# -*- coding: utf-8 -*-
"""P101 native Revit delivery. Executed only inside licensed Revit via pyRevit runner."""
import clr, os, json, math, traceback, codecs, csv, time
clr.AddReference('RevitAPI')
from Autodesk.Revit import DB
from System import Guid
from System.Collections.Generic import List
ROOT = r'E:\1.0 Project GPT Work\Precast-Module'
WORK = os.path.join(ROOT,'output','revit-p6')
OUT = os.path.join(ROOT,'deliverables','PM_Revit_48_P6')
LIB = os.path.join(OUT,'SharedLibrary')
for folder in [OUT,LIB]:
    if not os.path.isdir(folder): os.makedirs(folder)
app = __revit__.Application
data = json.load(open(os.path.join(WORK,'input.json')))
library = dict((i['key'],i) for i in data['library'])
MODE = globals().get('PM_RUN_MODE') or open(os.path.join(ROOT,'tools','revit-p6','mode.txt')).read().strip()
LOG = os.path.join(WORK,'build-'+MODE+'.log')
def log(s):
    with codecs.open(LOG,'a','utf-8') as f: f.write(unicode(s)+'\n')
def write(p,obj):
    with codecs.open(p,'w','utf-8') as f: f.write(json.dumps(obj,ensure_ascii=False,indent=2))
def mm(v): return float(v)/304.8
def xyz(v): return DB.XYZ(*[mm(x) for x in v])
def pt(x,y,z=0): return xyz([x,y,z])
def eid(b): return DB.ElementId(b)
def name(e): return DB.Element.Name.GetValue(e)
def setp(e,b,v):
    p=e.get_Parameter(b)
    if p and not p.IsReadOnly: p.Set(v)
def loop(points):
    c=DB.CurveLoop()
    # Recover circular runs from the source tessellation; straight and corner edges remain exact.
    pts=[xyz(v) for v in points];i=0;n=len(pts)
    while i<n:
        end=i+1
        if i+3<n:
            a,b,d=pts[i],pts[i+1],pts[i+2]
            try:
                if (b-a).Normalize().DotProduct((d-b).Normalize())<.94:raise ValueError('Corner, not a sampled arc')
                arc=DB.Arc.Create(a,d,b);center=arc.Center;radius=arc.Radius;normal=arc.Normal
                j=i+3
                while j<n and abs(pts[j].DistanceTo(center)-radius)<mm(.005) and abs((pts[j]-center).DotProduct(normal))<mm(.005):j+=1
                if j>=i+4 and radius>mm(20):
                    end=j-1;mid=pts[(i+end)//2]
                    c.Append(DB.Arc.Create(a,pts[end],mid));i=end;continue
            except:pass
        c.Append(DB.Line.CreateBound(pts[i],pts[(i+1)%n]));i+=1
    return c
def save(doc,p):
    opt=DB.SaveAsOptions();opt.OverwriteExistingFile=True;opt.MaximumBackups=1
    doc.SaveAs(p,opt)
def material(doc,title,col):
    e=doc.GetElement(DB.Material.Create(doc,title));e.Color=DB.Color(*col)
    return e
def scalar_volume(pr):
    points=[xyz(p) for p in pr['profile']]
    solid=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop(pr['profile'])]),DB.XYZ(*pr['direction']),mm(pr['depth']))
    return solid

PARAMS=['PM_ProductId','PM_PlanType','PM_ProfileFamily','PM_UseGroup','PM_SegmentTag','PM_SegmentRevision','PM_GeometryRevisionId','PM_InstanceId','PM_ModuleId','PM_Package','PM_ConcreteVolumeM3','PM_ConcreteMassKg','PM_Status','PM_EngineeringApproved','PM_ProductionReleased','PM_LiftingZoneStatus','PM_SourcePath']
shared=os.path.join(LIB,'PM_SharedParameters.txt')
if not os.path.isfile(shared):
    with open(shared,'w') as f:f.write('# Revit shared parameters\n*META\tVERSION\tMINVERSION\nMETA\t2\t1\n*GROUP\tID\tNAME\n*PARAM\tGUID\tNAME\tDATATYPE\tDATACATEGORY\tGROUP\tVISIBLE\tDESCRIPTION\tUSERMODIFIABLE\tHIDEWHENNOVALUE\n')
original_shared=app.SharedParametersFilename
app.SharedParametersFilename=shared
sf=app.OpenSharedParameterFile();grp=sf.Groups.get_Item('PM P6') or sf.Groups.Create('PM P6')
defs={}
for n,key in enumerate(PARAMS):
    d=grp.Definitions.get_Item(key)
    if not d:
        spec=DB.SpecTypeId.Number if key in ['PM_ConcreteVolumeM3','PM_ConcreteMassKg'] else DB.SpecTypeId.String.Text
        opt=DB.ExternalDefinitionCreationOptions(key,spec)
        opt.GUID=Guid('dcf39216-33d2-433a-9506-'+str(n+1).zfill(12));d=grp.Definitions.Create(opt)
    defs[key]=d
