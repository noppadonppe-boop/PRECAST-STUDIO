# -*- coding: utf-8 -*-
"""New shed + PV alternative, edited only in an independent copy of the office RVT."""
import os,math,json,codecs,traceback
from System import Guid
from System.Collections.Generic import List
from pyrevit import DB,revit
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
OUT=os.path.join(ROOT,'deliverables','PPE_Modular_Office_Shed_Solar')
PATH=os.path.join(OUT,'PPE_Engineering_Precast_Office_Shed_Solar_3x6_R2026.rvt')
def m(v):return v/.3048
def p(x,y,z=0):return DB.XYZ(m(x),m(y),m(z))
def nm(e):return DB.Element.Name.GetValue(e)
name=nm
def li(a,b):return DB.Line.CreateBound(a,b)
def sp(e,b,v):
    q=e.get_Parameter(b)
    if q and not q.IsReadOnly:q.Set(v)
setp=sp
def log(s):
    with codecs.open(os.path.join(OUT,'build-log.txt'),'a','utf8') as f:f.write(str(s)+'\n')
def rect(x,y,z,w,h):
    vs=[p(x,y,z),p(x+w,y,z),p(x+w,y+h,z),p(x,y+h,z)];cl=DB.CurveLoop()
    for i in range(4):cl.Append(li(vs[i],vs[(i+1)%4]))
    return cl
