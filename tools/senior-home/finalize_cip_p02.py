# -*- coding: utf-8 -*-
import os,json,traceback,codecs
from pyrevit import DB,revit
from System.Collections.Generic import List
OUT=r'E:\1.0 Project GPT Work\Precast-Module\deliverables\PPE_Senior_Home_P02_CIP'
def m(x):return x/.3048
def p(x,y,z=0):return DB.XYZ(m(x),m(y),m(z))
def nm(e):
    try:return e.Name
    except:return e.get_Parameter(DB.BuiltInParameter.SYMBOL_NAME_PARAM).AsString()
try:
    doc=revit.doc;assert 'P02_CIP' in doc.Title
    # The original title block uses static family text for its issue line.
    family=next(e.Symbol.Family for e in DB.FilteredElementCollector(doc).OfCategory(DB.BuiltInCategory.OST_TitleBlocks).WhereElementIsNotElementType() if e.Symbol.Family.Name=='PPE_Engineering_Senior_A1')
    fd=doc.EditFamily(family);tx=DB.Transaction(fd,'P02 title block issue date');tx.Start();changes=0
    for note in DB.FilteredElementCollector(fd).OfClass(DB.TextNote):
        text=note.Text.replace('06 SEP 2026','07 SEP 2026').replace('REV  P01','REV  P02').replace('REV P01','REV P02')
        if text!=note.Text:note.Text=text;changes+=1
    tx.Commit()
    opt=DB.SaveAsOptions();opt.OverwriteExistingFile=True;fd.SaveAs(os.path.join(OUT,'PPE_Engineering_Senior_A1.rfa'),opt)
    class LoadOptions(DB.IFamilyLoadOptions):
        def OnFamilyFound(self,familyInUse,overwriteParameterValues):return True
        def OnSharedFamilyFound(self,sharedFamily,familyInUse,source,overwriteParameterValues):return True
    fd.LoadFamily(doc,LoadOptions());fd.Close(False)
    tx=DB.Transaction(doc,'P02 system views and schedule QA');tx.Start()
    for note in DB.FilteredElementCollector(doc).OfClass(DB.TextNote):
        if 'LC-LC-PC-01' in note.Text:note.Text=note.Text.replace('LC-LC-PC-01','LC-PC-01')
    sch=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.ViewSchedule) if nm(e)=='Q05 - P02 Construction systems register')
    de=sch.Definition;old=de.GetFilter(0);de.SetFilter(0,DB.ScheduleFilter(old.FieldId,DB.ScheduleFilterType.Contains,' '))
    views=[v for v in DB.FilteredElementCollector(doc).OfClass(DB.View3D) if nm(v).startswith('3D - P02')]
    for v in views:
        for c in [DB.BuiltInCategory.OST_Levels,DB.BuiltInCategory.OST_Grids,DB.BuiltInCategory.OST_SectionBox,DB.BuiltInCategory.OST_CLines]:
            try:v.SetCategoryHidden(DB.ElementId(c),True)
            except:pass
        if 'foundations' in nm(v):
            for e in DB.FilteredElementCollector(doc).OfClass(DB.Floor):
                o=v.GetElementOverrides(e.Id);o.SetSurfaceTransparency(65);v.SetElementOverrides(e.Id,o)
    for vp in DB.FilteredElementCollector(doc).OfClass(DB.Viewport):
        vn=nm(doc.GetElement(vp.ViewId))
        if vn.startswith('3D - P02'):
            doc.Regenerate();vp.SetBoxCenter(p(.263,.205 if 'foundations' in vn else .427))
    doc.Regenerate();tx.Commit();doc.Save()
    sheets=sorted(list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet)),key=lambda s:s.SheetNumber)
    opts=DB.PDFExportOptions();opts.Combine=True;opts.FileName='PPE_Engineering_Senior_Home_P02_Drawings';opts.PaperFormat=DB.ExportPaperFormat.Default;doc.Export(OUT,List[DB.ElementId]([s.Id for s in sheets]),opts)
    opts=DB.ImageExportOptions();opts.ExportRange=DB.ExportRange.SetOfViews;opts.SetViewsAndSheets(List[DB.ElementId]([v.Id for v in views]+[s.Id for s in sheets]));opts.FilePath=os.path.join(OUT,'P02');opts.HLRandWFViewsFileType=DB.ImageFileType.PNG;opts.ShadowViewsFileType=DB.ImageFileType.PNG;opts.ImageResolution=DB.ImageResolution.DPI_150;opts.ZoomType=DB.ZoomFitType.FitToPage;opts.PixelSize=2200;doc.ExportImage(opts)
    with open(os.path.join(OUT,'P02-final-qa.json'),'w') as f:json.dump({'titleBlockTextChanges':changes,'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()],'tableRows':sch.GetTableData().GetSectionData(DB.SectionType.Body).NumberOfRows,'allSheetCount':len(sheets),'saved':doc.PathName},f,indent=2)
except:
    try:
        if tx.HasStarted():tx.RollBack()
    except:pass
    with open(os.path.join(OUT,'P02-final-error.txt'),'w') as f:f.write(traceback.format_exc())
    raise