# Keep the shared definition file active while families consume its definitions.

def build_family(item):
    dest=os.path.join(LIB,item['key']+'.rfa')
    auditfile=dest+'.json'
    if os.path.isfile(dest) and os.path.isfile(auditfile):
        existing=json.load(open(auditfile))
        if existing.get('builderRevision')==2:return existing
    fd=app.NewFamilyDocument(r'C:\ProgramData\Autodesk\RVT 2026\Family Templates\English\Metric Generic Model.rft')
    try:
        tx=DB.Transaction(fd,'Create editable Segment extrusions');tx.Start()
        setp(fd.OwnerFamily,DB.BuiltInParameter.FAMILY_SHARED,1)
        concrete=material(fd,'PM Concrete - density basis 2400 kg per m3 - strength TBD',(184,185,181))
        fm=fd.FamilyManager;fm.NewType('P36')
        for key in ['PM_SegmentTag','PM_SegmentRevision']:
            fp=fm.AddParameter(defs[key],DB.GroupTypeId.IdentityData,True)
            fm.Set(fp,item['typicalId'] if key=='PM_SegmentTag' else item['typicalId'].split('-')[-1])
        vol=0.0;forms=[]
        for k,pr in enumerate(item['prisms']):
            curves=DB.CurveArrArray();arr=DB.CurveArray()
            for curve in loop(pr['profile']):arr.Append(curve)
            curves.Append(arr)
            plane=DB.SketchPlane.Create(fd,DB.Plane.CreateByNormalAndOrigin(DB.XYZ(*pr['direction']),xyz(pr['profile'][0])))
            e=fd.FamilyCreate.NewExtrusion(True,curves,plane,mm(pr['depth']))
            forms.append(e)
            setp(e,DB.BuiltInParameter.MATERIAL_ID_PARAM,concrete.Id)
            # Every depth is exposed as an editable family parameter; sketch profile remains editable.
            fp=fm.AddParameter('Depth_'+str(k+1),DB.GroupTypeId.Geometry,DB.SpecTypeId.Length,False)
            fm.AssociateElementParameterToFamilyParameter(e.get_Parameter(DB.BuiltInParameter.EXTRUSION_END_PARAM),fp)
            fm.Set(fp,mm(pr['depth']))
            vol+=scalar_volume(pr).Volume*0.028316846592
        if len(forms)>1:
            fd.Regenerate()
            for a in range(len(forms)):
                for b in range(a+1,len(forms)):
                    try:DB.JoinGeometryUtils.JoinGeometry(fd,forms[a],forms[b])
                    except:pass
        if tx.Commit()!=DB.TransactionStatus.Committed:raise Exception('Family commit failed')
        rel=abs(vol-item['expectedVolumeM3'])/item['expectedVolumeM3']
        if rel>.01:raise Exception('Family volume mismatch '+str(rel))
        save(fd,dest)
        audit={'builderRevision':2,'key':item['key'],'typicalId':item['typicalId'],'nativeExtrusions':len(item['prisms']),'volumeM3':vol,'referenceVolumeM3':item['expectedVolumeM3'],'relativeError':rel,'profileEditing':'Native extrusion sketch with recovered circular arcs','depthEditing':'Depth_N type parameters','revitVersion':app.VersionNumber,'status':'VERIFIED_GEOMETRY'}
        write(auditfile,audit);log('FAMILY '+item['key'])
        return audit
    except:
        log(traceback.format_exc())
        if tx.GetStatus()==DB.TransactionStatus.Started:tx.RollBack()
        raise
    finally:fd.Close(False)

def titleblock():
    dest=os.path.join(LIB,'PM_PPE_A1.rfa')
    if os.path.isfile(dest):return dest
    fd=app.NewFamilyDocument(r'C:\ProgramData\Autodesk\RVT 2026\Family Templates\English\Titleblocks\A1 metric.rft')
    tx=DB.Transaction(fd,'PPE A1 standard');tx.Start()
    v=next(v for v in DB.FilteredElementCollector(fd).OfClass(DB.View) if v.ViewType==DB.ViewType.DrawingSheet)
    for e in list(DB.FilteredElementCollector(fd).OfClass(DB.CurveElement)):
        try:fd.Delete(e.Id)
        except:pass
    for x,y,a,b in [(0,0,841,0),(841,0,841,594),(841,594,0,594),(0,594,0,0),(15,15,826,15),(826,15,826,579),(826,579,15,579),(15,579,15,15),(15,65,826,65),(540,15,540,65),(720,15,720,65)]:
        fd.FamilyCreate.NewDetailCurve(v,DB.Line.CreateBound(pt(x,y),pt(a,b)))
    base=next(iter(DB.FilteredElementCollector(fd).OfClass(DB.TextNoteType)))
    for n,(x,y,s,size) in enumerate([(24,54,'PPE ENGINEERING | MODULAR CONCRETE',5),(24,39,'DEVELOPMENT / COORDINATION | GEOMETRY P36',3),(24,27,'Engineering and production release pending | Dimensions mm',2.5),(548,55,'REVIT 2026 | P01',4),(727,55,'A1',6)]):
        typ=base.Duplicate('PM '+str(n));setp(typ,DB.BuiltInParameter.TEXT_SIZE,mm(size));setp(typ,DB.BuiltInParameter.TEXT_FONT,'Arial')
        DB.TextNote.Create(fd,v.Id,pt(x,y),s,typ.Id)
    tx.Commit();save(fd,dest);fd.Close(False)
    return dest

