# -*- coding: utf-8 -*-
"""PPE cafe: native Revit architectural concept, independent new document."""
import os, math, json, traceback, codecs
import clr
from System.Collections.Generic import List
from pyrevit import DB, revit

ROOT = r'E:\1.0 Project GPT Work\Precast-Module'
OUT = os.path.join(ROOT, 'deliverables', 'PPE_Senior_Home')
if not os.path.isdir(OUT): os.makedirs(OUT)
LOG = os.path.join(OUT, "build-log.txt")
def log(s):
    with codecs.open(LOG, 'a', 'utf-8') as f: f.write(str(s) + '\n')
def m(v): return v / 0.3048
def p(x,y,z=0): return DB.XYZ(m(x),m(y),m(z))
def eid(b): return DB.ElementId(b)
def li(a,b): return DB.Line.CreateBound(a,b)
def name(e): return DB.Element.Name.GetValue(e)
def setp(e,b,v):
    q=e.get_Parameter(b)
    if q and not q.IsReadOnly: q.Set(v)
def meta(e,mark,desc):
    setp(e,DB.BuiltInParameter.ALL_MODEL_MARK,mark)
    setp(e,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,desc)
    return e
def rect(x0,y0,x1,y1,z=0):
    pts=[p(x0,y0,z),p(x1,y0,z),p(x1,y1,z),p(x0,y1,z)]
    c=DB.CurveLoop()
    for i in range(4): c.Append(li(pts[i],pts[(i+1)%4]))
    return c
def solid_box(x,y,z,dx,dy,dz,mat):
    return DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([rect(x,y,x+dx,y+dy,z)]),DB.XYZ.BasisZ,m(dz),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))

