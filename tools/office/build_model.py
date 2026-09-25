# -*- coding: utf-8 -*-
"""PPE ARCH OFFICE: independent new Revit project, lightweight precast concept."""
import os, math, json, traceback, codecs
import clr
from System import Guid
from System.Collections.Generic import List
from pyrevit import DB, revit
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
OUT=os.path.join(ROOT,'deliverables','PPE_Modular_Office')
LOG=os.path.join(OUT,'build-log.txt')
CURRENT='ARC'
elements=[]
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
    for key,value in [('PPE_WorkPackage',CURRENT),('PPE_ModuleID','M01' if CURRENT!='SITE' else 'SITE'),('PPE_Assembly',mark.split('-')[0]),('PPE_InstallStage','FACTORY' if CURRENT=='MOD' else ('FACTORY FITOUT' if CURRENT=='ARC' else 'SITE ASSEMBLY')),('PPE_Specification',desc)]:
        q=e.LookupParameter(key)
        if q and not q.IsReadOnly:q.Set(value)
    if e.Id not in [a.Id for a in elements]:elements.append(e)
    return e
def rect(x0,y0,x1,y1,z=0):
    pts=[p(x0,y0,z),p(x1,y0,z),p(x1,y1,z),p(x0,y1,z)]
    c=DB.CurveLoop()
    for i in range(4): c.Append(li(pts[i],pts[(i+1)%4]))
    return c
def solid_box(x,y,z,dx,dy,dz,mat):
    return DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([rect(x,y,x+dx,y+dy,z)]),DB.XYZ.BasisZ,m(dz),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))