def solids_of(e):
    result=[]
    def walk(gs):
        for g in gs:
            if isinstance(g,DB.Solid) and g.Volume>1e-9:result.append(g)
            elif isinstance(g,DB.GeometryInstance):walk(g.GetInstanceGeometry())
    walk(e.get_Geometry(DB.Options()))
    return result

def exact_solid_bounds(solids):
    points=[]
    for solid in solids:
        for edge in solid.Edges:
            c=edge.AsCurve();points.extend([c.GetEndPoint(0),c.GetEndPoint(1)])
            if isinstance(c,DB.Arc):
                low,high=c.GetEndParameter(0),c.GetEndParameter(1)
                for ax,ay in [(c.XDirection.X,c.YDirection.X),(c.XDirection.Y,c.YDirection.Y),(c.XDirection.Z,c.YDirection.Z)]:
                    angle=math.atan2(ay,ax)
                    for k in range(-4,5):
                        value=angle+k*math.pi
                        if low-1e-9<=value<=high+1e-9:points.append(c.Evaluate(value,False))
            elif not isinstance(c,DB.Line):points.extend(list(c.Tessellate()))
    return [[min(getattr(p,k) for p in points)*304.8 for k in ['X','Y','Z']],[max(getattr(p,k) for p in points)*304.8 for k in ['X','Y','Z']]]

