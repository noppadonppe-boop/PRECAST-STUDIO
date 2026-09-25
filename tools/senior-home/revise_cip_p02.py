# -*- coding: utf-8 -*-
import os,json,traceback,codecs,math
from pyrevit import DB,revit
from System import Guid
from System.Collections.Generic import List
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
OUT=os.path.join(ROOT,'deliverables','PPE_Senior_Home_P02_CIP')
if not os.path.isdir(OUT):os.makedirs(OUT)
def m(x):return float(x)/.3048
def p(x,y,z=0):return DB.XYZ(m(x),m(y),m(z))
def nm(e):
    try:return e.Name
    except:
        q=e.get_Parameter(DB.BuiltInParameter.SYMBOL_NAME_PARAM)
        return q.AsString() if q else str(e.GetType().Name)
def get(e,b):
    q=e.get_Parameter(b);return q.AsString() if q and q.StorageType==DB.StorageType.String else ''
def mk(e):return get(e,DB.BuiltInParameter.ALL_MODEL_MARK) or ''
def sp(e,b,x):
    q=e.get_Parameter(b)
    if q and not q.IsReadOnly:q.Set(x)
def boxloop(x,y,dx,dy,z=0):
    pts=[p(x,y,z),p(x+dx,y,z),p(x+dx,y+dy,z),p(x,y+dy,z)];c=DB.CurveLoop()
    for i in range(4):c.Append(DB.Line.CreateBound(pts[i],pts[(i+1)%4]))
    return c
def solid(x,y,z,dx,dy,dz,mat):return DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([boxloop(x,y,dx,dy,z)]),DB.XYZ.BasisZ,m(dz),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))
def setshape(e,sol):e.SetShape(List[DB.GeometryObject]([sol]))
def ds(mark,role,x,y,z,dx,dy,dz,mat,cat):
    e=DB.DirectShape.CreateElement(doc,DB.ElementId(cat));e.Name=role;setshape(e,solid(x,y,z,dx,dy,dz,mat));sp(e,DB.BuiltInParameter.ALL_MODEL_MARK,mark);return e
def cls(e,method,role):
    for key,value in [('PPE_Construction_Method',method),('PPE_Element_Role',role),('PPE_System_Code',{'CAST IN PLACE':'CIP','LIGHTWEIGHT PRECAST':'LC-PC','FINISH ONLY':'FIN'}[method])]:
        q=e.LookupParameter(key)
        if not q:raise Exception('Missing '+key+' on '+str(e.Id))
        q.Set(value)
    sp(e,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,'P02 | '+method+' | '+role+' | Geometry and sizes provisional; engineering design required.')
    classified.append(e)
