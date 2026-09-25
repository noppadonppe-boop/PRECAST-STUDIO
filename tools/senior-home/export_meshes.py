# -*- coding: utf-8 -*-
import os,json,traceback
from pyrevit import DB,revit
OUT=r'E:\1.0 Project GPT Work\Precast-Module\deliverables\PPE_Senior_Home\video'
if not os.path.isdir(OUT): os.makedirs(OUT)
try:
    doc=revit.doc
    assert 'Senior_Home' in doc.Title,doc.Title
    opts=DB.Options(); opts.DetailLevel=DB.ViewDetailLevel.Fine
    mats={}; elements=[]
    def mid(id):
        k=str(id.Value)
        if k not in mats:
            m=doc.GetElement(id)
            if isinstance(m,DB.Material):
                c=m.Color
                mats[k]={'name':m.Name,'color':[int(c.Red),int(c.Green),int(c.Blue)],'transparency':int(m.Transparency)}
            else: mats[k]={'name':'Default','color':[195,190,180],'transparency':0}
        return k
    def tri(mesh,mat,parts):
        k=mid(mat); data=parts.setdefault(k,[])
        for i in range(mesh.NumTriangles):
            t=mesh.get_Triangle(i)
            for j in range(3):
                v=t.get_Vertex(j)
                data.extend([round(v.X*.3048,5),round(v.Y*.3048,5),round(v.Z*.3048,5)])
    def walk(geo,parts):
        for g in geo:
            if isinstance(g,DB.GeometryInstance):walk(g.GetInstanceGeometry(),parts)
            elif isinstance(g,DB.Solid):
                for f in g.Faces:tri(f.Triangulate(),f.MaterialElementId,parts)
            elif isinstance(g,DB.Mesh):tri(g,g.MaterialElementId,parts)
    for e in DB.FilteredElementCollector(doc).WhereElementIsNotElementType():
        if not e.Category or e.Category.CategoryType!=DB.CategoryType.Model:continue
        if isinstance(e,(DB.View,DB.ElementType)):continue
        parts={}
        try:
            geo=e.get_Geometry(opts)
            if geo:walk(geo,parts)
        except:continue
        if not parts:continue
        p=e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK)
        elements.append({'id':str(e.Id.Value),'name':str(e.GetType().Name),'category':e.Category.Name,'mark':p.AsString() if p else '', 'parts':parts})
    with open(os.path.join(OUT,'revit-meshes.json'),'w') as f:json.dump({'source':doc.PathName,'materials':mats,'elements':elements},f,separators=(',',':'))
    with open(os.path.join(OUT,'export-status.txt'),'w') as f:f.write('Exported '+str(len(elements))+' model elements')
except:
    with open(os.path.join(OUT,'export-error.txt'),'w') as f:f.write(traceback.format_exc())
    raise



