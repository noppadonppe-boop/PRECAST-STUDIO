# -*- coding: utf-8 -*-
"""P103 ONE architectural pilot. Run inside licensed Revit 2026 via pyRevit CLI."""
import clr, os, json, math, codecs, traceback, shutil, hashlib
clr.AddReference('RevitAPI')
from Autodesk.Revit import DB
from System import Int64
from System.Collections.Generic import List
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
OUT=os.path.join(ROOT,'deliverables','PM_ARC_P61_Pilot','PM-I-B3')
WORK=os.path.join(ROOT,'output','revit-p61')
REF=os.path.join(OUT,'References'); LIB=os.path.join(OUT,'Families')
for folder in [OUT,WORK,REF,LIB,os.path.join(REF,'Baseline')]:
    if not os.path.isdir(folder):os.makedirs(folder)
app=__revit__.Application
def log(s):
    with codecs.open(os.path.join(WORK,'build.log'),'a','utf8') as f:f.write(unicode(s)+'\n')
def write(path,obj):
    with codecs.open(path,'w','utf8') as f:f.write(json.dumps(obj,indent=2,ensure_ascii=False))
def mm(v):return float(v)/304.8
def pt(x,y,z=0):return DB.XYZ(mm(x),mm(y),mm(z))
def name(e):return DB.Element.Name.GetValue(e)
def setp(e,b,v):
    p=e.get_Parameter(b)
    if p and not p.IsReadOnly:p.Set(v)
def save(d,p):
    o=DB.SaveAsOptions();o.OverwriteExistingFile=True;o.MaximumBackups=1;d.SaveAs(p,o)
def sha(p):
    with open(p,'rb') as f:return hashlib.sha256(f.read()).hexdigest()
def material(d,n,col,trans=0):
    m=next((e for e in DB.FilteredElementCollector(d).OfClass(DB.Material) if name(e)==n),None)
    if m is None:m=d.GetElement(DB.Material.Create(d,n))
    m.Color=DB.Color(*col);m.Transparency=trans
    return m
MATS={
 'oak':('JN-01 Warm timber laminate',(161,111,63),0),
 'deck':('DK-01 Exterior timber board',(142,96,52),0),
 'black':('MT-01 Black coated metal',(35,40,42),0),
 'glass':('GL-01 Safety glazing proposed',(147,187,193),65),
 'stone':('CT-01 Washable compact worktop',(223,216,199),0),
 'tile':('FL-01 Slip-resistant porcelain',(196,185,164),0),
 'white':('EQ-01 Neutral equipment finish',(231,232,226),0),
 'steel':('SN-01 Stainless steel',(162,173,178),0),
 'blue':('MEP-01 Water location',(36,125,191),0),
 'amber':('MEP-02 Electrical location',(230,158,38),0),
 'green':('LS-01 Plant illustration',(76,109,67),0),
 'ground':('SITE-01 Illustrative ground plane',(211,204,184),0)}
rows=[]; mepids=[]; families={}; family_audit=[]
def B(x,y,z,w,l,h,mat):return ['box',x,y,z,w,l,h,mat]
def C(x,y,z,r,h,mat):return ['cyl',x,y,z,r,h,mat]
def family(tag,cat,parts,desc):
    fd=app.NewFamilyDocument(r'C:\ProgramData\Autodesk\RVT 2026\Family Templates\English\Metric Generic Model.rft')
    try:
        t=DB.Transaction(fd,tag);t.Start()
        fd.OwnerFamily.FamilyCategory=fd.Settings.Categories.get_Item(cat)
        fm=fd.FamilyManager;fm.NewType('P103'); mats={}
        for key in set(p[-1] for p in parts):
            n,col,tr=MATS[key];mats[key]=material(fd,n,col,tr)
        for j,p in enumerate(parts):
            arr=DB.CurveArray();z=p[3]
            if p[0]=='box':
                _,x,y,z,w,l,h,mat=p;points=[pt(x,y,z),pt(x+w,y,z),pt(x+w,y+l,z),pt(x,y+l,z)]
                for k in range(4):arr.Append(DB.Line.CreateBound(points[k],points[(k+1)%4]))
            else:
                _,x,y,z,r,h,mat=p
                arr.Append(DB.Arc.Create(pt(x+r,y,z),pt(x-r,y,z),pt(x,y+r,z)))
                arr.Append(DB.Arc.Create(pt(x-r,y,z),pt(x+r,y,z),pt(x,y-r,z)))
            ca=DB.CurveArrArray();ca.Append(arr)
            sp=DB.SketchPlane.Create(fd,DB.Plane.CreateByNormalAndOrigin(DB.XYZ.BasisZ,pt(0,0,z)))
            e=fd.FamilyCreate.NewExtrusion(True,ca,sp,mm(h));setp(e,DB.BuiltInParameter.MATERIAL_ID_PARAM,mats[mat].Id)
            fp=fm.AddParameter('Part_%02d_Height'%(j+1),DB.GroupTypeId.Geometry,DB.SpecTypeId.Length,False)
            fm.AssociateElementParameterToFamilyParameter(e.get_Parameter(DB.BuiltInParameter.EXTRUSION_END_PARAM),fp);fm.Set(fp,mm(h))
        setp(fd.OwnerFamily,DB.BuiltInParameter.ALL_MODEL_DESCRIPTION,desc)
        t.Commit();path=os.path.join(LIB,tag+'.rfa');save(fd,path)
        family_audit.append({'family':tag,'nativeExtrusions':len(parts),'editability':'Move/rotate/copy instances; edit extrusion sketches and Part_N_Height type parameters; not fully parametric width/depth','path':'Families/'+tag+'.rfa'})
        return path
    finally:fd.Close(False)
