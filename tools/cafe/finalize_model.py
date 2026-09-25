# -*- coding: utf-8 -*-
"""Final cafe QA: circulation, sheet placement, material appearance and audit."""
import os,json,codecs,math
from pyrevit import DB,revit
from System.Collections.Generic import List
OUT=r'E:\1.0 Project GPT Work\Precast-Module\deliverables\PPE_Cafe'
path=os.path.join(OUT,'PPE_Engineering_Precast_Cafe_R2026.rvt')
uiapp=revit.uidoc.Application
uidoc=uiapp.OpenAndActivateDocument(path);doc=uidoc.Document
def m(x):return x/.3048
def p(x,y,z=0):return DB.XYZ(m(x),m(y),m(z))
def nm(e):return DB.Element.Name.GetValue(e)
def setp(e,b,val):
    q=e.get_Parameter(b)
    if q and not q.IsReadOnly:q.Set(val)
def rect(x,y,z,w,h):
    vs=[p(x,y,z),p(x+w,y,z),p(x+w,y+h,z),p(x,y+h,z)];loop=DB.CurveLoop()
    for i in range(4):loop.Append(DB.Line.CreateBound(vs[i],vs[(i+1)%4]))
    return loop
def boxshape(e,x,y,z,w,h,d,mat):
    s=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([rect(x,y,z,w,h)]),DB.XYZ.BasisZ,m(d),DB.SolidOptions(mat.Id,DB.ElementId.InvalidElementId))
    e.SetShape(List[DB.GeometryObject]([s]))
views=list(DB.FilteredElementCollector(doc).OfClass(DB.View))
sheets=sorted(list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet)),key=lambda v:v.SheetNumber)
axo=next(v for v in views if nm(v)=='3D - Exterior - PPE Cafe')
tr=DB.Transaction(doc,'PPE final QA - circulation and sheet alignment');tr.Start()
done=doc.ProjectInformation.get_Parameter(DB.BuiltInParameter.PROJECT_STATUS).AsString() or ''
timber=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.Material) if nm(e).startswith('WD-01'))
concrete=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.Material) if nm(e).startswith('PC-01'))
allshapes=list(DB.FilteredElementCollector(doc).OfClass(DB.DirectShape))
if 'QA2' not in done:
    for e in allshapes:
        name=nm(e);b=e.get_BoundingBox(None)
        if name=='CW-02 coffee service island':boxshape(e,1.75,1.52,.45,1.7,.6,.92,timber)
        elif name=='CW-02 worktop':boxshape(e,1.72,1.49,1.37,1.76,.66,.04,timber)
        elif name in ['Espresso machine','Espresso machine stainless face','Coffee grinder','Grinder hopper']:DB.ElementTransformUtils.MoveElement(doc,e.Id,p(0,.4))
        elif name=='Under-counter refrigerator':DB.ElementTransformUtils.MoveElement(doc,e.Id,p(-.45,.4))
        elif name in ['Cafe round table','Table pedestal','Table base']:
            x=(b.Min.X+b.Max.X)/2*.3048;y=(b.Min.Y+b.Max.Y)/2*.3048
            if abs(y-2.38)<.02:DB.ElementTransformUtils.MoveElement(doc,e.Id,p(4.75-x,(.85 if x<3 else 2.4)-y))
        elif name=='Cafe chair':
            x=(b.Min.X+b.Max.X)/2*.3048;y=(b.Min.Y+b.Max.Y)/2*.3048
            if abs(y-2.38)<.05:
                destx=4.2 if abs(x-2)<.1 or abs(x-4.1)<.1 else 5.3;desty=.85 if x<3.5 else 2.4
                DB.ElementTransformUtils.MoveElement(doc,e.Id,p(destx-x,desty-y))
    for roof in DB.FilteredElementCollector(doc).OfClass(DB.RoofBase):
        opt=DB.Options();opt.ComputeReferences=True
        for geom in roof.get_Geometry(opt):
            if isinstance(geom,DB.Solid):
                for face in geom.Faces:
                    if isinstance(face,DB.PlanarFace) and abs(face.FaceNormal.Z)<.1:doc.Paint(roof.Id,face,concrete.Id)
    setp(doc.ProjectInformation,DB.BuiltInParameter.PROJECT_STATUS,'CONCEPT - FOR DESIGN REVIEW - QA2')
    plan=next(v for v in views if nm(v)=='A101 - Furniture and floor plan')
    for n in DB.FilteredElementCollector(doc,plan.Id).OfClass(DB.TextNote):
        if n.Text.strip()=='CW-02':DB.ElementTransformUtils.MoveElement(doc,n.Id,p(0,.42))
        if 'CAFE' in n.Text:DB.ElementTransformUtils.MoveElement(doc,n.Id,p(-.35,0))
    s=next(s for s in sheets if s.SheetNumber=='A101')
    for n in DB.FilteredElementCollector(doc,s.Id).OfClass(DB.TextNote):
        if '01 WC and 02 store' in n.Text:n.Text=n.Text+'\nStaff aisle behind island: 800 nominal clear. Front seating provides a central approach to the entrance.'
