# -*- coding: utf-8 -*-
import os,json,traceback,codecs,clr
from pyrevit import DB,revit
from System import Int64
from System.Collections.Generic import List
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
OUT=os.path.join(ROOT,'deliverables','PPE_Senior_Home_P02_IFC')
def write(name,data):
    with codecs.open(os.path.join(OUT,name),'w','utf-8') as f:f.write(json.dumps(data,ensure_ascii=False,indent=2))
try:
    doc=revit.doc;assert 'P02_IsPrecast' in doc.Title
    details={'optionsProperties':[p.Name for p in clr.GetClrType(DB.IFCExportOptions).GetProperties()]}
    if hasattr(DB,'IFCParameterTemplate'):
        details['templateMethods']=[str(m) for m in clr.GetClrType(DB.IFCParameterTemplate).GetMethods()]
        details['templateProperties']=[p.Name for p in clr.GetClrType(DB.IFCParameterTemplate).GetProperties()]
    write('IFC_API_Diagnostics.json',details)
    tx=DB.Transaction(doc,'PPE IFC export configuration and ramp type');tx.Start()
    roofMappings=[]
    for roof in DB.FilteredElementCollector(doc).OfClass(DB.RoofBase):
        q=roof.get_Parameter(DB.BuiltInParameter.IFC_EXPORT_ELEMENT_AS)
        assert q and not q.IsReadOnly,'Roof IFC export-as parameter unavailable'
        q.Set('IfcSlab')
        p=roof.get_Parameter(DB.BuiltInParameter.IFC_EXPORT_PREDEFINEDTYPE)
        assert p and not p.IsReadOnly,'Roof IFC predefined type parameter unavailable'
        p.Set('ROOF')
        roofMappings.append(str(roof.Id.Value))
    ramp=doc.GetElement(DB.ElementId(Int64(358787)))
    if ramp.GetTypeId()==DB.ElementId.InvalidElementId:
        rt=DB.DirectShapeType.Create(doc,'PPE - CIP accessible ramp 1 to 12',ramp.Category.Id)
        rt.SetShape(List[DB.GeometryObject](list(ramp.get_Geometry(DB.Options()))))
        ramp.SetTypeId(rt.Id)
    template=DB.IFCParameterTemplate.FindByName(doc,'PPE Engineering - Full model with IsPrecast')
    if not template:template=DB.IFCParameterTemplate.GetOrCreateInSessionTemplate(doc).CopyTemplate(doc,'PPE Engineering - Full model with IsPrecast')
    template.ExportRevitElementParameters=True
    template.ExportRevitMaterialParameters=True
    template.ExportIFCCommonPropertySets=True
    template.ExportIFCBaseQuantities=True
    template.SetActiveTemplate()
    tx.Commit();doc.Save()
    options=DB.IFCExportOptions();options.FileVersion=DB.IFCVersion.IFC2x3CV2;options.SpaceBoundaryLevel=1
    exportOptions={'ExportBaseQuantities':'true','ExportIFCCommonPropertySets':'true','ExportInternalRevitPropertySets':'true','UseActiveViewGeometry':'false','IncludeSiteElevation':'true','PropertyMapping':template.Name}
    for k,v in exportOptions.items():options.AddOption(k,v)
    tx=DB.Transaction(doc,'PPE full model IFC export with property sets');tx.Start()
    try:exported=doc.Export(OUT,'PPE_Engineering_Senior_Home_P02_IsPrecast_R2026',options)
    finally:
        if tx.HasStarted():tx.RollBack()
    write('Revit_IFC_Export_Result.json',{'status':'complete' if exported else 'failed','schema':'IFC2x3CV2','options':exportOptions,'activeViewFilter':False,'rampTypeId':str(ramp.GetTypeId().Value),'roofIfcSlabROOF':roofMappings})
    print('PPE IFC EXPORT COMPLETE')
except:
    try:
        if tx.HasStarted():tx.RollBack()
    except:pass
    write('IFC-finalize-error.json',{'traceback':traceback.format_exc()});print(traceback.format_exc())