app=revit.doc.Application
doc=None
try:
    doc=app.NewProjectDocument(r'C:\ProgramData\Autodesk\RVT 2026\Templates\English\DefaultMetric.rte')
    tr=DB.Transaction(doc,'PPE senior home - materials and architectural model'); tr.Start()
    units=DB.Units(DB.UnitSystem.Metric)
    fo=DB.FormatOptions(DB.UnitTypeId.Millimeters); fo.Accuracy=1.0
    units.SetFormatOptions(DB.SpecTypeId.Length,fo); doc.SetUnits(units)
    info=doc.ProjectInformation
    info.Name='SENIOR LIVING PRECAST HOME'; info.Number='PPE-SH-001'
    info.ClientName='PPE Engineering'; info.BuildingName='Senior home 9600 x 5600'
    info.Author='PPE Engineering'; info.IssueDate='06 September 2026'
    setp(info,DB.BuiltInParameter.PROJECT_STATUS,'CONCEPT - FOR DESIGN REVIEW')
    setp(info,DB.BuiltInParameter.PROJECT_ORGANIZATION_NAME,'PPE Engineering')
    solidfill=next((x for x in DB.FilteredElementCollector(doc).OfClass(DB.FillPatternElement) if x.GetFillPattern().IsSolidFill),None)
    mats={}
    def material(key,n,col,trans=0,desc=''):
        a=DB.Material.Create(doc,n); e=doc.GetElement(a); e.Color=DB.Color(*col); e.Transparency=trans
        e.MaterialClass=key
        if solidfill:
            e.CutForegroundPatternId=solidfill.Id; e.CutForegroundPatternColor=DB.Color(*col)
        setp(e,DB.BuiltInParameter.ALL_MODEL_DESCRIPTION,desc)
        mats[key]=e; return e
    concrete=material('Precast','PC-01 - Structural lightweight precast - proposed',(179,175,164),0,'PROPOSED: 35 MPa / density 1800 kg/m3. Supplier and structural design to verify.')
    normal=material('Foundation','RC-01 - Reinforced concrete footing - provisional',(143,145,142),0,'PROVISIONAL substructure geometry only; geotechnical and foundation design required.')
    timber=material('Timber','WD-01 - Warm oak interior finish',(154,106,61),0,'12 mm oak veneer lining; sealed washable finish to joinery.')
    deckmat=material('Deck','WD-02 - Exterior durable timber decking',(137,94,54),0,'28 mm exterior timber boards with 6 mm gaps; corrosion-resistant fixings.')
    metal=material('Metal','AL-01 - Black powder-coated aluminium',(36,39,37),0,'Black powder-coated frames; nominal 50 x 100 mm; profiles subject to glazing supplier.')
    glass=material('Glass','GL-01 - Clear laminated safety glazing',(153,191,190),72,'Proposed 6+6 mm laminated safety glazing. Supplier to verify pane sizes, support and wind design.')
    tile=material('Tile','FL-02 - Anti-slip porcelain wet-area tile',(130,130,119),0,'10 mm slip-resistant porcelain + waterproofing to wet areas.')
    insul=material('Insulation','IN-01 - Roof mineral wool 50 mm',(212,192,130),0,'50 mm mineral wool; vapour and condensation strategy to be coordinated for actual site.')
    membrane=material('Waterproofing','WP-01 - Roof waterproof membrane',(191,188,178),0,'5 mm schematic membrane layer; flexible joints and terminations to supplier detail.')
    steel=material('Steel','ST-01 - Galvanized steel subframe',(92,97,94),0,'Provisional steel deck framing; member and connection design by engineer.')
    white=material('Ceramic','FX-01 - White sanitary ceramic',(234,232,219))
    green=material('Plant','LS-01 - Landscape foliage',(78,105,53))
    earth=material('Ground','SITE-01 - Paving - conceptual extent',(190,185,171))
    seal=material('Sealant','JT-01 - Flexible weather seal',(69,72,67),0,'Nominal 15 mm joints with backer rod and flexible sealant; structural transfer system not designed.')
    def typ(cls,n,layers):
        base=next(x for x in DB.FilteredElementCollector(doc).OfClass(cls) if (cls!=DB.WallType or x.Kind==DB.WallKind.Basic))
        t=base.Duplicate(n)
        ls=List[DB.CompoundStructureLayer]()
        for thick,fun,mat in layers: ls.Add(DB.CompoundStructureLayer(m(thick),fun,mat.Id))
        cs=t.GetCompoundStructure(); cs.SetLayers(ls); t.SetCompoundStructure(cs)
        return t
    structure=DB.MaterialFunctionAssignment.Structure
    finish=DB.MaterialFunctionAssignment.Finish1
    wt=typ(DB.WallType,'PPE - PC-01 precast wall 150 mm',[(.15,structure,concrete)])
    it=typ(DB.WallType,'PPE - Interior wet partition 100 mm',[(.01,finish,tile),(.08,structure,normal),(.01,finish,tile)])
    ft=typ(DB.FloorType,'PPE - Floor 220 - tile screed PC180',[(.01,finish,tile),(.03,finish,normal),(.18,structure,concrete)])
    fft=typ(DB.FloorType,'PPE - Oak floor finish 20 mm',[(.02,structure,timber)])
    wft=typ(DB.FloorType,'PPE - Wet area finish 20 mm',[(.02,structure,tile)])
    rt=typ(DB.RoofType,'PPE - Vault 217 mm - membrane PC insulation timber',[(.005,finish,membrane),(.12,structure,concrete),(.08,DB.MaterialFunctionAssignment.Insulation,insul),(.012,DB.MaterialFunctionAssignment.Finish2,timber)])
    dsels=[]
    markcounts={}
    def shape(n,solids,mat,cat=DB.BuiltInCategory.OST_GenericModel,mark=''):
        e=DB.DirectShape.CreateElement(doc,eid(cat)); e.Name=n.replace(':','-').replace('/','-')
        e.SetShape(List[DB.GeometryObject](solids)); e.ApplicationId='PPE Engineering'; e.ApplicationDataId=mark or n
        mk=mark or n
        markcounts[mk]=markcounts.get(mk,0)+1
        meta(e,mk+'-'+str(markcounts[mk]).zfill(2),n+' - concept geometry'); dsels.append(e); return e
    def box(n,x,y,z,dx,dy,dz,mat,cat=DB.BuiltInCategory.OST_GenericModel,mark=''):
        return shape(n,[solid_box(x,y,z,dx,dy,dz,mat)],mat,cat,mark)
    def cylinder(n,x,y,z,r,h,mat,cat=DB.BuiltInCategory.OST_GenericModel):
        loop=DB.CurveLoop(); loop.Append(DB.Arc.Create(p(x+r,y,z),p(x-r,y,z),p(x,y+r,z))); loop.Append(DB.Arc.Create(p(x-r,y,z),p(x+r,y,z),p(x,y-r,z)))
        s=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisZ,m(h),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))
        return shape(n,[s],mat,cat)
    asset=DB.StructuralAsset('PPE LC35 - PROPOSED',DB.StructuralAssetClass.Concrete)
    asset.Density=DB.UnitUtils.ConvertToInternalUnits(1800,DB.UnitTypeId.KilogramsPerCubicMeter)
    asset.ConcreteCompression=DB.UnitUtils.ConvertToInternalUnits(35,DB.UnitTypeId.Megapascals)
    concrete.StructuralAssetId=DB.PropertySetElement.Create(doc,asset).Id
    setp(info,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,'Image-based architectural concept. 9600 x 5600 envelope. Site not supplied. LC35 / 1800 kg/m3 proposed. Structural design, connections, lifting and MEP pending.')
    levs=list(DB.FilteredElementCollector(doc).OfClass(DB.Level))
    ffl=min(levs,key=lambda e:abs(e.Elevation)); ffl.Name='01 FFL +450'; ffl.Elevation=m(.45)
    ground=DB.Level.Create(doc,0); ground.Name='00 GROUND +000'
    spring=DB.Level.Create(doc,m(3.2)); spring.Name='02 VAULT SPRING +3200'
    crown=DB.Level.Create(doc,m(4.5)); crown.Name='03 VAULT CROWN +4500'
    vf=list(DB.FilteredElementCollector(doc).OfClass(DB.ViewFamilyType))
    vft=lambda f: next(e for e in vf if e.ViewFamily==f)
    plan=DB.ViewPlan.Create(doc,vft(DB.ViewFamily.FloorPlan).Id,ffl.Id); plan.Name='A101 - Floor plan and accessible route'
    bath=DB.ViewPlan.Create(doc,vft(DB.ViewFamily.FloorPlan).Id,ffl.Id); bath.Name='A401 - Bathroom and bedroom clearance plan'
    roofplan=DB.ViewPlan.Create(doc,vft(DB.ViewFamily.FloorPlan).Id,crown.Id); roofplan.Name='A102 - Roof panel layout'
    vr=roofplan.GetViewRange()
    for key,off in [(DB.PlanViewPlane.TopClipPlane,1.0),(DB.PlanViewPlane.CutPlane,.8),(DB.PlanViewPlane.BottomClipPlane,-2.0),(DB.PlanViewPlane.ViewDepthPlane,-2.0)]:
        vr.SetLevelId(key,crown.Id); vr.SetOffset(key,m(off))
    roofplan.SetViewRange(vr)
    def wall(x0,y0,x1,y1,t,h,mark,z=.45):
        e=DB.Wall.Create(doc,li(p(x0,y0),p(x1,y1)),t.Id,ffl.Id,m(h),m(z-.45),False,False)
        DB.WallUtils.DisallowWallJoinAtEnd(e,0); DB.WallUtils.DisallowWallJoinAtEnd(e,1)
        return meta(e,mark,'Concept panel or partition; dimensions / reinforcement / connections require detailed design')
    walls=[]; west=[]; north=[]
    for i in range(4):
        e=wall(.075,i*1.4+.0075,.075,(i+1)*1.4-.0075,wt,2.75,'PC-WW%02d'%(i+1)); walls.append(e); west.append(e)
        if i==1: doc.Create.NewOpening(e,p(0,1.62,2.25),p(0,2.48,2.8))
        e=wall(9.525,i*1.4+.0075,9.525,(i+1)*1.4-.0075,wt,2.8,'PC-WE%02d'%(i+1));walls.append(e)
        if i in [1,2]:doc.Create.NewOpening(e,p(9.5,i*1.4+.2,1.35),p(9.5,(i+1)*1.4-.2,2.6))
    for i in range(8):
        e=wall(i*1.2+.0075,5.525,(i+1)*1.2-.0075,5.525,wt,2.8 if i>=5 else 4.05,'PC-WN%02d'%(i+1)); walls.append(e);north.append(e)
        if i in [2,3,5,6]:doc.Create.NewOpening(e,p(i*1.2+.18,5.5,1.55),p((i+1)*1.2-.18,5.5,2.6))
    for i in range(2):walls.append(wall(i*1.2+.0075,.075,(i+1)*1.2-.0075,.075,wt,2.75,'PC-WS%02d'%(i+1)))
    # Native continuous room boundary walls; panel seams are sealed above finish level.
    part=wall(2.4,.15,2.4,5.45,it,2.7,'PT-01')
    cross=wall(.15,3.2,2.35,3.2,it,2.7,'PT-02')
    bedpart=wall(5.8,.15,5.8,5.45,it,2.7,'PT-03')
    floors=[]
    for i in range(4):
        for j in range(2):
            e=DB.Floor.Create(doc,List[DB.CurveLoop]([rect(i*2.4,j*2.8,(i+1)*2.4,(j+1)*2.8)]),ft.Id,ffl.Id)
            meta(e,'PC-F%d%d'%(i+1,j+1),'2400 x 2800 nominal bay; 180 PC + 30 screed + 10 finish. Structural panel joint below continuous topping.');floors.append(e)
    # Timber visual finish only outside the wet room, flush with the floor finish.
    for j,(a,b,c,d) in enumerate([(2.45,.15,5.75,5.45),(5.85,.15,9.45,5.45),(.15,3.25,2.35,5.45)]):
        box('FL-01 warm timber-look slip-resistant finish',a,b,.446,c-a,d-b,.004,timber,DB.BuiltInCategory.OST_Floors,'FIN-%d'%j)
    roofs=[]
    for j in range(4):
        y=j*1.4+.0075
        rp=doc.Create.NewReferencePlane(p(0,y,0),p(5.8,y,0),DB.XYZ.BasisZ,plan);rp.Name='Vault casting plane %d'%(j+1)
        ca=DB.CurveArray();ca.Append(DB.Arc.Create(p(0,y,3.2),p(5.8,y,3.2),p(2.9,y,4.5)))
        sign=1 if rp.Normal.Y>0 else -1
        r=doc.Create.NewExtrusionRoof(ca,rp,ground,rt,min(0,sign*m(1.385)),max(0,sign*m(1.385)))
        meta(r,'PC-R%02d'%(j+1),'Full 5.8 m vault concept / 1.4 m casting bay. Transport segmentation and lifting design unresolved. 15 mm joints; waterproof cover continuous.');roofs.append(r)
    flat=typ(DB.RoofType,'PPE - Flat warm roof 240 mm',[(.005,finish,membrane),(.03,finish,normal),(.12,structure,concrete),(.07,DB.MaterialFunctionAssignment.Insulation,insul),(.015,DB.MaterialFunctionAssignment.Finish2,timber)])
    ca=DB.CurveArray()
    for c in rect(5.72,-.55,9.9,5.75):ca.Append(c)
    mapping=clr.Reference[DB.ModelCurveArray](DB.ModelCurveArray())
    r=doc.Create.NewFootPrintRoof(ca,spring,flat,mapping);setp(r,DB.BuiltInParameter.ROOF_LEVEL_OFFSET_PARAM,m(.3));meta(r,'RF-05','Flat roof nominal top +3500; tapered screed/drainage design pending');roofs.append(r)
    doc.Regenerate()
    for j,e in enumerate(west):
        try:e.AddAttachment(roofs[j].Id,DB.AttachmentLocation.Top)
        except:pass
    for e in north:
        try:e.AddAttachment(roofs[3].Id if e.Location.Curve.GetEndPoint(0).X<m(5.8) else roofs[4].Id,DB.AttachmentLocation.Top)
        except:pass
    radius=(2.9**2+1.3**2)/(2*1.3);zc=4.5-radius
    def arc_z(x):return zc+math.sqrt(max(0,radius**2-(x-2.9)**2))
    def front_arch(n,y,thick,mat,x0,x1,zbot,cat):
        zm=lambda x:arc_z(x)-.20
        loop=DB.CurveLoop();loop.Append(li(p(x0,y,zbot),p(x1,y,zbot)));loop.Append(li(p(x1,y,zbot),p(x1,y,zm(x1))))
        loop.Append(DB.Arc.Create(p(x1,y,zm(x1)),p(x0,y,zm(x0)),p((x0+x1)/2,y,zm((x0+x1)/2))))
        loop.Append(li(p(x0,y,zm(x0)),p(x0,y,zbot)))
        s=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisY,m(thick),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))
        return shape(n,[s],mat,cat)
    front_arch('PC-South upper privacy infill',.025,.10,concrete,.15,2.4,2.93,DB.BuiltInCategory.OST_Walls)
    front_arch('GL-02 bedroom arched transom',.055,.012,glass,2.45,5.65,2.93,DB.BuiltInCategory.OST_Windows)
    # Glazing and frames; front living entrance uses a native wall-hosted door.
    box('GL-01 bedroom fixed glazing',2.45,.055,.5,3.2,.012,2.43,glass,DB.BuiltInCategory.OST_Windows,'W01')
    for x in [2.43,3.5,4.57,5.63]:box('Bedroom black aluminium mullion',x,.01,.45,.045,.10,arc_z(x)-.65,metal)
    for z in [.45,2.93]:box('Bedroom aluminium transom',2.43,.01,z,3.25,.10,.045,metal)
    for i in range(48):
        xa=.10+i*5.6/48;xb=.10+(i+1)*5.6/48;za=arc_z(xa)-.195;zb=arc_z(xb)-.195
        pts=[p(xa,0,za),p(xb,0,zb),p(xb,0,zb-.045),p(xa,0,za-.045)];loop=DB.CurveLoop()
        for k in range(4):loop.Append(li(pts[k],pts[(k+1)%4]))
        shape('Curved facade trim',[DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisY,m(.1),DB.SolidOptions(metal.Id,DB.ElementId.InvalidElementId))],metal)
    entrancewall=wall(5.85,.075,9.45,.075,wt,2.8,'PC-S entrance host')
    # Cut fixed glazed sidelights in solid wall, leaving real piers and door host.
    for xa,xb in [(5.97,6.42),(8.93,9.32)]:
        doc.Create.NewOpening(entrancewall,p(xa,0,.52),p(xb,0,2.8));box('Living fixed sidelight',xa,.055,.52,xb-xa,.012,2.28,glass,DB.BuiltInCategory.OST_Windows)
    def load_door(file,nm,w,h):
        fr=clr.Reference[DB.Family]();doc.LoadFamily(os.path.join(r'C:\ProgramData\Autodesk\RVT 2026\Libraries\English\US\Doors',file),fr)
        s=doc.GetElement(list(fr.Value.GetFamilySymbolIds())[0]).Duplicate(nm)
        setp(s,DB.BuiltInParameter.DOOR_WIDTH,m(w));setp(s,DB.BuiltInParameter.DOOR_HEIGHT,m(h));s.Activate();doc.Regenerate();return s
    ent=load_door('M_Door-Double-Sliding.rfa','PPE D01 sliding entrance - nominal 2400 x 2400',2.4,2.4)
    d=doc.Create.NewFamilyInstance(p(7.7,.075,.45),ent,entrancewall,ffl,DB.Structure.StructuralType.NonStructural);meta(d,'D01','2400 nominal opening; target >=1100 clear with one leaf open; flush track. Supplier verify clear width.')
    internal=load_door('M_Door-Opening.rfa','PPE D02 D03 sliding clear opening 1100 x 2200',1.1,2.2)
    for host,x,y,mk in [(part,2.4,1.15,'D02'),(bedpart,5.8,1.15,'D03')]:
        d=doc.Create.NewFamilyInstance(p(x,y,.45),internal,host,ffl,DB.Structure.StructuralType.NonStructural);meta(d,mk,'1100 clear opening with surface sliding panel shown fully open; lever/pull and soft close specified')
        box(mk+' surface sliding oak leaf - shown open',x+.06,1.73,.46,.04,1.15,2.19,timber,DB.BuiltInCategory.OST_Doors,mk+'-LEAF')
        box(mk+' sliding track',x+.05,.56,2.68,.05,2.36,.045,metal)
    util=load_door('M_Door-Single-Panel.rfa','PPE D04 utility - nominal 1000 x 2100',1.0,2.1)
    d=doc.Create.NewFamilyInstance(p(2.4,4.1,.45),util,part,ffl,DB.Structure.StructuralType.NonStructural);meta(d,'D04','Utility door nominal 1000; clear width supplier dependent')
    for i in [2,3,5,6]:
        xa=i*1.2+.18;xb=(i+1)*1.2-.18
        box('North window glass',xa,5.515,1.55,xb-xa,.012,1.05,glass,DB.BuiltInCategory.OST_Windows,'WN%d'%i)
        for z in [1.52,2.6]:box('North window horizontal frame',xa-.03,5.47,z,xb-xa+.06,.1,.04,metal)
        for x in [xa-.03,xb]:box('North window jamb',x,5.47,1.52,.03,.1,1.12,metal)
    for i in [1,2]:
        ya=i*1.4+.2
        box('East living window',9.52,ya,1.35,.012,1.,1.25,glass,DB.BuiltInCategory.OST_Windows,'WE%d'%i)
        for z in [1.32,2.6]:box('East window transom',9.47,ya-.03,z,.1,1.06,.04,metal)
        for y in [ya-.03,ya+1.]:box('East window jamb',9.47,y,1.32,.1,.03,1.32,metal)
    box('Bathroom high-level obscured glazing',.055,1.62,2.25,.012,.86,.55,glass,DB.BuiltInCategory.OST_Windows,'W05')
    # Foundation and supports are explicit schematic placeholders.
    for x in [.3,2.4,5.8,9.3]:
        for y in [.3,2.8,5.3]:
            box('RC pad - provisional',x-.4,y-.4,-.55,.8,.8,.3,normal,DB.BuiltInCategory.OST_StructuralFoundation)
            box('RC pedestal - provisional',x-.15,y-.15,-.25,.3,.3,.43,normal,DB.BuiltInCategory.OST_StructuralFoundation)
    for y in [.2,2.75,5.25]:box('Floor bearer - provisional',.05,y,.13,9.5,.15,.1,steel,DB.BuiltInCategory.OST_StructuralFraming)
    # Flush front veranda 9600 x 1800 and 1:12 straight approach along its outer edge.
    for i in range(12):box('Veranda composite non-slip deck board',0,-1.8+i*.15,.42,9.6,.145,.03,deckmat,DB.BuiltInCategory.OST_Floors,'DK')
    for x in [.15,2.4,4.8,7.2,9.35]:box('Veranda joist',x,-1.8,.27,.1,1.8,.15,steel,DB.BuiltInCategory.OST_StructuralFraming)
    box('Top ramp landing 1800 square',7.5,-3.6,.3,1.8,1.8,.15,deckmat,DB.BuiltInCategory.OST_Floors,'LAND-T')
    box('Bottom ramp landing 1800 square',.3,-3.6,-.15,1.8,1.8,.15,tile,DB.BuiltInCategory.OST_Floors,'LAND-B')
    # Ramp from x2.1,z0 to x7.5,z450, transverse width1800.
    pts=[p(2.1,-3.6,-.15),p(7.5,-3.6,.30),p(7.5,-3.6,.45),p(2.1,-3.6,0)];loop=DB.CurveLoop()
    for i in range(4):loop.Append(li(pts[i],pts[(i+1)%4]))
    shape('RA-01 accessible ramp 1:12',[DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisY,m(1.8),DB.SolidOptions(tile.Id,DB.ElementId.InvalidElementId))],tile,DB.BuiltInCategory.OST_Ramps,'RA-01')
    def rod(n,a,b,r,mat,cat=DB.BuiltInCategory.OST_GenericModel):
        a=p(*a);b=p(*b);d=(b-a).Normalize();u=d.CrossProduct(DB.XYZ.BasisZ)
        if u.GetLength()<.01:u=DB.XYZ.BasisX
        u=u.Normalize().Multiply(m(r));v=d.CrossProduct(u.Normalize()).Multiply(m(r))
        c=DB.CurveLoop();c.Append(DB.Arc.Create(a+u,a-u,a+v));c.Append(DB.Arc.Create(a-u,a+u,a-v))
        return shape(n,[DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([c]),d,a.DistanceTo(b),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))],mat,cat)
    for y in [-3.5,-1.9]:
        for h in [.7,.9]:
            rod('Ramp handrail 38 dia',(2.1,y,h),(7.5,y,.45+h),.019,metal)
            rod('Handrail lower extension',(.3,y,h),(2.1,y,h),.019,metal)
            rod('Handrail top extension',(7.5,y,.45+h),(9.25 if y<-3 else 7.8,y,.45+h),.019,metal)
        for x in [.35,1.4,2.1,3.45,4.8,6.15,7.5,8.6,9.2]:
            if y>-3 and x>7.8:continue
            z=max(0,min(.45,(x-2.1)/12));rod('Ramp handrail post',(x,y,z),(x,y,z+.91),.022,metal)
        # edge protection at each open ramp side follows the ramp pitch
        rod('Ramp 100 high wheel edge rail',(2.1,y,.06),(7.5,y,.51),.05,metal)
    # Front guardrail leaves the top landing route open at x7.5..9.3.
    for x in [.1,1.3,2.5,3.7,4.9,6.1,7.3]:rod('Veranda guard post',(x,-1.72,.45),(x,-1.72,1.55),.025,metal)
    for h in [.8,1.1]:rod('Veranda guard rail',(.1,-1.72,.45+h),(7.3,-1.72,.45+h),.02,metal)
    for x in [.1,9.5]:
        rod('Veranda side guard',(x,-1.72,1.55),(x,-.1,1.55),.02,metal)
    # Warm, uncluttered home interior.
    furn=DB.BuiltInCategory.OST_Furniture;cw=DB.BuiltInCategory.OST_Casework;plumb=DB.BuiltInCategory.OST_PlumbingFixtures
    box('Bed frame 1500 x 2000',3.35,2.75,.45,1.5,2.,.24,timber,furn,'F01')
    box('Mattress - top 500 above FFL',3.35,2.75,.69,1.5,2.,.26,white,furn)
    box('Bed headboard',3.30,4.76,.45,1.6,.07,1.0,timber,furn)
    for x in [3.48,4.18]:box('Pillow',x,4.2,1.0,.54,.4,.1,white,furn)
    box('Bedside shelf left',2.55,4.18,.85,.55,.42,.05,timber,cw)
    box('Bedside shelf right',5.12,4.18,.85,.45,.42,.05,timber,cw)
    box('Utility linen storage',.18,4.83,.45,2.1,.55,2.1,timber,cw,'CW01')
    box('Washing machine placeholder',.2,3.4,.45,.65,.65,.85,white,DB.BuiltInCategory.OST_SpecialityEquipment)
    box('Living sofa base',8.48,1.3,.45,.85,2.0,.42,timber,furn,'F02')
    box('Living sofa cushion',8.45,1.35,.87,.7,1.9,.12,white,furn)
    box('Living sofa back',9.13,1.3,.9,.16,2.0,.5,white,furn)
    for y in [1.3,3.15]:box('Sofa armrest',8.45,y,.86,.85,.15,.35,white,furn)
    box('Dining table - knee clear below',6.45,3.30,1.18,1.25,.75,.045,timber,furn,'F03')
    for x in [6.5,7.60]:
        for y in [3.35,3.95]:box('Table leg',x,y,.45,.04,.04,.73,metal,furn)
    for x,y in [(6.7,4.22),(7.34,4.22)]:
        box('Dining chair seat',x-.2,y-.2,.9,.4,.4,.04,timber,furn)
        box('Dining chair back',x-.2,y+.17,.94,.4,.04,.38,timber,furn)
        for dx in [-.17,.14]:
            for dy in [-.17,.14]:box('Chair leg',x+dx,y+dy,.45,.035,.035,.45,metal,furn)
    box('Kitchen cabinet run',6.0,4.85,.45,2.5,.6,.77,timber,cw,'CW02')
    box('Kitchen worktop 800 above FFL',5.98,4.83,1.22,2.54,.64,.03,white,cw)
    box('Kitchen hob',7.7,4.94,1.25,.55,.42,.025,metal,DB.BuiltInCategory.OST_SpecialityEquipment)
    box('Kitchen sink',6.18,4.91,1.25,.55,.44,.05,steel,plumb,'FX05')
    rod('Kitchen mixer',(6.45,5.32,1.27),(6.45,5.32,1.52),.016,steel,plumb)
    box('Fridge',8.65,4.73,.45,.7,.7,1.6,white,DB.BuiltInCategory.OST_SpecialityEquipment,'EQ01')
    box('Kitchen accessible open prep shelf',5.95,3.05,1.22,.45,.85,.03,timber,cw,'CW03')
    # Bathroom wet-room: shower west/north, toilet east/north, clear central approach.
    wcpath=r'C:\ProgramData\Autodesk\RVT 2026\Libraries\English\US\Plumbing\Architectural\Fixtures\Water Closets\M_Toilet-Domestic-3D.rfa'
    fr=clr.Reference[DB.Family]();doc.LoadFamily(wcpath,fr);ws=doc.GetElement(list(fr.Value.GetFamilySymbolIds())[0]);ws.Activate();doc.Regenerate()
    wcinst=doc.Create.NewFamilyInstance(p(1.86,2.58,.45),ws,ffl,DB.Structure.StructuralType.NonStructural);meta(wcinst,'FX01','WC target seat height 450-480 above FFL; fixture family is indicative, verify selection')
    box('Wall hung basin - knee space below',1.72,.23,1.2,.5,.50,.09,white,plumb,'FX02')
    box('Basin mirror',1.71,.165,1.48,.52,.025,.70,glass,DB.BuiltInCategory.OST_SpecialityEquipment)
    box('Shower zone - flush slip-resistant tile',.16,1.88,.448,1.18,1.25,.002,tile,DB.BuiltInCategory.OST_Floors,'SH01')
    box('Linear shower drain',.18,3.05,.448,1.1,.06,.006,metal,plumb,'DR01')
    box('Folding shower seat - open',.18,2.48,.88,.45,.45,.04,timber,plumb,'FX03')
    rod('Shower grab bar vertical',(.22,2.28,1.15),(.22,2.28,1.95),.0175,metal,plumb)
    rod('Shower grab bar horizontal',(.22,2.25,1.15),(.22,3.0,1.15),.0175,metal,plumb)
    rod('WC support rail', (2.22,2.02,1.20),(2.22,2.96,1.20),.0175,metal,plumb)
    rod('WC rear grab bar',(1.35,3.07,1.20),(2.22,3.07,1.20),.0175,metal,plumb)
    rod('Hand shower riser',(.23,3.03,1.55),(.23,3.03,2.25),.015,metal,plumb)
    rod('Emergency pull cord',(.4,2.9,.62),(.4,2.9,2.8),.006,metal,DB.BuiltInCategory.OST_ElectricalFixtures)
    # Lights, switches and outlets are coordinated positions, no circuits/connectors.
    for x,y in [(1.2,1.4),(4.1,1.6),(4.1,4.4),(6.7,1.5),(8.4,3.8),(7.4,5.0)]:
        cylinder('Warm 3000K ceiling light - schematic',x,y,3.04,.13,.035,white,DB.BuiltInCategory.OST_LightingFixtures)
    for x,y in [(2.46,1.75),(5.87,1.76),(8.98,.19)]:box('Switch 1000 above FFL',x,y,1.45,.075,.025,.12,white,DB.BuiltInCategory.OST_ElectricalFixtures)
    for x in [3.0,5.25]:box('Bedside outlet 600 above FFL',x,5.42,1.05,.10,.025,.075,white,DB.BuiltInCategory.OST_ElectricalFixtures)
    for y in [1.4,2.8,4.2]:box('Bedroom wardrobe/sliding screen head track',2.53,y,3.08,.04,.7,.04,timber)
    # Curved-panel joints with outer waterproof cap, and schematic rainwater pipes.
    for j in range(1,4):
        y=j*1.4
        for i in range(40):
            xa=i*5.8/40;xb=(i+1)*5.8/40
            rod('Vault joint weather cap',(xa,y,arc_z(xa)+.012),(xb,y,arc_z(xb)+.012),.018,membrane)
    for x in [5.92,9.75]:rod('Rainwater downpipe 75 mm - routing concept',(x,5.60,.05),(x,5.60,3.43),.0375,metal,DB.BuiltInCategory.OST_PlumbingFixtures)
    for x,y in [(.5,-.7),(9.05,-.7),(9.9,4.7)]:
        cylinder('Planter',x,y,.45,.22,.35,timber,furn)
        for j in range(5):cylinder('Landscape foliage',x+.06*(j%2),y+.06*(j//2),.8,.08,.35+.1*(j%3),green)
    paving=box('Conceptual ground - no survey',-1,-4.3,-.07,12,11,.07,earth)
    # Room separators inside panelized exterior envelope avoid gaps leaking room area.
    rb=DB.CurveArray()
    for c in rect(.151,.151,9.449,5.449,.45):rb.Append(c)
    sp=DB.SketchPlane.Create(doc,DB.Plane.CreateByNormalAndOrigin(DB.XYZ.BasisZ,p(0,0,.45)))
    doc.Create.NewRoomBoundaryLines(sp,rb,plan);doc.Regenerate()
    rooms=[]
    for x,y,n,num in [(1.0,1.0,'ACCESSIBLE BATH','01'),(1,4.1,'UTILITY / LINEN','02'),(4,1.8,'BEDROOM','03'),(7.3,2.4,'LIVING / KITCHEN','04')]:
        room=doc.Create.NewRoom(ffl,DB.UV(m(x),m(y)));room.Name=n;room.Number=num;rooms.append(room)
    if tr.Commit()!=DB.TransactionStatus.Committed:raise Exception('Model transaction failed')
    log('Native senior-home model committed')
    # Reusable A1 title block family in native Revit format.
    fd=app.NewFamilyDocument(r'C:\ProgramData\Autodesk\RVT 2026\Family Templates\English\Titleblocks\A1 metric.rft')
    tx=DB.Transaction(fd,'PPE Engineering title block'); tx.Start()
    fviews=[v for v in DB.FilteredElementCollector(fd).OfClass(DB.View) if not v.IsTemplate]
    log('Family views: '+str([(name(v),str(v.ViewType)) for v in fviews]))
    fv=next(v for v in fviews if v.ViewType==DB.ViewType.DrawingSheet)
    log('Title block view '+str(fv.ViewType))
    for ce in list(DB.FilteredElementCollector(fd).OfClass(DB.CurveElement)):
        try: fd.Delete(ce.Id)
        except: pass
    def fline(x0,y0,x1,y1): fd.FamilyCreate.NewDetailCurve(fv,li(p(x0/1000.,y0/1000.),p(x1/1000.,y1/1000.)))
    for a,b,c,d in [(0,0,841,0),(841,0,841,594),(841,594,0,594),(0,594,0,0),(15,15,826,15),(826,15,826,579),(826,579,15,579),(15,579,15,15),(15,65,826,65),(540,15,540,65),(720,15,720,65),(540,40,826,40)]: fline(a,b,c,d)
    bt=next(iter(DB.FilteredElementCollector(fd).OfClass(DB.TextNoteType)))
    def ftext(x,y,s,size):
        typ=bt.Duplicate('PPE '+str(size)+' '+str(x)+' '+str(y)); setp(typ,DB.BuiltInParameter.TEXT_SIZE,m(size/1000.)); setp(typ,DB.BuiltInParameter.TEXT_FONT,'Arial')
        DB.TextNote.Create(fd,fv.Id,p(x/1000.,y/1000.),s,typ.Id)
    ftext(23,56,'PPE Engineering',6)
    ftext(23,44,'SENIOR LIVING HOME  -  9.60 x 5.60 m',3.2)
    ftext(23,29,'CONCEPT DESIGN  /  FOR REVIEW  /  NOT FOR CONSTRUCTION',2.5)
    ftext(546,61,'PROJECT  PPE-SH-001',2.5)
    ftext(546,50,'ISSUE  06 SEP 2026   -   REV  P01',2.5)
    ftext(727,61,'A1  -  841 x 594 mm',2.5)
    ftext(727,50,'UNITS mm  -  AS SHOWN',2.5)
    tx.Commit()
    save=DB.SaveAsOptions(); save.OverwriteExistingFile=True
    fd.SaveAs(os.path.join(OUT,'PPE_Engineering_Senior_A1.rfa'),save)
    family=fd.LoadFamily(doc); fd.Close(False)
    tb=doc.GetElement(list(family.GetFamilySymbolIds())[0])
    log('Title block created')
    tr=DB.Transaction(doc,'PPE senior home - views annotations schedules sheets'); tr.Start()
    base=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.TextNoteType)))
    texts={}
    def tt(size):
        if size not in texts:
            t=base.Duplicate('PPE Arial '+str(size)+' mm'); setp(t,DB.BuiltInParameter.TEXT_SIZE,m(size/1000.)); setp(t,DB.BuiltInParameter.TEXT_FONT,'Arial'); texts[size]=t
        return texts[size]
    def textv(v,x,y,s,size=2.5,width=None):
        opt=DB.TextNoteOptions(tt(size).Id)
        pos=p(x,y) if v.ViewType in [DB.ViewType.DrawingSheet,DB.ViewType.DraftingView,DB.ViewType.FloorPlan] else v.Origin+v.RightDirection.Multiply(m(x))+v.UpDirection.Multiply(m(y))
        if width: return DB.TextNote.Create(doc,v.Id,pos,m(width),s,opt)
        return DB.TextNote.Create(doc,v.Id,pos,s,opt)
    def linev(v,x0,y0,x1,y1):
        if v.ViewType in [DB.ViewType.DrawingSheet,DB.ViewType.DraftingView,DB.ViewType.FloorPlan]: a=p(x0,y0); b=p(x1,y1)
        else:
            a=v.Origin+v.RightDirection.Multiply(m(x0))+v.UpDirection.Multiply(m(y0)); b=v.Origin+v.RightDirection.Multiply(m(x1))+v.UpDirection.Multiply(m(y1))
        return doc.Create.NewDetailCurve(v,li(a,b))
    def crop(v,x0,y0,z0,x1,y1,z1):
        bb=DB.BoundingBoxXYZ(); bb.Min=p(x0,y0,z0); bb.Max=p(x1,y1,z1); v.CropBox=bb; v.CropBoxActive=True; v.CropBoxVisible=False
    def style(v,scale=25):
        v.Scale=scale; v.DetailLevel=DB.ViewDetailLevel.Fine
        v.DisplayStyle=DB.DisplayStyle.HLR
        for cat in [DB.BuiltInCategory.OST_Levels,DB.BuiltInCategory.OST_CLines]:
            try: v.SetCategoryHidden(eid(cat),True)
            except: pass
    def plan_dimension(v,xvals,y,axis='x'):
        refs=DB.ReferenceArray()
        for val in xvals:
            if axis=='x': dc=doc.Create.NewDetailCurve(v,li(p(val,y-.1),p(val,y+.1)))
            else: dc=doc.Create.NewDetailCurve(v,li(p(y-.1,val),p(y+.1,val)))
            refs.Append(dc.GeometryCurve.Reference)
        if axis=='x': dl=li(p(xvals[0],y),p(xvals[-1],y))
        else: dl=li(p(y,xvals[0]),p(y,xvals[-1]))
        return doc.Create.NewDimension(v,dl,refs)
    for v in [plan,roofplan,bath]:
        style(v,25);v.HideElements(List[DB.ElementId]([paving.Id]))
        for cat in [DB.BuiltInCategory.OST_Sections,DB.BuiltInCategory.OST_Elev,DB.BuiltInCategory.OST_RoomSeparationLines]:
            try:v.SetCategoryHidden(eid(cat),True)
            except:pass
    crop(plan,-1.1,-4.2,-1,10.5,6.8,5)
    crop(roofplan,-.7,-.85,-1,10.5,6.7,6)
    crop(bath,-.4,-.4,-1,6.25,5.95,5)
    plan_dimension(plan,[0,9.6],6.45);plan_dimension(plan,[0,2.4,5.8,9.6],5.98)
    plan_dimension(plan,[0,5.6],-.65,'y');plan_dimension(plan,[-3.6,-1.8,0],-.65,'y')
    plan_dimension(plan,[.3,2.1,7.5,9.3],-4.0)
    plan_dimension(roofplan,[0,5.8,9.6],6.35);plan_dimension(roofplan,[0,1.4,2.8,4.2,5.6],-.45,'y')
    for x,y,s in [(.4,1.68,'01 BATH'),(.4,4.45,'02 UTILITY'),(3.05,2.18,'03 BEDROOM'),(6.55,2.47,'04 LIVING'),(6.35,4.66,'KITCHEN'),(3.8,-.7,'FLUSH VERANDA +450'),(3.4,-2.62,'RAMP 1:12  /  UP >'),(.52,-2.4,'LOWER\nLANDING'),(7.85,-2.65,'UPPER\nLANDING'),(7.1,.48,'D01'),(2.48,.70,'D02'),(5.87,.70,'D03'),(2.51,3.72,'D04')]:textv(plan,x,y,s,2.3)
    for j in range(4):textv(roofplan,2.6,j*1.4+.8,'PC-R%02d'%(j+1),3)
    textv(roofplan,6.7,2.8,'RF-05\nWARM FLAT ROOF',3)
    textv(roofplan,1.5,-.3,'CURVED PRECAST VAULT',2.5)
    # Reference north only; actual site orientation not assigned.
    for v in [plan,roofplan]:
        linev(v,10.05,4.7,10.05,5.6);linev(v,10.05,5.6,9.92,5.36);linev(v,10.05,5.6,10.18,5.36);textv(v,9.9,5.95,'N*',3)
    def circle(v,x,y,r):
        for a,b,c in [(p(x+r,y),p(x-r,y),p(x,y+r)),(p(x-r,y),p(x+r,y),p(x,y-r))]:doc.Create.NewDetailCurve(v,DB.Arc.Create(a,b,c))
    # Furniture-free circles are deliberately shown as coordination clearances.
    for v in [plan,bath]:
        circle(v,1.04,1.06,.775);circle(v,4.05,1.50,.775)
    plan_dimension(bath,[.15,2.35],-.12);plan_dimension(bath,[2.45,3.35,4.85,5.75],2.45)
    plan_dimension(bath,[.15,3.15],-.18,'y')
    for x,y,s in [(.25,3.7,'UTILITY / LINEN'),(.4,1.8,'1550 TURN'),(.3,2.45,'FLUSH\nSHOWER'),(1.55,2.3,'WC'),(3.32,1.9,'1550 TURN'),(3.7,3.68,'1500 x 2000\nBED'),(2.58,3.65,'900'),(5.05,3.65,'900'),(2.47,.6,'1100 CLEAR'),(5.02,.6,'1100 CLEAR')]:textv(bath,x,y,s,2.2)
    # Real building elevations, with view direction facing out from the facade.
    elevs=[]
    for nm,pt,dirvec in [('SOUTH - Entrance facade',p(4.8,-5.0),DB.XYZ(0,-1,0)),('NORTH - Garden facade',p(4.8,7.2),DB.XYZ(0,1,0)),('EAST - Living facade',p(11.0,2.8),DB.XYZ(1,0,0)),('WEST - Vault facade',p(-2,2.8),DB.XYZ(-1,0,0))]:
        marker=DB.ElevationMarker.CreateElevationMarker(doc,vft(DB.ViewFamily.Elevation).Id,pt,50)
        v=marker.CreateElevation(doc,plan.Id,0);doc.Regenerate()
        cur=v.ViewDirection;ang=math.atan2(dirvec.Y,dirvec.X)-math.atan2(cur.Y,cur.X)
        DB.ElementTransformUtils.RotateElement(doc,marker.Id,li(pt,pt+DB.XYZ.BasisZ),ang);doc.Regenerate()
        v.Name=nm;style(v,50)
        bb=v.CropBox;inv=bb.Transform.Inverse
        q=[inv.OfPoint(p(x,y,z)) for x in [-.6,10.2] for y in [-3.9,5.95] for z in [-.6,4.95]]
        bb.Min=DB.XYZ(min(a.X for a in q),min(a.Y for a in q),m(-18));bb.Max=DB.XYZ(max(a.X for a in q),max(a.Y for a in q),0)
        v.CropBox=bb;v.CropBoxActive=True;v.CropBoxVisible=False;setp(v,DB.BuiltInParameter.VIEWER_BOUND_OFFSET_FAR,m(18))
        v.HideElements(List[DB.ElementId]([paving.Id]));elevs.append(v)
    sections=[]
    for nm,org,right,direc,w,depth in [('SECTION A-A - Across bedroom and living',p(4.8,2.65,0),DB.XYZ(1,0,0),DB.XYZ(0,-1,0),5.45,7),('SECTION B-B - Bedroom front to rear',p(4.10,1.0,0),DB.XYZ(0,1,0),DB.XYZ(1,0,0),5.25,5.8)]:
        trf=DB.Transform.Identity;trf.Origin=org;trf.BasisX=right;trf.BasisY=DB.XYZ.BasisZ;trf.BasisZ=direc
        bb=DB.BoundingBoxXYZ();bb.Transform=trf;bb.Min=p(-w,-.65,0);bb.Max=p(w,4.95,depth)
        v=DB.ViewSection.CreateSection(doc,vft(DB.ViewFamily.Section).Id,bb);v.Name=nm;style(v,50);v.CropBoxVisible=False
        v.HideElements(List[DB.ElementId]([paving.Id]));sections.append(v)
    for v in elevs+sections:
        for cat in [DB.BuiltInCategory.OST_Sections,DB.BuiltInCategory.OST_Elev]:
            try:v.SetCategoryHidden(eid(cat),True)
            except:pass
    # Section line locations are explicit native annotations on the floor plan.
    linev(plan,-.25,2.65,10.0,2.65);textv(plan,-.3,2.98,'A',3);textv(plan,9.7,2.98,'A',3)
    linev(plan,4.1,-3.9,4.1,5.8);textv(plan,4.2,5.85,'B',3);textv(plan,4.2,-3.8,'B',3)
    axo=DB.View3D.CreateIsometric(doc,vft(DB.ViewFamily.ThreeDimensional).Id);axo.Name='3D - Exterior - PPE Senior Home'
    cut=DB.View3D.CreateIsometric(doc,vft(DB.ViewFamily.ThreeDimensional).Id);cut.Name='3D - Interior cutaway - PPE Senior Home'
    for v in [axo,cut]:
        v.Scale=50;v.DetailLevel=DB.ViewDetailLevel.Fine;v.DisplayStyle=DB.DisplayStyle.ShadingWithEdges
        forward=DB.XYZ(-.8,1,-.65).Normalize();right=forward.CrossProduct(DB.XYZ.BasisZ).Normalize();up=right.CrossProduct(forward).Normalize()
        v.SetOrientation(DB.ViewOrientation3D(p(16,-15,12),up,forward))
        for cat in [DB.BuiltInCategory.OST_Levels,DB.BuiltInCategory.OST_CLines,DB.BuiltInCategory.OST_SectionBox]:
            try:v.SetCategoryHidden(eid(cat),True)
            except:pass
        bb=DB.BoundingBoxXYZ();bb.Min=p(-.7,-4.0,-.05);bb.Max=p(10.25,6.0,4.95);v.SetSectionBox(bb);v.IsSectionBoxActive=True
    bb=DB.BoundingBoxXYZ();bb.Min=p(-.3,-1.9,.2);bb.Max=p(9.9,5.8,2.3);cut.SetSectionBox(bb)
    cut.HideElements(List[DB.ElementId]([r.Id for r in roofs]))
    # Consistent light warm concrete appearance at roof panel ends.
    for roof in roofs:
        op=DB.Options();op.ComputeReferences=True
        for geom in roof.get_Geometry(op):
            if isinstance(geom,DB.Solid):
                for face in geom.Faces:
                    if isinstance(face,DB.PlanarFace) and abs(face.FaceNormal.Z)<.1:
                        try:doc.Paint(roof.Id,face,concrete.Id)
                        except:pass

    sheets=[]
    def sheet(num,title):
        s=DB.ViewSheet.Create(doc,tb.Id); s.SheetNumber=num; s.Name=title
        textv(s,.546,.034,title,3,.17); textv(s,.728,.034,num,7)
        textv(s,.023,.570,num+'   /   '+title.upper(),5)
        sheets.append(s); return s
    def note(s,x,y,txt,size=3,width=None): return textv(s,x/1000.,y/1000.,txt,size,width/1000. if width else None)
    def vp(s,v,x,y,label=None):
        e=DB.Viewport.Create(doc,s.Id,v.Id,p(x/1000.,y/1000.)); doc.Regenerate()
        setp(doc.GetElement(e.GetTypeId()),DB.BuiltInParameter.VIEWPORT_ATTR_SHOW_LABEL,0)
        e.SetBoxCenter(p(x/1000.,y/1000.))
        return e
    s0=sheet('A001','Design overview and proposed materials')
    vp(s0,axo,290,360)
    note(s0,60,175,'01  EXTERIOR AXONOMETRIC  /  1:50',3.5)
    note(s0,565,520,'A HOME FOR AGEING IN PLACE',4)
    note(s0,565,502,'Reference: user-supplied concept image.\nEnclosed envelope: 9600 x 5600 = 53.76 m2.\n1 bedroom + bath + utility + living / kitchen.\nFront veranda 17.28 m2, plus ramp / landings.\nSelected form: curved bedroom volume\nand lower flat-roof living wing.\nFFL +450. Vault spring +3200 / crown +4500.\nDimensions not shown in image are assumed.',3,235)
    note(s0,565,411,'PROPOSED MATERIALS',4)
    note(s0,565,393,'PC-01: structural lightweight precast.\n35 MPa / 1800 kg/m3 - proposed only.\nWall 150 mm; floor 180 PC + 30 screed\n+ 10 tile. Vault 120 PC + 80 mineral wool\n+ 12 timber lining + 5 waterproofing.\nGL-01: 6+6 laminated safety glass.\nAL-01: black powder-coated frames.\nFL-01: slip-resistant timber-look finish.\nFL-02: wet-room slip-resistant tile.\nDK-01: textured composite deck, gaps <=5.\nWarm oak joinery; 3000K lighting.',3,235)
    note(s0,565,278,'DESIGN STATUS',4)
    note(s0,565,260,'Architectural BIM concept / P01.\nConfirm site, soil, flood level and orientation.\nEngineer to size foundation, reinforcement,\npanel connections, lifting and transport.\nMEP fixtures show positions only.\nNo structural or code compliance certified.',3,235)
    note(s0,40,139,'BIM CONTENT',4)
    note(s0,40,123,'Native Revit walls, floors, roofs, hosted doors, rooms, material assets, schedules and coordinated views.\nCustom glazing, furnishings, ramp, rails and fixtures include categorized DirectShape geometry.\nOverall image dimensions retained; room divisions, levels and material properties are design assumptions.',2.8,755)
    s1=sheet('A101','Floor plan and accessible approach')
    vp(s1,plan,294,337)
    note(s1,60,102,'01  FLOOR PLAN + APPROACH  /  1:25',3.5)
    note(s1,562,517,'ACCESS AND CIRCULATION',4)
    note(s1,562,499,'01  Bathroom with flush shower and seat.\n02  Utility / linen / washing machine.\n03  Bedroom with 1500 x 2000 bed.\n04  Living, dining and compact kitchen.\n\nRaised FFL: 450 mm above assumed grade.\nRamp rise/run = 450/5400 = 1:12.\nRamp structural width 1800; handrail clear\nwidth approx. 1562. Landings 1800 square.\nHandrails at 700 and 900 above ramp.\nVeranda guard nominal 1100 high.\nMain entry nominal 2400 sliding door.\nTarget entrance clear opening >=1100.\nBathroom / bedroom openings 1100 clear.\nCentral turn circles 1550 diameter.\nBedside circulation 900 nominal each side.\nDoor tracks and wet-room entrance flush.',3,242)
    note(s1,562,302,'DRAWING BASIS',4)
    note(s1,562,284,'Dimensions in mm; levels in mm.\nN* is drawing reference north only.\nNo site boundary or survey is implied.\nA-A and B-B correspond to A301 sections.\nDimension witness lines are annotation\nreferences; recheck after model edits.\n\nAccessibility reference: U.S. Access Board\nADA guides for ramps and bathing rooms,\nused for design guidance, not Thai approval.\nConfirm local requirements and resident\nneeds at detailed-design stage.',3,242)
    s2=sheet('A102','Roof plan and precast assembly')
    vp(s2,roofplan,295,360)
    note(s2,65,185,'01  ROOF AND PANEL PLAN  /  1:25',3.5)
    note(s2,565,514,'PANEL AND ROOF BASIS',4)
    note(s2,565,495,'PC-R01..04: 1400 nominal casting bays.\nCurved vault spans 5800 across the home.\nNominal 15 mm open structural panel joint.\nWeather cap / membrane bridges joints.\nRoof crown +4500; spring +3200.\nRF-05: living wing flat warm roof.\nNominal top +3500; drainage falls and\nlow points to supplier/detail design.\nRainwater pipes shown at rear positions.\n\nFloor: 8 nominal 2400 x 2800 panels.\nExterior wall panels: 150 thick.\nPanel widths are concept casting bays.\nActual segmentation for transport, crane\ncapacity and lifting stability remains open.\nDo not transport the shown 5800-wide\nvault as a single approved shipping unit.',3,240)
    note(s2,40,145,'ASSEMBLY SEQUENCE / CONCEPT',4)
    note(s2,40,125,'1  Survey and design foundations.  2  Install pedestals / bearers.  3  Place precast floor panels.\n4  Erect and temporarily brace wall panels.  5  Install roof segments and engineered connections.\n6  Complete membrane, joints, glazing and MEP.  7  Finish flush surfaces and verify resident access.',3,750)
    s3=sheet('A201','External elevations')
    for v,x,y in [(elevs[0],225,423),(elevs[1],625,423),(elevs[2],225,208),(elevs[3],625,208)]:vp(s3,v,x,y)
    for x,y,txt in [(65,530,'01 SOUTH - ENTRANCE / 1:50'),(465,530,'02 NORTH - GARDEN / 1:50'),(65,315,'03 EAST - LIVING / 1:50'),(465,315,'04 WEST - VAULT / 1:50')]:note(s3,x,y,txt,3.5)
    for x,y in [(65,350),(465,350),(65,135),(465,135)]:note(s3,x,y,'DATUM +0  |  FFL +450  |  FLAT ROOF +3500\nVAULT SPRING +3200  |  VAULT CROWN +4500',2.7,345)
    s4=sheet('A301','Building sections and construction basis')
    vp(s4,sections[0],290,415);vp(s4,sections[1],290,210)
    note(s4,65,524,'01  SECTION A-A / ACROSS THE TWO VOLUMES / 1:50',3.5)
    note(s4,65,316,'02  SECTION B-B / BEDROOM FRONT TO REAR / 1:50',3.5)
    note(s4,565,518,'LEVELS AND BUILD-UP',4)
    note(s4,565,498,'+000  Assumed finished external grade.\n+450  Finished floor / veranda.\n+230  Nominal structural floor soffit.\n+3150 Internal partition top.\n+3200 Vault profile spring datum.\n+3500 Flat roof nominal top datum.\n+4500 Vault profile crown datum.\n\nFloor: 10 tile / 30 screed / 180 PC.\nVault: 5 membrane / 120 PC /\n80 mineral wool / 12 timber lining.\nFlat roof: 5 membrane / 30 screed /\n120 PC / 70 insulation / 15 lining.\n\nFloor bearers, pedestals and pad footings\nare schematic placeholders. Connection\ncapacities, settlement and uplift require\nengineering for the actual site.\n\nResolve roof support at the vault / flat\nroof interface, drainage, waterproofing\nand condensation before construction.',3,238)
    note(s4,65,107,'Sections are cut from the BIM model. See A101 for section locations.\nNo reinforcement, structural calculations or concealed MEP is included.',2.8,450)
    s5=sheet('A401','Senior living layout and interior')
    vp(s5,bath,214,376);vp(s5,cut,615,391)
    note(s5,45,232,'01  BATH + BEDROOM CLEARANCES / 1:25',3.5)
    note(s5,442,232,'02  INTERIOR CUTAWAY / 1:50',3.5)
    note(s5,40,202,'RESIDENT COMFORT AND SAFETY',4)
    note(s5,40,183,'Flush shower, folding seat, grab bars and emergency pull cord.\n1550 diameter turn space indicated; maintain clear of stored items.\nBathroom opening 1100 clear with external surface sliding leaf.\nBedside aisles 900 nominal; bed top 500 above floor.\nBasin top approx. 840 above floor, with knee clearance below.',3,365)
    note(s5,444,183,'Warm 3000K lighting, bedside outlets at 600 and switches at 1000.\nSlip-resistant wet finishes and a flush transition to the veranda.\nKitchen worktop target 800 above floor; open prep shelf provided.\nSelect grab-bar fixings and supports for the actual resident.\nConfirm toilet seat height, side transfer and fixture clearances.',3,365)
    # Native schedules: live model areas, materials and door types.
    schedules=[]
    for cat,nm in [(DB.BuiltInCategory.OST_Walls,'Q01 Wall material quantities'),(DB.BuiltInCategory.OST_Floors,'Q02 Floor material quantities'),(DB.BuiltInCategory.OST_Roofs,'Q03 Roof material quantities')]:
        sch=DB.ViewSchedule.CreateMaterialTakeoff(doc,eid(cat));sch.Name=nm;de=sch.Definition;fields=list(de.GetSchedulableFields())
        for bip in [DB.BuiltInParameter.MATERIAL_NAME,DB.BuiltInParameter.MATERIAL_VOLUME]:
            sf=next((f for f in fields if f.ParameterId==eid(bip)),None)
            if sf:
                fld=de.AddField(sf);fld.GridColumnWidth=m(.19 if bip==DB.BuiltInParameter.MATERIAL_NAME else .05)
                if bip==DB.BuiltInParameter.MATERIAL_VOLUME:fld.DisplayType=DB.ScheduleFieldDisplayType.Totals
                else:de.AddSortGroupField(DB.ScheduleSortGroupField(fld.FieldId))
        de.IsItemized=False;de.ShowGrandTotal=True;schedules.append(sch)
    sch=DB.ViewSchedule.CreateSchedule(doc,eid(DB.BuiltInCategory.OST_Rooms));sch.Name='Q04 Room area schedule'
    for bip in [DB.BuiltInParameter.ROOM_NUMBER,DB.BuiltInParameter.ROOM_NAME,DB.BuiltInParameter.ROOM_AREA]:
        sf=next((f for f in sch.Definition.GetSchedulableFields() if f.ParameterId==eid(bip)),None)
        if sf:
            fld=sch.Definition.AddField(sf);fld.GridColumnWidth=m(.035 if bip==DB.BuiltInParameter.ROOM_NUMBER else .14 if bip==DB.BuiltInParameter.ROOM_NAME else .06)
    schedules.append(sch)
    s6=sheet('A601','Schedules and specification register')
    for sch,x,y in [(schedules[0],40,525),(schedules[1],40,388),(schedules[2],40,230),(schedules[3],340,525)]:DB.ScheduleSheetInstance.Create(doc,s6.Id,sch.Id,p(x/1000.,y/1000.))
    note(s6,340,425,'DOOR / OPENING REGISTER',4)
    note(s6,340,405,'D01  Main sliding entrance: nominal 2400 x 2400.\n        Target clear width >=1100; supplier to verify track/leaf.\nD02  Bath: 1100 clear x 2200 opening; sliding oak panel.\nD03  Bedroom: 1100 clear x 2200 opening; sliding oak panel.\nD04  Utility: nominal 1000 x 2100 hinged panel.\n        Confirm actual clear width after ironmongery selection.',3,448)
    note(s6,340,326,'MATERIAL / PROCUREMENT NOTES',4)
    note(s6,340,306,'PC-01 strength and density are proposed Revit material properties.\nRequire supplier mix design, test certificates and structural design.\nWet-area waterproofing extends continuously beneath tile finishes.\nSpecify verified wet slip resistance appropriate to barefoot use.\nGlazing 6+6 laminated is a starting specification; check wind/pane size.\nDeck fasteners, rail anchors and exposed steel need corrosion protection.\nUse low-emission washable interior finishes with rounded joinery edges.',3,448)
    note(s6,340,215,'QUANTITY AND MODEL LIMITS',4)
    note(s6,340,195,'Material take-offs are live quantities of the modelled categories.\nDirectShape furniture, rails, glazing and fittings are schematic solids.\nNo reinforcing steel, connection steel or wastage is quantified.\nRamps and rails are classified model geometry, not parametric systems.\nReferences: supplied image; access-board.gov ADA guides for ramps,\nclear turning spaces and bathing rooms (consulted 06 Sep 2026).\nLocal Thai applicability, actual site and resident needs remain to verify.',2.8,448)
    doc.Regenerate()
    if tr.Commit()!=DB.TransactionStatus.Committed:raise Exception('Drawing transaction failed')
    log('Seven A1 sheets committed')
    rvtpath=os.path.join(OUT,'PPE_Engineering_Senior_Home_R2026.rvt')
    save=DB.SaveAsOptions();save.OverwriteExistingFile=True;save.MaximumBackups=1;doc.SaveAs(rvtpath,save);log('RVT SAVED')
    audit={'rvt':rvtpath,'revitVersion':app.VersionNumber,'status':'ARCHITECTURAL CONCEPT P01','envelopeM':[9.6,5.6],'fflM':.45,'ramp':{'riseM':.45,'runM':5.4,'widthM':1.8,'clearBetweenRailsM':1.562,'ratio':12},'sheets':[{'number':s.SheetNumber,'name':s.Name} for s in sheets],'counts':{},'rooms':[],'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()],'roofBounds':[]}
    for cls in [DB.Wall,DB.Floor,DB.RoofBase,DB.DirectShape,DB.ViewSection,DB.ViewSchedule]:audit['counts'][cls.__name__]=len(list(DB.FilteredElementCollector(doc).OfClass(cls)))
    for room in rooms:audit['rooms'].append({'name':room.Name,'number':room.Number,'areaM2':room.Area*.3048**2})
    for r in roofs:
        b=r.get_BoundingBox(None);audit['roofBounds'].append({'mark':r.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString(),'minM':[float(q)*.3048 for q in [b.Min.X,b.Min.Y,b.Min.Z]],'maxM':[float(q)*.3048 for q in [b.Max.X,b.Max.Y,b.Max.Z]]})
    try:
        opts=DB.PDFExportOptions();opts.Combine=True;opts.FileName='PPE_Engineering_Senior_Home_Drawings';opts.PaperFormat=DB.ExportPaperFormat.Default
        audit['pdfExport']=doc.Export(OUT,List[DB.ElementId]([s.Id for s in sheets]),opts);log('PDF EXPORTED')
    except Exception as ex:audit['pdfError']=str(ex);log(str(ex))
    try:
        opts=DB.ImageExportOptions();opts.ExportRange=DB.ExportRange.SetOfViews;opts.SetViewsAndSheets(List[DB.ElementId]([axo.Id,cut.Id]+[s.Id for s in sheets]));opts.FilePath=os.path.join(OUT,'PPE');opts.HLRandWFViewsFileType=DB.ImageFileType.PNG;opts.ShadowViewsFileType=DB.ImageFileType.PNG;opts.ImageResolution=DB.ImageResolution.DPI_150;opts.ZoomType=DB.ZoomFitType.FitToPage;opts.PixelSize=2200;doc.ExportImage(opts);log('PREVIEWS EXPORTED')
    except Exception as ex:log('Images '+str(ex))
    with codecs.open(os.path.join(OUT,'model-audit.json'),'w','utf-8') as f:f.write(json.dumps(audit,indent=2))
    uidoc=revit.uidoc.Application.OpenAndActivateDocument(rvtpath);uidoc.ActiveView=axo
    log('COMPLETE')
except Exception:
    log(traceback.format_exc())
    try:
        if tr and tr.HasStarted():tr.RollBack()
    except:pass
    try:
        if doc and doc.IsValidObject and not doc.IsModifiable:doc.Close(False)
    except:pass
    raise