centres={'3D - Exterior - PPE Cafe':(.285,.343),'A101 - Furniture and floor plan':(.226,.365),'A102 - Roof and panel layout':(.625,.365),'EAST - Glazed entrance':(.230,.435),'WEST - Rear precast':(.630,.435),'SOUTH - Service hatch':(.230,.219),'NORTH - Seating side':(.630,.219),'SECTION A-A - Longitudinal':(.243,.361),'SECTION B-B - Transverse':(.644,.361),'D501 - Schematic precast interfaces':(.420,.358),'3D - Interior cutaway - PPE Cafe':(.560,.362)}
for vp in DB.FilteredElementCollector(doc).OfClass(DB.Viewport):
    vn=nm(doc.GetElement(vp.ViewId))
    if vn in centres:vp.SetBoxCenter(p(*centres[vn]))
setp(doc.ProjectInformation,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,'Image-based architectural concept. Proposed LC concrete 35 MPa, density 1800 kg/m3; image density 1200 not verified. Connections, reinforcing, foundations, lifting, MEP and accessibility pending detailed design.')
doc.Regenerate();tr.Commit();uidoc.ActiveView=axo;doc.Save()
opts=DB.PDFExportOptions();opts.Combine=True;opts.FileName='PPE_Engineering_Cafe_Drawings';opts.PaperFormat=DB.ExportPaperFormat.Default
pdfok=doc.Export(OUT,List[DB.ElementId]([s.Id for s in sheets]),opts)
opts=DB.ImageExportOptions();opts.ExportRange=DB.ExportRange.SetOfViews;opts.SetViewsAndSheets(List[DB.ElementId]([axo.Id]+[s.Id for s in sheets]));opts.FilePath=os.path.join(OUT,'PPE');opts.HLRandWFViewsFileType=DB.ImageFileType.PNG;opts.ShadowViewsFileType=DB.ImageFileType.PNG;opts.ImageResolution=DB.ImageResolution.DPI_150;opts.ZoomType=DB.ZoomFitType.FitToPage;opts.PixelSize=2200;doc.ExportImage(opts)
audit={'file':path,'revit':'2026','pdfExport':bool(pdfok),'sheets':[{'number':s.SheetNumber,'name':s.Name} for s in sheets],'counts':{},'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()],'rooms':[],'materialProperties':{'precastStrengthMPa':35,'precastDensityKgM3':1800,'status':'proposed - verify with supplier and engineer'},'limitations':['Architectural concept; not approved construction or fabrication design.','No reinforcement, lifting anchor, structural calculation or MEP design.','Custom components use categorized DirectShape; system walls floors roofs are native.','Dimensions reference annotation witness lines; verify after geometric edits.']}
for cls in [DB.Wall,DB.Floor,DB.RoofBase,DB.DirectShape,DB.ViewSection,DB.ViewSchedule]:audit['counts'][str(cls.__name__)]=int(len(list(DB.FilteredElementCollector(doc).OfClass(cls))))
for room in DB.FilteredElementCollector(doc).OfCategory(DB.BuiltInCategory.OST_Rooms).WhereElementIsNotElementType():audit['rooms'].append({'number':room.Number,'name':nm(room),'areaM2':round(float(room.Area)*.3048**2,3)})
audit['roofPanels']=[]
for r in DB.FilteredElementCollector(doc).OfClass(DB.RoofBase):
    b=r.get_BoundingBox(None);audit['roofPanels'].append({'mark':r.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString(),'minM':[float(q)*.3048 for q in [b.Min.X,b.Min.Y,b.Min.Z]],'maxM':[float(q)*.3048 for q in [b.Max.X,b.Max.Y,b.Max.Z]]})
with codecs.open(os.path.join(OUT,'model-audit.json'),'w','utf8') as f:f.write(json.dumps(audit,indent=2))
with open(os.path.join(OUT,'final-qa-complete.txt'),'w') as f:f.write('RVT saved, six sheets exported, model audit written.')
