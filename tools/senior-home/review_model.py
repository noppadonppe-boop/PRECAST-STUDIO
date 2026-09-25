# -*- coding: utf-8 -*-
import os,json,codecs,traceback
from pyrevit import DB,revit
from System.Collections.Generic import List
OUT=r'E:\1.0 Project GPT Work\Precast-Module\deliverables\PPE_Senior_Home'
path=os.path.join(OUT,'PPE_Engineering_Senior_Home_R2026.rvt')
try:
    uiapp=revit.uidoc.Application
    uidoc=uiapp.OpenAndActivateDocument(path);doc=uidoc.Document
    def nm(e):return DB.Element.Name.GetValue(e)
    def vec(p):return [round(float(q)*.3048,4) for q in [p.X,p.Y,p.Z]]
    views=list(DB.FilteredElementCollector(doc).OfClass(DB.View))
    sheets=sorted(list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet)),key=lambda s:s.SheetNumber)
    axo=next(v for v in views if nm(v)=='3D - Exterior - PPE Senior Home')
    cut=next(v for v in views if nm(v)=='3D - Interior cutaway - PPE Senior Home')
    uidoc.ActiveView=axo
    audit={'file':path,'revitVersion':doc.Application.VersionNumber,'sheets':[{'number':s.SheetNumber,'name':nm(s)} for s in sheets],'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()],'rooms':[],'roofs':[],'counts':{},'views':[],'doors':[]}
    for cls in [DB.Wall,DB.Floor,DB.RoofBase,DB.DirectShape,DB.ViewSection,DB.ViewSchedule]:audit['counts'][cls.__name__]=len(list(DB.FilteredElementCollector(doc).OfClass(cls)))
    for room in DB.FilteredElementCollector(doc).OfCategory(DB.BuiltInCategory.OST_Rooms).WhereElementIsNotElementType():audit['rooms'].append({'name':nm(room),'number':room.Number,'areaM2':round(room.Area*.3048**2,3)})
    for r in DB.FilteredElementCollector(doc).OfClass(DB.RoofBase):
        b=r.get_BoundingBox(None);audit['roofs'].append({'mark':r.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString(),'minM':vec(b.Min),'maxM':vec(b.Max)})
    for v in DB.FilteredElementCollector(doc).OfClass(DB.ViewSection):
        if not v.IsTemplate:audit['views'].append({'name':nm(v),'direction':vec(v.ViewDirection),'elements':len(list(DB.FilteredElementCollector(doc,v.Id).WhereElementIsNotElementType()))})
    for d in DB.FilteredElementCollector(doc).OfClass(DB.FamilyInstance).OfCategory(DB.BuiltInCategory.OST_Doors):
        audit['doors'].append({'mark':d.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString(),'type':nm(d.Symbol),'bbox':{'min':vec(d.get_BoundingBox(None).Min),'max':vec(d.get_BoundingBox(None).Max)}})
    pars=[]
    for d in DB.FilteredElementCollector(doc).OfClass(DB.FamilyInstance).OfCategory(DB.BuiltInCategory.OST_Doors):
        if d.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString()=='D02':
            for owner,obj in [('instance',d),('type',d.Symbol)]:
                for par in obj.Parameters:pars.append({'owner':owner,'name':par.Definition.Name,'value':par.AsValueString(),'readOnly':par.IsReadOnly,'storage':str(par.StorageType)})
    with codecs.open(os.path.join(OUT,'door-parameters.json'),'w','utf8') as f:f.write(json.dumps(pars,indent=2))
    opts=DB.PDFExportOptions();opts.Combine=True;opts.FileName='PPE_Engineering_Senior_Home_Drawings';opts.PaperFormat=DB.ExportPaperFormat.Default
    audit['pdfExport']=bool(doc.Export(OUT,List[DB.ElementId]([s.Id for s in sheets]),opts))
    opts=DB.ImageExportOptions();opts.ExportRange=DB.ExportRange.SetOfViews;opts.SetViewsAndSheets(List[DB.ElementId]([axo.Id,cut.Id]+[s.Id for s in sheets]));opts.FilePath=os.path.join(OUT,'PPE');opts.HLRandWFViewsFileType=DB.ImageFileType.PNG;opts.ShadowViewsFileType=DB.ImageFileType.PNG;opts.ImageResolution=DB.ImageResolution.DPI_150;opts.ZoomType=DB.ZoomFitType.FitToPage;opts.PixelSize=2200;doc.ExportImage(opts)
    with codecs.open(os.path.join(OUT,'model-audit.json'),'w','utf8') as f:f.write(json.dumps(audit,indent=2))
    with open(os.path.join(OUT,'review-complete.txt'),'w') as f:f.write('RVT reopened, drawings exported, model audit written.')
except:
    with open(os.path.join(OUT,'review-error.txt'),'w') as f:f.write(traceback.format_exc())
    raise
