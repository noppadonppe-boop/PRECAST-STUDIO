# -*- coding: utf-8 -*-
import os,json,codecs,math
from pyrevit import DB,revit
from System.Collections.Generic import List
OUT=r'E:\1.0 Project GPT Work\Precast-Module\deliverables\PPE_Cafe'
path=os.path.join(OUT,'PPE_Engineering_Precast_Cafe_R2026.rvt')
uiapp=revit.uidoc.Application
uidoc=uiapp.OpenAndActivateDocument(path)
doc=uidoc.Document
def vec(p): return [round(float(x)*.3048,4) for x in [p.X,p.Y,p.Z]] if p else None
def nm(e): return DB.Element.Name.GetValue(e)
def bbdata(b): return {'min':vec(b.Min),'max':vec(b.Max),'origin':vec(b.Transform.Origin),'x':vec(b.Transform.BasisX),'y':vec(b.Transform.BasisY),'z':vec(b.Transform.BasisZ)}
d={'views':[],'roofs':[],'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()]}
for v in DB.FilteredElementCollector(doc).OfClass(DB.ViewSection):
    if v.IsTemplate: continue
    d['views'].append({'id':int(v.Id.Value),'name':nm(v),'direction':vec(v.ViewDirection),'origin':vec(v.Origin),'crop':bbdata(v.CropBox),'elements':len(list(DB.FilteredElementCollector(doc,v.Id).WhereElementIsNotElementType()))})
for r in DB.FilteredElementCollector(doc).OfClass(DB.RoofBase): d['roofs'].append({'name':nm(r),'bbox':bbdata(r.get_BoundingBox(None))})
with codecs.open(os.path.join(OUT,'inspection.json'),'w','utf8') as f:f.write(json.dumps(d,indent=2))
uidoc.ActiveView=next(v for v in DB.FilteredElementCollector(doc).OfClass(DB.View3D) if nm(v).startswith('3D - Exterior'))

def m(x): return x/.3048
def p(x,y,z=0): return DB.XYZ(m(x),m(y),m(z))
def setp(e,b,val):
    q=e.get_Parameter(b)
    if q and not q.IsReadOnly:q.Set(val)
views=list(DB.FilteredElementCollector(doc).OfClass(DB.View))
sheets=sorted(list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet)),key=lambda v:v.SheetNumber)
axo=uidoc.ActiveView
tr=DB.Transaction(doc,'PPE review - correct elevations and sheet layout');tr.Start()
roofs=list(DB.FilteredElementCollector(doc).OfClass(DB.RoofBase))
for w in DB.FilteredElementCollector(doc).OfClass(DB.Wall):
    mk=w.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString() or ''
    if mk.startswith(('PC-WS','PC-WN')):
        index=int(mk[-1])-1
        target=sorted(roofs,key=lambda r:r.get_BoundingBox(None).Min.X)[index]
        if not w.GetAttachmentIds(DB.AttachmentLocation.Top):w.AddAttachment(target.Id,DB.AttachmentLocation.Top)
for mat in DB.FilteredElementCollector(doc).OfClass(DB.Material):
    if nm(mat).startswith('PC-01') and mat.StructuralAssetId==DB.ElementId.InvalidElementId:
        asset=DB.StructuralAsset('PPE LC35 - PROPOSED VERIFY',DB.StructuralAssetClass.Concrete)
        asset.Density=DB.UnitUtils.ConvertToInternalUnits(1800,DB.UnitTypeId.KilogramsPerCubicMeter)
        asset.ConcreteCompression=DB.UnitUtils.ConvertToInternalUnits(35,DB.UnitTypeId.Megapascals)
        prop=DB.PropertySetElement.Create(doc,asset);mat.StructuralAssetId=prop.Id
