import clr,json,os
clr.AddReference('RevitAPI')
from Autodesk.Revit import DB
root=r'E:\1.0 Project GPT Work\Precast-Module'
app=__revit__.Application
doc=app.OpenDocumentFile(os.path.join(root,'deliverables/PM_Revit_48_P6/PM-I-C1/PM-I-C1_R2026_P01.rvt'))
def pt(p):return [p.X*304.8,p.Y*304.8,p.Z*304.8]
results=[]
for v in DB.FilteredElementCollector(doc).OfClass(DB.ViewSection):
    if not v.Name.startswith('PM'):continue
    b=v.CropBox
    dims=[]
    for d in DB.FilteredElementCollector(doc).OfClass(DB.Dimension):
        if d.OwnerViewId==v.Id:
            q=d.get_BoundingBox(v)
            dims.append({'id':int(d.Id.Value),'hidden':d.IsHidden(v),'value':d.Value,'bbox':None if not q else [pt(q.Min),pt(q.Max)],'line':[pt(d.Curve.GetEndPoint(0)),pt(d.Curve.GetEndPoint(1))] if d.Curve.IsBound else 'unbound'})
    results.append({'view':v.Name,'origin':pt(v.Origin),'right':pt(v.RightDirection),'up':pt(v.UpDirection),'crop':[pt(b.Min),pt(b.Max)],'cropOrigin':pt(b.Transform.Origin),'dimensions':dims,'dimensionsVisible':not v.GetCategoryHidden(DB.ElementId(DB.BuiltInCategory.OST_Dimensions))})
json.dump(results,open(os.path.join(root,'output/revit-p6/view-inspection.json'),'w'),indent=2)
doc.Close(False)