def solid(x,y,z,w,d,h,mat):return DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([rect(x,y,z,w,d)]),DB.XYZ.BasisZ,m(h),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))
uiapp=revit.uidoc.Application;uidoc=uiapp.OpenAndActivateDocument(PATH);doc=uidoc.Document;app=doc.Application
assert os.path.normcase(doc.PathName)==os.path.normcase(PATH)
tr=DB.Transaction(doc,'PPE M02 - precast shed roof and photovoltaic system')
try:
    tr.Start()
    info=doc.ProjectInformation
    assert 'SOLAR COMPLETE' not in (info.get_Parameter(DB.BuiltInParameter.PROJECT_STATUS).AsString() or ''),'Already built; use review script for revisions.'
    info.Name='PRECAST SHED + SOLAR OFFICE';info.Number='PPE-PC-OFF-002';info.BuildingName='M02 Site Office 3000 x 6000 - shed roof + 2.70 kWp PV'
    sp(info,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,'4 staff + 2 visitors; external WC. Lightweight PRECAST panelized module M02. Shed roof 20 percent fall toward project south. Six 450 W PV panels. Site azimuth and electrical/structural design pending.')
    for ass in list(DB.FilteredElementCollector(doc).OfClass(DB.AssemblyInstance)):ass.Disassemble()
    # Extend existing identity bindings to the electrical-equipment category.
    for shared in list(DB.FilteredElementCollector(doc).OfClass(DB.SharedParameterElement)):
        de=shared.GetDefinition()
        if de.Name.startswith('PPE_'):
            binding=doc.ParameterBindings.get_Item(de)
            if binding:
                cs=app.Create.NewCategorySet()
                for cat in binding.Categories:cs.Insert(cat)
                cs.Insert(DB.Category.GetCategory(doc,DB.BuiltInCategory.OST_ElectricalEquipment))
                doc.ParameterBindings.ReInsert(de,app.Create.NewInstanceBinding(cs),DB.GroupTypeId.IdentityData)
    saved=app.SharedParametersFilename;app.SharedParametersFilename=os.path.join(OUT,'PPE_Office_SharedParameters.txt')
    try:
        sf=app.OpenSharedParameterFile();gp=sf.Groups.get_Item('PPE Solar') or sf.Groups.Create('PPE Solar')
        cats=app.Create.NewCategorySet();cats.Insert(DB.Category.GetCategory(doc,DB.BuiltInCategory.OST_ElectricalEquipment))
        for key,kind,guid in [('PPE_PV_Rated_Wp',DB.SpecTypeId.Number,'0358e210-0253-4dcd-b895-f1121f020001'),('PPE_PV_Model',DB.SpecTypeId.String.Text,'0358e210-0253-4dcd-b895-f1121f020002')]:
            ext=gp.Definitions.get_Item(key)
            if not ext:
                opt=DB.ExternalDefinitionCreationOptions(key,kind);opt.GUID=Guid(guid);ext=gp.Definitions.Create(opt)
            doc.ParameterBindings.Insert(ext,app.Create.NewInstanceBinding(cats),DB.GroupTypeId.IdentityData)
    finally:app.SharedParametersFilename=saved
    def tag(e,mark,pkg,desc):
        sp(e,DB.BuiltInParameter.ALL_MODEL_MARK,mark);sp(e,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,desc)
        for key,value in [('PPE_WorkPackage',pkg),('PPE_ModuleID','SITE' if pkg=='SITE' else 'M02'),('PPE_Assembly',mark.split('-')[0]),('PPE_InstallStage','FACTORY' if pkg=='MOD' else ('SITE SOLAR INSTALLATION' if pkg=='SOLAR' else ('FACTORY FITOUT' if pkg=='ARC' else 'SITE ASSEMBLY'))),('PPE_Specification',desc)]:
            q=e.LookupParameter(key)
            if q:q.Set(value)
        return e
    for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType():
        q=e.LookupParameter('PPE_ModuleID')
        if q and q.AsString()=='M01':q.Set('M02')
    mats=list(DB.FilteredElementCollector(doc).OfClass(DB.Material));mat=lambda prefix:next(e for e in mats if nm(e).startswith(prefix))
    concrete=mat('PC-01');metal=mat('AL-01');glass=mat('GL-01');steel=mat('ST-01');white=mat('FX-01')
    def newmat(n,col):
        e=doc.GetElement(DB.Material.Create(doc,n));e.Color=DB.Color(*col);return e
    pvcell=newmat('PV-01 - Monocrystalline solar cells - representative',(15,31,53))
    pval=newmat('PV-02 - Anodized aluminium racking',(115,123,130))
    views=list(DB.FilteredElementCollector(doc).OfClass(DB.View));vget=lambda n:next(v for v in views if nm(v)==n)
    plan=vget('A101 - Office furniture plan');roofplan=vget('A102 - Precast roof panel plan');axo=vget('3D - ARCH OFFICE exterior');cut=vget('3D - Office interior cutaway');modular=vget('3D - MOD precast components only');classified=vget('3D - MOD ARC SITE work packages')
    ground=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.Level) if nm(e)=='00 GROUND +000')
    for e in DB.FilteredElementCollector(doc).OfClass(DB.Level):
        if 'SPRING' in nm(e):e.Elevation=m(2.95);e.Name='02 LOW ROOF +2950'
        if 'CROWN' in nm(e):e.Elevation=m(3.555);e.Name='03 HIGH ROOF +3555'
    # Replace six original curved roof/lining elements with six native linear extrusions.
    oldroofs=list(DB.FilteredElementCollector(doc).OfClass(DB.ExtrusionRoof))
    rt=next(e.RoofType for e in oldroofs if e.LookupParameter('PPE_WorkPackage').AsString()=='MOD')
    ct=next(e.RoofType for e in oldroofs if e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString()=='CL-01')
    wt=next(e.RoofType for e in oldroofs if e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString()=='WP-01')
    rt.Name='MOD - PC-R - Lightweight precast shed roof 120';ct.Name='ARC - CL-01 - Insulated sloping oak ceiling 62'
    for e in oldroofs:doc.Delete(e.Id)
    def roof(x,length,typ,zlow,mark,pkg):
        rp=doc.Create.NewReferencePlane(p(x,0),p(x,3),DB.XYZ.BasisZ,plan);rp.Name='M02 '+mark+' slope plane'
        ca=DB.CurveArray();ca.Append(li(p(x,0,zlow),p(x,3,zlow+.6)));sgn=1 if rp.Normal.X>0 else -1
        e=doc.Create.NewExtrusionRoof(ca,rp,ground,typ,min(0,sgn*m(length)),max(0,sgn*m(length)))
        return tag(e,mark,pkg,'Shed roof: 20 percent fall (11.31 deg) toward project south. '+nm(typ)+'. Strength, bearings, joints and waterproofing require detailed design.')
    roofs=[roof(j*1.5+.0075,1.485,rt,2.95,'PC-R'+str(j+1),'MOD') for j in range(4)]
    lining=roof(.16,5.69,ct,2.77,'CL-01','ARC')
    membrane=roof(0,6,wt,2.95+.005*math.sqrt(1.04),'WP-01','ARC')
    # Low and high longitudinal walls support the single-pitch shell.
    walls=list(DB.FilteredElementCollector(doc).OfClass(DB.Wall))
    for e in walls:
        mark=e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString() or ''
        h=3.10 if mark.startswith('PC-WN') else (2.5 if mark.startswith('PC-WS') else 2.34)
        sp(e,DB.BuiltInParameter.WALL_USER_HEIGHT_PARAM,m(h))
    doc.Regenerate()
    for r in roofs:
        a=r.get_BoundingBox(None)
        for w in walls:
            b=w.get_BoundingBox(None)
            if min(a.Max.X,b.Max.X)-max(a.Min.X,b.Min.X)>m(.001):
                try:DB.JoinGeometryUtils.JoinGeometry(doc,r,w)
                except:pass
    def polygon_x(x,thick,y0,y1,zbot,z0,z1,mat):
        vs=[p(x,y0,zbot),p(x,y1,zbot),p(x,y1,z1),p(x,y0,z0)];cl=DB.CurveLoop()
        for i in range(4):cl.Append(li(vs[i],vs[(i+1)%4]))
        return DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([cl]),DB.XYZ.BasisX,m(thick),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))
    for e in DB.FilteredElementCollector(doc).OfClass(DB.DirectShape):
        n=nm(e)
        if n=='MOD - Rear curved precast infill':
            e.SetShape(List[DB.GeometryObject]([polygon_x(0,.15,.15,2.85,2.79,2.8576,3.3976,concrete)]));e.Name='MOD - Rear sloping precast infill';e.LookupParameter('PPE_Specification').Set('MOD: 150 mm lightweight precast trapezoid rear infill below shed roof; structural design pending.')
        elif n=='ARC - Arched safety-glass transom':
            e.SetShape(List[DB.GeometryObject]([polygon_x(5.91,.012,.15,2.85,2.60,2.83,3.37,glass)]));e.Name='ARC - Sloping safety-glass transom'
        elif n=='ARC - Black arched fascia':
            y0=.12;y1=2.88;z0=2.95+.2*y0-.13;z1=2.95+.2*y1-.13
            vs=[p(5.875,y0,z0),p(5.875,y1,z1),p(5.875,y1,z1-.045),p(5.875,y0,z0-.045)];cl=DB.CurveLoop()
            for i in range(4):cl.Append(li(vs[i],vs[(i+1)%4]))
            so=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([cl]),DB.XYZ.BasisX,m(.1),DB.SolidOptions(metal.Id,DB.ElementId.InvalidElementId))
            e.SetShape(List[DB.GeometryObject]([so]));e.Name='ARC - Black sloping fascia'
        elif n=='ARC - Arched transom mullion':
            e.SetShape(List[DB.GeometryObject]([solid(5.875,1.47,2.62,.1,.05,.49,metal)]));e.Name='ARC - Sloping transom mullion'
    def shape(n,solids,mark,pkg,desc,cat=DB.BuiltInCategory.OST_GenericModel):
        e=DB.DirectShape.CreateElement(doc,DB.ElementId(cat));e.Name=n;e.SetShape(List[DB.GeometryObject](solids));e.ApplicationId='PPE Engineering';e.ApplicationDataId=mark;return tag(e,mark,pkg,desc)
    def box(n,x,y,z,w,d,h,mat,mark,pkg='SOLAR',desc='',cat=DB.BuiltInCategory.OST_GenericModel):return shape(n,[solid(x,y,z,w,d,h,mat)],mark,pkg,desc,cat)
    # Six landscape 450 W reference modules, in a 3-column by 2-row array.
    theta=math.atan(.2);rot=DB.Transform.CreateRotation(DB.XYZ.BasisX,theta)
    solar=[];panels=[];panelcentres=[]
    xstart=(6-(3*1.762+2*.02))/2.;ystart=.36
    def sloped_parts(parts,x,y,z):
        move=DB.Transform.CreateTranslation(p(x,y,z))
        return [DB.SolidUtils.CreateTransformed(DB.SolidUtils.CreateTransformed(s,rot),move) for s in parts]
    for row in range(2):
        yy=ystart+row*1.154*math.cos(theta)
        for col in range(3):
            xx=xstart+col*1.782;mark='PV-0'+str(row*3+col+1)
            parts=[solid(0,0,0,1.762,1.134,.03,metal),solid(.022,.022,.03,1.718,1.09,.002,pvcell)]
            for k in range(1,12):parts.append(solid(.022+k*1.718/12,.022,.032,.001,1.09,.001,pval))
            for k in range(1,12):parts.append(solid(.022,.022+k*1.09/12,.032,1.718,.001,.001,pval))
            e=shape('SOLAR - 450 W module '+mark,sloped_parts(parts,xx,yy,2.95+.2*yy+.14),mark,'SOLAR','Reference Trina TSM-450NEG9R.28: 450 Wp, 1762 x 1134 x 30 mm, 21 kg. Geometry/cell pattern schematic. Six modules = 2.70 kWp DC. Nominal roof clearance 140 mm at panel underside.',DB.BuiltInCategory.OST_ElectricalEquipment)
            e.LookupParameter('PPE_PV_Rated_Wp').Set(450.0);e.LookupParameter('PPE_PV_Model').Set('Trina TSM-450NEG9R.28 / reference only');panels.append(e);solar.append(e);panelcentres.append((xx+.88,yy+.55*math.cos(theta),mark))
    for row in range(2):
        yy=ystart+row*1.154*math.cos(theta)
        for j,dy in enumerate([.23,.90]):
            y=yy+dy*math.cos(theta)
            e=shape('SOLAR - Aluminium mounting rail',sloped_parts([solid(0,0,0,5.45,.04,.05,pval)],.275,y,2.95+.2*y+.07),'PV-RAIL-'+str(row*2+j+1),'SOLAR','40 x 50 mm rail shown schematically. Final rail span, module clamp zones and fixings by mounting supplier.');solar.append(e)
            for k,x in enumerate([.6,2.2,3.8,5.4]):
                e=box('SOLAR - Flashed mounting pedestal',x-.04,y-.04,2.95+.2*y+.006,.08,.08,.07,metal,'PV-MT-'+str(row*8+j*4+k+1),desc='Concept cast-in threaded insert and flashed standoff. Anchor capacity, edge distance, reinforcement and waterproofing detail by engineer/supplier. No ballast assumed.');solar.append(e)
    solar.append(box('SOLAR - 3 kW grid-tie inverter',-.20,1.0,1.15,.18,.43,.62,white,'PV-INV',desc='3 kW AC grid-tie inverter placeholder, external rear wall. Verify MPPT/string voltage, weather rating, clearances and utility approval. No battery or backup operation assumed.',cat=DB.BuiltInCategory.OST_ElectricalEquipment))
    for y,mark in [(1.52,'PV-DC'),(1.80,'PV-AC')]:solar.append(box('SOLAR - Isolator enclosure '+mark,-.16,y,1.32,.14,.20,.30,metal,mark,desc='Concept isolator/protection enclosure; DC/AC protection, SPD, earthing and cable sizes by electrical engineer.'))
    solar.append(box('SOLAR - Rear cable containment',-.08,1.46,1.6,.06,.06,1.25,metal,'PV-CB',desc='Schematic weatherproof cable route; no circuit or cable size is certified.'))
    # Drainage on the low south eave is a detachable architectural component.
    gutter=box('ARC - South eaves gutter',0,-.12,2.79,6,.12,.10,metal,'RW-G','ARC','120 x 100 mm schematic gutter; size and outlet capacity to rainfall design.')
    down=box('ARC - South rear downpipe',.08,-.12,.10,.075,.075,2.69,metal,'RW-D','ARC','75 mm schematic downpipe, discharge to site drainage; hydraulic design required.')
    for v in [cut,modular]:v.HideElements(List[DB.ElementId]([e.Id for e in solar]+[gutter.Id,down.Id,lining.Id,membrane.Id]+[e.Id for e in roofs] if v.Id==cut.Id else [e.Id for e in solar]+[gutter.Id,down.Id,lining.Id,membrane.Id]))
    roofplan.HideElements(List[DB.ElementId]([e.Id for e in solar]+[lining.Id,membrane.Id]))
    # Classification includes a fourth live filter for the rooftop energy system.
    solidfill=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.FillPatternElement) if e.GetFillPattern().IsSolidFill)
    par=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.SharedParameterElement) if e.GetDefinition().Name=='PPE_WorkPackage')
    fc=List[DB.ElementId]([DB.ElementId(DB.BuiltInCategory.OST_GenericModel),DB.ElementId(DB.BuiltInCategory.OST_ElectricalEquipment)])
    filt=DB.ParameterFilterElement.Create(doc,'PPE - SOLAR',fc,DB.ElementParameterFilter(DB.ParameterFilterRuleFactory.CreateEqualsRule(par.Id,'SOLAR')))
    og=DB.OverrideGraphicSettings();og.SetSurfaceForegroundPatternId(solidfill.Id);og.SetSurfaceForegroundPatternColor(DB.Color(44,175,194));classified.AddFilter(filt.Id);classified.SetFilterOverrides(filt.Id,og)
    # Update every original annotation, including level labels, to the new option.
    for n in DB.FilteredElementCollector(doc).OfClass(DB.TextNote):
        tx=n.Text
        if tx.strip()=='SPRING +2800':DB.ElementTransformUtils.MoveElement(doc,n.Id,p(0,0,.15))
        if tx.strip()=='CROWN +3455':DB.ElementTransformUtils.MoveElement(doc,n.Id,p(0,0,.1))
        for old,new in [('ARCH OFFICE','SHED + SOLAR OFFICE'),('PPE-PC-OFF-001','PPE-PC-OFF-002'),('curved','sloping'),('Curved','Sloping'),('arch infill','sloping infill'),('arch,','wedge,'),('M01','M02'),('3455','3555'),('3450','3550'),('2800','2950'),('SPRING','LOW ROOF'),('CROWN','HIGH ROOF'),('crown','high edge'),('spring','low edge')]:tx=tx.replace(old,new)
        if 'The cafe reference is translated' in tx:tx='A lightweight precast site office with a clean single-pitch silhouette, bright side windows and warm timber.\nSix rooftop photovoltaic modules provide a proposed 2.70 kWp array. The deck and sunshade detach from\nthe 3 x 6 m precast module. All components carry MOD / ARC / SITE / SOLAR identity parameters.'
        n.Text=tx
    axo.Name='3D - SHED SOLAR OFFICE exterior';classified.Name='3D - MOD ARC SITE SOLAR work packages'
    for v in [axo,cut,modular,classified]:
        b=v.GetSectionBox();b.Max=p(8.3,3.3,4.0);v.SetSectionBox(b)
    doc.Regenerate();tr.Commit();log('Shed roof and '+str(len(solar))+' solar components committed')
    # A new A1 family preserves the previous option and changes all title block project data.
    src=open(os.path.join(ROOT,'tools','office','build_model.py')).read()
    chunk=src[src.index('    # Reusable A1 title block'):src.index("    log('Title block created')")]
    chunk='\n'.join(line[4:] if line.startswith('    ') else line for line in chunk.splitlines())
    chunk=chunk.replace('PPE_Engineering_A1.rfa','PPE_Engineering_A1_Shed_Solar.rfa').replace('PRECAST ARCH OFFICE','PRECAST SHED + SOLAR OFFICE').replace('PPE-PC-OFF-001','PPE-PC-OFF-002')
    exec(compile(chunk,'solar_titleblock','exec'))
    tr=DB.Transaction(doc,'PPE shed-solar drawings and assembly');tr.Start()
    for inst in list(DB.FilteredElementCollector(doc).OfCategory(DB.BuiltInCategory.OST_TitleBlocks).WhereElementIsNotElementType()):inst.ChangeTypeId(tb.Id)
    # Reuse text, line and style helpers from the proven office builder.
    chunk=src[src.index('    base=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.TextNoteType)))'):src.index('    for v in [plan,roofplan]:')]
    chunk=chunk.replace("'PPE Arial '","'PPE Solar Arial '")
    exec(compile('\n'.join(line[4:] if line.startswith('    ') else line for line in chunk.splitlines()),'solar_annotation_helpers','exec'))
    def note(s,x,y,txt,size=3,width=None):return textv(s,x/1000.,y/1000.,txt,size,width/1000. if width else None)
    sheets=sorted(list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet)),key=lambda s:s.SheetNumber)
    for s in sheets:
        if s.SheetNumber=='A001':s.Name='SHED SOLAR OFFICE - design and specification';note(s,550,224,'SOLAR OPTION  /  2.70 kWp DC',4);note(s,550,209,'6 x 450 W reference modules; 3 kW inverter.\nRoof fall 20 percent / 11.31 degrees.\nSee E701 for layout and system concept.',2.8,250)
        if s.SheetNumber=='M401':
            note(s,572,173,'SOLAR  /  CYAN',3.5);note(s,572,158,'PV panels, rails, mounting pedestals,\ninverter and schematic cable/protection route.',2.6,230)
    vtypes=list(DB.FilteredElementCollector(doc).OfClass(DB.ViewFamilyType));vft=lambda f:next(e for e in vtypes if e.ViewFamily==f)
    solarplan=doc.GetElement(roofplan.Duplicate(DB.ViewDuplicateOption.WithDetailing));solarplan.Name='E701 - Photovoltaic roof installation plan'
    solarplan.UnhideElements(List[DB.ElementId]([e.Id for e in solar]+[membrane.Id]))
    for n in list(DB.FilteredElementCollector(doc,solarplan.Id).OfClass(DB.TextNote)):doc.Delete(n.Id)
    for x,y,mark in panelcentres:textv(solarplan,x-.22,y,mark+'\n450 Wp',2.5)
    textv(solarplan,.35,-.65,'LOW EDGE / RAINWATER GUTTER\nRoof fall 20% toward project south',2.5)
    pvdetail=DB.ViewDrafting.Create(doc,vft(DB.ViewFamily.Drafting).Id);pvdetail.Name='E701 - Solar system concept';pvdetail.Scale=1
    def dbox(x,y,w,h,title):
        for a,b,c,d in [(x,y,x+w,y),(x+w,y,x+w,y+h),(x+w,y+h,x,y+h),(x,y+h,x,y)]:linev(pvdetail,a,b,c,d)
        textv(pvdetail,x+.008,y+h-.008,title,3)
    dbox(0,.22,.25,.035,'PV ARRAY: 6 x 450 Wp = 2.70 kWp')
    dbox(0,.16,.25,.035,'DC ISOLATION / SPD / EARTHING')
    dbox(0,.10,.25,.035,'3 kW GRID-TIE INVERTER / TBD')
    dbox(0,.04,.25,.035,'AC ISOLATION / SITE DB / UTILITY')
    for yy in [.195,.135,.075]:linev(pvdetail,.125,yy,.125,yy+.025)
    textv(pvdetail,0,.012,'Functional diagram only. No cable, breaker,\nstring or protection sizing is released.',2.7)
    se=DB.ViewSheet.Create(doc,tb.Id);se.SheetNumber='E701';se.Name='Rooftop solar layout and system concept';sheets.append(se)
    note(se,23,570,'E701   /   ROOFTOP SOLAR LAYOUT AND SYSTEM CONCEPT',5)
    note(se,546,34,'Rooftop solar layout and system concept',3,170);note(se,728,34,'E701',7)
    pv1=DB.Viewport.Create(doc,se.Id,solarplan.Id,p(.230,.377));pv2=DB.Viewport.Create(doc,se.Id,pvdetail.Id,p(.627,.392))
    for vp in [pv1,pv2]:sp(doc.GetElement(vp.GetTypeId()),DB.BuiltInParameter.VIEWPORT_ATTR_SHOW_LABEL,0)
    note(se,90,254,'01  ROOFTOP PV ARRAY  /  1:25',3.2);note(se,505,227,'02  SYSTEM CONCEPT  /  DIAGRAM',3.2)
    note(se,40,208,'SOLAR SPECIFICATION AND DESIGN BASIS',4)
    note(se,40,190,'6 x 450 Wp reference modules: 1762 x 1134 x 30 mm, 21 kg each; array module mass 126 kg excludes racking.\n3 columns x 2 rows, 20 mm nominal gaps, coplanar with 11.31 degree roof; nominal 140 mm underside clearance.\nApproximately 337 mm end offsets; no roof walkway is claimed. Plan safe maintenance access from the site.\n3 kW grid-tie inverter placeholder; verify module availability, MPPT, cold Voc, protection, earthing and utility rules.\nFixings use proposed cast-in inserts with weathered standoffs. Structural uplift, anchorage, roof capacity and\nwaterproofing require detailed engineering. No battery, energy-yield or backup-power claim is included.',2.9,748)
    note(se,40,101,'Product reference: Trina TSM-450NEG9R.28, manufacturer datasheet TSM_EN_2023_B. Confirm local supply.\nProject south is a drawing convention; final azimuth, shading and drainage depend on the actual site.',2.6,750)
    sch=DB.ViewSchedule.CreateSchedule(doc,DB.ElementId(DB.BuiltInCategory.OST_ElectricalEquipment));sch.Name='Q05 - Solar panel rated capacity'
    de=sch.Definition;fields=list(de.GetSchedulableFields())
    for key in ['Mark','PPE_PV_Model','PPE_PV_Rated_Wp']:
        sf1=next((f for f in fields if f.GetName(doc)==key),None)
        if sf1:
            fld=de.AddField(sf1)
            if key=='PPE_PV_Rated_Wp':fld.DisplayType=DB.ScheduleFieldDisplayType.Totals;de.AddFilter(DB.ScheduleFilter(fld.FieldId,DB.ScheduleFilterType.GreaterThan,0.0))
    de.ShowGrandTotal=True
    modids=List[DB.ElementId]([e.Id for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType() if e.LookupParameter('PPE_WorkPackage') and e.LookupParameter('PPE_WorkPackage').AsString()=='MOD'])
    assembly=DB.AssemblyInstance.Create(doc,modids,DB.ElementId(DB.BuiltInCategory.OST_Walls))
    doc.Regenerate();pv1.SetBoxCenter(p(.230,.377));pv2.SetBoxCenter(p(.627,.392));tr.Commit()
    tr=DB.Transaction(doc,'Name M02 module and complete');tr.Start();assembly.AssemblyTypeName='M02 - PRECAST SHED SOLAR OFFICE 3000 x 6000';sp(info,DB.BuiltInParameter.PROJECT_STATUS,'CONCEPT - SOLAR COMPLETE - FOR REVIEW');tr.Commit()
    doc.Save();log('SAVED '+PATH)
    sheets=sorted(sheets,key=lambda s:s.SheetNumber)
    opts=DB.PDFExportOptions();opts.Combine=True;opts.FileName='PPE_Engineering_Shed_Solar_Office_Drawings';opts.PaperFormat=DB.ExportPaperFormat.Default;doc.Export(OUT,List[DB.ElementId]([s.Id for s in sheets]),opts)
    opts=DB.ImageExportOptions();opts.ExportRange=DB.ExportRange.SetOfViews;opts.SetViewsAndSheets(List[DB.ElementId]([axo.Id,cut.Id,modular.Id,classified.Id]));opts.FilePath=os.path.join(OUT,'PPE_Solar');opts.HLRandWFViewsFileType=DB.ImageFileType.PNG;opts.ShadowViewsFileType=DB.ImageFileType.PNG;opts.ImageResolution=DB.ImageResolution.DPI_150;opts.ZoomType=DB.ZoomFitType.FitToPage;opts.PixelSize=2200;doc.ExportImage(opts)
    audit={'file':PATH,'version':app.VersionNumber,'moduleEnvelopeM':[6,3],'solar':{'panels':6,'panelWp':450,'arrayKWp':2.7,'inverterKW':3,'reference':'Trina TSM-450NEG9R.28','sizeMm':[1762,1134,30],'panelMassKg':21,'slopeDegrees':math.degrees(theta),'roofFall':.2},'sheets':[{'number':s.SheetNumber,'name':s.Name} for s in sheets],'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()],'components':[],'packageCounts':{},'precastVolumeM3':0,'assembly':{'name':assembly.AssemblyTypeName,'memberCount':len(list(assembly.GetMemberIds()))}}
    for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType():
        q=e.LookupParameter('PPE_WorkPackage')
        if not q or not q.AsString():continue
        pkg=q.AsString();audit['packageCounts'][pkg]=audit['packageCounts'].get(pkg,0)+1
        vol=0
        try:vol=e.GetMaterialVolume(concrete.Id)*.3048**3
        except:pass
        if pkg=='MOD':audit['precastVolumeM3']+=vol
        b=e.get_BoundingBox(None)
        audit['components'].append({'id':int(e.Id.Value),'name':nm(e),'category':e.Category.Name,'mark':e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString(),'package':pkg,'module':e.LookupParameter('PPE_ModuleID').AsString(),'spec':e.LookupParameter('PPE_Specification').AsString(),'precastVolumeM3':vol,'boundsM':{'min':[b.Min.X*.3048,b.Min.Y*.3048,b.Min.Z*.3048],'max':[b.Max.X*.3048,b.Max.Y*.3048,b.Max.Z*.3048]} if b else None})
    with codecs.open(os.path.join(OUT,'model-audit.json'),'w','utf8') as f:f.write(json.dumps(audit,indent=2))
    uidoc.ActiveView=axo;log('COMPLETE')
except Exception:
    log(traceback.format_exc())
    try:
        if tr.HasStarted():tr.RollBack()
    except:pass
    raise