log('\nSTART PPE ARCH OFFICE')
app=revit.doc.Application
doc=None
try:
    doc=app.NewProjectDocument(r'C:\ProgramData\Autodesk\RVT 2026\Templates\English\DefaultMetric.rte')
    tr=DB.Transaction(doc,'PPE modular precast office - model'); tr.Start()
    units=DB.Units(DB.UnitSystem.Metric)
    fo=DB.FormatOptions(DB.UnitTypeId.Millimeters); fo.Accuracy=1.0
    units.SetFormatOptions(DB.SpecTypeId.Length,fo); doc.SetUnits(units)
    info=doc.ProjectInformation
    info.Name='ARCH OFFICE - LIGHTWEIGHT PRECAST'; info.Number='PPE-PC-OFF-001'
    info.ClientName='PPE Engineering'; info.BuildingName='Site office 3000 x 6000 - 4 staff + 2 visitors'
    info.Author='PPE Engineering'; info.IssueDate='15 September 2026'
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
    concrete=material('Precast','PC-01 - Structural lightweight precast - proposed',(179,175,164),0,'PROPOSED: 35 MPa / density 1800 kg/m3. Supplier and structural design to verify. Structural lightweight aggregate concrete, not AAC blockwork. Values require mix design and test confirmation.')
    normal=material('Foundation','RC-01 - Reinforced concrete footing - provisional',(143,145,142),0,'PROVISIONAL substructure geometry only; geotechnical and foundation design required.')
    timber=material('Timber','WD-01 - Warm oak interior finish',(154,106,61),0,'12 mm oak veneer curved ceiling lining; sealed washable finish to joinery.')
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

    # Stable shared instance parameters used in filters, schedules and component register.
    shared=os.path.join(OUT,'PPE_Office_SharedParameters.txt')
    if not os.path.isfile(shared):
        with open(shared,'w') as f:f.write('# This is a Revit shared parameter file.\n*META\tVERSION\tMINVERSION\nMETA\t2\t1\n*GROUP\tID\tNAME\n*PARAM\tGUID\tNAME\tDATATYPE\tDATACATEGORY\tGROUP\tVISIBLE\tDESCRIPTION\tUSERMODIFIABLE\tHIDEWHENNOVALUE\n'.replace('\\t','\t').replace('\\n','\n'))
    savedShared=app.SharedParametersFilename
    app.SharedParametersFilename=shared
    sf=app.OpenSharedParameterFile()
    group=sf.Groups.get_Item('PPE Office') or sf.Groups.Create('PPE Office')
    cats=app.Create.NewCategorySet()
    catnames=['OST_Walls','OST_Floors','OST_Roofs','OST_GenericModel','OST_Doors','OST_Windows','OST_Casework','OST_Furniture','OST_StructuralFoundation','OST_StructuralFraming','OST_LightingFixtures','OST_MechanicalEquipment','OST_ElectricalFixtures','OST_SpecialityEquipment','OST_Stairs']
    for key in catnames:cats.Insert(DB.Category.GetCategory(doc,getattr(DB.BuiltInCategory,key)))
    definitions={}
    for i,key in enumerate(['PPE_WorkPackage','PPE_ModuleID','PPE_Assembly','PPE_InstallStage','PPE_Specification']):
        d=group.Definitions.get_Item(key)
        if not d:
            opt=DB.ExternalDefinitionCreationOptions(key,DB.SpecTypeId.String.Text)
            opt.GUID=Guid('135aa460-7e99-4330-b8aa-917032ed500'+str(i));opt.Description='PPE office component identity and installation scope'
            d=group.Definitions.Create(opt)
        doc.ParameterBindings.Insert(d,app.Create.NewInstanceBinding(cats),DB.GroupTypeId.IdentityData);definitions[key]=d
    app.SharedParametersFilename=savedShared
    asset=DB.StructuralAsset('PPE structural lightweight concrete - proposed 35 MPa 1800 kg/m3',DB.StructuralAssetClass.Concrete)
    asset.Density=DB.UnitUtils.ConvertToInternalUnits(1800,DB.UnitTypeId.KilogramsPerCubicMeter)
    asset.ConcreteCompression=DB.UnitUtils.ConvertToInternalUnits(35,DB.UnitTypeId.Megapascals)
    concrete.StructuralAssetId=DB.PropertySetElement.Create(doc,asset).Id
    setp(info,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,'User brief: 3 x 6 m lightweight PRECAST office; 4 workstations + 2 meeting seats; external WC. Concept panelized kit assembled on site. No whole-module lifting approval. MOD precast; ARC fitout; SITE external works.')
    wt=typ(DB.WallType,'MOD - PC-W - Lightweight precast wall 150',[(.15,structure,concrete)])
    ft=typ(DB.FloorType,'MOD - PC-F - Lightweight precast floor 180',[(.18,structure,concrete)])
    fft=typ(DB.FloorType,'ARC - FL-01 - Oak-look resilient finish 20',[(.02,structure,timber)])
    rt=typ(DB.RoofType,'MOD - PC-R - Lightweight precast curved roof 120',[(.12,structure,concrete)])
    crt=typ(DB.RoofType,'ARC - CL-01 - Insulated oak curved ceiling 62',[(.05,structure,insul),(.012,DB.MaterialFunctionAssignment.Finish2,timber)])
    wrt=typ(DB.RoofType,'ARC - WP-01 - Continuous roof membrane 5',[(.005,structure,membrane)])
    levs=list(DB.FilteredElementCollector(doc).OfClass(DB.Level))
    ffl=min(levs,key=lambda e:abs(e.Elevation));ffl.Name='01 FFL +450';ffl.Elevation=m(.45)
    ground=DB.Level.Create(doc,0);ground.Name='00 GROUND +000'
    spring=DB.Level.Create(doc,m(2.8));spring.Name='02 ROOF SPRING +2800'
    crown=DB.Level.Create(doc,m(3.455));crown.Name='03 ROOF CROWN +3455'
    vf=list(DB.FilteredElementCollector(doc).OfClass(DB.ViewFamilyType))
    vft=lambda f:next(e for e in vf if e.ViewFamily==f)
    plan=DB.ViewPlan.Create(doc,vft(DB.ViewFamily.FloorPlan).Id,ffl.Id);plan.Name='A101 - Office furniture plan'
    roofplan=DB.ViewPlan.Create(doc,vft(DB.ViewFamily.FloorPlan).Id,crown.Id);roofplan.Name='A102 - Precast roof panel plan'
    vr=roofplan.GetViewRange()
    for key,off in [(DB.PlanViewPlane.TopClipPlane,1.2),(DB.PlanViewPlane.CutPlane,1.0),(DB.PlanViewPlane.BottomClipPlane,-1.0),(DB.PlanViewPlane.ViewDepthPlane,-1.0)]:
        vr.SetLevelId(key,crown.Id);vr.SetOffset(key,m(off))
    roofplan.SetViewRange(vr)
    def wall(x0,y0,x1,y1,t,h,mark,z=.45):
        e=DB.Wall.Create(doc,li(p(x0,y0),p(x1,y1)),t.Id,ffl.Id,m(h),m(z-.45),False,False)
        DB.WallUtils.DisallowWallJoinAtEnd(e,0);DB.WallUtils.DisallowWallJoinAtEnd(e,1)
        return meta(e,mark,'MOD: factory-cast structural lightweight concrete wall 150 mm; panelized assembly; reinforcement and connectors by engineer')
    CURRENT='MOD';walls=[];southids=[];roofids=[]
    for side,y in [('S',.075),('N',2.925)]:
        for j in range(4):
            e=wall(j*1.5+.0075,y,(j+1)*1.5-.0075,y,wt,2.35,'PC-W'+side+str(j+1));walls.append(e)
            if side=='S':southids.append(e.Id)
            a=j*1.5+.22;b=(j+1)*1.5-.22
            if side=='N' or j<3:doc.Create.NewOpening(e,p(a,y,1.35),p(b,y,2.35))
    rear=wall(.075,.15,.075,2.85,wt,2.35,'PC-WR');walls.append(rear)
    floors=[]
    for j in range(3):
        e=DB.Floor.Create(doc,List[DB.CurveLoop]([rect(j*2+.0075,0,(j+1)*2-.0075,3)]),ft.Id,ffl.Id)
        setp(e,DB.BuiltInParameter.FLOOR_HEIGHTABOVELEVEL_PARAM,m(-.02));meta(e,'PC-F'+str(j+1),'MOD: 180 mm precast floor; 2000 nominal bay; top +430 / soffit +250; design bearing and handling');floors.append(e)
    CURRENT='ARC'
    e=DB.Floor.Create(doc,List[DB.CurveLoop]([rect(.15,.15,5.88,2.85)]),fft.Id,ffl.Id);meta(e,'FL-01','ARC: 20 mm finish build-up, oak-look resilient floor and levelling substrate, final FFL +450')
    roofs=[];linings=[]
    def curved_roof(x,length,t,zs,zc,mark):
        rp=doc.Create.NewReferencePlane(p(x,0,0),p(x,3,0),DB.XYZ.BasisZ,plan);rp.Name='PPE '+mark+' extrusion plane'
        curves=DB.CurveArray();curves.Append(DB.Arc.Create(p(x,0,zs),p(x,3,zs),p(x,1.5,zc)))
        sign=1 if rp.Normal.X>0 else -1
        r=doc.Create.NewExtrusionRoof(curves,rp,ground,t,min(0,sign*m(length)),max(0,sign*m(length)))
        meta(r,mark,name(t)+'; supplier to develop curved profile, supports and movement details');return r
    for j in range(4):
        CURRENT='MOD';r=curved_roof(j*1.5+.0075,1.485,rt,2.8,3.45,'PC-R'+str(j+1));roofs.append(r);roofids.append(r.Id)
    CURRENT='ARC'
    # Curved interior ceiling is separately modelled and classified from the concrete shell.
    r=curved_roof(.16,5.69,crt,2.62,3.27,'CL-01');linings.append(r);roofids.append(r.Id)
    r=curved_roof(0,6,wrt,2.805,3.455,'WP-01');linings.append(r);roofids.append(r.Id)
    doc.Regenerate()
    for r in roofs:
        for w in walls:
            try:DB.JoinGeometryUtils.JoinGeometry(doc,r,w)
            except:pass
    log('Native lightweight precast shell and separate architectural layers created')
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

    CURRENT='SITE'
    for xx in [.3,2.1,3.9,5.7]:
        for yy in [.30,2.7]:
            box('SITE - RC pad footing - provisional',xx-.32,yy-.32,-.55,.64,.64,.25,normal,DB.BuiltInCategory.OST_StructuralFoundation,'FD-01')
            box('SITE - RC pedestal - provisional',xx-.15,yy-.15,-.30,.3,.3,.55,normal,DB.BuiltInCategory.OST_StructuralFoundation,'FD-02')
    # Only a provisional support arrangement; no lifting frame is asserted.
    radius=(1.5**2+.65**2)/(2*.65);zc=3.45-radius
    def arc_z(y):return zc+math.sqrt(max(0,radius**2-(y-1.5)**2))
    def arch_infill(n,x,thick,mat,cat,y0=.15,y1=2.85,zbot=2.75,offset=.12,mark=''):
        z0=arc_z(y0)-offset;z1=arc_z(y1)-offset;ym=(y0+y1)/2
        loop=DB.CurveLoop();loop.Append(li(p(x,y0,zbot),p(x,y1,zbot)));loop.Append(li(p(x,y1,zbot),p(x,y1,z1)))
        loop.Append(DB.Arc.Create(p(x,y1,z1),p(x,y0,z0),p(x,ym,arc_z(ym)-offset)));loop.Append(li(p(x,y0,z0),p(x,y0,zbot)))
        s=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisX,m(thick),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))
        return shape(n,[s],mat,cat,mark)
    CURRENT='MOD'
    arch_infill('MOD - Rear curved precast infill',0,.15,concrete,DB.BuiltInCategory.OST_Walls,zbot=2.78,offset=.115,mark='PC-WR-T')
    CURRENT='ARC'
    arch_infill('ARC - Arched safety-glass transom',5.91,.012,glass,DB.BuiltInCategory.OST_Windows,zbot=2.6,offset=.14,mark='GL-T')
    # 1200 nominal sliding entrance, fixed sidelights, arched transom.
    for ya,yb,n in [(.15,1.05,'GL-L'),(1.05,2.25,'D01'),(2.25,2.85,'GL-R')]:
        box('ARC - '+n+' laminated glass',5.91,ya,.5,.012,yb-ya,2.07,glass,DB.BuiltInCategory.OST_Doors if n=='D01' else DB.BuiltInCategory.OST_Windows,n)
    for yy in [.12,1.02,1.62,2.22,2.82]:box('ARC - Entrance mullion',5.875,yy,.45,.1,.05,2.15,metal,mark='AL-F')
    for zz in [.45,2.57]:box('ARC - Entrance head and sill',5.875,.12,zz,.1,2.75,.05,metal,mark='AL-F')
    box('ARC - Door pull handle',5.985,1.64,1.25,.025,.025,.35,metal,mark='D-H')
    # A single smooth arched trim assembled from small solids, counted once.
    parts=[]
    for i in range(40):
        ya=.12+i*2.76/40;yb=.12+(i+1)*2.76/40;za=arc_z(ya)-.13;zb=arc_z(yb)-.13
        loop=DB.CurveLoop();pts=[p(5.875,ya,za),p(5.875,yb,zb),p(5.875,yb,zb-.045),p(5.875,ya,za-.045)]
        for k in range(4):loop.Append(li(pts[k],pts[(k+1)%4]))
        parts.append(DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisX,m(.1),DB.SolidOptions(metal.Id,DB.ElementId.InvalidElementId)))
    shape('ARC - Black arched fascia',parts,metal,mark='AL-ARCH')
    box('ARC - Arched transom mullion',5.875,1.47,2.62,.1,.05,.68,metal,mark='AL-T')
    for side,y in [('S',.07),('N',2.92)]:
        for j in range(4 if side=='N' else 3):
            xa=j*1.5+.22;xb=(j+1)*1.5-.22
            gl=box('ARC - '+side+' office daylight window',xa,y,1.36,xb-xa,.012,.98,glass,DB.BuiltInCategory.OST_Windows,'W'+side+str(j+1))
            if side=='S':southids.append(gl.Id)
            for zz in [1.32,2.32]:
                e=box('ARC - Window rail',xa-.025,y-.035,zz,xb-xa+.05,.08,.04,metal,mark='AL-W')
                if side=='S':southids.append(e.Id)
            for xx in [xa-.025,xb-.015]:
                e=box('ARC - Window jamb',xx,y-.035,1.32,.04,.08,1.04,metal,mark='AL-W')
                if side=='S':southids.append(e.Id)
    # Warm timber highlights around the meeting corner, removable exterior package.
    for j in range(10):
        e=box('ARC - Timber accent batten',4.56+j*.117,-.055,.57,.04,.04,1.96,timber,mark='WD-B');southids.append(e.Id)
    box('ARC - Office sign panel',4.72,-.105,1.62,.93,.04,.36,metal,mark='SG-01')
    CURRENT='SITE'
    canopy=box('SITE - Detachable south sunshade',.1,-.65,2.46,4.35,.65,.065,deckmat,mark='CN-01');southids.append(canopy.Id)
    for xx in [.25,1.6,3.0,4.2]:
        e=box('SITE - Sunshade bracket',xx,-.48,2.28,.04,.04,.18,metal,mark='CN-B');southids.append(e.Id)
    # Independent 1500 x 3000 arrival terrace, two steps. Site access to be coordinated.
    for j in range(20):box('SITE - Removable deck board',6.02,j*.15,.422,1.5,.144,.028,deckmat,DB.BuiltInCategory.OST_Floors,'DK-01')
    for yy in [.1,1.45,2.85]:box('SITE - Deck steel bearer',6.03,yy,.25,1.45,.07,.17,steel,DB.BuiltInCategory.OST_StructuralFraming,'DK-B')
    for xx,zz in [(7.52,.15),(7.82,0)]:box('SITE - Entry step',xx,.9,zz,.3,1.5,.15,deckmat,DB.BuiltInCategory.OST_Stairs,'ST-01')
    paving=box('SITE - Concept paving extent',-.6,-1.0,-.055,9.25,4.6,.055,earth,mark='LS-01')
    CURRENT='ARC';cw=DB.BuiltInCategory.OST_Casework;furn=DB.BuiltInCategory.OST_Furniture
    def chair(x,y,angle,n='Task chair',mark='CH-01'):
        parts=[solid_box(-.23,-.23,.88,.46,.46,.05,metal)]
        for a in [-.18,.15]:
            for b in [-.18,.15]:parts.append(solid_box(a,b,.45,.03,.03,.43,metal))
        parts.append(solid_box(-.23,.19,.93,.46,.04,.37,timber))
        rot=DB.Transform.CreateRotation(DB.XYZ.BasisZ,angle);move=DB.Transform.CreateTranslation(p(x,y))
        return shape('ARC - '+n,[DB.SolidUtils.CreateTransformed(DB.SolidUtils.CreateTransformed(s,rot),move) for s in parts],timber,furn,mark)
    for j in range(4):
        xx=.30+j*1.1
        parts=[solid_box(xx,2.3,1.17,1.08,.55,.03,timber)]
        for dx in [.04,1.0]:
            for yy in [2.34,2.77]:parts.append(solid_box(xx+dx,yy,.45,.035,.035,.72,metal))
        shape('ARC - Workstation 1100 x 550',parts,timber,furn,'WS-'+str(j+1))
        chair(xx+.54,2.0,math.pi,'Task chair','CH-01')
        box('ARC - Desktop monitor',xx+.32,2.68,1.3,.47,.025,.28,metal,DB.BuiltInCategory.OST_SpecialityEquipment,'IT-01')
        box('ARC - Monitor stand',xx+.5,2.64,1.2,.1,.12,.1,metal,mark='IT-S')
        box('ARC - Keyboard',xx+.35,2.40,1.2,.4,.15,.018,metal,mark='IT-K')
    # Two visitor seats occupy the front south corner without blocking the entrance.
    cylinder('ARC - Meeting table top',4.84,.59,1.17,.29,.035,timber,furn)
    cylinder('ARC - Meeting table stem',4.84,.59,.49,.035,.68,metal,furn)
    cylinder('ARC - Meeting table base',4.84,.59,.45,.20,.04,metal,furn)
    chair(4.22,.59,math.pi/2,'Visitor chair','CH-02');chair(5.46,.59,-math.pi/2,'Visitor chair','CH-02')
    box('ARC - Low document cabinet',.65,.16,.45,1.35,.38,.72,timber,cw,'CW-01')
    box('ARC - Personal lockers',2.15,.16,.45,1.1,.38,1.05,timber,cw,'CW-02')
    box('ARC - Printer',.95,.21,1.17,.48,.28,.24,white,DB.BuiltInCategory.OST_SpecialityEquipment,'EQ-01')
    box('ARC - Pinboard',.17,.6,1.35,.025,1.15,.75,timber,cw,'CW-03')
    box('ARC - Split AC indoor unit - capacity TBD',.16,.82,2.26,.20,.9,.26,white,DB.BuiltInCategory.OST_MechanicalEquipment,'AC-01')
    for xx in [1.1,2.6,4.1]:
        box('ARC - Linear LED luminaire',xx,1.44,2.91,.85,.05,.035,white,DB.BuiltInCategory.OST_LightingFixtures,'LT-01')
    for xx in [.8,1.9,3.0,4.1]:box('ARC - Power and data point - schematic',xx,2.82,1.25,.10,.03,.07,white,DB.BuiltInCategory.OST_ElectricalFixtures,'EL-01')
    cylinder('ARC - Interior planter',5.5,2.58,.45,.17,.34,timber,furn)
    for j in range(5):cylinder('ARC - Interior foliage',5.5+(j%2)*.07-.035,2.58+(j//2)*.06-.06,.77,.055,.25+j*.06,green)
    CURRENT='SITE'
    cylinder('SITE - Terrace planter',7.13,2.65,.45,.19,.4,timber,furn)
    for j in range(6):cylinder('SITE - Terrace foliage',7.13+(j%2)*.1-.05,2.65+(j//2)*.07-.07,.84,.065,.35+j*.08,green)
    CURRENT='ARC';doc.Regenerate()
    # Continuous outer room boundary; the front glazing is a categorized custom component.
    rb=DB.CurveArray()
    for c in rect(.151,.151,5.899,2.849,.45):rb.Append(c)
    sp=DB.SketchPlane.Create(doc,DB.Plane.CreateByNormalAndOrigin(DB.XYZ.BasisZ,p(0,0,.45)))
    doc.Create.NewRoomBoundaryLines(sp,rb,plan);doc.Regenerate()
    room=doc.Create.NewRoom(ffl,DB.UV(m(3.4),m(1.2)));room.Name='OFFICE - 4 STAFF + 2 VISITORS';room.Number='01'
    if tr.Commit()!=DB.TransactionStatus.Committed:raise Exception('Model did not commit')
    log('Model committed: '+str(len(elements))+' classified elements')
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
    ftext(23,44,'PRECAST ARCH OFFICE  -  3.00 x 6.00 m',3.2)
    ftext(23,29,'CONCEPT DESIGN  /  FOR REVIEW  /  NOT FOR CONSTRUCTION',2.5)
    ftext(546,61,'PROJECT  PPE-PC-OFF-001',2.5)
    ftext(546,50,'ISSUE  15 SEP 2026   -   REV  P01',2.5)
    ftext(727,61,'A1  -  841 x 594 mm',2.5)
    ftext(727,50,'UNITS mm  -  AS SHOWN',2.5)
    tx.Commit()
    save=DB.SaveAsOptions(); save.OverwriteExistingFile=True
    fd.SaveAs(os.path.join(OUT,'PPE_Engineering_A1.rfa'),save)
    family=fd.LoadFamily(doc); fd.Close(False)
    tb=doc.GetElement(list(family.GetFamilySymbolIds())[0])
    log('Title block created')
    tr=DB.Transaction(doc,'PPE office - drawings and classification'); tr.Start()
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

    for v in [plan,roofplan]:
        style(v,25);crop(v,-.7,-1.0,-1,8.4,3.8,5);v.HideElements(List[DB.ElementId]([paving.Id]))
    roofplan.HideElements(List[DB.ElementId]([e.Id for e in linings]))
    # Dimensions use annotation witness geometry at the declared envelope coordinates.
    def dim(v,vals,pos,axis='x'):
        refs=DB.ReferenceArray()
        for a in vals:
            dc=linev(v,a,pos-.08,a,pos+.08) if axis=='x' else linev(v,pos-.08,a,pos+.08,a)
            refs.Append(dc.GeometryCurve.Reference)
        dl=li(p(vals[0],pos),p(vals[-1],pos)) if axis=='x' else li(p(pos,vals[0]),p(pos,vals[-1]))
        return doc.Create.NewDimension(v,dl,refs)
    dim(plan,[0,6],3.68);dim(plan,[0,1.5,3,4.5,6],3.34);dim(plan,[0,3],-.40,'y')
    dim(plan,[6.02,7.52],-.45);dim(roofplan,[0,1.5,3,4.5,6],3.45);dim(roofplan,[0,3],-.4,'y')
    for j in range(4):
        textv(plan,.50+j*1.1,2.66,'WS-0'+str(j+1),2.1)
        textv(roofplan,.34+j*1.5,1.65,'PC-R'+str(j+1),3)
    for x,y,s in [(1.0,1.3,'OFFICE 01'),(3.35,1.35,'CLEAR AISLE\n900 NOM.'),(4.35,.15,'2 VISITOR SEATS'),(6.32,2.0,'DECK'),(5.9,1.2,'D01'),(.75,.15,'STORAGE')]:textv(plan,x,y,s,2.1)
    # Elevation view direction points toward the viewer (not the target).
    elevs=[]
    for nm,pt,dr in [('EAST - Glazed entrance',p(9,1.5),DB.XYZ(1,0,0)),('SOUTH - Timber accent and sunshade',p(3,-3),DB.XYZ(0,-1,0)),('WEST - Precast rear',p(-2,1.5),DB.XYZ(-1,0,0)),('NORTH - Workstation windows',p(3,5.5),DB.XYZ(0,1,0))]:
        marker=DB.ElevationMarker.CreateElevationMarker(doc,vft(DB.ViewFamily.Elevation).Id,pt,25)
        v=marker.CreateElevation(doc,plan.Id,0);doc.Regenerate();cur=v.ViewDirection
        ang=math.atan2(dr.Y,dr.X)-math.atan2(cur.Y,cur.X)
        DB.ElementTransformUtils.RotateElement(doc,marker.Id,li(pt,pt+DB.XYZ.BasisZ),ang);doc.Regenerate()
        v.Name=nm;style(v,25);bb=v.CropBox;inv=bb.Transform.Inverse
        pts=[inv.OfPoint(p(x,y,z)) for x in [-.45,8.3] for y in [-.8,3.2] for z in [-.6,3.9]]
        bb.Min=DB.XYZ(min(a.X for a in pts),min(a.Y for a in pts),bb.Min.Z);bb.Max=DB.XYZ(max(a.X for a in pts),max(a.Y for a in pts),bb.Max.Z)
        v.CropBox=bb;v.CropBoxActive=True;v.CropBoxVisible=False;setp(v,DB.BuiltInParameter.VIEWER_BOUND_OFFSET_FAR,m(15));v.HideElements(List[DB.ElementId]([paving.Id]));elevs.append(v)
    sections=[]
    for nm,org,right,direc,w,depth in [('SECTION A-A - Longitudinal office',p(3,1.50),DB.XYZ(1,0,0),DB.XYZ(0,-1,0),4.5,2.5),('SECTION B-B - Workstation and aisle',p(2.7,1.5),DB.XYZ(0,1,0),DB.XYZ(1,0,0),2.35,3.0)]:
        trf=DB.Transform.Identity;trf.Origin=org;trf.BasisX=right;trf.BasisY=DB.XYZ.BasisZ;trf.BasisZ=direc
        bb=DB.BoundingBoxXYZ();bb.Transform=trf;bb.Min=p(-w,-.65,0);bb.Max=p(w,4,depth)
        v=DB.ViewSection.CreateSection(doc,vft(DB.ViewFamily.Section).Id,bb);v.Name=nm;style(v,25);v.CropBoxVisible=False;v.HideElements(List[DB.ElementId]([paving.Id]));sections.append(v)
        for z,l in [(0,'GROUND +0'),(.45,'FFL +450'),(2.8,'SPRING +2800'),(3.455,'CROWN +3455')]:
            linev(v,-w+.1,z,-w+.6,z);textv(v,-w+.1,z+.13,l,2)
    axo=DB.View3D.CreateIsometric(doc,vft(DB.ViewFamily.ThreeDimensional).Id);axo.Name='3D - ARCH OFFICE exterior'
    cut=DB.View3D.CreateIsometric(doc,vft(DB.ViewFamily.ThreeDimensional).Id);cut.Name='3D - Office interior cutaway'
    modular=DB.View3D.CreateIsometric(doc,vft(DB.ViewFamily.ThreeDimensional).Id);modular.Name='3D - MOD precast components only'
    classified=DB.View3D.CreateIsometric(doc,vft(DB.ViewFamily.ThreeDimensional).Id);classified.Name='3D - MOD ARC SITE work packages'
    for v in [axo,cut,modular,classified]:
        style(v,25);v.DisplayStyle=DB.DisplayStyle.ShadingWithEdges
        f=DB.XYZ(-1,1,-.75).Normalize();r=f.CrossProduct(DB.XYZ.BasisZ).Normalize();u=r.CrossProduct(f).Normalize()
        v.SetOrientation(DB.ViewOrientation3D(p(12,-10,9),u,f))
        b=DB.BoundingBoxXYZ();b.Min=p(-.5,-.85,-.01);b.Max=p(8.3,3.3,3.8);v.SetSectionBox(b);v.IsSectionBoxActive=True
        try:v.SetCategoryHidden(eid(DB.BuiltInCategory.OST_SectionBox),True)
        except:pass
    cut.HideElements(List[DB.ElementId](roofids+southids))
    modular.HideElements(List[DB.ElementId]([e.Id for e in elements if e.LookupParameter('PPE_WorkPackage').AsString()!='MOD']))
    # Saved native parameter filters keep the package colours live when values change.
    pid=DB.SharedParameterElement.Lookup(doc,definitions['PPE_WorkPackage'].GUID).Id
    filtercats=List[DB.ElementId]([c.Id for c in cats])
    for pkg,col in [('MOD',(57,119,164)),('ARC',(197,136,60)),('SITE',(108,143,103))]:
        rule=DB.ParameterFilterRuleFactory.CreateEqualsRule(pid,pkg)
        filt=DB.ParameterFilterElement.Create(doc,'PPE - '+pkg,filtercats,DB.ElementParameterFilter(rule))
        og=DB.OverrideGraphicSettings();og.SetSurfaceForegroundPatternId(solidfill.Id);og.SetSurfaceForegroundPatternColor(DB.Color(*col));og.SetCutForegroundPatternId(solidfill.Id);og.SetCutForegroundPatternColor(DB.Color(*col))
        classified.AddFilter(filt.Id);classified.SetFilterOverrides(filt.Id,og)
    # Hide elevation markers from the furniture plan; section callouts remain coordinated.
    try:plan.SetCategoryHidden(eid(DB.BuiltInCategory.OST_Elev),True)
    except:pass
    # Sheet helper, with title block family plus native editable sheet annotations.
    sheets=[];placements=[]
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
        placements.append((e,x,y))
        note(s,x-90,y-105,label,3.2)
        return e

    s0=sheet('A001','ARCH OFFICE - design and specification')
    vp(s0,axo,290,347,'01  PRECAST ARCH OFFICE  /  1:25')
    note(s0,550,530,'A NEW SITE OFFICE',5)
    note(s0,550,510,'3000 W x 6000 L / 18.00 m2 gross\n4 workstations + 2 visitor seats\nToilets provided externally\nFFL +450 / crown +3455\n1500 mm precast wall and roof bays\n2000 mm precast floor bays',3.2,255)
    note(s0,550,424,'LIGHTWEIGHT PRECAST',4)
    note(s0,550,408,'MOD  Structural lightweight aggregate concrete:\n150 wall / 180 floor / 120 curved roof.\nProposed 35 MPa and 1800 kg/m3.\nConfirm supplier mix design and test data.\nPanelized kit assembled at site; 15 mm joints.\nWhole-module transport/lifting is not designed.',3,258)
    note(s0,550,327,'ARCHITECTURAL FINISHES',4)
    note(s0,550,311,'ARC  Clear concrete sealer, warm oak accents,\nblack frames and laminated safety glazing.\nSeparate 50 mineral wool + 12 oak ceiling;\n5 roof membrane and 20 floor finish.\nFour 1100 x 550 workstations, task chairs,\nlow storage, lockers and two visitor seats.',3,255)
    note(s0,40,190,'CONCEPT INTENT',4)
    note(s0,40,173,'The cafe reference is translated into a workplace: a soft curved precast shell, bright side windows,\na transparent entrance and warm timber at the visitor corner. The arrival deck and sunshade detach\nfrom the 3 x 6 m module. All modelled components carry MOD / ARC / SITE identity parameters.',3,740)
    note(s0,40,115,'Design review issue P01. Structural members, reinforcement, connections, lifting, foundation design,\nMEP capacity and site access require detailed coordination before manufacture or construction.',2.7,740)
    s1=sheet('A101','Office plan and roof panel layout')
    vp(s1,plan,225,368,'01  FURNITURE PLAN  /  1:25');vp(s1,roofplan,625,368,'02  PRECAST ROOF PLAN  /  1:25')
    note(s1,40,214,'SPACE PLANNING',4)
    note(s1,40,196,'Four workstations line the north window wall. Two visitor chairs and a small round table sit near the entrance.\nMaintain 900 nominal clear circulation with chairs in the shown positions; verify occupied-chair clearance.\nD01: 1200 nominal sliding entrance zone; final clear opening and threshold by glazing supplier.\nThe 1500 x 3000 arrival deck is a separate SITE assembly. External WC by site provision.',3,735)
    note(s1,40,126,'DIMENSION BASIS',3.5)
    note(s1,40,110,'All dimensions in mm. 6000 x 3000 refers to the precast envelope. Witness dimensions use annotation lines\nat declared coordinates; update and verify after geometry changes. Elevation directions are project-based.',2.7,740)
    s2=sheet('A201','Four external elevations')
    for v,x,y,label in [(elevs[0],230,437,'01  EAST / ENTRANCE  /  1:25'),(elevs[2],630,437,'02  WEST / REAR  /  1:25'),(elevs[1],230,222,'03  SOUTH / SUNSHADE  /  1:25'),(elevs[3],630,222,'04  NORTH / WORKSTATIONS  /  1:25')]:vp(s2,v,x,y,label)
    note(s2,40,88,'Concrete panel joints 15 nominal. Black frames and timber accents are ARC. External deck and canopy are SITE.',2.5,755)
    s3=sheet('A301','Building sections and envelope')
    vp(s3,sections[0],247,367,'01  SECTION A-A  /  1:25');vp(s3,sections[1],647,367,'02  SECTION B-B  /  1:25')
    note(s3,40,211,'SECTION / MATERIAL BUILD-UP',4)
    note(s3,40,193,'MOD: 180 precast floor, top +430 / soffit +250; 150 precast walls; 120 curved precast roof core.\nARC: 20 finished floor at +450; separate 50 mineral wool + 12 oak ceiling; 5 roof waterproofing.\nExterior roof spring +2800 at concrete profile; concrete crown +3450, waterproofed crown +3455.\nCurved lining follows an independent profile below the concrete shell. Coordinate supports and vapour control.\nShallow roof-edge gutters / downpipes and membrane upstands are to be detailed by the selected supplier.',3,755)
    note(s3,40,114,'Pads and pedestals are SITE placeholders. Structural calculations, reinforcement, bearing, connection capacities\nand handling/lifting design are excluded from this concept issue. No whole-module lifting capacity is stated.',2.7,755)
    s4=sheet('M401','Modular components and work packages')
    vp(s4,modular,228,384,'01  MOD / PRECAST KIT ONLY  /  1:25');vp(s4,classified,623,384,'02  WORK PACKAGE COLOURS  /  1:25')
    note(s4,40,243,'MOD  /  BLUE  /  PRECAST',4)
    note(s4,40,225,'PC-F1-F3: 3 floor panels, 2000 nominal bay.\nPC-WS1-4 and PC-WN1-4: 8 side panels.\nPC-WR + PC-WR-T: rear wall and arch infill.\nPC-R1-R4: 4 curved roof panels.\nReinforcement and embedded connectors TBD.',2.9,245)
    note(s4,306,243,'ARC  /  OCHRE  /  FITOUT',4)
    note(s4,306,225,'Glazing, black frames and entrance.\nSeparate roof membrane and insulated ceiling.\nFloor finish, timber accents and sign panel.\nWorkstations, chairs, storage and equipment.\nFactory fitout coordinated with precast panels.',2.9,245)
    note(s4,572,243,'SITE  /  GREEN  /  ASSEMBLY',4)
    note(s4,572,225,'Pads and pedestals, provisional.\nIndependent entry deck and steps.\nDetachable south sunshade and brackets.\nPaving and external planter.\nSite access, drainage and external WC by site.',2.9,237)
    note(s4,40,137,'BIM IDENTIFICATION',3.5)
    note(s4,40,121,'Select an element: PPE_WorkPackage / PPE_ModuleID / PPE_Assembly / PPE_InstallStage / PPE_Specification.\nM01 identifies the 3 x 6 m module. MOD is the precast package; ARC is its fitout; SITE is separately assembled.\nThis is a panelized modular concept. Site assembly is assumed; integrated volumetric lifting requires design.',2.7,750)
    detail=DB.ViewDrafting.Create(doc,vft(DB.ViewFamily.Drafting).Id);detail.Name='D501 - Precast assembly interfaces';detail.Scale=5
    def drect(x,y,w,h):
        for a,b,c,d in [(x,y,x+w,y),(x+w,y,x+w,y+h),(x+w,y+h,x,y+h),(x,y+h,x,y)]:linev(detail,a,b,c,d)
    drect(0,0,.75,.18);drect(.22,.2,.15,.66);drect(.20,.18,.19,.02)
    textv(detail,0,1.12,'01  MOD WALL / FLOOR',3)
    textv(detail,.43,.9,'150 PC wall',2.4);textv(detail,.43,.62,'Bearing pad / grout\nby engineer',2.4);linev(detail,.44,.45,.37,.19)
    textv(detail,0,-.06,'180 PC floor + 20 ARC finish\nConnector / anchorage design TBD',2.4)
    drect(1.45,.28,.30,.5);drect(1.765,.28,.30,.5);linev(detail,1.75,.70,1.765,.70)
    textv(detail,1.43,1.12,'02  MOD PANEL JOINT',3)
    textv(detail,1.43,.14,'15 nominal movement joint\nBacker rod + weather seal\nEmbedded connectors by engineer',2.4)
    drect(2.9,.45,.7,.12);linev(detail,2.9,.575,3.6,.575);drect(2.9,.29,.7,.062)
    textv(detail,2.89,1.12,'03  MOD / ARC ROOF',3)
    textv(detail,2.89,.99,'5 ARC membrane\n120 MOD curved precast\nSeparate 50 insulation + 12 oak',2.4)
    textv(detail,2.89,.16,'Schematic straightened section\nDetail joints, drainage and ceiling fixing',2.4)
    s5=sheet('A501','Precast interfaces and assembly sequence');vp(s5,detail,419,377,'01-03  SCHEMATIC INTERFACES  /  1:5')
    note(s5,40,207,'PROPOSED SITE ASSEMBLY',4)
    note(s5,40,189,'01 Survey and construct engineered foundations.  02 Set and level PC-F floor panels.\n03 Erect and brace precast wall panels.  04 Set curved PC-R roof panels using designed lifting inserts.\n05 Complete structural connections, grout and weather seals.  06 Install glazing, ceiling and office fitout.\n07 Assemble the independent deck and sunshade; connect services and inspect before occupation.',3,750)
    note(s5,40,115,'Details indicate assembly intent. They are not fabrication details: joint tolerance, bearing, anchors, temporary\nbracing, reinforcement, lifting inserts and crane planning require supplier and structural-engineer design.',2.7,750)
    schedules=[]
    for cat,nm in [(DB.BuiltInCategory.OST_Walls,'Q01 - Wall material takeoff'),(DB.BuiltInCategory.OST_Floors,'Q02 - Floor material takeoff'),(DB.BuiltInCategory.OST_Roofs,'Q03 - Roof and lining takeoff')]:
        sch=DB.ViewSchedule.CreateMaterialTakeoff(doc,eid(cat));sch.Name=nm;de=sch.Definition;fields=list(de.GetSchedulableFields())
        for bip in [DB.BuiltInParameter.MATERIAL_NAME,DB.BuiltInParameter.MATERIAL_VOLUME]:
            sf1=next((f for f in fields if f.ParameterId==eid(bip)),None)
            if sf1:
                fld=de.AddField(sf1);fld.GridColumnWidth=m(.155 if bip==DB.BuiltInParameter.MATERIAL_NAME else .045)
                if bip==DB.BuiltInParameter.MATERIAL_VOLUME:fld.DisplayType=DB.ScheduleFieldDisplayType.Totals
                else:de.AddSortGroupField(DB.ScheduleSortGroupField(fld.FieldId))
        de.IsItemized=False;de.ShowGrandTotal=True;schedules.append(sch)
    # A native multi-category component register, available in Project Browser and export CSV.
    sch=DB.ViewSchedule.CreateSchedule(doc,DB.ElementId.InvalidElementId);sch.Name='Q04 - PPE MOD ARC SITE component register';de=sch.Definition
    fields=list(de.GetSchedulableFields())
    wanted=['PPE_WorkPackage','PPE_ModuleID','PPE_Assembly','Mark','PPE_InstallStage','PPE_Specification']
    for key in wanted:
        ff=next((f for f in fields if f.GetName(doc)==key),None)
        if ff:
            fld=de.AddField(ff)
            if key in ['PPE_WorkPackage','PPE_Assembly']:de.AddSortGroupField(DB.ScheduleSortGroupField(fld.FieldId))
    s6=sheet('A601','Live quantities and office interior')
    for sch1,x,y in [(schedules[0],32,529),(schedules[1],32,391),(schedules[2],32,253)]:DB.ScheduleSheetInstance.Create(doc,s6.Id,sch1.Id,p(x/1000.,y/1000.))
    vp(s6,cut,559,378,'01  OFFICE INTERIOR CUTAWAY  /  1:25')
    note(s6,303,202,'QUANTITY AND MODEL BASIS',4)
    note(s6,303,185,'Live schedules report modelled material volumes by category.\nThe roof schedule includes separate MOD concrete and ARC lining.\nProposed concrete mass = model volume x 1800 kg/m3;\nthis excludes reinforcement, fitout and transport rigging.\nSystem walls, floors and roofs are native Revit elements.\nCustom glazing, rear arch, furniture and fittings are categorized\nDirectShapes, editable by replacement. Q04 lists work packages.',2.8,495)
    note(s6,303,95,'Concept issue P01 / 15 SEP 2026 / Revit 2026 / PPE Engineering',2.5,495)
    doc.Regenerate()
    for e,x,y in placements:e.SetBoxCenter(p(x/1000.,y/1000.))
    tr.Commit();log('Seven coordinated sheets and classification views committed')

    rvtpath=os.path.join(OUT,'PPE_Engineering_Precast_Office_3x6_R2026.rvt')
    save=DB.SaveAsOptions();save.OverwriteExistingFile=True;save.MaximumBackups=1;doc.SaveAs(rvtpath,save);log('SAVED '+rvtpath)
    audit={'file':rvtpath,'version':app.VersionNumber,'moduleEnvelopeM':[6,3],'occupancy':{'workstations':4,'visitorSeats':2,'wc':'external'},'nativeCounts':{},'sheets':[{'number':s.SheetNumber,'name':s.Name} for s in sheets],'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()],'components':[],'packageCounts':{},'precastVolumeM3':0}
    for cls in [DB.Wall,DB.Floor,DB.RoofBase,DB.DirectShape,DB.ViewSection,DB.ViewSchedule]:audit['nativeCounts'][cls.__name__]=len(list(DB.FilteredElementCollector(doc).OfClass(cls)))
    for e in elements:
        pkg=e.LookupParameter('PPE_WorkPackage').AsString();audit['packageCounts'][pkg]=audit['packageCounts'].get(pkg,0)+1
        vol=0
        try:vol=e.GetMaterialVolume(concrete.Id)*.3048**3
        except:pass
        if pkg=='MOD':audit['precastVolumeM3']+=vol
        audit['components'].append({'id':int(e.Id.Value),'name':name(e),'category':e.Category.Name,'mark':e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString(),'package':pkg,'module':e.LookupParameter('PPE_ModuleID').AsString(),'precastVolumeM3':vol})
    audit['proposedPrecastMassKg']=audit['precastVolumeM3']*1800;audit['netRoomAreaM2']=room.Area*.3048**2
    opts=DB.PDFExportOptions();opts.Combine=True;opts.FileName='PPE_Engineering_Precast_Office_Drawings';opts.PaperFormat=DB.ExportPaperFormat.Default
    audit['pdfExport']=bool(doc.Export(OUT,List[DB.ElementId]([s.Id for s in sheets]),opts));log('Native PDF exported')
    opts=DB.ImageExportOptions();opts.ExportRange=DB.ExportRange.SetOfViews;opts.SetViewsAndSheets(List[DB.ElementId]([axo.Id,cut.Id,modular.Id,classified.Id]));opts.FilePath=os.path.join(OUT,'PPE_Office');opts.HLRandWFViewsFileType=DB.ImageFileType.PNG;opts.ShadowViewsFileType=DB.ImageFileType.PNG;opts.ImageResolution=DB.ImageResolution.DPI_150;opts.ZoomType=DB.ZoomFitType.FitToPage;opts.PixelSize=2200
    doc.ExportImage(opts)
    with codecs.open(os.path.join(OUT,'model-audit.json'),'w','utf-8') as f:f.write(json.dumps(audit,indent=2))
    uidoc=revit.uidoc.Application.OpenAndActivateDocument(rvtpath);uidoc.ActiveView=axo;log('COMPLETE')
except Exception:
    log(traceback.format_exc())
    try:
        if tr and tr.HasStarted():tr.RollBack()
    except:pass
    try:
        if doc and doc.IsValidObject and not doc.IsModifiable:doc.Close(False)
    except:pass
    raise
