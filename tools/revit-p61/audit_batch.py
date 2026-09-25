# -*- coding: utf-8 -*-
"""Native P104 per-product coordination and relocated-link audit; never edits geometry."""
import clr,os,json,codecs,traceback,shutil,hashlib
clr.AddReference('RevitAPI')
from Autodesk.Revit import DB
from System import Int64
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
WORK=os.path.join(ROOT,'output','revit-p61-batch');OUT=os.path.join(ROOT,'deliverables','PM_ARC_48_P104')
app=__revit__.Application
def write(p,obj):
    with codecs.open(p,'w','utf8') as f:f.write(json.dumps(obj,indent=2,ensure_ascii=False))
def log(s):
    with codecs.open(os.path.join(WORK,'audit.log'),'a','utf8') as f:f.write(unicode(s)+'\n')
def solids(e):
    out=[]
    def walk(gs):
        for g in gs:
            if isinstance(g,DB.Solid) and g.Volume>1e-9:out.append(g)
            elif isinstance(g,DB.GeometryInstance):walk(g.GetInstanceGeometry())
    walk(e.get_Geometry(DB.Options()));return out
def overlaps(a,b):return all(getattr(a.Min,k)<getattr(b.Max,k)-1e-7 and getattr(a.Max,k)>getattr(b.Min,k)+1e-7 for k in ['X','Y','Z'])
def audit(pid):
    folder=os.path.join(OUT,pid);qpath=os.path.join(folder,'QA_P104.json');qa=json.load(open(qpath));m=json.load(open(os.path.join(folder,'Recipe_P104.json')))
    d=app.OpenDocumentFile(os.path.join(folder,pid+'_ARC_R2026_P104.rvt'))
    try:
        link=next(iter(DB.FilteredElementCollector(d).OfClass(DB.RevitLinkInstance)));ld=link.GetLinkDocument();assert ld and link.GetTotalTransform().IsIdentity
        concrete=[]
        for e in DB.FilteredElementCollector(ld).WhereElementIsNotElementType():
            q=e.LookupParameter('PM_Package')
            if q and q.AsString()=='MOD':concrete.append((e.LookupParameter('PM_InstanceId').AsString(),e.get_BoundingBox(None),solids(e)))
        assert len(concrete)==m['concreteCount']
        arc=[];materials={};errors=[];clashes=[];internal=[];corners=[];tested=0
        for e in DB.FilteredElementCollector(d).WhereElementIsNotElementType():
            if not isinstance(e,(DB.FamilyInstance,DB.Floor,DB.Wall)):continue
            if e.Category.Id==DB.ElementId(DB.BuiltInCategory.OST_TitleBlocks):continue
            q=e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK);mark=q.AsString() if q else ''
            if not mark:continue
            for mid in e.GetMaterialIds(False):
                name=DB.Element.Name.GetValue(d.GetElement(mid));materials[name]=materials.get(name,0)+e.GetMaterialVolume(mid)*.028316846592
            arc.append((mark,e,e.get_BoundingBox(None),solids(e)))
        def volume(asol,bsol,a,b):
            vol=0
            for s in asol:
                for t in bsol:
                    try:vol+=DB.BooleanOperationsUtils.ExecuteBooleanOperation(s,t,DB.BooleanOperationsType.Intersect).Volume*.028316846592
                    except Exception as ex:errors.append({'a':a,'b':b,'error':str(ex)})
            return vol
        for mark,e,bb,ss in arc:
            for sid,sbb,s in concrete:
                if not overlaps(bb,sbb):continue
                tested+=1;v=volume(ss,s,mark,sid)
                if v>1e-7:clashes.append({'arc':mark,'concrete':sid,'intersectionM3':v})
        for j,(ma,ea,ba,sa) in enumerate(arc):
            for mb,eb,bb,sb in arc[j+1:]:
                if not overlaps(ba,bb):continue
                v=volume(sa,sb,ma,mb)
                if v<=1e-7:continue
                r={'a':ma,'b':mb,'intersectionM3':v}
                if isinstance(ea,DB.Wall) and isinstance(eb,DB.Wall):r['classification']='Partition corner lap in source layout; joinery connection not designed';corners.append(r)
                else:internal.append(r)
        placement=[]
        rows=json.load(open(os.path.join(folder,'ARC_ItemRegister_P104.json')))
        for r in rows:
            e=d.GetElement(DB.ElementId(Int64(r['elementId'])))
            if e is None:
                placement.append({'mark':r['mark'],'pass':False,'error':'Expected instance missing after save/reopen'})
                continue
            p=e.Location.Point
            err=max(abs(getattr(p,k)*304.8-v) for k,v in zip(['X','Y','Z'],r['p']))
            placement.append({'mark':r['mark'],'placementErrorMm':err,'pass':err<.01})
        floorarea=sum(e.get_Parameter(DB.BuiltInParameter.HOST_AREA_COMPUTED).AsDouble()*.09290304 for e in DB.FilteredElementCollector(d).OfClass(DB.Floor))
        dimensionCount=DB.FilteredElementCollector(d).OfClass(DB.Dimension).GetElementCount()
        result={'productId':pid,'arcConcreteCandidatePairs':tested,'arcConcreteClashes':clashes,'arcInternalClashes':internal,'partitionCornerLaps':corners,'booleanErrors':errors,'placementChecks':placement,'floorFinishAreaM2':floorarea,'materialGeometryVolumeM3':materials,'nativeDimensionCount':dimensionCount,'toleranceM3':1e-7,'notChecked':['Code compliance','Mechanical/electrical/hydraulic sizing','Fixing capacity','Full operational clearances','Procurement quantities','Deck support design']}
        write(os.path.join(folder,'Coordination_QA_P104.json'),result)
        d.Close(False);d=None
        relocated=os.path.join(WORK,'relocated-review',pid)
        for rel in [pid+'_ARC_R2026_P104.rvt','References/'+pid+'_STR_Coordination_P104.rvt']:
            dest=os.path.join(relocated,rel)
            if not os.path.isdir(os.path.dirname(dest)):os.makedirs(os.path.dirname(dest))
            shutil.copy2(os.path.join(folder,rel),dest)
        d=app.OpenDocumentFile(os.path.join(relocated,pid+'_ARC_R2026_P104.rvt'))
        li=next(iter(DB.FilteredElementCollector(d).OfClass(DB.RevitLinkInstance)));ld=li.GetLinkDocument();expected=os.path.join(relocated,'References',pid+'_STR_Coordination_P104.rvt')
        assert ld and os.path.normcase(ld.PathName)==os.path.normcase(expected)
        qa['relocationTest']='PASS';qa['relocatedLinkedPath']=ld.PathName;qa['coordinationAudit']='PASS' if not(clashes or internal or errors) and all(x['pass'] for x in placement) else 'NEEDS_CORRECTION';qa['arcConcreteClashes']=len(clashes);qa['arcInternalClashes']=len(internal);qa['booleanErrors']=len(errors)
        qa['auditedRvtSha256']=hashlib.sha256(open(os.path.join(folder,pid+'_ARC_R2026_P104.rvt'),'rb').read()).hexdigest()
        qa['auditedStrSha256']=hashlib.sha256(open(os.path.join(folder,'References',pid+'_STR_Coordination_P104.rvt'),'rb').read()).hexdigest()
        write(qpath,qa);log(pid+' '+qa['coordinationAudit']+' concrete='+str(len(clashes))+' internal='+str(len(internal))+' relocation PASS')
        return {'id':pid,'coordination':qa['coordinationAudit'],'relocation':'PASS'}
    finally:
        if d:d.Close(False)

selection=os.path.join(WORK,'selection.json');ids=json.load(open(selection)) if os.path.isfile(selection) else [m['id'] for m in json.load(open(os.path.join(WORK,'input.json')))['models']]
results=[]
for pid in ids:
    if not os.path.isfile(os.path.join(OUT,pid,'QA_P104.json')):continue
    try:results.append(audit(pid))
    except:
        error=traceback.format_exc();log(pid+' ERROR '+error);results.append({'id':pid,'error':error})
write(os.path.join(WORK,'last-audit-result.json'),results)
