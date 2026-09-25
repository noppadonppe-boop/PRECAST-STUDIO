# -*- coding: utf-8 -*-
import os,json,traceback,codecs
from pyrevit import DB,revit
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
OUT=os.path.join(ROOT,'deliverables','PPE_Senior_Home_P02_IFC')
if not os.path.isdir(OUT):os.makedirs(OUT)
def write(name,data):
    with codecs.open(os.path.join(OUT,name),'w','utf-8') as f:f.write(json.dumps(data,ensure_ascii=False,indent=2))
def nm(e):
    try:return e.Name
    except:return str(e.GetType().Name)
def textparam(e,name):
    p=e.LookupParameter(name)
    return (p.AsString() or '') if p else ''
def inventory(doc):
    rows=[]
    for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType():
        if not e.Category or e.Category.CategoryType!=DB.CategoryType.Model:continue
        try:mats=sorted(str(x.Value) for x in e.GetMaterialIds(False))
        except:mats=[]
        rows.append({'id':str(e.Id.Value),'category':e.Category.Name,'typeId':str(e.GetTypeId().Value),'materials':mats})
    return sorted(rows,key=lambda r:r['id'])
try:
    doc=revit.doc;app=doc.Application
    assert 'P02_CIP' in doc.Title,doc.Title
    before=inventory(doc)
    matsBefore=[{'id':str(e.Id.Value),'name':nm(e)} for e in DB.FilteredElementCollector(doc).OfClass(DB.Material)]
    pe=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.ParameterElement) if e.GetDefinition().Name=='IsPrecast')
    definition=pe.GetDefinition()
    assert definition.GetDataType()==DB.SpecTypeId.Boolean.YesNo,'Not Yes/No'
    assert not isinstance(pe,DB.SharedParameterElement),'User requested non-shared project parameter'
    tr=DB.Transaction(doc,'PPE - IsPrecast classification - preserve all finishes');tr.Start()
    cats=app.Create.NewCategorySet()
    names=['OST_Walls','OST_Floors','OST_Roofs','OST_StructuralFoundation','OST_StructuralColumns','OST_StructuralFraming','OST_Ramps','OST_GenericModel','OST_Ceilings','OST_Doors','OST_Windows','OST_Furniture','OST_FurnitureSystems','OST_PlumbingFixtures','OST_Casework','OST_SpecialityEquipment','OST_LightingFixtures','OST_ElectricalFixtures','OST_Railings','OST_Stairs','OST_Planting','OST_Site']
    for name in names:
        cat=doc.Settings.Categories.get_Item(getattr(DB.BuiltInCategory,name))
        if cat and cat.AllowsBoundParameters:cats.Insert(cat)
    binding=doc.ParameterBindings.get_Item(definition)
    assert isinstance(binding,DB.InstanceBinding),'Not instance binding'
    for c in cats:assert binding.Categories.Contains(c),'Missing category '+c.Name
    cats=binding.Categories
    doc.Regenerate()
    records=[]
    for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType():
        if not e.Category or e.Category.CategoryType!=DB.CategoryType.Model:continue
        q=e.LookupParameter('IsPrecast')
        if not q:continue
        code=textparam(e,'PPE_System_Code');value=1 if code=='LC-PC' else 0
        assert not q.IsReadOnly,'Read-only '+str(e.Id)
        q.Set(value)
        mark=e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK)
        records.append({'id':str(e.Id.Value),'uniqueId':e.UniqueId,'category':e.Category.Name,'name':nm(e),'mark':mark.AsString() if mark else '', 'system':code,'IsPrecast':bool(q.AsInteger()),'shared':q.IsShared})
    assert sum(1 for r in records if r['IsPrecast'])==34,'Unexpected precast count'
    assert sum(1 for r in records if r['system']=='CIP' and not r['IsPrecast'])==47,'CIP mismatch'
    assert sum(1 for r in records if r['system']=='FIN' and not r['IsPrecast'])==16,'Finish mismatch'
    tr.Commit()
    after=inventory(doc);assert before==after,'Physical inventory changed'
    matsAfter=[{'id':str(e.Id.Value),'name':nm(e)} for e in DB.FilteredElementCollector(doc).OfClass(DB.Material)]
    assert matsBefore==matsAfter,'Material inventory changed'
    view=next(v for v in DB.FilteredElementCollector(doc).OfClass(DB.View3D) if nm(v)=='3D - Exterior - PPE Senior Home')
    revit.uidoc.ActiveView=view
    for uv in revit.uidoc.GetOpenUIViews():
        if uv.ViewId==view.Id:uv.ZoomToFit()
    target='PPE_Engineering_Senior_Home_P02_IsPrecast_R2026'
    save=DB.SaveAsOptions();save.OverwriteExistingFile=True;save.MaximumBackups=1
    doc.SaveAs(os.path.join(OUT,target+'.rvt'),save)
    write('Revit_IsPrecast_Audit.json',{'parameter':{'name':'IsPrecast','type':'Yes/No','instance':True,'shared':False,'group':'Identity Data','categories':[c.Name for c in cats]},'physicalInventoryUnchanged':before==after,'materialsUnchanged':matsBefore==matsAfter,'materialCount':len(matsAfter),'materials':matsAfter,'before':before,'after':after,'elements':records,'counts':{'Yes':34,'No':len(records)-34,'CIP':47,'finishOnly':16},'sheets':[{'number':s.SheetNumber,'name':nm(s)} for s in DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet)]})
    options=DB.IFCExportOptions();options.FileVersion=DB.IFCVersion.IFC2x3CV2;options.SpaceBoundaryLevel=1
    exportOptions={'ExportBaseQuantities':'true','ExportIFCCommonPropertySets':'true','ExportInternalRevitPropertySets':'true','UseActiveViewGeometry':'false','IncludeSiteElevation':'true'}
    for k,v in exportOptions.items():options.AddOption(k,v)
    tx=DB.Transaction(doc,'PPE full model IFC export');tx.Start()
    try:exported=doc.Export(OUT,target,options)
    finally:
        if tx.HasStarted():tx.RollBack()
    assert exported,'IFC export failed'
    write('Revit_IFC_Export_Result.json',{'status':'complete','rvt':target+'.rvt','ifc':target+'.ifc','schema':'IFC2x3CV2','options':exportOptions,'activeViewFilter':False,'preserveAllFinishes':True})
    print('PPE IFC COMPLETE: '+OUT)
except:
    try:
        if tr.HasStarted():tr.RollBack()
    except:pass
    write('IsPrecast-error.json',{'traceback':traceback.format_exc()})
    print(traceback.format_exc())