for v in DB.FilteredElementCollector(doc).OfClass(DB.ViewSection):
    if v.IsTemplate:continue
    if nm(v).startswith(('EAST -','WEST -','NORTH -','SOUTH -')):
        desired={'EAST':DB.XYZ(1,0,0),'WEST':DB.XYZ(-1,0,0),'NORTH':DB.XYZ(0,1,0),'SOUTH':DB.XYZ(0,-1,0)}[nm(v).split(' ')[0]]
        if v.ViewDirection.DotProduct(desired)<0:
            marker=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.ElevationMarker) if any(e.GetViewId(i)==v.Id for i in range(4)))
            pt={'EAST':p(8.7,1.6),'WEST':p(-2,1.6),'NORTH':p(3,5.3),'SOUTH':p(3,-3)}[nm(v).split(' ')[0]]
            DB.ElementTransformUtils.RotateElement(doc,marker.Id,DB.Line.CreateBound(pt,pt+DB.XYZ.BasisZ),math.pi)
            doc.Regenerate()
        box=v.CropBox; inv=box.Transform.Inverse
        points=[inv.OfPoint(p(x,y,z)) for x in [-.6,8.4] for y in [-1.65,3.8] for z in [-.6,4.05]]
        box.Min=DB.XYZ(min(q.X for q in points),min(q.Y for q in points),m(-14))
        box.Max=DB.XYZ(max(q.X for q in points),max(q.Y for q in points),0)
        v.CropBox=box;v.CropBoxActive=True;v.CropBoxVisible=False
        setp(v,DB.BuiltInParameter.VIEWER_BOUND_OFFSET_FAR,m(14))
    # Hide crossing sections/elevations in elevation and section drawing views.
    for cat in [DB.BuiltInCategory.OST_Sections,DB.BuiltInCategory.OST_Elev]:
        try:v.SetCategoryHidden(DB.ElementId(cat),True)
        except:pass
    if nm(v).startswith('SECTION'):
        for tn in DB.FilteredElementCollector(doc,v.Id).OfClass(DB.TextNote):
            if any(k in tn.Text for k in ['GROUND','FFL','SPRING','CROWN']):
                # Initial text positions used the crop-origin datum (-700); correct to model datum.
                DB.ElementTransformUtils.MoveElement(doc,tn.Id,p(0,0,.7))
        for ce in DB.FilteredElementCollector(doc,v.Id).OfClass(DB.CurveElement):
            if isinstance(ce,DB.DetailCurve):DB.ElementTransformUtils.MoveElement(doc,ce.Id,p(0,0,.7))
roofplan=next(v for v in views if nm(v)=='A102 - Roof and panel layout')
for cat in [DB.BuiltInCategory.OST_Sections,DB.BuiltInCategory.OST_Elev]:roofplan.SetCategoryHidden(DB.ElementId(cat),True)
plan=next(v for v in views if nm(v)=='A101 - Furniture and floor plan')
plan.SetCategoryHidden(DB.ElementId(DB.BuiltInCategory.OST_Elev),True)
# Keep actual section markers on floor plan but crop their annotation extents to sheet cell.
setp(plan,DB.BuiltInParameter.VIEWER_ANNOTATION_CROP_ACTIVE,1)
for s in sheets:
    for n in DB.FilteredElementCollector(doc,s.Id).OfClass(DB.TextNote):
        if 'EXTERIOR AXONOMETRIC' in n.Text: DB.ElementTransformUtils.MoveElement(doc,n.Id,p(0,-.053))
        if 'INTERIOR CUTAWAY' in n.Text: DB.ElementTransformUtils.MoveElement(doc,n.Id,p(0,-.063))
        if 'FURNITURE / FLOOR PLAN' in n.Text:DB.ElementTransformUtils.MoveElement(doc,n.Id,p(0,-.017))
        if '01-03  PRECAST INTERFACES' in n.Text:DB.ElementTransformUtils.MoveElement(doc,n.Id,p(0,-.046))
for mat in DB.FilteredElementCollector(doc).OfClass(DB.Material):
    if nm(mat).startswith('WP-01'):mat.Color=DB.Color(178,177,168)
    if nm(mat).startswith('PC-01'):mat.Color=DB.Color(192,189,179)
# Improve the initial 3D presentation by hiding the section-box boundary category.
try:axo.SetCategoryHidden(DB.ElementId(DB.BuiltInCategory.OST_SectionBox),True)
except:pass
doc.Regenerate();tr.Commit();doc.Save()
opts=DB.PDFExportOptions();opts.Combine=True;opts.FileName='PPE_Engineering_Cafe_Drawings';opts.PaperFormat=DB.ExportPaperFormat.Default
doc.Export(OUT,List[DB.ElementId]([s.Id for s in sheets]),opts)
opts=DB.ImageExportOptions();opts.ExportRange=DB.ExportRange.SetOfViews;opts.SetViewsAndSheets(List[DB.ElementId]([axo.Id]+[s.Id for s in sheets]));opts.FilePath=os.path.join(OUT,'PPE');opts.HLRandWFViewsFileType=DB.ImageFileType.PNG;opts.ShadowViewsFileType=DB.ImageFileType.PNG;opts.ImageResolution=DB.ImageResolution.DPI_150;opts.ZoomType=DB.ZoomFitType.FitToPage;opts.PixelSize=2200;doc.ExportImage(opts)
with open(os.path.join(OUT,'review-complete.txt'),'w') as f:f.write('Views repaired and RVT/PDF/PNG saved')
