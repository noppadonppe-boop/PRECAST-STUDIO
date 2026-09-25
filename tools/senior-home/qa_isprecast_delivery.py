# -*- coding: utf-8 -*-
import os,json,codecs,traceback
from pyrevit import DB,revit
from System.Collections.Generic import List
OUT=r'E:\1.0 Project GPT Work\Precast-Module\deliverables\PPE_Senior_Home_P02_IFC'
def write(name,data):
    with codecs.open(os.path.join(OUT,name),'w','utf-8') as f:f.write(json.dumps(data,ensure_ascii=False,indent=2))
try:
    doc=revit.doc
    with codecs.open(os.path.join(OUT,'Revit_IsPrecast_Audit.json'),'r','utf-8') as f:old=json.load(f)
    rows=[];physical=[]
    for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType():
        if not e.Category or e.Category.CategoryType!=DB.CategoryType.Model:continue
        try:mats=sorted(str(x.Value) for x in e.GetMaterialIds(False))
        except:mats=[]
        rows.append({'id':str(e.Id.Value),'category':e.Category.Name,'typeId':str(e.GetTypeId().Value),'materials':mats})
        if e.Category.Name in ['Walls','Roofs','Floors','Structural Foundations','Ramps','Generic Models','Ceilings','Doors','Windows','Furniture','Plumbing Fixtures','Lighting Fixtures','Electrical Fixtures','Casework','Specialty Equipment']:
            if mats:physical.append(str(e.Id.Value))
    before={r['id']:r for r in old['before']};after={r['id']:r for r in rows}
    assert set(before)==set(after),'Instance inventory changed'
    differences=[{'before':before[k],'after':after[k]} for k in before if before[k]!=after[k]]
    assert len(differences)==1 and differences[0]['before']['id']=='358787','Unexpected inventory differences'
    assert all(before[k]['materials']==after[k]['materials'] for k in before),'Material assignments changed'
    materials=list(DB.FilteredElementCollector(doc).OfClass(DB.Material));assert len(materials)==old['materialCount']
    write('Final_Preservation_QA.json',{'allOriginalInstanceIdsPreserved':True,'allMaterialAssignmentsPreserved':True,'materialDefinitionsPreserved':len(materials),'onlyTypeChange':differences,'physicalMaterialBearingIds':physical,'physicalMaterialBearingCount':len(physical),'sheets':len(list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet))),'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()]})
    views=[v for v in DB.FilteredElementCollector(doc).OfClass(DB.View3D) if not v.IsTemplate and v.Name in ['3D - Exterior - PPE Senior Home','3D - Interior cutaway - PPE Senior Home']]
    io=DB.ImageExportOptions();io.FilePath=os.path.join(OUT,'PPE_Full_Finishes');io.ExportRange=DB.ExportRange.SetOfViews;io.SetViewsAndSheets(List[DB.ElementId]([v.Id for v in views]));io.HLRandWFViewsFileType=DB.ImageFileType.PNG;io.ShadowViewsFileType=DB.ImageFileType.PNG;io.ZoomType=DB.ZoomFitType.FitToPage;io.PixelSize=2000;io.ImageResolution=DB.ImageResolution.DPI_150
    doc.ExportImage(io)
    print('PRESERVATION QA COMPLETE')
except:write('QA-error.json',{'traceback':traceback.format_exc()});print(traceback.format_exc())