def build_product(m,tbpath):
    pid=m['id'];folder=os.path.join(OUT,pid)
    if not os.path.isdir(folder):os.makedirs(folder)
    rvt=os.path.join(folder,pid+'_R2026_P01.rvt')
    qa_path=os.path.join(folder,pid+'_QA_P01.json')
    if MODE!='pilot' and os.path.isfile(qa_path) and json.load(open(qa_path)).get('status')=='PASS':
        log('SKIP VERIFIED '+pid);return
    doc=None
    try:
        log('PRODUCT START '+pid)
        doc=app.NewProjectDocument(r'C:\ProgramData\Autodesk\RVT 2026\Templates\English\DefaultMetric.rte')
        fams={}
        tx=DB.Transaction(doc,'Load PM shared library');tx.Start()
        for key in sorted(set(i['familyKey'] for i in m['instances'] if i['kind']!='FLOOR')):
            ref=clr.Reference[DB.Family]();ok=doc.LoadFamily(os.path.join(LIB,key+'.rfa'),ref)
            if not ok or ref.Value is None:raise Exception('Family load failed: '+key)
            fams[key]=doc.GetElement(list(ref.Value.GetFamilySymbolIds())[0])
        ref=clr.Reference[DB.Family]();doc.LoadFamily(tbpath,ref);tb=doc.GetElement(list(ref.Value.GetFamilySymbolIds())[0])
        tx.Commit()
        tx=DB.Transaction(doc,'PM model and metadata');tx.Start()
        doc.SetUnits(DB.Units(DB.UnitSystem.Metric))
        setp(doc.ProjectInformation,DB.BuiltInParameter.PROJECT_NAME,pid+' | '+m['useName'])
        setp(doc.ProjectInformation,DB.BuiltInParameter.PROJECT_NUMBER,pid)
        cats=app.Create.NewCategorySet()
        for c in [DB.BuiltInCategory.OST_GenericModel,DB.BuiltInCategory.OST_Floors,DB.BuiltInCategory.OST_Walls,DB.BuiltInCategory.OST_Furniture,DB.BuiltInCategory.OST_Windows,DB.BuiltInCategory.OST_Doors]:cats.Insert(DB.Category.GetCategory(doc,c))
        for key,d in defs.items():doc.ParameterBindings.Insert(d,app.Create.NewInstanceBinding(cats),DB.GroupTypeId.IdentityData)
        concrete=material(doc,'PM Concrete - density basis 2400 - strength TBD',(184,185,181))
        timber=material(doc,'PM Fitout placeholder',(168,125,79))
        glass=material(doc,'PM Glazing placeholder',(147,182,191));glass.Transparency=70
        floorbase=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.FloorType)))
        ft=floorbase.Duplicate('PM Precast slab 175 mm')
        cs=ft.GetCompoundStructure();cs.SetLayers(List[DB.CompoundStructureLayer]([DB.CompoundStructureLayer(mm(175),DB.MaterialFunctionAssignment.Structure,concrete.Id)]));ft.SetCompoundStructure(cs)
        level=DB.Level.Create(doc,0);level.Name='PM 00 Slab underside +000'
        ffl=DB.Level.Create(doc,mm(175));ffl.Name='PM 01 Slab top +175'
        rooflevel=DB.Level.Create(doc,mm(3000));rooflevel.Name='PM 02 Envelope +3000'
        elements=[];arc=[];pairs=[]
        def meta(e,i,pkg='MOD'):
            vals={'PM_ProductId':pid,'PM_PlanType':m['plan'],'PM_ProfileFamily':m['family'],'PM_UseGroup':str(m['use']),'PM_SegmentTag':i.get('typicalId','ARC'),'PM_SegmentRevision':i.get('typicalId','P36').split('-')[-1],'PM_GeometryRevisionId':'P36','PM_InstanceId':i['id'],'PM_ModuleId':i.get('bayId',i.get('nodeId',m['plan'])),'PM_Package':pkg,'PM_ConcreteVolumeM3':i.get('concreteMassKg',0)/2400,'PM_ConcreteMassKg':i.get('concreteMassKg',0),'PM_Status':'DEVELOPMENT_COORDINATION','PM_EngineeringApproved':'false','PM_ProductionReleased':'false','PM_LiftingZoneStatus':'SCHEMATIC_UNSIZED_P52' if pkg=='MOD' else 'N/A','PM_SourcePath':m['sourcePath']}
            for k,val in vals.items():
                q=e.LookupParameter(k)
                if q and not q.IsReadOnly:q.Set(val)
            setp(e,DB.BuiltInParameter.ALL_MODEL_MARK,i.get('label',i['id']))
        for i in m['instances']:
            if i['kind']=='FLOOR':
                pr=library[i['familyKey']]['prisms'][0]
                pts=[[p[k]+i['boundsMm']['min'][k] for k in range(3)] for p in pr['profile']]
                pts=[[p[0],p[1],0] for p in pts]
                e=DB.Floor.Create(doc,List[DB.CurveLoop]([loop(pts)]),ft.Id,level.Id)
                setp(e,DB.BuiltInParameter.FLOOR_HEIGHTABOVELEVEL_PARAM,mm(i['boundsMm']['max'][2]))
            else:
                sym=fams[i['familyKey']]
                if not sym.IsActive:sym.Activate()
                e=doc.Create.NewFamilyInstance(xyz(i['boundsMm']['min']),sym,DB.Structure.StructuralType.NonStructural)
            meta(e,i);elements.append(e);pairs.append((e,i))
        def box(mins,size,mat,cat,ident):
            x,y,z=mins;w,l,h=size
            sol=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop([[x,y,z],[x+w,y,z],[x+w,y+l,z],[x,y+l,z]])]),DB.XYZ.BasisZ,mm(h),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))
            e=DB.DirectShape.CreateElement(doc,eid(cat));e.SetShape(List[DB.GeometryObject]([sol]));e.Name=ident
            meta(e,{'id':ident},'ARC');arc.append(e);return e
        for item in m['fitout']['items']:
            if item['kind']!='WET_ROOM':box(item['minMm'],item['sizeMm'],timber,DB.BuiltInCategory.OST_Furniture,item['id'])
        for item in m['fitout']['partitions']:box(item['minMm'],item['sizeMm'],concrete,DB.BuiltInCategory.OST_GenericModel,item['id'])
        for o in m['openings']:
            # Model thin generic glazing at the opening plane, without altering concrete.
            ps=o['cornersMm'];a=xyz(ps[1])-xyz(ps[0]);b=xyz(ps[3])-xyz(ps[0]);n=a.CrossProduct(b).Normalize()
            sol=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop(ps)]),n,mm(10),DB.SolidOptions(glass.Id,DB.ElementId.InvalidElementId))
            e=DB.DirectShape.CreateElement(doc,eid(DB.BuiltInCategory.OST_Windows if o['type']=='W01' else DB.BuiltInCategory.OST_Doors));e.SetShape(List[DB.GeometryObject]([sol]));e.Name=o['id']+' rough opening glazing placeholder';meta(e,{'id':o['id']},'ARC');arc.append(e)
        doc.Regenerate()
        checks=[]
        for e,i in pairs:
            bb=e.get_BoundingBox(None);solids=solids_of(e);v=sum(s.Volume for s in solids)*0.028316846592
            actualMin,actualMax=exact_solid_bounds(solids)
            err=max(abs(a-b) for a,b in zip(actualMin+actualMax,i['boundsMm']['min']+i['boundsMm']['max']))
            ve=abs(v-i['concreteMassKg']/2400)/(i['concreteMassKg']/2400)
            checks.append({'instanceId':i['id'],'elementId':int(e.Id.Value),'typicalId':i['typicalId'],'familyKey':i['familyKey'],'kind':i['kind'],'boundsErrorMm':err,'volumeM3':v,'referenceMassKg':i['concreteMassKg'],'massKg':v*2400,'volumeRelativeError':ve,'pass':err<=1 and ve<=.01})
        if not all(i['pass'] for i in checks):raise Exception('Geometry mismatch '+json.dumps([i for i in checks if not i['pass']]))
        tx.Commit()
        log('GEOMETRY PASS '+pid)
        tx=DB.Transaction(doc,'PM views dimensions schedules sheets');tx.Start()
        vfts=list(DB.FilteredElementCollector(doc).OfClass(DB.ViewFamilyType))
        def vft(f):return next(v for v in vfts if v.ViewFamily==f)
        def style(v,scale=None):
            v.Scale=scale or (25 if m['plan']=='I' else 40);v.DetailLevel=DB.ViewDetailLevel.Fine;v.DisplayStyle=DB.DisplayStyle.HLR
            for cat in [DB.BuiltInCategory.OST_Levels,DB.BuiltInCategory.OST_Grids,DB.BuiltInCategory.OST_Sections,DB.BuiltInCategory.OST_Elev]:
                try:v.SetCategoryHidden(eid(cat),True)
                except:pass
        xmax,ymax,zmax=m['externalDimensionsMm'];scale=25 if m['plan']=='I' else 40
        base=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.TextNoteType)));texts={}
        def text(v,x,y,s,size=3,width=0):
            if size not in texts:
                t=base.Duplicate('PM Arial '+str(size));setp(t,DB.BuiltInParameter.TEXT_SIZE,mm(size));setp(t,DB.BuiltInParameter.TEXT_FONT,'Arial');texts[size]=t
            op=DB.TextNoteOptions(texts[size].Id)
            pos=pt(x,y) if v.ViewType in [DB.ViewType.DrawingSheet,DB.ViewType.FloorPlan,DB.ViewType.CeilingPlan] else v.Origin+v.RightDirection.Multiply(mm(x))+v.UpDirection.Multiply(mm(y))
            if width:return DB.TextNote.Create(doc,v.Id,pos,mm(width),s,op)
            return DB.TextNote.Create(doc,v.Id,pos,s,op)
        def detail(v,x,y,a,b):
            if v.ViewType==DB.ViewType.FloorPlan:p1,p2=pt(x,y),pt(a,b)
            else:p1=v.Origin+v.RightDirection.Multiply(mm(x))+v.UpDirection.Multiply(mm(y));p2=v.Origin+v.RightDirection.Multiply(mm(a))+v.UpDirection.Multiply(mm(b))
            return doc.Create.NewDetailCurve(v,DB.Line.CreateBound(p1,p2))
        def dim(v,vals,pos,axis):
            refs=DB.ReferenceArray()
            for q in vals:
                c=detail(v,q,pos-50,q,pos+50) if axis=='x' else detail(v,pos-50,q,pos+50,q);refs.Append(c.GeometryCurve.Reference)
            def local(x,y):return pt(x,y) if v.ViewType==DB.ViewType.FloorPlan else v.Origin+v.RightDirection.Multiply(mm(x))+v.UpDirection.Multiply(mm(y))
            a,b=(local(vals[0],pos),local(vals[-1],pos)) if axis=='x' else (local(pos,vals[0]),local(pos,vals[-1]))
            return doc.Create.NewDimension(v,DB.Line.CreateBound(a,b),refs)
        plan=DB.ViewPlan.Create(doc,vft(DB.ViewFamily.FloorPlan).Id,ffl.Id);plan.Name='PM A101 Floor and Segment Plan';style(plan)
        roof=DB.ViewPlan.Create(doc,vft(DB.ViewFamily.FloorPlan).Id,rooflevel.Id);roof.Name='PM A102 Roof and Joints';style(roof)
        for v,lev,cut,bot in [(plan,ffl,1200,-175),(roof,rooflevel,500,-3100)]:
            vr=v.GetViewRange()
            for key,off in [(DB.PlanViewPlane.TopClipPlane,cut+500),(DB.PlanViewPlane.CutPlane,cut),(DB.PlanViewPlane.BottomClipPlane,bot),(DB.PlanViewPlane.ViewDepthPlane,bot)]:vr.SetLevelId(key,lev.Id);vr.SetOffset(key,mm(off))
            v.SetViewRange(vr)
            bb=DB.BoundingBoxXYZ();bb.Min=pt(-1300,-1300,-500);bb.Max=pt(xmax+1000,ymax+1000,4500);v.CropBox=bb;v.CropBoxActive=True;v.CropBoxVisible=False
            dim(v,[0,xmax],-850,'x');dim(v,list(range(0,int(ymax)+1,1500)),-450,'y');dim(v,[0,ymax],-900,'y')
        for e,i in pairs:
            if i['kind']=='FLOOR':
                x=(i['boundsMm']['min'][0]+i['boundsMm']['max'][0])/2;y=(i['boundsMm']['min'][1]+i['boundsMm']['max'][1])/2
                text(plan,x-280,y,i['label'],2)
        def section(n,origin,right,direction,w,depth):
            tr=DB.Transform.Identity;tr.Origin=xyz(origin);tr.BasisX=DB.XYZ(*right);tr.BasisY=DB.XYZ.BasisZ;tr.BasisZ=DB.XYZ(*direction)
            bb=DB.BoundingBoxXYZ();bb.Transform=tr;bb.Min=pt(-w/2-900,-500,0);bb.Max=pt(w/2+900,3600,depth)
            v=DB.ViewSection.CreateSection(doc,vft(DB.ViewFamily.Section).Id,bb);v.Name=n;style(v);v.CropBoxVisible=False
            doc.Regenerate()
            # Revit resets Section.Origin to the crop's lower-left corner.
            dim(v,[900,900+w],250,'x');dim(v,[500,675,3500],400,'y');dim(v,[500,3500],150,'y')
            return v
        elevations=[section('PM South elevation',[xmax/2,-500,0],[-1,0,0],[0,1,0],xmax,ymax+1000),section('PM North elevation',[xmax/2,ymax+500,0],[1,0,0],[0,-1,0],xmax,ymax+1000),section('PM East elevation',[xmax+500,ymax/2,0],[0,-1,0],[-1,0,0],ymax,xmax+1000),section('PM West elevation',[-500,ymax/2,0],[0,1,0],[1,0,0],ymax,xmax+1000)]
        # Sections look into the building; right x up determines view direction.
        sections=[section('PM Section A-A',[1500,742.5,0],[1,0,0],[0,-1,0],3000,500),section('PM Section B-B',[1450,ymax/2,0],[0,1,0],[1,0,0],ymax,1400)]
        axos=[]
        for n in ['PM 3D Exterior','PM 3D Segments','PM 3D Exploded']:
            v=DB.View3D.CreateIsometric(doc,vft(DB.ViewFamily.ThreeDimensional).Id);v.Name=n;style(v);v.DisplayStyle=DB.DisplayStyle.ShadingWithEdges
            forward=DB.XYZ(-1,1,-.85).Normalize();right=forward.CrossProduct(DB.XYZ.BasisZ).Normalize();up=right.CrossProduct(forward).Normalize()
            v.SetOrientation(DB.ViewOrientation3D(pt(xmax+8000,-8000,8000),up,forward));axos.append(v)
        for v in axos[1:]:
            if arc:v.HideElements(List[DB.ElementId]([e.Id for e in arc]))
        for e,i in pairs:
            move=pt(-550 if i.get('side')=='LH' else 550 if i.get('side')=='RH' else 0,0,700 if i['kind'] in ['CAP','NODE_ROOF'] else 0)
            if move.GetLength()>0:DB.DisplacementElement.Create(doc,List[DB.ElementId]([e.Id]),move,axos[2],None)
        schedule=DB.ViewSchedule.CreateSchedule(doc,DB.ElementId.InvalidElementId);schedule.Name='PM Segment register'
        fields={}
        for key in ['PM_InstanceId','PM_SegmentTag','PM_ConcreteVolumeM3','PM_ConcreteMassKg','PM_Package']:
            sp=DB.SharedParameterElement.Lookup(doc,defs[key].GUID)
            fld=schedule.Definition.AddField(DB.ScheduleFieldType.Instance,sp.Id);fld.ColumnHeading=key.replace('PM_','');fields[key]=fld
            fld.GridColumnWidth=mm(105 if key=='PM_InstanceId' else 105 if key=='PM_SegmentTag' else 38)
        schedule.Definition.AddFilter(DB.ScheduleFilter(fields['PM_Package'].FieldId,DB.ScheduleFilterType.Equal,'MOD'));fields['PM_Package'].IsHidden=True
        schedule.Definition.AddSortGroupField(DB.ScheduleSortGroupField(fields['PM_InstanceId'].FieldId))
        schedule.Definition.IsItemized=True
        sheets=[];placements=[]
        def sheet(num,title):
            s=DB.ViewSheet.Create(doc,tb.Id);s.SheetNumber=num;s.Name=title
            text(s,24,568,num+' | '+title.upper(),5,775);text(s,548,38,pid,4,165);text(s,727,37,num,5,90)
            sheets.append(s);return s
        def place(s,v,x,y,label):
            vp=DB.Viewport.Create(doc,s.Id,v.Id,pt(x,y));setp(doc.GetElement(vp.GetTypeId()),DB.BuiltInParameter.VIEWPORT_ATTR_SHOW_LABEL,0)
            placements.append((vp,x,y,s,label.replace('1:50','1:'+str(v.Scale))))
        s=sheet('A001','Product overview');place(s,axos[0],275,360,'01 | Exterior | 1:50')
        text(s,550,525,pid+'\n'+m['useName']+'\nProfile '+m['family']+' | Plan '+m['plan'],5,240)
        text(s,550,450,'Envelope: '+str(xmax)+' x '+str(ymax)+' x '+str(zmax)+' mm\nGrid: 1500 mm\nConcrete segments: '+str(len(elements))+'\nNominal area: '+str(m['area']['nominalExternalM2'])+' m2\nConcrete mass: '+str(round(m['mass']['knownConcreteKg']/1000,3))+' t',3.4,245)
        text(s,30,172,'P36 geometry / P35 Typical library / P101 BIM coordination\nConcrete density 2400 kg/m3 is a quantity basis. Material strength and reinforcement sizes remain open.\nLifting and production engineering follow the recorded development assumptions and scope transfer.',3,770)
        s=sheet('A101','Floor plan and segment layout');place(s,plan,320,335,'01 | Floor and Segment Plan | 1:50');text(s,585,500,'MODEL BASIS\nNative slab + shared segment families\nOpening dimensions are rough concrete sizes.\nFitout is schematic.\n+Y is a project reference axis.\nAll dimensions in mm.',3,210)
        s=sheet('A102','Roof and joint layout');place(s,roof,320,335,'01 | Roof layout | 1:50');text(s,585,500,'ROOF COORDINATION\nPaired wall-roof half segments\n1500 mm nominal bay grid\nShared wall edges at L/U nodes\nNode covers within 3000 envelope\nJoint capacity and weather sealing\nremain subject to engineering.',3,210)
        s=sheet('A201','External elevations')
        for v,x,y,label in zip(elevations,[225,620,225,620],[440,440,230,230],['South','North','East','West']):place(s,v,x,y,label+' | 1:50')
        s=sheet('A301','Sections and levels');place(s,sections[0],225,350,'A-A | 1:50');place(s,sections[1],620,350,'B-B | 1:50');text(s,30,155,'Datum +000 = underside of concrete floor. Slab top +175. Main envelope +3000.\nLevels represent concrete geometry before finishes. Dimensions reference declared geometry coordinates.',3,760)
        s=sheet('A401','Segment coordination');place(s,axos[1],225,360,'Assembled structure | 1:50');place(s,axos[2],620,360,'Exploded structure | 1:50');text(s,30,155,'Displacement view illustrates part identity and arrangement. Consult the Stage 5 mould package for mould assembly.\nShared families expose editable extrusion sketches and Depth_N type parameters. Check geometry after any edit.',3,770)
        s=sheet('A601','Segment quantities and status')
        DB.ScheduleSheetInstance.Create(doc,s.Id,schedule.Id,pt(28,535))
        text(s,460,520,'QUANTITY BASIS\n'+str(len(elements))+' precast instances\nDensity: 2400 kg/m3\nMass excludes steel, fittings and finishes.\nConcrete strength: not selected\nEngineering approval: false\nProduction release: false\n\nSource: '+m['sourcePath']+'\n\nNative Revit geometry is checked\nagainst P36 per instance.\nSlabs: native Floors\nOther concrete: shared Families\nGlazing and fitout: DirectShape',3,340)
        doc.Regenerate()
        for vp,x,y,s,label in placements:
            vp.SetBoxCenter(pt(x,y));doc.Regenerate();outline=vp.GetBoxOutline()
            text(s,outline.MinimumPoint.X*304.8,max(80,outline.MinimumPoint.Y*304.8-12),label,3.5,310)
        doc.Regenerate()
        dimensionAudit=[]
        for v in [plan,roof]+elevations+sections:
            ds=[d for d in DB.FilteredElementCollector(doc).OfClass(DB.Dimension) if d.OwnerViewId==v.Id]
            visible=[d for d in ds if d.get_BoundingBox(v) is not None]
            dimensionAudit.append({'view':v.Name,'dimensions':len(ds),'visibleDimensions':len(visible)})
        if any(d['visibleDimensions']<2 for d in dimensionAudit):raise Exception('Dimensions not visible: '+json.dumps(dimensionAudit))
        tx.Commit()
        save(doc,rvt)
        if pid=='PM-I-C1':
            # A reusable empty project template retains standards, views and sheets.
            t=DB.Transaction(doc,'Template cleanup');t.Start();doc.Delete(List[DB.ElementId]([e.Id for e in elements+arc]));t.Commit()
            save(doc,os.path.join(LIB,'PM_Coordination_R2026.rte'))
            doc.Close(False);doc=app.OpenDocumentFile(rvt)
        else:
            doc.Close(False);doc=app.OpenDocumentFile(rvt)
        # The exported files come from the reopened saved model.
        sheets=sorted([v for v in DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet) if v.SheetNumber.startswith('A') and v.SheetNumber in ['A001','A101','A102','A201','A301','A401','A601']],key=lambda v:v.SheetNumber)
        pdf=DB.PDFExportOptions();pdf.Combine=True;pdf.FileName=pid+'_A1_Drawings_P01';pdf.PaperFormat=DB.ExportPaperFormat.Default
        pdfok=doc.Export(folder,List[DB.ElementId]([s.Id for s in sheets]),pdf)
        if not pdfok:raise Exception('PDF export failed')
        exports=[]
        for vn,suffix in [('PM 3D Exterior','3D_Exterior'),('PM 3D Segments','3D_Segments'),('PM A101 Floor and Segment Plan','Plan'),('PM Section A-A','Section')]:
            v=next(v for v in DB.FilteredElementCollector(doc).OfClass(DB.View) if v.Name==vn)
            op=DB.ImageExportOptions();op.ExportRange=DB.ExportRange.SetOfViews;op.SetViewsAndSheets(List[DB.ElementId]([v.Id]));op.FilePath=os.path.join(folder,pid+'_'+suffix+'_P01');op.HLRandWFViewsFileType=DB.ImageFileType.PNG;op.ShadowViewsFileType=DB.ImageFileType.PNG;op.ImageResolution=DB.ImageResolution.DPI_150;op.ZoomType=DB.ZoomFitType.FitToPage;op.PixelSize=2200;doc.ExportImage(op);exports.append(vn)
        warnings=[w.GetDescriptionText() for w in doc.GetWarnings()]
        qa={'productId':pid,'status':'PASS','revitVersion':app.VersionNumber,'revitBuild':app.VersionBuild,'nativeReopened':True,'nativeSaved':True,'pdfExport':pdfok,'sheets':[s.SheetNumber for s in sheets],'imageViews':exports,'sourceSha256':m['sourceSha256'],'sourceRevision':'P36','concreteInstanceCount':len(checks),'nativeFloorCount':sum(1 for i in m['instances'] if i['kind']=='FLOOR'),'sharedFamilyInstanceCount':sum(1 for i in m['instances'] if i['kind']!='FLOOR'),'directShapeConcreteCount':0,'fitoutDirectShapes':len(arc),'checks':checks,'dimensionAudit':dimensionAudit,'warnings':warnings,'engineeringApproved':False,'productionReleased':False,'visualReview':'PENDING'}
        write(qa_path,qa)
        with open(os.path.join(folder,pid+'_SegmentSchedule_P01.csv'),'wb') as f:
            w=csv.writer(f);w.writerow(['InstanceId','TypicalId','FamilyKey','NativeVolumeM3','NativeConcreteMassKg','ReferenceConcreteMassKg','GeometryRevision'])
            for c in checks:w.writerow([c['instanceId'],c['typicalId'],c['familyKey'],c['volumeM3'],c['massKg'],c['referenceMassKg'],'P36'])
        log('PRODUCT PASS '+pid)
    finally:
        if doc:
            try:
                if tx.GetStatus()==DB.TransactionStatus.Started:tx.RollBack()
            except:pass
            try:doc.Close(False)
            except:pass

try:
    log('START '+MODE+' Revit '+app.VersionNumber+' '+app.VersionBuild)
    audits=[]
    for item in data['library']:audits.append(build_family(item))
    write(os.path.join(LIB,'family-library.json'),audits)
    tbpath=titleblock()
    models=data['models'][:1] if MODE=='pilot' else data['models']
    if globals().get('PM_PROFILE_FILTER'):models=[m for m in models if m['family']==PM_PROFILE_FILTER]
    failed=[]
    for m in models:
        try:build_product(m,tbpath)
        except:
            error=traceback.format_exc();log(error);failed.append({'product':m['id'],'error':error})
            if MODE=='pilot':break
    write(os.path.join(WORK,'run-'+MODE+'.json'),{'mode':MODE,'attempted':len(models),'failures':failed,'finished':True})
    log('FINISHED '+MODE)
except:
    log(traceback.format_exc());write(os.path.join(WORK,'run-'+MODE+'.json'),{'mode':MODE,'fatal':traceback.format_exc(),'finished':False})
    raise
finally:
    app.SharedParametersFilename=original_shared