try:
    doc=revit.doc;assert 'PPE_Engineering_Senior_Home' in doc.Title,doc.Title
    assert not any(mk(e)=='CIP-S01' for e in DB.FilteredElementCollector(doc).OfClass(DB.Floor)),'P02 already exists; avoid duplicate revision'
    app=doc.Application;classified=[]
    save=DB.SaveAsOptions();save.OverwriteExistingFile=True;save.MaximumBackups=1
    target=os.path.join(OUT,'PPE_Engineering_Senior_Home_P02_CIP_R2026.rvt');doc.SaveAs(target,save)
    tr=DB.Transaction(doc,'P02 - cast in place substructure and lightweight precast superstructure');tr.Start()
    # Dedicated structural materials; screed remains a separate nonstructural material.
    rcid=DB.Material.Create(doc,'CIP-01 - Cast in place reinforced concrete - proposed');rc=doc.GetElement(rcid);rc.Color=DB.Color(153,159,166);rc.MaterialClass='Concrete'
    asset=DB.StructuralAsset('CIP RC28 - PROPOSED',DB.StructuralAssetClass.Concrete);asset.Density=DB.UnitUtils.ConvertToInternalUnits(2400,DB.UnitTypeId.KilogramsPerCubicMeter);asset.ConcreteCompression=DB.UnitUtils.ConvertToInternalUnits(28,DB.UnitTypeId.Megapascals);rc.StructuralAssetId=DB.PropertySetElement.Create(doc,asset).Id
    sp(rc,DB.BuiltInParameter.ALL_MODEL_DESCRIPTION,'CAST IN PLACE. Proposed RC28 / 2400 kg/m3. Strength, reinforcement and foundation sizes require project structural design.')
    lc=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.Material) if nm(e).startswith('PC-01'));lc.Name='LC-PC-01 - Structural lightweight PRECAST - proposed LC35'
    sp(lc,DB.BuiltInParameter.ALL_MODEL_DESCRIPTION,'FACTORY PRECAST structural lightweight concrete. Proposed 35 MPa / 1800 kg/m3. Not generic AAC blockwork. Supplier mix, reinforcement, connections and erection design required.')
    # Stable shared instance parameters can be filtered, scheduled and exported.
    shared=os.path.join(OUT,'PPE_Construction_Systems_SharedParameters.txt')
    with open(shared,'w') as f:f.write('# This is a Revit shared parameter file.\n*META\tVERSION\tMINVERSION\nMETA\t2\t1\n*GROUP\tID\tNAME\nGROUP\t1\tPPE Engineering\n*PARAM\tGUID\tNAME\tDATATYPE\tDATACATEGORY\tGROUP\tVISIBLE\tDESCRIPTION\tUSERMODIFIABLE\tHIDEWHENNOVALUE\n')
    oldshared=app.SharedParametersFilename;app.SharedParametersFilename=shared
    try:
        sf=app.OpenSharedParameterFile();group=sf.Groups.get_Item('PPE Engineering');cats=app.Create.NewCategorySet()
        for c in [DB.BuiltInCategory.OST_Walls,DB.BuiltInCategory.OST_Floors,DB.BuiltInCategory.OST_Roofs,DB.BuiltInCategory.OST_StructuralFoundation,DB.BuiltInCategory.OST_StructuralFraming,DB.BuiltInCategory.OST_Ramps]:cats.Insert(doc.Settings.Categories.get_Item(c))
        for key,guid in [('PPE_Construction_Method','4f575984-4d7a-4a6c-9a91-e276c0296945'),('PPE_Element_Role','9a794780-a9f3-4fd8-b21b-995b85a0c075'),('PPE_System_Code','910a62e7-1ef0-4c38-9d2e-a62095bdb3df')]:
            opt=DB.ExternalDefinitionCreationOptions(key,DB.SpecTypeId.String.Text);opt.GUID=Guid(guid);opt.Description='PPE P02 construction system classification';definition=group.Definitions.Create(opt)
            assert doc.ParameterBindings.Insert(definition,app.Create.NewInstanceBinding(cats),DB.GroupTypeId.IdentityData),'Binding failed '+key
    finally:app.SharedParametersFilename=oldshared
    # One continuous in-situ floor replaces the eight factory floor modules.
    ffl=next(l for l in DB.FilteredElementCollector(doc).OfClass(DB.Level) if nm(l)=='01 FFL +450')
    floors=list(DB.FilteredElementCollector(doc).OfClass(DB.Floor));oldfloors=[e for e in floors if mk(e).startswith('PC-F')];assert len(oldfloors)==8,len(oldfloors)
    ft=doc.GetElement(oldfloors[0].GetTypeId()).Duplicate('PPE - CIP-S01 - 180 RC + 30 screed + 10 finish')
    cs=ft.GetCompoundStructure()
    for i,layer in enumerate(cs.GetLayers()):
        if layer.Function==DB.MaterialFunctionAssignment.Structure:cs.SetMaterialId(i,rc.Id)
    ft.SetCompoundStructure(cs);sp(ft,DB.BuiltInParameter.ALL_MODEL_DESCRIPTION,'Continuous cast-in-place reinforced floor slab, no precast floor panel joints. 180 structural core + 40 finish build-up. Preliminary sizes.')
    for e in oldfloors:doc.Delete(e.Id)
    floor=DB.Floor.Create(doc,List[DB.CurveLoop]([boxloop(0,0,9.6,5.6)]),ft.Id,ffl.Id);sp(floor,DB.BuiltInParameter.ALL_MODEL_MARK,'CIP-S01');sp(floor,DB.BuiltInParameter.FLOOR_PARAM_IS_STRUCTURAL,1);cls(floor,'CAST IN PLACE','MAIN FLOOR SLAB')
    vt=ft.Duplicate('PPE - CIP-S02 - Veranda RC slab 180 mm');vcs=vt.GetCompoundStructure();vcs.SetLayers(List[DB.CompoundStructureLayer]([DB.CompoundStructureLayer(m(.18),DB.MaterialFunctionAssignment.Structure,rc.Id)]));vt.SetCompoundStructure(vcs)
    vf=DB.Floor.Create(doc,List[DB.CurveLoop]([boxloop(0,-1.8,9.6,1.8)]),vt.Id,ffl.Id);sp(vf,DB.BuiltInParameter.FLOOR_HEIGHTABOVELEVEL_PARAM,m(-.03));sp(vf,DB.BuiltInParameter.FLOOR_PARAM_IS_STRUCTURAL,1);sp(vf,DB.BuiltInParameter.ALL_MODEL_MARK,'CIP-S02');cls(vf,'CAST IN PLACE','VERANDA FLOOR SLAB')
    # Retain foundation geometry as preliminary, with a dedicated CIP material.
    countpad=countped=0
    for e in list(DB.FilteredElementCollector(doc).OfClass(DB.DirectShape)):
        mark=mk(e);b=e.get_BoundingBox(None)
        if mark.startswith('RC pad') or mark.startswith('RC pedestal'):
            x,y,z=[q*.3048 for q in [b.Min.X,b.Min.Y,b.Min.Z]];dx,dy,dz=[q*.3048 for q in [b.Max.X-b.Min.X,b.Max.Y-b.Min.Y,b.Max.Z-b.Min.Z]]
            if mark.startswith('RC pad'):countpad+=1;mark='CIP-F%02d'%countpad;role='PAD FOUNDATION'
            else:countped+=1;mark='CIP-P%02d'%countped;role='FOUNDATION PEDESTAL';dz=.23-z
            setshape(e,solid(x,y,z,dx,dy,dz,rc));e.Name='CIP '+role;sp(e,DB.BuiltInParameter.ALL_MODEL_MARK,mark);cls(e,'CAST IN PLACE',role)
        elif mark.startswith('Floor bearer') or mark.startswith('Veranda joist'):doc.Delete(e.Id)
    # Foundation tie beams under slab/wall lines replace the schematic steel bearers.
    for i,y in enumerate([.075,2.8,5.525]):
        e=ds('CIP-GB%02d'%(i+1),'FOUNDATION GRADE BEAM',-.075,y-.15,-.22,9.75,.30,.45,rc,DB.BuiltInCategory.OST_StructuralFoundation);cls(e,'CAST IN PLACE','FOUNDATION GRADE BEAM')
    for i,x in enumerate([.075,2.4,5.8,9.525]):
        for j,(y,dy) in enumerate([(.225,2.425),(2.95,2.425)]):
            e=ds('CIP-GB%02d%s'%(i+4,chr(65+j)),'FOUNDATION GRADE BEAM',x-.15,y,-.22,.3,dy,.45,rc,DB.BuiltInCategory.OST_StructuralFoundation);cls(e,'CAST IN PLACE','FOUNDATION GRADE BEAM')
    # Veranda support at its outside edge; footing sizes remain preliminary.
    for i,x in enumerate([.3,4.8,9.3]):
        for suffix,z,dx,dy,dz,role in [('F',-.55,.8,.8,.3,'VERANDA FOUNDATION'),('P',-.25,.3,.3,.49,'VERANDA PEDESTAL')]:
            e=ds('CIP-V'+suffix+str(i+1),role,x-dx/2,-1.5-dy/2,z,dx,dy,dz,rc,DB.BuiltInCategory.OST_StructuralFoundation);cls(e,'CAST IN PLACE',role)
    e=ds('CIP-GBV','VERANDA GRADE BEAM',-.075,-1.65,-.21,9.75,.30,.45,rc,DB.BuiltInCategory.OST_StructuralFoundation);cls(e,'CAST IN PLACE','VERANDA GRADE BEAM')
    # Ramps and landing concrete are explicitly distinct from their finish specification.
    for e in list(DB.FilteredElementCollector(doc).OfClass(DB.DirectShape)):
        mark=mk(e)
        if mark.startswith('LAND-'):
            b=e.get_BoundingBox(None);a=[b.Min.X*.3048,b.Min.Y*.3048,b.Min.Z*.3048,(b.Max.X-b.Min.X)*.3048,(b.Max.Y-b.Min.Y)*.3048,(b.Max.Z-b.Min.Z)*.3048];setshape(e,solid(*(a+[rc])));sp(e,DB.BuiltInParameter.ALL_MODEL_MARK,'CIP-'+mark);e.Name='CIP RAMP LANDING';cls(e,'CAST IN PLACE','RAMP LANDING')
        elif mark.startswith('RA-01'):
            pts=[p(2.1,-3.6,-.15),p(7.5,-3.6,.30),p(7.5,-3.6,.45),p(2.1,-3.6,0)];loop=DB.CurveLoop()
            for i in range(4):loop.Append(DB.Line.CreateBound(pts[i],pts[(i+1)%4]))
            setshape(e,DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisY,m(1.8),DB.SolidOptions(rc.Id,DB.ElementId.InvalidElementId)));e.Name='CIP accessible ramp 1 to 12';sp(e,DB.BuiltInParameter.ALL_MODEL_MARK,'CIP-RA01');cls(e,'CAST IN PLACE','ACCESSIBLE RAMP')
        elif e.Category and e.Category.Id==DB.ElementId(DB.BuiltInCategory.OST_Floors) and (mark.startswith('FIN-') or mark.startswith('DK-') or mark.startswith('SH01')):cls(e,'FINISH ONLY','SURFACE FINISH')
    # Every wall and roof has an explicit factory-lightweight-precast system.
    usedtypes=set()
    for w in DB.FilteredElementCollector(doc).OfClass(DB.Wall):
        typ=doc.GetElement(w.GetTypeId());key=str(typ.Id.Value)
        if key not in usedtypes:
            cs=typ.GetCompoundStructure()
            if cs:
                for i,ly in enumerate(cs.GetLayers()):
                    if ly.Function==DB.MaterialFunctionAssignment.Structure:cs.SetMaterialId(i,lc.Id)
                typ.SetCompoundStructure(cs)
            typ.Name='PPE - LC-PC wall '+str(int(round(typ.Width*.3048*1000)))+' mm';usedtypes.add(key)
        cls(w,'LIGHTWEIGHT PRECAST','INTERNAL PARTITION' if mk(w).startswith('PT-') else 'EXTERNAL WALL PANEL')
    for w in DB.FilteredElementCollector(doc).OfClass(DB.DirectShape).OfCategory(DB.BuiltInCategory.OST_Walls):cls(w,'LIGHTWEIGHT PRECAST','CURVED WALL INFILL')
    usedroof=set()
    for r in DB.FilteredElementCollector(doc).OfClass(DB.RoofBase):
        typ=doc.GetElement(r.GetTypeId());key=str(typ.Id.Value)
        if key not in usedroof:
            typ.Name='PPE - LC-PC '+('flat roof 240 mm' if mk(r)=='RF-05' else 'vault roof 217 mm');usedroof.add(key)
        cls(r,'LIGHTWEIGHT PRECAST','FLAT ROOF PANEL' if mk(r)=='RF-05' else 'CURVED ROOF PANEL')
    # Remove obsolete unused precast floor type so it cannot be mistaken for P02 scope.
    for t in list(DB.FilteredElementCollector(doc).OfClass(DB.FloorType)):
        if nm(t)=='PPE - Floor 220 - tile screed PC180':doc.Delete(t.Id)
    # Coordinate existing sheets and detail notes with the revised construction method.
    replacements=[('Wall 150 mm; floor 180 PC + 30 screed','Wall 150 mm LC-PC; floor 180 CIP + 30 screed'),('Floor: 10 tile / 30 screed / 180 PC.','Floor: 10 finish / 30 screed / 180 CIP RC.'),('Floor: 8 nominal 2400 x 2800 panels.','Floor: ONE continuous cast-in-place slab.'),('180 PC + 30 screed + 10 tile','180 CIP RC + 30 screed + 10 finish'),('1  Survey and design foundations.  2  Install pedestals / bearers.  3  Place precast floor panels.','1  Cast foundations / grade beams.  2  Form, reinforce and cast continuous floor.  3  Cure / verify strength.'),('Floor bearers, pedestals and pad footings','CIP grade beams, pedestals and pad footings'),('Architectural BIM concept / P01.','Architectural BIM concept / P02.'),('PC-01: structural lightweight precast.','LC-PC-01: structural lightweight precast.'),('PC-01 strength and density','LC-PC-01 strength and density')]
    for note in DB.FilteredElementCollector(doc).OfClass(DB.TextNote):
        text=note.Text
        for a,b in replacements:text=text.replace(a,b)
        if 'PC-01: structural lightweight precast.' in text:text=text.replace('PC-01:','LC-PC-01:')
        note.Text=text
    sp(doc.ProjectInformation,DB.BuiltInParameter.PROJECT_STATUS,'P02 - CIP FOUNDATION / FLOORS + LC PRECAST SUPERSTRUCTURE - CONCEPT')
    doc.ProjectInformation.IssueDate='07 September 2026'
    # Dedicated 3D system views and live construction-system schedule.
    vft=next(t for t in DB.FilteredElementCollector(doc).OfClass(DB.ViewFamilyType) if t.ViewFamily==DB.ViewFamily.ThreeDimensional)
    axo=next(v for v in DB.FilteredElementCollector(doc).OfClass(DB.View3D) if nm(v)=='3D - Exterior - PPE Senior Home')
    solidfill=next(f for f in DB.FilteredElementCollector(doc).OfClass(DB.FillPatternElement) if f.GetFillPattern().IsSolidFill)
    colors={'CIP':DB.Color(48,111,195),'LC-PC':DB.Color(215,135,43)};vlist=[]
    for title,foundationOnly in [('3D - P02 Construction systems - CIP blue LCPC orange',False),('3D - P02 CIP foundations and continuous floors',True)]:
        view=DB.View3D.CreateIsometric(doc,vft.Id);view.Name=title;view.Scale=50;view.DetailLevel=DB.ViewDetailLevel.Fine;view.DisplayStyle=DB.DisplayStyle.Shading;view.SetOrientation(axo.GetOrientation())
        bb=DB.BoundingBoxXYZ();bb.Min=p(-.8,-4,-.8);bb.Max=p(10.3,6.1,5);view.SetSectionBox(bb);view.IsSectionBoxActive=True
        keep=[e for e in classified if e.LookupParameter('PPE_System_Code').AsString() in (['CIP'] if foundationOnly else ['CIP','LC-PC'])];keepids=set(str(e.Id.Value) for e in keep)
        hides=[]
        for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType():
            if e.Category and e.Category.CategoryType==DB.CategoryType.Model and str(e.Id.Value) not in keepids and e.CanBeHidden(view):hides.append(e.Id)
        if hides:view.HideElements(List[DB.ElementId](hides))
        for e in keep:
            col=colors[e.LookupParameter('PPE_System_Code').AsString()];o=DB.OverrideGraphicSettings();o.SetSurfaceForegroundPatternId(solidfill.Id);o.SetSurfaceForegroundPatternColor(col);o.SetCutForegroundPatternId(solidfill.Id);o.SetCutForegroundPatternColor(col);view.SetElementOverrides(e.Id,o)
        vlist.append(view)
    sch=DB.ViewSchedule.CreateSchedule(doc,DB.ElementId.InvalidElementId);sch.Name='Q05 - P02 Construction systems register';de=sch.Definition
    for key,width in [('PPE_Construction_Method',.10),('PPE_Element_Role',.10)]:
        sf=next(f for f in de.GetSchedulableFields() if f.GetName(doc)==key);field=de.AddField(sf);field.ColumnHeading=key.replace('PPE_','').replace('_',' ');field.GridColumnWidth=m(width);de.AddSortGroupField(DB.ScheduleSortGroupField(field.FieldId))
        if key=='PPE_Construction_Method':de.AddFilter(DB.ScheduleFilter(field.FieldId,DB.ScheduleFilterType.NotEqual,''))
    countfield=de.AddField(DB.ScheduleFieldType.Count);countfield.GridColumnWidth=m(.025);countfield.ColumnHeading='COUNT';de.IsItemized=False;de.ShowGrandTotal=True
    tb=next(e for e in DB.FilteredElementCollector(doc).OfCategory(DB.BuiltInCategory.OST_TitleBlocks).WhereElementIsNotElementType() if e.Symbol.Family.Name=='PPE_Engineering_Senior_A1')
    sheet=DB.ViewSheet.Create(doc,tb.GetTypeId());sheet.SheetNumber='S001';sheet.Name='P02 Construction systems - CIP and lightweight precast'
    basett=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.TextNoteType)));nts={}
    def nt(view,x,y,text,size=3,width=None):
        if size not in nts:
            ty=basett.Duplicate('PPE P02 '+str(size)+' mm');sp(ty,DB.BuiltInParameter.TEXT_SIZE,m(size/1000.));sp(ty,DB.BuiltInParameter.TEXT_FONT,'Arial');nts[size]=ty
        return DB.TextNote.Create(doc,view.Id,p(x,y),m(width),text,nts[size].Id) if width else DB.TextNote.Create(doc,view.Id,p(x,y),text,nts[size].Id)
    nt(sheet,.023,.570,'S001 / P02 - CONSTRUCTION SYSTEMS',5)
    for v,y in [(vlist[0],.427),(vlist[1],.205)]:
        vp=DB.Viewport.Create(doc,sheet.Id,v.Id,p(.263,y));doc.Regenerate();vp.SetBoxCenter(p(.263,y))
    nt(sheet,.045,.548,'01  LIGHTWEIGHT PRECAST ABOVE CIP SUBSTRUCTURE / 1:50',3)
    nt(sheet,.045,.325,'02  CIP FOUNDATIONS + CONTINUOUS FLOOR SLABS / 1:50',3)
    nt(sheet,.515,.542,'LIVE SYSTEM REGISTER',4)
    DB.ScheduleSheetInstance.Create(doc,sheet.Id,sch.Id,p(.515,.522))
    nt(sheet,.515,.320,'BLUE  /  CAST IN PLACE',4)
    nt(sheet,.515,.302,'CIP-01: proposed RC28 / 2400 kg/m3.\nPad foundations, pedestals and grade beams.\nMain floor: 180 RC + 30 screed + 10 finish.\nVeranda: 180 RC + 30 composite finish.\nRamp and landings: 150 RC, slip-resistant finish.\nFloor construction joints to engineering design.',3,.29)
    nt(sheet,.515,.226,'ORANGE  /  LIGHTWEIGHT PRECAST',4)
    nt(sheet,.515,.208,'LC-PC-01: proposed LC35 / 1800 kg/m3.\n150 external wall / 100 internal partition.\n120 structural core in vault and flat roof.\nFactory-made reinforced panels; not AAC blocks.\nPanel marks PC-W / PC-R retained for continuity.',3,.29)
    nt(sheet,.515,.143,'DESIGN AND MODEL NOTES',4)
    nt(sheet,.515,.125,'P02 supersedes the precast floor concept.\nCIP foundation beams / pads are provisional.\nFinal soil, reinforcement, spans, connections,\nbearing, lifting and bracing require design.\nNative Floor objects; foundations / ramp include\ncategorized DirectShape with shared parameters.',2.8,.29)
    nt(sheet,.546,.034,'Construction systems / P02',3,.17);nt(sheet,.728,.034,'S001',7)
    # A plan note documents continuity without confusing finish boards with structural panels.
    plan=next(v for v in DB.FilteredElementCollector(doc).OfClass(DB.ViewPlan) if nm(v)=='A101 - Floor plan and accessible route')
    nt(plan,3.05,5.25,'CIP-S01 / CONTINUOUS RC FLOOR',2.1)
    doc.Regenerate();assert tr.Commit()==DB.TransactionStatus.Committed
    doc.Save();revit.uidoc.ActiveView=vlist[0]
    audit={'file':target,'revision':'P02','elements':[],'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()],'sheets':[]}
    for e in classified:
        if not e.IsValidObject:continue
        entry={'id':str(e.Id.Value),'mark':mk(e),'category':e.Category.Name,'method':e.LookupParameter('PPE_Construction_Method').AsString(),'role':e.LookupParameter('PPE_Element_Role').AsString(),'code':e.LookupParameter('PPE_System_Code').AsString()}
        if isinstance(e,DB.Floor):entry['areaM2']=round(e.get_Parameter(DB.BuiltInParameter.HOST_AREA_COMPUTED).AsDouble()*.3048**2,4)
        audit['elements'].append(entry)
    sheets=sorted(list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet)),key=lambda s:s.SheetNumber)
    audit['sheets']=[{'number':s.SheetNumber,'name':nm(s)} for s in sheets]
    assert len(list(DB.FilteredElementCollector(doc).OfClass(DB.Floor)))==2
    assert not any(mk(e).startswith('PC-F') for e in DB.FilteredElementCollector(doc).OfClass(DB.Floor))
    opts=DB.PDFExportOptions();opts.Combine=True;opts.FileName='PPE_Engineering_Senior_Home_P02_Drawings';opts.PaperFormat=DB.ExportPaperFormat.Default;audit['pdfExport']=bool(doc.Export(OUT,List[DB.ElementId]([s.Id for s in sheets]),opts))
    opts=DB.ImageExportOptions();opts.ExportRange=DB.ExportRange.SetOfViews;opts.SetViewsAndSheets(List[DB.ElementId]([v.Id for v in vlist]+[s.Id for s in sheets]));opts.FilePath=os.path.join(OUT,'P02');opts.HLRandWFViewsFileType=DB.ImageFileType.PNG;opts.ShadowViewsFileType=DB.ImageFileType.PNG;opts.ImageResolution=DB.ImageResolution.DPI_150;opts.ZoomType=DB.ZoomFitType.FitToPage;opts.PixelSize=2200;doc.ExportImage(opts)
    with codecs.open(os.path.join(OUT,'P02-model-audit.json'),'w','utf8') as f:f.write(json.dumps(audit,indent=2))
    with open(os.path.join(OUT,'P02-complete.txt'),'w') as f:f.write('P02 saved and exported successfully')
except:
    try:
        if tr.HasStarted():tr.RollBack()
    except:pass
    with open(os.path.join(OUT,'P02-error.txt'),'w') as f:f.write(traceback.format_exc())
    raise