def rect(x,y,w,l,z=0):
    points=[pt(x,y,z),pt(x+w,y,z),pt(x+w,y+l,z),pt(x,y+l,z)];cl=DB.CurveLoop()
    for i in range(4):cl.Append(DB.Line.CreateBound(points[i],points[(i+1)%4]))
    return cl
def fingerprint(d):
    res=[]
    for e in DB.FilteredElementCollector(d).WhereElementIsNotElementType():
        q=e.LookupParameter('PM_Package')
        if not q or q.AsString()!='MOD':continue
        bb=e.get_BoundingBox(None)
        p=e.LookupParameter('PM_InstanceId')
        res.append({'id':p.AsString(),'uniqueId':e.UniqueId,'type':str(e.GetType()),'bb':[round(v*304.8,6) for v in [bb.Min.X,bb.Min.Y,bb.Min.Z,bb.Max.X,bb.Max.Y,bb.Max.Z]],'volume':e.LookupParameter('PM_ConcreteVolumeM3').AsDouble()})
    return sorted(res,key=lambda r:r['id'])
doc=None
try:
    log('START P103 '+app.VersionBuild)
    source=os.path.join(ROOT,'deliverables','PM_Revit_48_P6','PM-I-B3','PM-I-B3_R2026_P01.rvt')
    sourcehash=sha(source)
    baseline=os.path.join(REF,'Baseline',os.path.basename(source));shutil.copy2(source,baseline)
    sd=app.OpenDocumentFile(source)
    before=fingerprint(sd)
    oldarc=[]
    for e in DB.FilteredElementCollector(sd).WhereElementIsNotElementType():
        q=e.LookupParameter('PM_Package')
        if q and q.AsString()=='ARC':oldarc.append(e.Id)
    st=DB.Transaction(sd,'P103 reference: remove superseded ARC placeholders ONLY');st.Start()
    sd.Delete(List[DB.ElementId](oldarc));st.Commit()
    after=fingerprint(sd)
    if before!=after or len(before)!=14:raise Exception('Structural reference fingerprint changed')
    strpath=os.path.join(REF,'PM-I-B3_STR_Coordination_R2026_P103.rvt');save(sd,strpath);sd.Close(False)
    # Inspect actual supplied cafe RVT without saving it.
    cr=os.path.join(ROOT,'Picture Stock','PPE_Engineering_Precast_Cafe_R2026.rvt')
    rd=app.OpenDocumentFile(cr)
    reference={'path':cr,'sha256':sha(cr),'title':rd.Title,'nativeWalls':DB.FilteredElementCollector(rd).OfClass(DB.Wall).GetElementCount(),'nativeRoofs':DB.FilteredElementCollector(rd).OfClass(DB.RoofBase).GetElementCount(),'use':'Style/delivery reference ONLY; legacy dimensions and concrete material not adopted'}
    rd.Close(False);write(os.path.join(WORK,'reference-inspection.json'),reference)
    log('SOURCE PASS: 14 structural elements unchanged; '+str(len(oldarc))+' superseded ARC placeholders removed in derived reference only')
    # Native editable loadable families, with individual component materials.
    fpaths={}
    def fam(n,cat,parts,desc):fpaths[n]=family(n,cat,parts,desc)
    furniture=DB.BuiltInCategory.OST_Furniture
    fam('P61_Table_R650',furniture,[C(0,0,715,325,35,'oak'),C(0,0,40,38,675,'black'),C(0,0,0,210,40,'black')],'Round cafe table, 650 diameter x 750 high')
    chair=[B(-210,-210,420,420,420,35,'oak'),B(-210,170,455,420,35,335,'oak')]
    for x in [-175,145]:
        for y in [-170,145]:chair.append(B(x,y,0,30,30,420,'black'))
    fam('P61_Chair',furniture,chair,'Cafe chair; schematic furniture selection')
    counter=[B(0,0,90,650,2200,760,'oak'),B(-15,-15,850,680,2230,40,'stone'),B(35,35,0,580,2130,90,'black')]
    for y in [35,575,1115,1655]:counter.append(B(646,y,120,6,505,690,'oak'))
    fam('P61_Counter_650x2200',furniture,counter,'Preparation counter; open work aisle on east side')
    fam('P61_Storage_550x1000',furniture,[B(0,0,80,550,1000,780,'oak'),B(-10,-10,860,570,1020,30,'stone'),B(40,40,0,470,920,80,'black')],'Loose storage cabinet')
    fam('P61_Espresso_Placeholder',DB.BuiltInCategory.OST_SpecialityEquipment,[B(0,0,0,430,620,350,'black'),B(415,20,90,30,580,25,'steel'),B(420,40,320,30,540,20,'steel')],'Coffee machine reservation only; model and electrical/water demand TBD')
    # Frame clearances: 10mm perimeter installation gaps, all within existing openings.
    def glazed(w,h):
        return [['box',10,0,0,40,70,h],['box',w-50,0,0,40,70,h],['box',50,0,h-40,w-100,70,40],['box',50,0,0,w-100,70,40],['box',50,28,40,w-100,12,h-80]]
    def frameparts(w,h):
        out=[]
        for j,v in enumerate(glazed(w,h)):out.append(v+['glass' if j==4 else 'black'])
        return out
    fam('P61_Window_900x1200',DB.BuiltInCategory.OST_Windows,frameparts(900,1180),'4 windows in unchanged 900x1200 rough openings; frame outer 880x1180; glass operation to architect')
    dp=frameparts(1000,2080)+[B(860,-22,850,18,22,300,'black')]
    fam('P61_Door_1000x2100',DB.BuiltInCategory.OST_Doors,dp,'Glazed door in unchanged 1000x2100 rough opening. Clear passage approx900; hardware/egress not certified')
    fam('P61_Awning_1100',DB.BuiltInCategory.OST_GenericModel,[B(0,0,0,650,1100,40,'oak'),B(0,80,-70,600,35,60,'black'),B(0,985,-70,600,35,60,'black')],'Canopy schematic support; no approved concrete drilling or bracket design')
    fam('P61_ServiceShelf_900',furniture,[B(0,0,0,300,900,35,'oak'),B(0,90,-100,230,30,100,'black'),B(0,780,-100,230,30,100,'black')],'External window shelf; anchors pending coordination')
    fam('P61_DeckFront',DB.BuiltInCategory.OST_GenericModel,[B(i*146,0,0,140,1500,28,'deck') for i in range(31)],'Timber decking 28mm; framing and support separately designed')
    fam('P61_DeckSide',DB.BuiltInCategory.OST_GenericModel,[B(i*146,0,0,140,6000,28,'deck') for i in range(10)],'Side deck board layout; framing and supports not engineered')
    fam('P61_Step',DB.BuiltInCategory.OST_GenericModel,[B(0,0,0,1200,300,28,'deck'),B(0,0,-122,1200,25,122,'deck'),B(0,275,-122,1200,25,122,'deck')],'Entry step schematic enclosure; foundation and accessible approach TBD')
    support=[]
    for y in range(-1450,0,450):
        support.append(B(40,y,57,4420,50,100,'black'))
        for x in [80,1480,2880,4370]:support.append(B(x,y,-115,50,50,172,'black'))
    for y in range(100,6000,450):
        support.append(B(3060,y,57,1360,50,100,'black'))
        for x in [3060,4370]:support.append(B(x,y,-115,50,50,172,'black'))
    fam('P61_DeckSupport_Reservation',DB.BuiltInCategory.OST_GenericModel,support,'Spatial support reservation ONLY; member sizes, supports and anchors NOT engineered')
    fam('P61_SiteLevel_Illustration',DB.BuiltInCategory.OST_GenericModel,[B(-250,-2050,-135,5000,8900,20,'ground')],'Illustrative site plane at-115, not survey or foundation design')
    fam('P61_Planter',furniture,[C(0,0,0,130,350,'black'),C(0,0,350,80,440,'green'),C(55,0,350,45,620,'green')],'Movable planter; illustrative planting')
    fam('P61_AC_Indoor',DB.BuiltInCategory.OST_MechanicalEquipment,[B(0,0,0,900,220,280,'white'),B(35,215,35,830,8,45,'black')],'Indoor AC preliminary location only; capacity and piping TBD')
    fam('P61_AC_Outdoor',DB.BuiltInCategory.OST_MechanicalEquipment,[B(0,0,70,800,350,570,'white'),B(30,20,0,50,310,70,'black'),B(720,20,0,50,310,70,'black')],'Outdoor AC location; ventilation/service clearances to supplier')
    fam('P61_Pendant',DB.BuiltInCategory.OST_LightingFixtures,[C(0,0,0,100,80,'black'),C(0,0,80,5,130,'black')],'Pendant position only; lumens, circuit and fixing pending')
    fam('P61_Socket',DB.BuiltInCategory.OST_ElectricalFixtures,[B(0,0,0,18,85,85,'amber')],'Power outlet location only; no circuit/cable/breaker sizing')
    fam('P61_DB',DB.BuiltInCategory.OST_ElectricalEquipment,[B(0,0,0,100,350,450,'white'),B(100,25,40,4,300,370,'amber')],'Distribution board location only; electrical ratings TBD')
    fam('P61_Sink',DB.BuiltInCategory.OST_PlumbingFixtures,[B(0,0,0,450,30,170,'steel'),B(0,470,0,450,30,170,'steel'),B(0,30,0,30,440,170,'steel'),B(420,30,0,30,440,170,'steel'),B(30,30,0,390,440,8,'steel'),C(60,430,170,12,220,'steel'),B(60,320,375,20,120,15,'steel')],'Inset sink indicative position; cabinet/worktop cutout to joinery design')
    fam('P61_WaterDrainPoint',DB.BuiltInCategory.OST_PlumbingFixtures,[C(0,0,0,28,80,'blue')],'Combined plumbing coordination point; sizes/routing/grease trap external TBD')
    log('FAMILIES BUILT '+str(len(fpaths)))
    td=app.OpenDocumentFile(os.path.join(ROOT,'deliverables','PM_Revit_48_P6','SharedLibrary','PM_PPE_A1.rfa'))
    tt=DB.Transaction(td,'ARC pilot titleblock');tt.Start()
    for note in DB.FilteredElementCollector(td).OfClass(DB.TextNote):
        note.Text=note.Text.replace('REVIT 2026 | P01','REVIT 2026 | P103').replace('DEVELOPMENT / COORDINATION | GEOMETRY P36','ARCHITECTURAL PILOT | LINKED STRUCTURE P36')
    tt.Commit();tbpath=os.path.join(LIB,'P61_PPE_A1.rfa');save(td,tbpath);td.Close(False)
    doc=app.NewProjectDocument(r'C:\ProgramData\Autodesk\RVT 2026\Templates\English\DefaultMetric.rte')
    t=DB.Transaction(doc,'P103 architectural pilot');t.Start()
    units=DB.Units(DB.UnitSystem.Metric);fo=DB.FormatOptions(DB.UnitTypeId.Millimeters);fo.Accuracy=1.;units.SetFormatOptions(DB.SpecTypeId.Length,fo);doc.SetUnits(units)
    doc.ProjectInformation.Name='PM-I-B3 | Cafe architectural pilot';doc.ProjectInformation.Number='P103 / Stage 6.1';doc.ProjectInformation.Author='PPE Engineering - architectural study'
    setp(doc.ProjectInformation,DB.BuiltInParameter.PROJECT_STATUS,'ARCHITECT REVIEW - NOT FOR CONSTRUCTION')
    for n,path in fpaths.items():
        rr=clr.Reference[DB.Family]();doc.LoadFamily(path,rr);sym=doc.GetElement(list(rr.Value.GetFamilySymbolIds())[0]);sym.Activate();families[n]=sym
    # Relative link includes a faithful geometry copy of all14 structural elements.
    lr=DB.RevitLinkType.Create(doc,DB.ModelPathUtils.ConvertUserVisiblePathToModelPath(strpath),DB.RevitLinkOptions(True))
    link=DB.RevitLinkInstance.Create(doc,lr.ElementId);link.Pinned=True
    level=DB.Level.Create(doc,mm(185));level.Name='ARC FFL +185 (slab +175 / finish 10)'
    rooflev=DB.Level.Create(doc,mm(3000));rooflev.Name='STR envelope +3000'
    mats=dict((k,material(doc,*v)) for k,v in MATS.items())
    def instance(familyname,mark,x,y,z,angle=0,group='ARC',note=''):
        e=doc.Create.NewFamilyInstance(pt(x,y,z),families[familyname],DB.Structure.StructuralType.NonStructural)
        if angle:DB.ElementTransformUtils.RotateElement(doc,e.Id,DB.Line.CreateBound(pt(x,y,z),pt(x,y,z+1000)),angle)
        setp(e,DB.BuiltInParameter.ALL_MODEL_MARK,mark);setp(e,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,group+' | '+note+' | P103 preliminary')
        rows.append({'mark':mark,'family':familyname,'group':group,'xMm':x,'yMm':y,'zMm':z,'rotationDeg':angle*180/math.pi,'note':note,'elementId':int(e.Id.Value)})
        if group=='MEP':mepids.append(e.Id)
        return e
    base=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.FloorType)))
    ft=base.Duplicate('P61 FL-01 10mm finish assembly')
    cs=ft.GetCompoundStructure();cs.SetLayers(List[DB.CompoundStructureLayer]([DB.CompoundStructureLayer(mm(10),DB.MaterialFunctionAssignment.Structure,mats['tile'].Id)]));ft.SetCompoundStructure(cs)
    for i,(a,b) in enumerate([(160,1485),(1515,2985),(3015,4485),(4515,5840)]):
        e=DB.Floor.Create(doc,List[DB.CurveLoop]([rect(170,a,2660,b-a)]),ft.Id,level.Id);setp(e,DB.BuiltInParameter.ALL_MODEL_MARK,'FL-%02d'%(i+1))
    instance('P61_Counter_650x2200','JN-01',400,3250,185,note='650x2200; height890; staff works east side')
    instance('P61_Storage_550x1000','JN-02',2150,4450,185,note='550x1000; central aisle1100 nominal')
    instance('P61_Espresso_Placeholder','EQ-01',510,4650,1075,note='Indicative coffee machine')
    instance('P61_Sink','SN-01',500,3400,1075,group='MEP',note='Countertop basin proposal; top-mounted to avoid unmodelled cutout')
    for j,y in enumerate([1350,2900]):
        instance('P61_Table_R650','TB-%02d'%(j+1),2225,y,185)
        instance('P61_Chair','CH-%02d'%(j*2+1),2225,y-560,185,math.pi)
        instance('P61_Chair','CH-%02d'%(j*2+2),2225,y+560,185)
    for j,y in enumerate([300,1800,3300,4800]):instance('P61_Window_900x1200','W%02d'%(j+1),2960,y,1085,math.pi/2,note='Rough900x1200; perimeter gap10; frame50 inset')
    for j,y in enumerate([42.5,5877.5]):instance('P61_Door_1000x2100','D%02d'%(j+1),1000,y,195,note='Rough1000x2100; perimeter gap10; proposed glazing')
    instance('P61_DeckFront','DK-01',0,-1515,157,note='Deck finished level185; 15mm separation to structure')
    instance('P61_DeckSide','DK-02',3015,0,157,note='Deck projection1454; independent support by others')
    instance('P61_DeckSupport_Reservation','DK-S01',0,0,0,note='Support space only; NOT a structural member selection')
    instance('P61_SiteLevel_Illustration','SITE-01',0,0,0,note='Illustrative ground -115; not surveyed')
    instance('P61_Step','ST-01',900,-1815,7,note='Tread top35; provisional ground -115; two150 rises; access design pending')
    for j,y in enumerate([3200,4700]):
        instance('P61_Awning_1100','AW-%02d'%(j+1),3010,y,2330,note='Clear of opening head; bracket fixing TBD')
        instance('P61_ServiceShelf_900','SH-%02d'%(j+1),3010,y+100,1040)
    for j,y in enumerate([900,2550]):
        instance('P61_Table_R650','OT-%02d'%(j+1),3790,y,185)
        instance('P61_Chair','OC-%02d'%(j*2+1),3790,y-550,185,math.pi)
        instance('P61_Chair','OC-%02d'%(j*2+2),3790,y+550,185)
    for j,(x,y) in enumerate([(450,-900),(4070,-1050),(4100,5700)]):instance('P61_Planter','PL-%02d'%(j+1),x,y,185)
    instance('P61_AC_Indoor','AC-I01',1050,180,2370,group='MEP',note='Above front door; supply to +Y; capacity and condensate route TBD')
    instance('P61_AC_Outdoor','AC-O01',3200,6200,-45,group='MEP',note='Rear external proposed location; pad not engineered')
    for j,y in enumerate([1250,2800,4400]):instance('P61_Pendant','LT-%02d'%(j+1),1500,y,2590,group='MEP',note='Decorative lighting position; circuits and hanger fixing TBD')
    for j,(x,y,z) in enumerate([(165,1250,485),(165,3400,1385),(165,4850,1385),(2720,5100,1185)]):instance('P61_Socket','SO-%02d'%(j+1),x,y,z,group='MEP',note='Indicative outlet; protection and load schedule not designed')
    instance('P61_DB','DB-01',175,5450,1185,group='MEP',note='Maintain working access; utility route via coordinated interface only')
    instance('P61_WaterDrainPoint','WP-01',1150,3450,230,group='MEP',note='Water/waste coordination ONLY; no structural penetration generated')
    t.Commit();log('ARC GEOMETRY CREATED')
    t=DB.Transaction(doc,'Architecture views schedules and sheets');t.Start()
    vf=list(DB.FilteredElementCollector(doc).OfClass(DB.ViewFamilyType))
    def vft(f):return next(x for x in vf if x.ViewFamily==f)
    def style(v,scale=25):
        v.Scale=scale;v.DetailLevel=DB.ViewDetailLevel.Fine;v.DisplayStyle=DB.DisplayStyle.HLR
        for cat in [DB.BuiltInCategory.OST_Levels,DB.BuiltInCategory.OST_Grids,DB.BuiltInCategory.OST_Sections,DB.BuiltInCategory.OST_Elev]:
            try:v.SetCategoryHidden(DB.ElementId(cat),True)
            except:pass
    baseText=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.TextNoteType)));texts={}
    def text(v,x,y,s,size=3,width=0):
        if size not in texts:
            tt=baseText.Duplicate('P61 Arial '+str(size));setp(tt,DB.BuiltInParameter.TEXT_SIZE,mm(size));setp(tt,DB.BuiltInParameter.TEXT_FONT,'Arial');texts[size]=tt
        o=DB.TextNoteOptions(texts[size].Id)
        if width:return DB.TextNote.Create(doc,v.Id,pt(x,y),mm(width),s,o)
        return DB.TextNote.Create(doc,v.Id,pt(x,y),s,o)
    def dim(v,vals,pos,axis):
        refs=DB.ReferenceArray()
        for q in vals:
            a,b=(pt(q,pos-40),pt(q,pos+40)) if axis=='x' else (pt(pos-40,q),pt(pos+40,q))
            c=doc.Create.NewDetailCurve(v,DB.Line.CreateBound(a,b));refs.Append(c.GeometryCurve.Reference)
        a,b=(pt(vals[0],pos),pt(vals[-1],pos)) if axis=='x' else (pt(pos,vals[0]),pt(pos,vals[-1]))
        return doc.Create.NewDimension(v,DB.Line.CreateBound(a,b),refs)
    plans=[]
    for n in ['ARC A101 Furniture and finishes','ARC A401 MEP preliminary positions']:
        v=DB.ViewPlan.Create(doc,vft(DB.ViewFamily.FloorPlan).Id,level.Id);v.Name=n;style(v)
        vr=v.GetViewRange()
        for key,off in [(DB.PlanViewPlane.TopClipPlane,2900),(DB.PlanViewPlane.CutPlane,1200),(DB.PlanViewPlane.BottomClipPlane,-400),(DB.PlanViewPlane.ViewDepthPlane,-400)]:vr.SetLevelId(key,level.Id);vr.SetOffset(key,mm(off))
        v.SetViewRange(vr)
        bb=DB.BoundingBoxXYZ();bb.Min=pt(-1200,-2300,-500);bb.Max=pt(5200,7200,3600);v.CropBox=bb;v.CropBoxActive=True;v.CropBoxVisible=False
        dim(v,[0,3000],-2050,'x');dim(v,[0,1500,3000,4500,6000],-450,'y');dim(v,[0,6000],-900,'y')
        plans.append(v)
    # Furniture plan hides MEP markers except sink and visible pendants; MEP plan uses position callouts.
    hidden=[DB.ElementId(Int64(r['elementId'])) for r in rows if r['mark'].startswith(('SO','WP','DB','AC','LT','SITE','DK-S'))]
    plans[0].HideElements(List[DB.ElementId](hidden))
    plans[1].HideElements(List[DB.ElementId]([DB.ElementId(Int64(r['elementId'])) for r in rows if r['mark'].startswith(('SITE','DK-S'))]))
    for mark,x,y in [('JN-01',600,4250),('JN-02',2200,4300),('TB-01',1900,1300),('TB-02',1900,2880),('D01',1250,-200),('D02',1250,6200),('FL-01',700,2400)]:text(plans[0],x,y,mark,2.5)
    # Native room enclosed by explicit ARC study boundaries, independent of link room-bounding settings.
    sk=DB.SketchPlane.Create(doc,DB.Plane.CreateByNormalAndOrigin(DB.XYZ.BasisZ,pt(0,0,185)))
    boundary=DB.CurveArray()
    for c in rect(170,160,2660,5680,185):boundary.Append(c)
    doc.Create.NewRoomBoundaryLines(sk,boundary,plans[0]);room=doc.Create.NewRoom(level,DB.UV(mm(1500),mm(3000)))
    room.Number='CF-01';setp(room,DB.BuiltInParameter.ROOM_NAME,'Cafe - seating and preparation')
    for r in rows:
        if r['group']=='MEP':
            # Circle location markers are deliberate drafting symbols, not routes or calculated systems.
            v=plans[1];x,y=r['xMm'],r['yMm'];radius=100
            for a,b,c in [(pt(x+radius,y),pt(x-radius,y),pt(x,y+radius)),(pt(x-radius,y),pt(x+radius,y),pt(x,y-radius))]:doc.Create.NewDetailCurve(v,DB.Arc.Create(a,b,c))
            text(v,x+130,y+120,r['mark'],2)
    def section(n,origin,right,direction,w,depth):
        tr=DB.Transform.Identity;tr.Origin=pt(*origin);tr.BasisX=DB.XYZ(*right);tr.BasisY=DB.XYZ.BasisZ;tr.BasisZ=DB.XYZ(*direction)
        b=DB.BoundingBoxXYZ();b.Transform=tr;b.Min=pt(-w/2-200,-350,0);b.Max=pt(w/2+200,3200,depth)
        v=DB.ViewSection.CreateSection(doc,vft(DB.ViewFamily.Section).Id,b);v.Name=n;style(v,30);v.CropBoxVisible=False;return v
    elev=[section('ARC Front elevation',[2250,-2300,0],[-1,0,0],[0,1,0],4800,9300),section('ARC Side elevation',[5200,2400,0],[0,-1,0],[-1,0,0],9000,6000)]
    sections=[section('ARC Transverse section',[1500,4400,0],[1,0,0],[0,-1,0],3400,300),section('ARC Longitudinal section',[1700,2400,0],[0,1,0],[1,0,0],9000,3000)]
    doc.Regenerate()
    def vdim(v,worldpoints,position,axis):
        def loc(p):
            delta=p-v.Origin;return [delta.DotProduct(v.RightDirection),delta.DotProduct(v.UpDirection)]
        def wp(a,b):return v.Origin+v.RightDirection.Multiply(a)+v.UpDirection.Multiply(b)
        vals=sorted(loc(p)[0 if axis=='x' else 1] for p in worldpoints);pos=loc(position)[1 if axis=='x' else 0];refs=DB.ReferenceArray()
        for q in vals:
            a,b=(wp(q,pos-mm(35)),wp(q,pos+mm(35))) if axis=='x' else (wp(pos-mm(35),q),wp(pos+mm(35),q))
            c=doc.Create.NewDetailCurve(v,DB.Line.CreateBound(a,b));refs.Append(c.GeometryCurve.Reference)
        a,b=(wp(vals[0],pos),wp(vals[-1],pos)) if axis=='x' else (wp(pos,vals[0]),wp(pos,vals[-1]))
        return doc.Create.NewDimension(v,DB.Line.CreateBound(a,b),refs)
    for v in elev+sections:
        if abs(v.RightDirection.X)>.5:
            vdim(v,[pt(0,0,0),pt(3000,0,0)],pt(0,0,-260),'x')
            vdim(v,[pt(0,0,0),pt(0,0,3000)],pt(3200,0,0),'y')
        else:
            vdim(v,[pt(0,0,0),pt(0,6000,0)],pt(0,0,-260),'x')
            vdim(v,[pt(0,0,0),pt(0,0,3000)],pt(0,6400,0),'y')
    axos=[]
    for n,cut in [('ARC 3D Exterior',False),('ARC 3D Interior cutaway',True)]:
        v=DB.View3D.CreateIsometric(doc,vft(DB.ViewFamily.ThreeDimensional).Id);v.Name=n;style(v,30 if cut else 20);v.DisplayStyle=DB.DisplayStyle.ShadingWithEdges
        forward=DB.XYZ(-1,1,-.8 if not cut else -1.45).Normalize();right=forward.CrossProduct(DB.XYZ.BasisZ).Normalize();up=right.CrossProduct(forward).Normalize();v.SetOrientation(DB.ViewOrientation3D(pt(10500,-7000,9000),up,forward))
        bb=DB.BoundingBoxXYZ();bb.Min=pt(-300,-2100,-200);bb.Max=pt(4800,6900,3100 if not cut else 1450);v.SetSectionBox(bb)
        if cut:v.HideElements(List[DB.ElementId]([DB.ElementId(Int64(r['elementId'])) for r in rows if r['mark'].startswith(('AW','SO','WP','DB','AC','LT'))]))
        axos.append(v)
    # Native schedules, editable and updated from instance marks/comments.
    schedules=[]
    for cat,n in [(DB.BuiltInCategory.OST_Furniture,'ARC Furniture'),(DB.BuiltInCategory.OST_Doors,'ARC Doors'),(DB.BuiltInCategory.OST_Windows,'ARC Windows'),(DB.BuiltInCategory.OST_MechanicalEquipment,'ARC AC locations')]:
        vs=DB.ViewSchedule.CreateSchedule(doc,DB.ElementId(cat));vs.Name=n
        for b,label,w in [(DB.BuiltInParameter.ALL_MODEL_MARK,'Mark',22),(DB.BuiltInParameter.ELEM_FAMILY_AND_TYPE_PARAM,'Family / Type',98)]:
            f=vs.Definition.AddField(DB.ScheduleFieldType.Instance,DB.ElementId(b));f.ColumnHeading=label;f.GridColumnWidth=mm(w)
        schedules.append(vs)
    rr=clr.Reference[DB.Family]();doc.LoadFamily(tbpath,rr);tb=doc.GetElement(list(rr.Value.GetFamilySymbolIds())[0])
    sheets=[];placements=[]
    def sheet(num,n):
        s=DB.ViewSheet.Create(doc,tb.Id);s.SheetNumber=num;s.Name=n
        text(s,24,568,num+' | '+n.upper(),5,780)
        text(s,548,38,'PM-I-B3 | ARC P103',4,175);text(s,727,37,num,5,90)
        text(s,24,68,'ARCHITECTURAL PILOT - FOR REVIEW / NOT FOR CONSTRUCTION | MEP POSITIONS ONLY',2.5,780)
        sheets.append(s);return s
    def place(s,v,x,y):
        vp=DB.Viewport.Create(doc,s.Id,v.Id,pt(x,y));setp(doc.GetElement(vp.GetTypeId()),DB.BuiltInParameter.VIEWPORT_ATTR_SHOW_LABEL,0);placements.append((vp,x,y));return vp
    s=sheet('A001','Cafe architectural proposal');place(s,axos[0],290,330)
    text(s,565,520,'I-B3 / CURVED ROOF CAFE\n18 m2 nominal structural footprint\n3000 x 6000 x 3000 mm\n4 standard bays @1500 mm\n\nWarm timber + black metal\nExposed precast shell\n4 side windows; 2 glazed doors\n4 indoor + 4 outdoor seats shown\nSeat count is layout, not occupancy approval.',3.5,245)
    text(s,565,330,'SEPARATE ARC + LINKED STRUCTURE\nP6 concrete geometry unchanged.\nOld ARC placeholders replaced in\na derived coordination reference.\nOriginal RVT included in References/Baseline.\n\nReference cafe image is style only.\nNo full-glazed arch or new concrete holes.',3,245)
    s=sheet('A101','Furniture and finishes plan');place(s,plans[0],300,320)
    text(s,565,525,'PLAN BASIS / ALL DIMENSIONS mm\nFFL +185 = slab175 + finish10\nInternal floor finish approx15.0 m2\nCounter JN-01: 650 x 2200\nStorage JN-02: 550 x 1000\nCentral aisle at counter:1100 nominal\n\nFL-01 porcelain / movement joints\nJN-01 timber laminate joinery\nCT-01 washable worktop\nDK-01 exterior timber decking\nGL-01 safety glass / black frames\n\nNo internal WC: external shared WC\nrequired; accessible approach pending.\nDeck/support/site levels are proposals.',3,245)
    s=sheet('A201','Front and side elevations');place(s,elev[0],225,345);place(s,elev[1],605,345)
    text(s,30,150,'Front / Side | 1:30\nStructural envelope +3000; slab top +175; proposed FFL/deck +185. Windows rough900x1200, sill+1075, head+2275.\nDoors rough1000x2100, base+185, head+2285. Canopy and shelf support details remain design tasks.',3,770)
    s=sheet('A301','Sections and interior cutaway');place(s,sections[0],195,405);place(s,sections[1],585,405);place(s,axos[1],265,210)
    text(s,555,225,'INTERIOR CUTAWAY\nHorizontal clipping at +1450\nfor furniture arrangement only.\nRoof remains intact in linked model.\n\nNo suspended ceiling proposed.\nRoof insulation / condensation /\nwaterproofing interfaces require\narchitect + engineer coordination.',3,240)
    s=sheet('A401','MEP location coordination');place(s,plans[1],300,320)
    text(s,565,525,'LOCATION STUDY - NO SYSTEM DESIGN\nAC-I01: above front door\nAC-O01: external rear area\nLT-01..03: decorative light positions\nSO-01..04: outlet proposals\nDB-01: rear distribution board\nSN-01: countertop basin\nWP-01: water / waste interface zone\n\nNo BTU, cable, breaker or pipe sizes.\nNo routes or concrete penetrations.\nNo fire/egress/accessibility certification.\nCoordinate power, condensate, ventilation,\nwaterproofing and external grease trap.\nAll final duties by discipline designers.',3,245)
    s=sheet('A601','Furniture openings and equipment')
    for vs,x,y in [(schedules[0],30,525),(schedules[1],350,525),(schedules[2],350,400),(schedules[3],350,230)]:DB.ScheduleSheetInstance.Create(doc,s.Id,vs.Id,pt(x,y))
    text(s,530,510,'OPENING BASIS\nD01/D02: concrete1000x2100\nFrame outer980x2080\nWindow W01..04:900x1200\nFrame outer880x1180\n10mm installation allowance\nperimeter, subject to supplier.\n\nFamilies are non-hosted to avoid\naltering linked precast. Moving a\nfamily does NOT move the opening.\nRecheck alignment after editing.',3,275)
    s=sheet('A701','Unbranded outline specifications')
    text(s,30,525,'FINISH / MATERIAL PROPOSALS\n\nFL-01  Slip-resistant porcelain finish assembly, total10mm study allowance; confirm substrate, adhesive and joint build-up.\nJN-01  Moisture-resistant joinery substrate with timber-look washable laminate; seal all edges and wet interfaces.\nCT-01  Non-porous washable worktop; food-contact suitability and cleaning performance to be confirmed.\nDK-01  Exterior durable timber boards28mm with6mm gaps; slip resistance and corrosion-resistant fasteners.\nMT-01  Black coated metal frames; coating exposure class, profiles and fixings by supplier.\nGL-01  Safety glazing to doors/windows; pane thickness and support design not selected.\nPC-01  Exposed existing precast; surface preparation/sealer and repair method subject to architect review.\nWP-01  Roof/joint waterproofing system to coordinate without blocking movement; not fully detailed in pilot.\n\nSERVICES / FITOUT\nIndoor/outdoor AC locations, lighting and electrical points, basin and water/waste interface are spatial reservations.\nMechanical duties, equipment loads, wiring, protection, pipe sizing, traps, drainage fall and ventilation are NOT designed.\nShared external WC is required by source concept and is outside this one-unit pilot.\n\nENGINEERING HANDOFF\nAdded finishes, furniture, deck, canopies and equipment are not part of Stage6 structural verification.\nConfirm dead/live loads, supports, anchors and service openings before construction. Nothing here releases fabrication.\n\nMODEL / REFERENCE CONTROL\nP103 ARC is separate; linked geometry contains unchanged14 precast instances from P6/P36.\nPackaged baseline original retained; derived reference removes only10 superseded ARC placeholders.\nFamilies: native editable extrusion sketches + Part_N_Height parameters; not fully width/depth parametric.\nDimensions are reference-coordinate witness dimensions; recheck after architectural modifications.',3.5,775)
    doc.Regenerate()
    for vp,x,y in placements:vp.SetBoxCenter(pt(x,y))
    t.Commit()
    rvt=os.path.join(OUT,'PM-I-B3_ARC_R2026_P103.rvt');save(doc,rvt);doc.Close(False);doc=app.OpenDocumentFile(rvt)
    actualLink=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.RevitLinkInstance)))
    ld=actualLink.GetLinkDocument()
    if ld is None:raise Exception('Link not loaded after native reopen')
    if fingerprint(ld)!=before:raise Exception('Linked structural fingerprints mismatch')
    transform=actualLink.GetTotalTransform()
    if transform.Origin.GetLength()>1e-8:raise Exception('Link origin shifted')
    nativeSheets=sorted(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet),key=lambda s:s.SheetNumber)
    pdf=DB.PDFExportOptions();pdf.Combine=True;pdf.FileName='PM-I-B3_ARC_A1_P103';pdf.PaperFormat=DB.ExportPaperFormat.Default
    ok=doc.Export(OUT,List[DB.ElementId]([s.Id for s in nativeSheets]),pdf)
    if not ok:raise Exception('PDF export failed')
    pngviews=[]
    for vn,suffix in [('ARC 3D Exterior','Exterior'),('ARC 3D Interior cutaway','Interior'),('ARC A101 Furniture and finishes','Plan'),('ARC A401 MEP preliminary positions','MEP')]:
        v=next(v for v in DB.FilteredElementCollector(doc).OfClass(DB.View) if v.Name==vn)
        o=DB.ImageExportOptions();o.ExportRange=DB.ExportRange.SetOfViews;o.SetViewsAndSheets(List[DB.ElementId]([v.Id]));o.FilePath=os.path.join(OUT,suffix);o.HLRandWFViewsFileType=DB.ImageFileType.PNG;o.ShadowViewsFileType=DB.ImageFileType.PNG;o.ImageResolution=DB.ImageResolution.DPI_150;o.ZoomType=DB.ZoomFitType.FitToPage;o.PixelSize=2400;doc.ExportImage(o);pngviews.append(vn)
    ext=doc.GetElement(actualLink.GetTypeId()).GetExternalFileReference()
    qa={'productId':'PM-I-B3','revision':'P103','stage':'6.1 PILOT ONLY','nativeSavedReopened':True,'revitBuild':app.VersionBuild,'sourceSha256':sourcehash,'sourceUnchanged':sha(source)==sourcehash,'linkedStructureCount':len(before),'structureFingerprintMatch':True,'linkLoaded':True,'linkPathType':str(ext.PathType),'linkOriginMm':[transform.Origin.X*304.8,transform.Origin.Y*304.8,transform.Origin.Z*304.8],'removedOldArcPlaceholders':len(oldarc),'arcFamilyInstances':len(rows),'nativeFloorFinishCount':4,'loadableFamilyTypes':len(family_audit),'pdfExport':ok,'sheets':[s.SheetNumber for s in nativeSheets],'imageViews':pngviews,'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()],'visualReview':'PENDING','relocatedPackageTest':'PENDING','engineeringApproved':False,'productionReleased':False,'full48Authorized':False}
    write(os.path.join(OUT,'QA_P103.json'),qa);write(os.path.join(OUT,'ARC_ItemRegister_P103.json'),rows);write(os.path.join(OUT,'FamilyLibrary_P103.json'),family_audit);write(os.path.join(WORK,'structural-fingerprint.json'),before)
    doc.Close(False);doc=None;log('NATIVE PILOT COMPLETE')
except:
    log(traceback.format_exc())
    if doc:
        try:
            if doc.IsModifiable:t.RollBack()
            doc.Close(False)
        except:pass
    raise
