# -*- coding: utf-8 -*-
"""Correct node roof occlusion in L/U plans; retain geometry and re-audit."""
import os,json,codecs,traceback
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
helper=os.path.join(ROOT,'tools','revit-p61','build_pilot.py')
exec(compile(open(helper).read().split('doc=None\ntry:')[0],helper,'exec'))
WORK=os.path.join(ROOT,'output','revit-p61-batch')
OUT=os.path.join(ROOT,'deliverables','PM_ARC_48_P104')
auditfile=os.path.join(ROOT,'tools','revit-p61','audit_batch.py')
ns={'__revit__':__revit__}
exec(compile(open(auditfile).read().split('\nselection=os.path.join')[0],auditfile,'exec'),ns)
results=[]
for pid in ['PM-'+plan+'-'+profile+str(use) for plan in ['L','U'] for profile in ['A','B','C','D'] for use in range(1,5) if 'PM-'+plan+'-'+profile+str(use)!='PM-L-A1']:
    d=None
    try:
        folder=os.path.join(OUT,pid);rvt=os.path.join(folder,pid+'_ARC_R2026_P104.rvt')
        d=app.OpenDocumentFile(rvt)
        viewnames=['ARC 3D Exterior','ARC 3D Interior cutaway','ARC A101 Furniture and finishes','ARC A401 MEP preliminary positions']
        views=[v for v in DB.FilteredElementCollector(d).OfClass(DB.View) if v.Name in viewnames]
        assert len(views)==4
        centers=[(v,v.GetBoxCenter()) for v in DB.FilteredElementCollector(d).OfClass(DB.Viewport)]
        t=DB.Transaction(d,'P104 plan top range below node roof');t.Start()
        for v in views:
            if isinstance(v,DB.ViewPlan):
                vr=v.GetViewRange();vr.SetOffset(DB.PlanViewPlane.TopClipPlane,mm(2000));v.SetViewRange(vr)
        d.Regenerate()
        for v,p in centers:v.SetBoxCenter(p)
        t.Commit();d.Save();d.Close(False);d=app.OpenDocumentFile(rvt)
        ss=sorted(DB.FilteredElementCollector(d).OfClass(DB.ViewSheet),key=lambda v:v.SheetNumber)
        op=DB.PDFExportOptions();op.Combine=True;op.FileName=pid+'_ARC_A1_P104';op.PaperFormat=DB.ExportPaperFormat.Default
        assert d.Export(folder,List[DB.ElementId]([s.Id for s in ss]),op)
        for vn,suffix in zip(viewnames,['Exterior','Interior','Plan','MEP']):
            v=next(v for v in DB.FilteredElementCollector(d).OfClass(DB.View) if v.Name==vn)
            if isinstance(v,DB.ViewPlan):assert abs(v.GetViewRange().GetOffset(DB.PlanViewPlane.TopClipPlane)-mm(2000))<1e-6
            op=DB.ImageExportOptions();op.ExportRange=DB.ExportRange.SetOfViews;op.SetViewsAndSheets(List[DB.ElementId]([v.Id]));op.FilePath=os.path.join(folder,suffix);op.HLRandWFViewsFileType=DB.ImageFileType.PNG;op.ShadowViewsFileType=DB.ImageFileType.PNG;op.ImageResolution=DB.ImageResolution.DPI_150;op.ZoomType=DB.ZoomFitType.FitToPage;op.PixelSize=2400;d.ExportImage(op)
        d.Close(False);d=None
        qp=os.path.join(folder,'QA_P104.json');qa=json.load(open(qp))
        qa.update({'planRangePatch':'Top clip2000mm excludes overhead node roofs; geometry unchanged; native reopened','visualReview':'PENDING','packaged':False})
        write(qp,qa)
        results.append(ns['audit'](pid))
    except:
        results.append({'id':pid,'error':traceback.format_exc()})
    finally:
        if d:
            try:d.Close(False)
            except:pass
    write(os.path.join(WORK,'node-plan-patch-result.json'),results)
