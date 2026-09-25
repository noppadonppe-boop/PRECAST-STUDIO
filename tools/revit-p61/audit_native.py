# -*- coding: utf-8 -*-
import clr,os,json,codecs,traceback,shutil
clr.AddReference('RevitAPI')
from Autodesk.Revit import DB
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
OUT=os.path.join(ROOT,'deliverables','PM_ARC_P61_Pilot','PM-I-B3')
WORK=os.path.join(ROOT,'output','revit-p61')
app=__revit__.Application
def write(p,obj):
    with codecs.open(p,'w','utf8') as f:f.write(json.dumps(obj,indent=2,ensure_ascii=False))
def solids(e):
    out=[]
    def walk(gs):
        for g in gs:
            if isinstance(g,DB.Solid) and g.Volume>1e-9:out.append(g)
            elif isinstance(g,DB.GeometryInstance):walk(g.GetInstanceGeometry())
    walk(e.get_Geometry(DB.Options()));return out
def intersects(a,b):
    return all(getattr(a.Min,k)<getattr(b.Max,k)-1e-7 and getattr(a.Max,k)>getattr(b.Min,k)+1e-7 for k in ['X','Y','Z'])
doc=None
try:
    doc=app.OpenDocumentFile(os.path.join(OUT,'PM-I-B3_ARC_R2026_P103.rvt'))
    li=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.RevitLinkInstance)));ld=li.GetLinkDocument()
    concrete=[]
    for e in DB.FilteredElementCollector(ld).WhereElementIsNotElementType():
        q=e.LookupParameter('PM_Package')
        if q and q.AsString()=='MOD':concrete.append((e,e.get_BoundingBox(None),solids(e)))
    clash=[];errors=[];tested=0;materials={};arc=[]
    for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType():
        if not isinstance(e,(DB.FamilyInstance,DB.Floor)):continue
        if isinstance(e,DB.FamilyInstance) and e.Category.Id==DB.ElementId(DB.BuiltInCategory.OST_TitleBlocks):continue
        mark=e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK);mark=mark.AsString() if mark else ''
        for mid in e.GetMaterialIds(False):
            n=DB.Element.Name.GetValue(doc.GetElement(mid));v=e.GetMaterialVolume(mid)*.028316846592
            materials[n]=materials.get(n,0)+v
        if not mark or mark.startswith(('DK','SITE','ST','PL','AW','SH')):continue
        bb=e.get_BoundingBox(None);ss=solids(e);arc.append((e,mark,bb,ss))
        for ce,cb,cs in concrete:
            if not intersects(bb,cb):continue
            tested+=1;vol=0
            for a in ss:
                for b in cs:
                    try:vol+=DB.BooleanOperationsUtils.ExecuteBooleanOperation(a,b,DB.BooleanOperationsType.Intersect).Volume*.028316846592
                    except Exception as ex:errors.append({'arc':mark,'str':ce.LookupParameter('PM_InstanceId').AsString(),'error':str(ex)})
            if vol>1e-7:clash.append({'arc':mark,'str':ce.LookupParameter('PM_InstanceId').AsString(),'intersectionM3':vol})
    furnitureClashes=[]
    for i,(a,ma,ba,sa) in enumerate(arc):
        if not ma.startswith(('CH','OC','TB','OT','JN')):continue
        for b,mb,bb,sb in arc[i+1:]:
            if not mb.startswith(('CH','OC','TB','OT','JN')) or not intersects(ba,bb):continue
            vol=0
            for s1 in sa:
                for s2 in sb:
                    try:vol+=DB.BooleanOperationsUtils.ExecuteBooleanOperation(s1,s2,DB.BooleanOperationsType.Intersect).Volume*.028316846592
                    except Exception as ex:errors.append({'arc':ma,'other':mb,'error':str(ex)})
            if vol>1e-7:furnitureClashes.append({'a':ma,'b':mb,'intersectionM3':vol})
    areas=[]
    for r in DB.FilteredElementCollector(doc).OfCategory(DB.BuiltInCategory.OST_Rooms).WhereElementIsNotElementType():areas.append({'number':r.Number,'areaM2':r.Area*.09290304})
    flarea=sum(e.get_Parameter(DB.BuiltInParameter.HOST_AREA_COMPUTED).AsDouble()*.09290304 for e in DB.FilteredElementCollector(doc).OfClass(DB.Floor))
    native={'concreteInstances':len(concrete),'arcConcreteCandidatePairsTested':tested,'arcConcreteClashes':clash,'furnitureClashes':furnitureClashes,'booleanErrors':errors,'toleranceM3':1e-7,'rooms':areas,'floorFinishAreaM2':flarea,'materialGeometryVolumeM3':materials,'notChecked':['Fixing capacity','Movement/service/access clearances','Building code compliance','Full MEP design','Deck support engineering','Anchors and lifting']}
    write(os.path.join(OUT,'Coordination_QA_P103.json'),native)
    doc.Close(False);doc=None
    # A separate, non-overlapping root exercises relative-link portability.
    relocated=os.path.join(WORK,'relocated-review','PM-I-B3')
    if not os.path.isdir(relocated):os.makedirs(relocated)
    for rel in ['PM-I-B3_ARC_R2026_P103.rvt','References/PM-I-B3_STR_Coordination_R2026_P103.rvt']:
        dest=os.path.join(relocated,rel);parent=os.path.dirname(dest)
        if not os.path.isdir(parent):os.makedirs(parent)
        shutil.copy2(os.path.join(OUT,rel),dest)
    doc=app.OpenDocumentFile(os.path.join(relocated,'PM-I-B3_ARC_R2026_P103.rvt'))
    link=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.RevitLinkInstance)));linked=link.GetLinkDocument()
    if linked is None or os.path.normcase(linked.PathName)!=os.path.normcase(os.path.join(relocated,'References','PM-I-B3_STR_Coordination_R2026_P103.rvt')):raise Exception('Relocation did not load relocated reference')
    qa=json.load(open(os.path.join(OUT,'QA_P103.json')));qa['relocatedPackageTest']='PASS';qa['relocatedLinkedPath']=linked.PathName;qa['coordinationQaPath']='Coordination_QA_P103.json';qa['arcConcreteClashes']=len(clash);qa['furnitureClashes']=len(furnitureClashes);qa['booleanErrors']=len(errors)
    write(os.path.join(OUT,'QA_P103.json'),qa);doc.Close(False);doc=None
    write(os.path.join(WORK,'native-audit-result.json'),{'completed':True,'clashes':len(clash)+len(furnitureClashes),'errors':len(errors),'relocation':'PASS'})
except:
    write(os.path.join(WORK,'native-audit-error.json'),{'error':traceback.format_exc()})
    if doc:doc.Close(False)
    raise
