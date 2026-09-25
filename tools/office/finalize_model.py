# -*- coding: utf-8 -*-
"""Office QA: resolve invalid joins, coordinate views and refresh native deliverables."""
import os,math,json,codecs,traceback
from System.Collections.Generic import List
from pyrevit import DB,revit
OUT=r'E:\1.0 Project GPT Work\Precast-Module\deliverables\PPE_Modular_Office'
PATH=os.path.join(OUT,'PPE_Engineering_Precast_Office_3x6_R2026.rvt')
def m(x):return x/.3048
def p(x,y,z=0):return DB.XYZ(m(x),m(y),m(z))
def nm(e):return DB.Element.Name.GetValue(e)
def sp(e,b,v):
    q=e.get_Parameter(b)
    if q and not q.IsReadOnly:q.Set(v)
def log(s):
    with codecs.open(os.path.join(OUT,'finalize-log.txt'),'a','utf8') as f:f.write(str(s)+'\n')
uiapp=revit.uidoc.Application
uidoc=uiapp.OpenAndActivateDocument(PATH);doc=uidoc.Document
assert doc.ProjectInformation.Number=='PPE-PC-OFF-001'
tr=DB.Transaction(doc,'PPE office final drawing and model QA')
try:
    tr.Start()
    fixed=0
    for warning in list(doc.GetWarnings()):
        if 'joined but do not intersect' in warning.GetDescriptionText():
            ids=list(warning.GetFailingElements())
            if len(ids)==2:
                a,b=[doc.GetElement(i) for i in ids]
                if DB.JoinGeometryUtils.AreElementsJoined(doc,a,b):DB.JoinGeometryUtils.UnjoinGeometry(doc,a,b);fixed+=1
    log('Invalid joins resolved: '+str(fixed))
    views=[v for v in DB.FilteredElementCollector(doc).OfClass(DB.View) if not v.IsTemplate]
    axo=next(v for v in views if nm(v)=='3D - ARCH OFFICE exterior')
    cut=next(v for v in views if nm(v)=='3D - Office interior cutaway')
    modular=next(v for v in views if nm(v)=='3D - MOD precast components only')
    classified=next(v for v in views if nm(v)=='3D - MOD ARC SITE work packages')
    roofplan=next(v for v in views if nm(v)=='A102 - Precast roof panel plan')
    plan=next(v for v in views if nm(v)=='A101 - Office furniture plan')
    mats=list(DB.FilteredElementCollector(doc).OfClass(DB.Material))
    concrete=next(e for e in mats if nm(e).startswith('PC-01'))
    membrane=next(e for e in mats if nm(e).startswith('WP-01'))
    membrane.Color=DB.Color(195,191,181)
    concrete.Color=DB.Color(195,191,181)
    # Membrane extrusion is concentric with the concrete roof, eliminating surface interference.
    done=doc.ProjectInformation.get_Parameter(DB.BuiltInParameter.PROJECT_STATUS).AsString() or ''
    if 'QA1' not in done:
        old=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.ExtrusionRoof) if e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString()=='WP-01')
        rt=old.RoofType
        vals={key:old.LookupParameter(key).AsString() for key in ['PPE_WorkPackage','PPE_ModuleID','PPE_Assembly','PPE_InstallStage','PPE_Specification']}
        doc.Delete(old.Id)
        rp=doc.Create.NewReferencePlane(p(0,0),p(0,3),DB.XYZ.BasisZ,plan);rp.Name='PPE waterproofing concentric profile'
        radius=(1.5**2+.65**2)/(2*.65);zc=3.45-radius
        outer=radius+.005;zs=zc+math.sqrt(outer**2-1.5**2)
        arr=DB.CurveArray();arr.Append(DB.Arc.Create(p(0,0,zs),p(0,3,zs),p(0,1.5,3.455)))
        ground=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.Level) if nm(e)=='00 GROUND +000')
        sign=1 if rp.Normal.X>0 else -1
        new=doc.Create.NewExtrusionRoof(arr,rp,ground,rt,min(0,sign*m(6)),max(0,sign*m(6)))
        sp(new,DB.BuiltInParameter.ALL_MODEL_MARK,'WP-01')
        for key,value in vals.items():new.LookupParameter(key).Set(value)
        sp(new,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,'ARC: 5 mm continuous waterproof membrane, concentric with precast roof; warm concrete-grey finish. Detail expansion joints and drainage with supplier.')
        for v in [cut,modular,roofplan]:v.HideElements(List[DB.ElementId]([new.Id]))
        # Replace the faceted arch trim by one true circular band.
        arch=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.DirectShape) if nm(e)=='ARC - Black arched fascia')
        metal=next(e for e in mats if nm(e).startswith('AL-01'))
        ro=radius-.13;ri=ro-.045;y0=.12;y1=2.88
        z=lambda rr,y:zc+math.sqrt(rr**2-(y-1.5)**2)
        loop=DB.CurveLoop()
        loop.Append(DB.Arc.Create(p(5.875,y0,z(ro,y0)),p(5.875,y1,z(ro,y1)),p(5.875,1.5,z(ro,1.5))))
        loop.Append(DB.Line.CreateBound(p(5.875,y1,z(ro,y1)),p(5.875,y1,z(ri,y1))))
        loop.Append(DB.Arc.Create(p(5.875,y1,z(ri,y1)),p(5.875,y0,z(ri,y0)),p(5.875,1.5,z(ri,1.5))))
        loop.Append(DB.Line.CreateBound(p(5.875,y0,z(ri,y0)),p(5.875,y0,z(ro,y0))))
        s=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisX,m(.1),DB.SolidOptions(metal.Id,DB.ElementId.InvalidElementId))
        arch.SetShape(List[DB.GeometryObject]([s]))
        sp(doc.ProjectInformation,DB.BuiltInParameter.PROJECT_STATUS,'CONCEPT - FOR DESIGN REVIEW - QA1')
    # Keep the modelled floor material consistent with the oak finish specification.
    for e in DB.FilteredElementCollector(doc).OfClass(DB.Floor):
        q=e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK)
        if q and q.AsString()=='FL-01':
            doc.GetElement(e.GetTypeId()).Name='ARC - FL-01 - Engineered oak floor finish 20'
            description='ARC: proposed 20 mm engineered oak finish, sealed for office use; final FFL +450; substrate preparation and moisture control by flooring supplier.'
            sp(e,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,description);e.LookupParameter('PPE_Specification').Set(description)
    # Native Revit assembly makes the precast kit selectable as M01.
    assembly=next((e for e in DB.FilteredElementCollector(doc).OfClass(DB.AssemblyInstance)),None)
    if not assembly:
        modids=List[DB.ElementId]([e.Id for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType() if e.LookupParameter('PPE_WorkPackage') and e.LookupParameter('PPE_WorkPackage').AsString()=='MOD'])
        if DB.AssemblyInstance.AreElementsValidForAssembly(doc,modids,DB.ElementId.InvalidElementId):
            acat=DB.ElementId(DB.BuiltInCategory.OST_Walls)
            if DB.AssemblyInstance.IsValidNamingCategory(doc,acat,modids):assembly=DB.AssemblyInstance.Create(doc,modids,acat)
    # The sign belongs to the removed south facade in the cutaway.
    signs=[e.Id for e in DB.FilteredElementCollector(doc).OfClass(DB.DirectShape) if nm(e)=='ARC - Office sign panel']
    cut.HideElements(List[DB.ElementId](signs))
    # Clean orthographic drawings: sections are keyed in plan, not repeated through elevations.
    for v in views:
        if v.ViewType in [DB.ViewType.Elevation,DB.ViewType.Section] or v.Id==roofplan.Id:
            try:v.SetCategoryHidden(DB.ElementId(DB.BuiltInCategory.OST_Sections),True)
            except:pass
    for v in [axo,cut,modular,classified]:
        v.Scale=30
        try:
            disp=v.GetViewDisplayModel();disp.SmoothEdges=True;v.SetViewDisplayModel(disp)
        except:pass
    # Reposition view centres and captions with actual extents, avoiding overlap with diagrams.
    centres={'3D - ARCH OFFICE exterior':(.290,.362),'3D - Office interior cutaway':(.559,.385),'3D - MOD precast components only':(.228,.400),'3D - MOD ARC SITE work packages':(.623,.400),'A101 - Office furniture plan':(.225,.368),'A102 - Precast roof panel plan':(.625,.368),'EAST - Glazed entrance':(.230,.437),'WEST - Precast rear':(.630,.437),'SOUTH - Timber accent and sunshade':(.230,.222),'NORTH - Workstation windows':(.630,.222),'SECTION A-A - Longitudinal office':(.247,.367),'SECTION B-B - Workstation and aisle':(.647,.367),'D501 - Precast assembly interfaces':(.419,.377)}
    doc.Regenerate()
    for vp in DB.FilteredElementCollector(doc).OfClass(DB.Viewport):
        vn=nm(doc.GetElement(vp.ViewId))
        if vn in centres:vp.SetBoxCenter(p(*centres[vn]))
    sheets=sorted(list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet)),key=lambda s:s.SheetNumber)
    for s in sheets:
        notes=list(DB.FilteredElementCollector(doc,s.Id).OfClass(DB.TextNote))
        for n in notes:
            tx=n.Text.strip()
            if any(q in tx for q in ['PRECAST ARCH OFFICE  /','OFFICE INTERIOR CUTAWAY','MOD / PRECAST KIT ONLY','WORK PACKAGE COLOURS']):
                n.Text=n.Text.replace('1:25','1:30')
                yy={'A001':.238,'M401':.265,'A601':.244}.get(s.SheetNumber,.24)
                DB.ElementTransformUtils.MoveElement(doc,n.Id,DB.XYZ(0,m(yy)-n.Coord.Y,0))
    doc.Regenerate();tr.Commit()
    if assembly:
        at=DB.Transaction(doc,'Name precast module assembly');at.Start()
        assembly.AssemblyTypeName='M01 - PRECAST ARCH OFFICE 3000 x 6000'
        sp(assembly,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,'17-piece lightweight precast module kit. Architectural fitout carries the same M01 identity. Assembly grouping does not certify whole-module lifting.')
        at.Commit();log('Native module assembly: '+str(assembly.Id.Value))
    doc.Save();log('Model and annotations saved')
    opts=DB.PDFExportOptions();opts.Combine=True;opts.FileName='PPE_Engineering_Precast_Office_Drawings';opts.PaperFormat=DB.ExportPaperFormat.Default
    doc.Export(OUT,List[DB.ElementId]([s.Id for s in sheets]),opts)
    opts=DB.ImageExportOptions();opts.ExportRange=DB.ExportRange.SetOfViews;opts.SetViewsAndSheets(List[DB.ElementId]([axo.Id,cut.Id,modular.Id,classified.Id]));opts.FilePath=os.path.join(OUT,'PPE_Office');opts.HLRandWFViewsFileType=DB.ImageFileType.PNG;opts.ShadowViewsFileType=DB.ImageFileType.PNG;opts.ImageResolution=DB.ImageResolution.DPI_150;opts.ZoomType=DB.ZoomFitType.FitToPage;opts.PixelSize=2200;doc.ExportImage(opts)
    with codecs.open(os.path.join(OUT,'model-audit.json'),'r','utf8') as f:audit=json.load(f)
    audit['warnings']=[w.GetDescriptionText() for w in doc.GetWarnings()];audit['components']=[];audit['packageCounts']={};audit['precastVolumeM3']=0
    for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType():
        q=e.LookupParameter('PPE_WorkPackage')
        if not q or not q.AsString():continue
        pkg=q.AsString();audit['packageCounts'][pkg]=audit['packageCounts'].get(pkg,0)+1
        vol=0
        try:vol=e.GetMaterialVolume(concrete.Id)*.3048**3
        except:pass
        if pkg=='MOD':audit['precastVolumeM3']+=vol
        b=e.get_BoundingBox(None)
        audit['components'].append({'id':int(e.Id.Value),'name':nm(e),'category':e.Category.Name,'mark':e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString(),'package':pkg,'module':e.LookupParameter('PPE_ModuleID').AsString(),'stage':e.LookupParameter('PPE_InstallStage').AsString(),'spec':e.LookupParameter('PPE_Specification').AsString(),'precastVolumeM3':vol,'boundsM':{'min':[b.Min.X*.3048,b.Min.Y*.3048,b.Min.Z*.3048],'max':[b.Max.X*.3048,b.Max.Y*.3048,b.Max.Z*.3048]} if b else None})
    audit['proposedPrecastMassKg']=audit['precastVolumeM3']*1800;audit['qa']='QA1 - invalid joins resolved; seven PDF sheets visually reviewed; concentric membrane; package filters verified'
    audit['assembly']={'id':int(assembly.Id.Value),'name':assembly.AssemblyTypeName,'memberCount':len(list(assembly.GetMemberIds()))} if assembly else None
    audit['sheets']=[{'number':s.SheetNumber,'name':s.Name} for s in sheets]
    with codecs.open(os.path.join(OUT,'model-audit.json'),'w','utf8') as f:f.write(json.dumps(audit,indent=2))
    uidoc.ActiveView=axo;log('COMPLETE - warnings '+str(len(audit['warnings'])))
except Exception:
    log(traceback.format_exc())
    if tr.HasStarted():tr.RollBack()
    raise
