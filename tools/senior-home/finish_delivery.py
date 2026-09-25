# -*- coding: utf-8 -*-
import os,math,json,codecs,traceback
from pyrevit import DB,revit
from System.Collections.Generic import List
OUT=r'E:\1.0 Project GPT Work\Precast-Module\deliverables\PPE_Senior_Home'
path=os.path.join(OUT,'PPE_Engineering_Senior_Home_R2026.rvt')
def m(v):return v/.3048
def p(x,y,z=0):return DB.XYZ(m(x),m(y),m(z))
def nm(e):return DB.Element.Name.GetValue(e)
def mk(e):return e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString() or ''
def sp(e,b,v):
    q=e.get_Parameter(b)
    if q and not q.IsReadOnly:q.Set(v)
def line(a,b):return DB.Line.CreateBound(a,b)
try:
    uidoc=revit.uidoc.Application.OpenAndActivateDocument(path);doc=uidoc.Document
    tr=DB.Transaction(doc,'PPE delivery - measured openings, exact infill and title block');tr.Start()
    for d in DB.FilteredElementCollector(doc).OfClass(DB.FamilyInstance).OfCategory(DB.BuiltInCategory.OST_Doors):
        if mk(d) in ['D02','D03']:
            d.Symbol.LookupParameter('Rough Width').Set(m(1.1));d.Symbol.LookupParameter('Rough Height').Set(m(2.2))
    sheets=list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet))
    src=next(s for s in sheets if s.SheetNumber=='A001');dst=next(s for s in sheets if s.SheetNumber=='A501')
    good=next(iter(DB.FilteredElementCollector(doc,src.Id).OfCategory(DB.BuiltInCategory.OST_TitleBlocks).WhereElementIsNotElementType()))
    for inst in DB.FilteredElementCollector(doc,dst.Id).OfCategory(DB.BuiltInCategory.OST_TitleBlocks).WhereElementIsNotElementType():inst.ChangeTypeId(good.GetTypeId())
    # Use categorized curved upper infills where the stock wall profile imposed a level cap.
    status=doc.ProjectInformation.get_Parameter(DB.BuiltInParameter.PROJECT_STATUS).AsString() or ''
    if 'QA4' not in status:
        ffl=next(l for l in DB.FilteredElementCollector(doc).OfClass(DB.Level) if nm(l)=='01 FFL +450')
        wt=next(t for t in DB.FilteredElementCollector(doc).OfClass(DB.WallType) if nm(t)=='PPE - PC-01 precast wall 150 mm')
        mat=next(t for t in DB.FilteredElementCollector(doc).OfClass(DB.Material) if nm(t).startswith('PC-01'))
        R=(2.9**2+1.3**2)/2.6;zc=4.5-R
        def zz(x):return zc+math.sqrt((R-.217)**2-(x-2.9)**2)
        for old in list(DB.FilteredElementCollector(doc).OfClass(DB.Wall)):
            mark=mk(old)
            if mark in ['PC-WN01','PC-WN02','PC-WN03','PC-WN04','PC-WN05']:
                i=int(mark[-2:])-1;a=i*1.2+.0075;b=min((i+1)*1.2-.0075,5.7925);doc.Delete(old.Id)
                w=DB.Wall.Create(doc,line(p(a,5.525),p(b,5.525)),wt.Id,ffl.Id,m(2.35),0,False,False)
                for k in [0,1]:DB.WallUtils.DisallowWallJoinAtEnd(w,k)
                sp(w,DB.BuiltInParameter.ALL_MODEL_MARK,mark)
                if i in [2,3]:doc.Create.NewOpening(w,p(i*1.2+.18,5.5,1.55),p((i+1)*1.2-.18,5.5,2.6))
                pts=[p(a,5.45,2.8),p(b,5.45,2.8),p(b,5.45,zz(b)),p(a,5.45,zz(a))]
                loop=DB.CurveLoop();loop.Append(line(pts[0],pts[1]));loop.Append(line(pts[1],pts[2]));loop.Append(DB.Arc.Create(pts[2],pts[3],p((a+b)/2,5.45,zz((a+b)/2))));loop.Append(line(pts[3],pts[0]))
                sol=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisY,m(.15),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))
                e=DB.DirectShape.CreateElement(doc,DB.ElementId(DB.BuiltInCategory.OST_Walls));e.Name='Curved rear precast upper infill '+mark;e.SetShape(List[DB.GeometryObject]([sol]));sp(e,DB.BuiltInParameter.ALL_MODEL_MARK,mark+'U');sp(e,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,'Curved upper infill, same 150 PC material, follows inner vault radius. Classified DirectShape.')
        sp(doc.ProjectInformation,DB.BuiltInParameter.PROJECT_STATUS,'ARCHITECTURAL CONCEPT P01 - QA4')
    doc.Regenerate()
    # Recenter drawing viewports after title-block and profile edits.
    centers={'3D - Exterior - PPE Senior Home':(.290,.360),'A101 - Floor plan and accessible route':(.294,.337),'A102 - Roof panel layout':(.295,.360),'A401 - Bathroom and bedroom clearance plan':(.214,.376),'3D - Interior cutaway - PPE Senior Home':(.615,.391),'SOUTH - Entrance facade':(.225,.423),'NORTH - Garden facade':(.625,.423),'EAST - Living facade':(.225,.208),'WEST - Vault facade':(.625,.208),'SECTION A-A - Across bedroom and living':(.290,.415),'SECTION B-B - Bedroom front to rear':(.290,.210),'S501 - Schematic connections and ramp':(.410,.405)}
    for v in DB.FilteredElementCollector(doc).OfClass(DB.Viewport):
        vn=nm(doc.GetElement(v.ViewId))
        if vn in centers:v.SetBoxCenter(p(*centers[vn]))
    doc.Regenerate();tr.Commit();doc.Save()
    check={'doorOpenings':[],'flatRoof':[],'titleBlocks':[],'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()]}
    for d in DB.FilteredElementCollector(doc).OfClass(DB.FamilyInstance).OfCategory(DB.BuiltInCategory.OST_Doors):
        if mk(d) in ['D02','D03']:
            b=d.get_BoundingBox(None);check['doorOpenings'].append({'mark':mk(d),'actualClearWidthM':round((b.Max.Y-b.Min.Y)*.3048,4),'actualHeightM':round((b.Max.Z-b.Min.Z)*.3048,4)})
    for r in DB.FilteredElementCollector(doc).OfClass(DB.RoofBase):
        if mk(r)=='RF-05':
            b=r.get_BoundingBox(None);check['flatRoof'].append({'topM':b.Max.Z*.3048,'soffitM':b.Min.Z*.3048})
    for s in sorted(sheets,key=lambda v:v.SheetNumber):
        inst=next(iter(DB.FilteredElementCollector(doc,s.Id).OfCategory(DB.BuiltInCategory.OST_TitleBlocks).WhereElementIsNotElementType()));check['titleBlocks'].append({'sheet':s.SheetNumber,'family':inst.Symbol.Family.Name})
    with codecs.open(os.path.join(OUT,'final-geometry-check.json'),'w','utf8') as f:f.write(json.dumps(check,indent=2))
    review=r'E:\1.0 Project GPT Work\Precast-Module\tools\senior-home\review_model.py';exec(compile(open(review).read(),review,'exec'))
except:
    try:
        if tr.HasStarted():tr.RollBack()
    except:pass
    with open(os.path.join(OUT,'delivery-error.txt'),'w') as f:f.write(traceback.format_exc())
    raise
