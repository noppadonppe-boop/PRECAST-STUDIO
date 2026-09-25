# -*- coding: utf-8 -*-
"""PPE cafe: native Revit architectural concept, independent new document."""
import os, math, json, traceback, codecs
import clr
from System.Collections.Generic import List
from pyrevit import DB, revit

ROOT = r'E:\1.0 Project GPT Work\Precast-Module'
OUT = os.path.join(ROOT, 'deliverables', 'PPE_Cafe')
if not os.path.isdir(OUT): os.makedirs(OUT)
repair=os.path.join(ROOT,'tools','cafe','finalize_model.py')
if os.path.isfile(os.path.join(OUT,'review-mode.flag')):
    try: exec(compile(open(repair).read(),repair,'exec'))
    except Exception:
        with open(os.path.join(OUT,'review-error.txt'),'w') as f:f.write(traceback.format_exc())
        raise
    raise SystemExit
existing=os.path.join(OUT,'PPE_Engineering_Precast_Cafe_R2026.rvt')
if os.path.isfile(existing):
    revit.uidoc.Application.OpenAndActivateDocument(existing)
    raise SystemExit
LOG = os.path.join(OUT, 'build-log.txt')
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

log('\nSTART PPE CAFE')
app=revit.doc.Application
doc=None
try:
    doc=app.NewProjectDocument(r'C:\ProgramData\Autodesk\RVT 2026\Templates\English\DefaultMetric.rte')
    tr=DB.Transaction(doc,'PPE cafe - materials and architectural model'); tr.Start()
    units=DB.Units(DB.UnitSystem.Metric)
    fo=DB.FormatOptions(DB.UnitTypeId.Millimeters); fo.Accuracy=1.0
    units.SetFormatOptions(DB.SpecTypeId.Length,fo); doc.SetUnits(units)
    info=doc.ProjectInformation
    info.Name='PRECAST MODULE CAFE'; info.Number='PPE-PC-CAFE-001'
    info.ClientName='PPE Engineering'; info.BuildingName='Barrel-vault cafe 3200 x 6000'
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
    concrete=material('Precast','PC-01 - Structural lightweight precast - proposed',(179,175,164),0,'PROPOSED: 35 MPa / density 1800 kg/m3. Supplier and structural design to verify. Reference image says 1200 kg/m3; not adopted as structural proof.')
    normal=material('Foundation','RC-01 - Reinforced concrete footing - provisional',(143,145,142),0,'PROVISIONAL substructure geometry only; geotechnical and foundation design required.')
    timber=material('Timber','WD-01 - Warm oak interior finish',(154,106,61),0,'12 mm oak veneer lining; sealed washable finish to joinery.')
    deckmat=material('Deck','WD-02 - Exterior durable timber decking',(137,94,54),0,'28 mm exterior timber boards with 6 mm gaps; corrosion-resistant fixings.')
    metal=material('Metal','AL-01 - Black powder-coated aluminium',(36,39,37),0,'Black powder-coated frames; nominal 50 x 100 mm; profiles subject to glazing supplier.')
    glass=material('Glass','GL-01 - Clear laminated safety glazing',(153,191,190),72,'Proposed 6+6 mm laminated safety glazing. Supplier to verify pane sizes, support and wind design.')
    tile=material('Tile','FL-02 - Anti-slip porcelain wet-area tile',(130,130,119),0,'10 mm slip-resistant porcelain + waterproofing to wet areas.')
    insul=material('Insulation','IN-01 - Roof mineral wool 50 mm',(212,192,130),0,'50 mm mineral wool; vapour and condensation strategy to be coordinated for actual site.')
    membrane=material('Waterproofing','WP-01 - Roof waterproof membrane',(111,115,110),0,'5 mm schematic membrane layer; flexible joints and terminations to supplier detail.')
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
    ft=typ(DB.FloorType,'PPE - Precast floor 180 mm',[(.18,structure,concrete)])
    fft=typ(DB.FloorType,'PPE - Oak floor finish 20 mm',[(.02,structure,timber)])
    wft=typ(DB.FloorType,'PPE - Wet area finish 20 mm',[(.02,structure,tile)])
    rt=typ(DB.RoofType,'PPE - Vault 187 mm - membrane PC insulation timber',[(.005,finish,membrane),(.12,structure,concrete),(.05,DB.MaterialFunctionAssignment.Insulation,insul),(.012,DB.MaterialFunctionAssignment.Finish2,timber)])
    levs=list(DB.FilteredElementCollector(doc).OfClass(DB.Level))
    ffl=min(levs,key=lambda e:abs(e.Elevation)); ffl.Name='01 FFL +450'; ffl.Elevation=m(.45)
    ground=DB.Level.Create(doc,0); ground.Name='00 GROUND +000'
    spring=DB.Level.Create(doc,m(2.75)); spring.Name='02 SPRING +2750'
    crown=DB.Level.Create(doc,m(3.65)); crown.Name='03 CROWN +3650'
    vf=list(DB.FilteredElementCollector(doc).OfClass(DB.ViewFamilyType))
    vft=lambda f: next(e for e in vf if e.ViewFamily==f)
    plan=DB.ViewPlan.Create(doc,vft(DB.ViewFamily.FloorPlan).Id,ffl.Id); plan.Name='A101 - Furniture and floor plan'
    roofplan=DB.ViewPlan.Create(doc,vft(DB.ViewFamily.FloorPlan).Id,crown.Id); roofplan.Name='A102 - Roof and panel layout'
    vr=roofplan.GetViewRange()
    for key,off in [(DB.PlanViewPlane.TopClipPlane,1.2),(DB.PlanViewPlane.CutPlane,1.0),(DB.PlanViewPlane.BottomClipPlane,-.95),(DB.PlanViewPlane.ViewDepthPlane,-.95)]:
        vr.SetLevelId(key,crown.Id); vr.SetOffset(key,m(off))
    roofplan.SetViewRange(vr)
    def wall(x0,y0,x1,y1,t,h,mark,z=.45):
        e=DB.Wall.Create(doc,li(p(x0,y0),p(x1,y1)),t.Id,ffl.Id,m(h),m(z-.45),False,False)
        DB.WallUtils.DisallowWallJoinAtEnd(e,0); DB.WallUtils.DisallowWallJoinAtEnd(e,1)
        return meta(e,mark,'PRELIMINARY - factory precast panel; connections and reinforcement pending design')
    walls=[]
    # Four 1500 mm casting bays, true 15 mm separation joints.
    for side,y in [('S',.075),('N',3.125)]:
        for j in range(4):
            e=wall(j*1.5+.0075,y,(j+1)*1.5-.0075,y,wt,2.3,'PC-W'+side+str(j+1)); walls.append(e)
            if side=='S' and j in [1,2]:
                a=max(j*1.5+.04,1.85); b=min((j+1)*1.5-.04,4.15)
                doc.Create.NewOpening(e,p(a,0,1.4),p(b,0,2.35))
    rear=wall(.075,.15,.075,3.05,wt,2.3,'PC-WR'); walls.append(rear)
    # Native floor slabs in 3 transportable bays.
    floors=[]
    for j in range(3):
        e=DB.Floor.Create(doc,List[DB.CurveLoop]([rect(j*2+.0075,0,(j+1)*2-.0075,3.2)]),ft.Id,ffl.Id)
        setp(e,DB.BuiltInParameter.FLOOR_HEIGHTABOVELEVEL_PARAM,m(-.02)); meta(e,'PC-F'+str(j+1),'180 mm precast slab; bearing / reinforcement to engineer'); floors.append(e)
    e=DB.Floor.Create(doc,List[DB.CurveLoop]([rect(1.45,.15,5.9,3.05)]),fft.Id,ffl.Id); meta(e,'FL-01','20 mm internal oak finish at FFL')
    e=DB.Floor.Create(doc,List[DB.CurveLoop]([rect(.15,.15,1.35,3.05)]),wft.Id,ffl.Id); meta(e,'FL-02','Wet-area anti-slip finish; falls/drainage to coordinate')
    part=wall(1.4,.15,1.4,3.05,it,2.15,'PT-01')
    cross=wall(.15,1.65,1.35,1.65,it,2.15,'PT-02')
    # Hosted native door families.
    dpath=r'C:\ProgramData\Autodesk\RVT 2026\Libraries\English\US\Doors\M_Door-Single-Panel.rfa'
    famref=clr.Reference[DB.Family](); doc.LoadFamily(dpath,famref)
    ds=doc.GetElement(list(famref.Value.GetFamilySymbolIds())[0]); ds=ds.Duplicate('PPE - 800 x 2100 internal door')
    for b,v in [(DB.BuiltInParameter.DOOR_WIDTH,.8),(DB.BuiltInParameter.DOOR_HEIGHT,2.1)]: setp(ds,b,m(v))
    ds.Activate(); doc.Regenerate()
    for yy,mark in [(.9,'D02'),(2.35,'D03')]:
        e=doc.Create.NewFamilyInstance(p(1.4,yy,.45),ds,part,ffl,DB.Structure.StructuralType.NonStructural); meta(e,mark,'800 x 2100 internal flush door')
    roofs=[]
    for j in range(4):
        x=j*1.5+.0075
        rp=doc.Create.NewReferencePlane(p(x,0,0),p(x,3.2,0),DB.XYZ.BasisZ,plan)
        rp.Name='PPE roof casting plane '+str(j+1)
        curves=DB.CurveArray(); curves.Append(DB.Arc.Create(p(x,0,2.75),p(x,3.2,2.75),p(x,1.6,3.65)))
        sign=1 if rp.Normal.X>0 else -1
        roof=doc.Create.NewExtrusionRoof(curves,rp,ground,rt,min(0,sign*m(1.485)),max(0,sign*m(1.485)))
        meta(roof,'PC-R'+str(j+1),'1500 mm nominal roof bay; 15 mm joint; membrane 5 / precast 120 / insulation 50 / timber 12 mm')
        roofs.append(roof)
    log('Native walls, slabs, doors and extrusion roofs created')
    dsels=[]
    markcounts={}
    def shape(n,solids,mat,cat=DB.BuiltInCategory.OST_GenericModel,mark=''):
        e=DB.DirectShape.CreateElement(doc,eid(cat)); e.Name=n
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
    # Foundation placeholders, steel bearers and ventilated floor void.
    for x in [.35,2.1,3.9,5.65]:
        for y in [.35,2.85]:
            box('Pad footing - provisional',x-.35,y-.35,-.5,.7,.7,.25,normal,DB.BuiltInCategory.OST_StructuralFoundation)
            box('Concrete pedestal - provisional',x-.15,y-.15,-.25,.3,.3,.43,normal,DB.BuiltInCategory.OST_StructuralFoundation)
    for y in [.15,2.9]: box('Steel floor bearer',0,y,.18,6,.15,.07,steel,DB.BuiltInCategory.OST_StructuralFraming)
    # Rear arched infill and front glazing, built as smooth solids.
    radius=(1.6**2+.9**2)/(2*.9); zc=3.65-radius
    def arc_z(y): return zc+math.sqrt(max(0,radius**2-(y-1.6)**2))
    def arch_infill(n,x,thick,mat,cat,y0=.15,y1=3.05,zbot=2.7):
        z0=arc_z(y0)-.14; z1=arc_z(y1)-.14; ym=(y0+y1)/2
        loop=DB.CurveLoop()
        loop.Append(li(p(x,y0,zbot),p(x,y1,zbot))); loop.Append(li(p(x,y1,zbot),p(x,y1,z1)))
        loop.Append(DB.Arc.Create(p(x,y1,z1),p(x,y0,z0),p(x,ym,arc_z(ym)-.14)))
        loop.Append(li(p(x,y0,z0),p(x,y0,zbot)))
        s=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisX,m(thick),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))
        return shape(n,[s],mat,cat)
    arch_infill('PC-WR upper curved infill',0,.15,concrete,DB.BuiltInCategory.OST_Walls,zbot=2.74)
    arch_infill('GL-02 arched transom',5.91,.012,glass,DB.BuiltInCategory.OST_Windows,zbot=2.6)
    # Front fixed sidelights and paired central sliding entrance.
    for ya,yb,n in [(.15,1.0,'GL-03 left fixed'),(1.0,2.2,'D01 sliding glazed entrance'),(2.2,3.05,'GL-04 right fixed')]:
        cat=DB.BuiltInCategory.OST_Doors if n.startswith('D01') else DB.BuiltInCategory.OST_Windows
        box(n,5.91,ya,.5,.012,yb-ya,2.08,glass,cat,n.split(' ')[0])
    for yy in [.12,.97,1.57,2.17,3.02]: box('Front aluminium mullion',5.875,yy,.45,.1,.05,2.2,metal)
    for zz in [.45,2.57]: box('Front aluminium rail',5.875,.12,zz,.1,2.95,.05,metal)
    box('Entrance pull handle',5.995,1.55,1.3,.025,.025,.35,metal)
    # Arched perimeter trim is segmented into fine solid quadrilaterals.
    for i in range(32):
        ya=.12+i*2.96/32; yb=.12+(i+1)*2.96/32
        za=arc_z(ya)-.13; zb=arc_z(yb)-.13
        loop=DB.CurveLoop(); pts=[p(5.875,ya,za),p(5.875,yb,zb),p(5.875,yb,zb-.045),p(5.875,ya,za-.045)]
        for k in range(4): loop.Append(li(pts[k],pts[(k+1)%4]))
        s=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisX,m(.1),DB.SolidOptions(metal.Id,DB.ElementId.InvalidElementId)); shape('Arched aluminium frame',[s],metal)
    box('Arched transom centre mullion',5.875,1.575,2.6,.1,.05,.87,metal)
    for xa,xb in [(1.86,2.96),(3.04,4.14)]:
        box('GL-05 service glazing',xa,.055,1.42,xb-xa,.012,.9,glass,DB.BuiltInCategory.OST_Windows)
    for zz in [1.39,2.32]: box('Service aluminium horizontal frame',1.83,-.01,zz,2.34,.09,.04,metal)
    for xx in [1.83,2.96,4.12]: box('Service aluminium vertical frame',xx,-.01,1.39,.04,.09,.97,metal)
    box('Service counter exterior oak ledge',1.75,-.4,1.35,2.5,.65,.05,timber,DB.BuiltInCategory.OST_Casework,'CW-03')
    box('Service hatch canopy',1.7,-.65,2.43,2.6,.8,.065,deckmat,DB.BuiltInCategory.OST_GenericModel,'CN-01')
    for xx in [1.8,4.1]: box('Canopy steel bracket',xx,-.5,2.25,.04,.04,.18,metal)
    # Deck L-shape; boards and support frame.
    for i in range(10): box('South deck board',-.3,-1.42+i*.145,.402,7.9,.139,.028,deckmat,DB.BuiltInCategory.OST_Floors)
    for i in range(24): box('Front deck board',6.05,.03+i*.145,.402,1.55,.139,.028,deckmat,DB.BuiltInCategory.OST_Floors)
    for x in [-.2,1.3,2.8,4.3,5.8,7.3]: box('Deck steel joist',x,-1.4,.25,.08,4.95 if x>6 else 1.4,.15,steel,DB.BuiltInCategory.OST_StructuralFraming)
    for yy in [-1.35,-.12,3.35]: box('Deck edge bearer',-.3 if yy<0 else 6.05,yy,.25,7.9 if yy<0 else 1.55,.08,.15,steel)
    for zz,xx,dd in [(.10,7.85,.4),(.25,7.6,.4)]: box('Entrance timber step',xx,.8,zz,dd,1.5,.15,deckmat,DB.BuiltInCategory.OST_Stairs)
    # A small ground slab provides a neutral context, not a surveyed site.
    box('Conceptual paving extent',-1,-2.1,-.06,10,6.4,.06,earth,DB.BuiltInCategory.OST_GenericModel)
    # Joinery, coffee equipment, display shelving and customer tables.
    cw=DB.BuiltInCategory.OST_Casework; furn=DB.BuiltInCategory.OST_Furniture; equip=DB.BuiltInCategory.OST_SpecialityEquipment
    box('CW-01 back counter cabinets',1.6,.17,.45,2.65,.52,.82,timber,cw,'CW-01')
    box('CW-01 dark worktop',1.58,.15,1.27,2.7,.57,.035,metal,cw)
    box('CW-02 coffee service island',1.75,1.12,.45,2.2,.6,.92,timber,cw,'CW-02')
    box('CW-02 worktop',1.72,1.09,1.37,2.26,.66,.04,timber,cw)
    box('Espresso machine',2.0,1.18,1.41,.65,.38,.4,metal,equip,'EQ-01')
    box('Espresso machine stainless face',2.0,1.55,1.51,.65,.015,.22,steel,equip)
    cylinder('Coffee grinder',2.87,1.4,1.41,.095,.4,metal,equip)
    cylinder('Grinder hopper',2.87,1.4,1.81,.09,.15,glass,equip)
    box('Under-counter refrigerator',3.3,1.15,.48,.55,.53,.8,metal,equip,'EQ-02')
    for zz in [1.72,2.08]:
        box('Wall display shelf',1.6,2.88,zz,2.5,.17,.035,timber,cw)
        for j in range(9): cylinder('Display canister',1.78+j*.25,2.965,zz+.035,.042,.13,white,equip)
    # Tables with chairs, legs and backrests, separately scheduled as furniture.
    def chair(x,y,angle):
        parts=[solid_box(-.2,-.2,.88,.4,.4,.045,timber)]
        for a in [-.17,.14]:
            for b in [-.17,.14]: parts.append(solid_box(a,b,.45,.035,.035,.43,metal))
        parts.append(solid_box(-.2,.17,.92,.4,.035,.36,timber))
        rot=DB.Transform.CreateRotation(DB.XYZ.BasisZ,angle); move=DB.Transform.CreateTranslation(p(x,y))
        shape('Cafe chair',[DB.SolidUtils.CreateTransformed(DB.SolidUtils.CreateTransformed(s,rot),move) for s in parts],timber,furn)
    def table(x,y,exterior=False):
        z=.43 if exterior else .45
        cylinder('Cafe round table',x,y,z+.72,.32,.035,timber,furn)
        cylinder('Table pedestal',x,y,z+.05,.035,.67,metal,furn)
        cylinder('Table base',x,y,z,.19,.035,metal,furn)
    for xx in [2.55,4.65]:
        table(xx,2.38); chair(xx-.55,2.38,math.pi/2); chair(xx+.55,2.38,-math.pi/2)
    for xx in [4.5,6.7]:
        table(xx,-.72,True); chair(xx-.5,-.72,math.pi/2); chair(xx+.5,-.72,-math.pi/2)
    # Sanitary fixtures: native family WC plus schematic basin and handwash sink.
    wcpath=r'C:\ProgramData\Autodesk\RVT 2026\Libraries\English\US\Plumbing\Architectural\Fixtures\Water Closets\M_Toilet-Domestic-3D.rfa'
    wf=clr.Reference[DB.Family](); doc.LoadFamily(wcpath,wf)
    ws=doc.GetElement(list(wf.Value.GetFamilySymbolIds())[0]); ws.Activate(); doc.Regenerate()
    wcinst=doc.Create.NewFamilyInstance(p(.65,.55,.45),ws,ffl,DB.Structure.StructuralType.NonStructural); meta(wcinst,'FX-01','WC layout placeholder; plumbing connection design excluded')
    box('WC hand basin',.18,1.04,1.2,.42,.43,.15,white,DB.BuiltInCategory.OST_PlumbingFixtures,'FX-02')
    box('Cafe stainless sink',3.6,.24,1.29,.46,.38,.045,steel,DB.BuiltInCategory.OST_PlumbingFixtures,'FX-03')
    for x,y in [(5.6,2.85),(6.9,3.1),(.8,-.55),(4.8,-.35)]:
        cylinder('Terracotta planter',x,y,.43,.17,.34,timber,furn)
        for j in range(5): cylinder('Plant foliage',x+(j%2)*.08-.04,y+(j//2)*.06-.06,.74,.065,.25+(j%3)*.15,green)
    # Pendant lights with actual lighting category, schematic equipment only.
    for xx in [2.2,3.6,5.0]:
        cylinder('Pendant suspension',xx,1.9,2.64,.006,.6,metal,DB.BuiltInCategory.OST_LightingFixtures)
        cylinder('Pendant shade',xx,1.9,2.57,.13,.08,metal,DB.BuiltInCategory.OST_LightingFixtures)
    # Sign disc facing service side.
    loop=DB.CurveLoop(); loop.Append(DB.Arc.Create(p(5.35,-.085,1.9),p(4.55,-.085,1.9),p(4.95,-.085,2.3))); loop.Append(DB.Arc.Create(p(4.55,-.085,1.9),p(5.35,-.085,1.9),p(4.95,-.085,1.5)))
    s=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisY,m(.04),DB.SolidOptions(metal.Id,DB.ElementId.InvalidElementId)); shape('BREW AND CO cafe sign',[s],metal)
    doc.Regenerate()
    rb=DB.CurveArray()
    for c in rect(.151,.151,5.899,3.049,.45): rb.Append(c)
    sp=DB.SketchPlane.Create(doc,DB.Plane.CreateByNormalAndOrigin(DB.XYZ.BasisZ,p(0,0,.45)))
    doc.Create.NewRoomBoundaryLines(sp,rb,plan)
    doc.Regenerate()
    for pt,n,num in [(DB.UV(m(.7),m(.9)),'WC','01'),(DB.UV(m(.7),m(2.4)),'STORE','02'),(DB.UV(m(4.9),m(2.0)),'CAFE / SERVICE','03')]:
        try:
            room=doc.Create.NewRoom(ffl,pt); room.Name=n; room.Number=num
        except Exception as ex: log('Room: '+str(ex))
    if tr.Commit()!=DB.TransactionStatus.Committed: raise Exception('Model transaction did not commit')
    log('Model transaction committed')

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
    ftext(23,44,'PRECAST MODULE CAFE  -  3.20 x 6.00 m',3.2)
    ftext(23,29,'CONCEPT DESIGN  /  FOR REVIEW  /  NOT FOR CONSTRUCTION',2.5)
    ftext(546,61,'PROJECT  PPE-PC-CAFE-001',2.5)
    ftext(546,50,'ISSUE  06 SEP 2026   -   REV  P01',2.5)
    ftext(727,61,'A1  -  841 x 594 mm',2.5)
    ftext(727,50,'UNITS mm  -  AS SHOWN',2.5)
    tx.Commit()
    save=DB.SaveAsOptions(); save.OverwriteExistingFile=True
    fd.SaveAs(os.path.join(OUT,'PPE_Engineering_A1.rfa'),save)
    family=fd.LoadFamily(doc); fd.Close(False)
    tb=doc.GetElement(list(family.GetFamilySymbolIds())[0])
    log('Title block created')
    tr=DB.Transaction(doc,'PPE cafe - views annotations schedules sheets'); tr.Start()
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
    for v in [plan,roofplan]: style(v); crop(v,-1,-2.3,-1,9,4.5,5)
    # Hide conceptual ground paving in drawings to keep linework legible.
    paving=next(e for e in dsels if name(e)=='Conceptual paving extent')
    for v in [plan,roofplan]: v.HideElements(List[DB.ElementId]([paving.Id]))
    # Model-referenced dimensions use reference planes at actual envelope coordinates.
    def plan_dimension(v,xvals,y,axis='x'):
        refs=DB.ReferenceArray()
        for val in xvals:
            if axis=='x': dc=doc.Create.NewDetailCurve(v,li(p(val,y-.1),p(val,y+.1)))
            else: dc=doc.Create.NewDetailCurve(v,li(p(y-.1,val),p(y+.1,val)))
            refs.Append(dc.GeometryCurve.Reference)
        if axis=='x': dl=li(p(xvals[0],y),p(xvals[-1],y))
        else: dl=li(p(y,xvals[0]),p(y,xvals[-1]))
        return doc.Create.NewDimension(v,dl,refs)
    plan_dimension(plan,[0,6],3.75); plan_dimension(plan,[0,1.5,3,4.5,6],3.45); plan_dimension(plan,[0,3.2],-.55,'y')
    plan_dimension(roofplan,[0,1.5,3,4.5,6],3.65); plan_dimension(roofplan,[0,3.2],-.55,'y')
    for x,y,s in [(.35,.8,'WC\n01'),(.25,2.7,'STORE\n02'),(4.4,1.8,'CAFE\n03'),(2.15,.95,'CW-02'),(2.0,-.48,'SERVICE HATCH'),(6.25,2.5,'TIMBER\nDECK'),(6.03,1.7,'D01'),(1.5,.7,'D02'),(1.5,2.5,'D03')]: textv(plan,x,y,s,2.2)
    for j in range(4): textv(roofplan,j*1.5+.45,1.65,'PC-R'+str(j+1),3)
    textv(roofplan,1.1,-1.85,'4 x 1500 nominal casting bays / 15 mm joints',2.5)
    # Native elevations created from elevation markers.
    elevs=[]
    for nm,pt,dirvec in [('EAST - Glazed entrance',p(8.7,1.6),DB.XYZ(-1,0,0)),('SOUTH - Service hatch',p(3,-3),DB.XYZ(0,1,0)),('WEST - Rear precast',p(-2,1.6),DB.XYZ(1,0,0)),('NORTH - Seating side',p(3,5.3),DB.XYZ(0,-1,0))]:
        marker=DB.ElevationMarker.CreateElevationMarker(doc,vft(DB.ViewFamily.Elevation).Id,pt,25)
        v=marker.CreateElevation(doc,plan.Id,0); doc.Regenerate()
        cur=v.ViewDirection; ang=math.atan2(dirvec.Y,dirvec.X)-math.atan2(cur.Y,cur.X)
        DB.ElementTransformUtils.RotateElement(doc,marker.Id,DB.Line.CreateBound(pt,pt+DB.XYZ.BasisZ),ang); doc.Regenerate()
        v.Name=nm; style(v)
        bb=v.CropBox; inv=bb.Transform.Inverse
        q=[inv.OfPoint(p(x,y,z)) for x in [-.5,8.3] for y in [-1.6,3.7] for z in [-.55,4.2]]
        bb.Min=DB.XYZ(min(a.X for a in q),min(a.Y for a in q),bb.Min.Z); bb.Max=DB.XYZ(max(a.X for a in q),max(a.Y for a in q),bb.Max.Z)
        v.CropBox=bb; v.CropBoxActive=True; v.CropBoxVisible=False
        setp(v,DB.BuiltInParameter.VIEWER_BOUND_OFFSET_FAR,m(14))
        v.HideElements(List[DB.ElementId]([paving.Id])); elevs.append(v)
    sections=[]
    for nm,org,right,direc,w,depth in [('SECTION A-A - Longitudinal',p(3,2.05,0),DB.XYZ(1,0,0),DB.XYZ(0,-1,0),4.5,3),('SECTION B-B - Transverse',p(4.4,1.6,0),DB.XYZ(0,1,0),DB.XYZ(1,0,0),2.65,2)]:
        trf=DB.Transform.Identity; trf.Origin=org; trf.BasisX=right; trf.BasisY=DB.XYZ.BasisZ; trf.BasisZ=direc
        bb=DB.BoundingBoxXYZ(); bb.Transform=trf; bb.Min=p(-w,-.7,0); bb.Max=p(w,4.25,depth)
        v=DB.ViewSection.CreateSection(doc,vft(DB.ViewFamily.Section).Id,bb); v.Name=nm; style(v,25); v.CropBoxVisible=False
        v.HideElements(List[DB.ElementId]([paving.Id])); sections.append(v)
        for z,l in [(0,'GROUND +0'),(.45,'FFL +450'),(2.75,'SPRING +2750'),(3.65,'CROWN +3650')]:
            linev(v,-w+.15,z,-w+.65,z); textv(v,-w+.15,z+.14,l,2)
    # Architectural 3D and cutaway views.
    axo=DB.View3D.CreateIsometric(doc,vft(DB.ViewFamily.ThreeDimensional).Id); axo.Name='3D - Exterior - PPE Cafe'
    cut=DB.View3D.CreateIsometric(doc,vft(DB.ViewFamily.ThreeDimensional).Id); cut.Name='3D - Interior cutaway - PPE Cafe'
    for v in [axo,cut]:
        v.Scale=25; v.DetailLevel=DB.ViewDetailLevel.Fine; v.DisplayStyle=DB.DisplayStyle.ShadingWithEdges
        forward=DB.XYZ(-1,1,-.68).Normalize(); right=forward.CrossProduct(DB.XYZ.BasisZ).Normalize(); up=right.CrossProduct(forward).Normalize()
        v.SetOrientation(DB.ViewOrientation3D(p(12,-10,9),up,forward))
        for cat in [DB.BuiltInCategory.OST_Levels,DB.BuiltInCategory.OST_CLines]: v.SetCategoryHidden(eid(cat),True)
    cut.HideElements(List[DB.ElementId]([e.Id for e in roofs]+[e.Id for e in walls if 'WS' in (e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString() or '')]))
    box3=DB.BoundingBoxXYZ(); box3.Min=p(-.6,-1.6,-.05); box3.Max=p(8.3,3.7,4.1); axo.SetSectionBox(box3)
    axo.IsSectionBoxActive=True
    # Sheet helper, with title block family plus native editable sheet annotations.
    sheets=[]
    def sheet(num,title):
        s=DB.ViewSheet.Create(doc,tb.Id); s.SheetNumber=num; s.Name=title
        textv(s,.546,.034,title,3,.17); textv(s,.728,.034,num,7)
        textv(s,.023,.570,num+'   /   '+title.upper(),5)
        sheets.append(s); return s
    def note(s,x,y,txt,size=3,width=None): return textv(s,x/1000.,y/1000.,txt,size,width/1000. if width else None)
    def vp(s,v,x,y,label):
        e=DB.Viewport.Create(doc,s.Id,v.Id,p(x/1000.,y/1000.)); doc.Regenerate()
        # Suppress the stock long title line; use consistent native sheet titles.
        typ=doc.GetElement(e.GetTypeId())
        setp(typ,DB.BuiltInParameter.VIEWPORT_ATTR_SHOW_LABEL,0)
        note(s,x-90,y-105,label,3.2)
        return e
    s0=sheet('A001','Design overview and material basis')
    vp(s0,axo,285,343,'01  EXTERIOR AXONOMETRIC  /  1:25')
    note(s0,557,525,'DESIGN BASIS',4)
    note(s0,557,510,'Reference: supplied cafe concept image.\nSelected form: barrel-vault precast module.\nEnvelope: 6000 L x 3200 W.\nFFL +450; roof crown +3650.\nHeight above FFL: 3200.\nFacade: glazed entrance + side sales hatch.\n4 internal + 4 external seats indicated.',3,250)
    note(s0,557,435,'MATERIAL PROPOSAL',4)
    note(s0,557,420,'PC-01  Structural lightweight precast:\n150 wall / 180 floor / 120 roof core.\n35 MPa and 1800 kg/m3 are proposed only.\nImage density 1200 kg/m3 remains unverified.\nRoof: 5 membrane + 120 PC + 50 insulation\n+ 12 timber lining = 187 nominal.\nGL-01  6+6 laminated glass, black frames.\nWD-01  Oak lining and sealed joinery.\nWD-02  28 timber deck, 6 open joints.\nFL-02  Anti-slip tile in wet/service rooms.',3,250)
    note(s0,557,303,'COORDINATION REQUIRED',4)
    note(s0,557,288,'Confirm site, survey, soil and planning limits.\nEngineer to design reinforcement, supports,\nconnections, lifting anchors and transport.\nMEP routing, drainage, ventilation and cooling\nare not designed in this architectural model.\nStep access shown; accessible route and WC\nlayout require site-specific coordination.\nNo strength or code compliance is certified.',3,250)
    note(s0,38,165,'MODEL CONTENT',4)
    note(s0,38,150,'Native Revit walls, layered floors, curved extrusion roofs, hosted internal doors, rooms, views and sheets.\nCustom glazing, joinery, furniture and secondary components use categorized DirectShape geometry.\nPanel seams are 15 mm. Connection details are schematic; no reinforcement or lifting hardware is released.',3,485)
    s1=sheet('A101','Floor plan and roof layout')
    vp(s1,plan,226,365,'01  FURNITURE / FLOOR PLAN  /  1:25')
    vp(s1,roofplan,625,365,'02  ROOF PANEL LAYOUT  /  1:25')
    note(s1,40,200,'LAYOUT NOTES',4)
    note(s1,40,184,'01 WC and 02 store are enclosed rooms. 03 cafe includes bar, service counter and seating.\nD01: 1200 wide sliding glazed entrance. D02/D03: nominal 800 x 2100 internal doors.\nExternal deck: 1400 wide along service facade; 1550 projection at glazed end.\nFloor structural panels: 3 x 2000 nominal bays. Walls/roof: 4 x 1500 nominal bays.',3,745)
    note(s1,40,125,'Dimensions are in mm. Envelope dimensions refer to outer precast faces. View dimensions use witness lines\nat these coordinates; recheck witness lines when editing the design. North orientation is not site-established.',2.7,740)
    s2=sheet('A201','External elevations')
    for v,x,y,label in [(elevs[0],230,435,'01  EAST / ENTRANCE  /  1:25'),(elevs[2],630,435,'02  WEST / REAR  /  1:25'),(elevs[1],230,219,'03  SOUTH / SERVICE  /  1:25'),(elevs[3],630,219,'04  NORTH / SEATING  /  1:25')]: vp(s2,v,x,y,label)
    s3=sheet('A301','Building sections')
    vp(s3,sections[0],243,361,'01  SECTION A-A  /  1:25')
    vp(s3,sections[1],644,361,'02  SECTION B-B  /  1:25')
    note(s3,40,185,'SECTION / ENVELOPE NOTES',4)
    note(s3,40,169,'FFL +450; structural slab top +430, soffit +250. Nominal roof spring +2750, crown +3650.\nRoof layers follow the curved profile. Floor void and steel bearers are provisional.\nPrecast concrete strength, density, reinforcement, bearing and connections require structural design.\nRoof waterproofing continuity across panel seams is required. Detail membrane terminations and drainage\nwith the selected supplier. Ceiling ventilation and condensation control require climate/site coordination.',3,750)
    # Native drafting details on a clear 1:5 sheet. Each uses real annotation geometry.
    detail=DB.ViewDrafting.Create(doc,vft(DB.ViewFamily.Drafting).Id); detail.Name='D501 - Schematic precast interfaces'; detail.Scale=5
    def drect(x,y,w,h):
        for a,b,c,d in [(x,y,x+w,y),(x+w,y,x+w,y+h),(x+w,y+h,x,y+h),(x,y+h,x,y)]: linev(detail,a,b,c,d)
    # Three details separated horizontally in model space; no implied engineered anchors.
    drect(0,0,.7,.18); drect(.2,.205,.15,.7); drect(.18,.18,.19,.025)
    textv(detail,-.03,1.13,'01  WALL / FLOOR BEARING',3)
    textv(detail,.42,.86,'150 PC wall',2.5); textv(detail,.42,.55,'25 grout bed\nnominal',2.5)
    linev(detail,.42,.46,.35,.205); textv(detail,.02,-.08,'180 PC slab\nDowel / sleeve by engineer',2.5)
    drect(1.5,.2,.3,.55); drect(1.815,.2,.3,.55)
    linev(detail,1.8,.65,1.815,.65); linev(detail,1.8,.7,1.815,.7)
    textv(detail,1.48,1.13,'02  VERTICAL PANEL JOINT',3)
    textv(detail,1.48,.06,'15 nominal joint\nBacker rod + flexible sealant\nStructural connector by engineer',2.5)
    linev(detail,1.81,.7,2.2,.9); textv(detail,2.08,.98,'Weather seal',2.5)
    drect(3.15,.2,.32,.12); drect(3.485,.2,.32,.12)
    linev(detail,3.15,.335,3.8,.335); linev(detail,3.15,.15,3.8,.15); linev(detail,3.15,.138,3.8,.138)
    textv(detail,3.1,1.13,'03  ROOF PANEL INTERFACE',3)
    textv(detail,3.1,.95,'5 membrane bridging joint\n120 precast core\n50 insulation + 12 timber lining',2.5)
    textv(detail,3.1,.05,'15 nominal joint\nTongue / groove and bearing\nsubject to structural / supplier design',2.5)
    s4=sheet('A501','Schematic connection details')
    vp(s4,detail,420,358,'01-03  PRECAST INTERFACES  /  1:5')
    note(s4,40,172,'DETAIL STATUS',4)
    note(s4,40,155,'These details communicate the intended assembly and weathering strategy only.\nNo anchor capacity, reinforcement, tongue-and-groove dimensions or lifting design has been established.\nConfirm tolerances, movement, fire protection, corrosion protection and build sequence before shop drawings.',3,740)
    # Native material take-off schedules for actual system elements.
    schedules=[]
    for cat,nm in [(DB.BuiltInCategory.OST_Walls,'Q01 - Precast wall material quantities'),(DB.BuiltInCategory.OST_Floors,'Q02 - Floor material quantities'),(DB.BuiltInCategory.OST_Roofs,'Q03 - Roof material quantities')]:
        sch=DB.ViewSchedule.CreateMaterialTakeoff(doc,eid(cat)); sch.Name=nm; de=sch.Definition
        fields=list(de.GetSchedulableFields())
        for bip in [DB.BuiltInParameter.MATERIAL_NAME,DB.BuiltInParameter.MATERIAL_VOLUME]:
            sf=next((f for f in fields if f.ParameterId==eid(bip)),None)
            if sf:
                fld=de.AddField(sf); fld.GridColumnWidth=m(.11 if bip==DB.BuiltInParameter.MATERIAL_NAME else .05)
                if bip==DB.BuiltInParameter.MATERIAL_VOLUME: fld.DisplayType=DB.ScheduleFieldDisplayType.Totals
                else:
                    sort=DB.ScheduleSortGroupField(fld.FieldId); de.AddSortGroupField(sort)
        de.IsItemized=False; de.ShowGrandTotal=True; de.ShowGrandTotalTitle=True
        schedules.append(sch)
    s5=sheet('A601','Material quantities and interior')
    for sch,x,y in [(schedules[0],35,525),(schedules[1],35,390),(schedules[2],35,255)]: DB.ScheduleSheetInstance.Create(doc,s5.Id,sch.Id,p(x/1000.,y/1000.))
    vp(s5,cut,560,362,'01  INTERIOR CUTAWAY  /  1:25')
    note(s5,335,163,'QUANTITY BASIS',4)
    note(s5,335,147,'Live Revit material take-offs include the modelled elements in each category.\nValues are concept quantities, without procurement waste or connection steel.\nDirectShape components are editable by replacement; system elements are native.\nNo reinforcing steel quantity is included.',2.8,465)
    doc.Regenerate()
    tr.Commit(); log('Views and sheets committed')
    # Save genuine RVT and export coordinated drawing set and preview.
    rvtpath=os.path.join(OUT,'PPE_Engineering_Precast_Cafe_R2026.rvt')
    save=DB.SaveAsOptions(); save.OverwriteExistingFile=True; save.MaximumBackups=1
    doc.SaveAs(rvtpath,save); log('SAVED '+rvtpath)
    manifest={'revitVersion':app.VersionNumber,'rvt':rvtpath,'sheets':[{'number':s.SheetNumber,'name':s.Name,'id':int(s.Id.Value)} for s in sheets], 'nativeWalls':len(list(DB.FilteredElementCollector(doc).OfClass(DB.Wall))), 'nativeFloors':len(list(DB.FilteredElementCollector(doc).OfClass(DB.Floor))), 'nativeRoofs':len(roofs),'directShapes':len(dsels),'roofBounds':[],'warnings':[]}
    for r in roofs:
        b=r.get_BoundingBox(None); manifest['roofBounds'].append({'mark':r.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString(),'min':[v*.3048 for v in [b.Min.X,b.Min.Y,b.Min.Z]],'max':[v*.3048 for v in [b.Max.X,b.Max.Y,b.Max.Z]]})
    for w in doc.GetWarnings(): manifest['warnings'].append(w.GetDescriptionText())
    try:
        opts=DB.PDFExportOptions(); opts.Combine=True; opts.FileName='PPE_Engineering_Cafe_Drawings'; opts.PaperFormat=DB.ExportPaperFormat.Default
        manifest['pdfExport']=doc.Export(OUT,List[DB.ElementId]([s.Id for s in sheets]),opts); log('PDF exported')
    except Exception as ex: manifest['pdfError']=str(ex); log('PDF '+str(ex))
    try:
        opts=DB.ImageExportOptions(); opts.ExportRange=DB.ExportRange.SetOfViews; opts.SetViewsAndSheets(List[DB.ElementId]([axo.Id]+[s.Id for s in sheets])); opts.FilePath=os.path.join(OUT,'PPE'); opts.HLRandWFViewsFileType=DB.ImageFileType.PNG; opts.ShadowViewsFileType=DB.ImageFileType.PNG; opts.ImageResolution=DB.ImageResolution.DPI_150; opts.ZoomType=DB.ZoomFitType.FitToPage; opts.PixelSize=2200; doc.ExportImage(opts); log('Previews exported')
    except Exception as ex: log('Image '+str(ex))
    with codecs.open(os.path.join(OUT,'model-audit.json'),'w','utf-8') as f: f.write(json.dumps(manifest,indent=2))
    revit.uidoc.Application.OpenAndActivateDocument(rvtpath)
    revit.uidoc.ActiveView=axo
    log('COMPLETE')
except Exception:
    log(traceback.format_exc())
    try:
        if tr and tr.HasStarted(): tr.RollBack()
    except: pass
    try:
        if doc and doc.IsValidObject and not doc.IsModifiable: doc.Close(False)
    except: pass
    raise
