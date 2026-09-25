# -*- coding: utf-8 -*-
import os,json,traceback
from pyrevit import DB,revit
from System.Collections.Generic import List
OUT=r'E:\1.0 Project GPT Work\Precast-Module\deliverables\PPE_Senior_Home'
def m(x):return x/.3048
def p(x,y,z=0):return DB.XYZ(m(x),m(y),m(z))
def nm(e):return DB.Element.Name.GetValue(e)
def sp(e,b,v):
    q=e.get_Parameter(b)
    if q and not q.IsReadOnly:q.Set(v)
try:
    doc=revit.doc
    if not doc.PathName.endswith('PPE_Engineering_Senior_Home_R2026.rvt'):raise Exception('Unexpected active document')
    tr=DB.Transaction(doc,'PPE coordinate room ceilings and lighting');tr.Start()
    existing=list(DB.FilteredElementCollector(doc).OfClass(DB.Ceiling))
    if not existing:
        base=next(t for t in DB.FilteredElementCollector(doc).OfClass(DB.CeilingType) if t.GetCompoundStructure() is not None)
        typ=base.Duplicate('PPE - 12 mm moisture resistant gypsum ceiling')
        matid=DB.Material.Create(doc,'CL-01 - Moisture-resistant gypsum ceiling');mat=doc.GetElement(matid);mat.Color=DB.Color(231,225,211)
        sp(mat,DB.BuiltInParameter.ALL_MODEL_DESCRIPTION,'12 mm moisture-resistant gypsum with washable low-emission finish. Wet room ventilation and access panels to coordinate.')
        cs=typ.GetCompoundStructure();cs.SetLayers(List[DB.CompoundStructureLayer]([DB.CompoundStructureLayer(m(.012),DB.MaterialFunctionAssignment.Structure,matid)]));typ.SetCompoundStructure(cs)
        level=next(l for l in DB.FilteredElementCollector(doc).OfClass(DB.Level) if nm(l)=='01 FFL +450')
        for a,b,c,d,z,mark in [(.15,.15,2.35,3.15,2.90,'CL01 BATH'),(.15,3.25,2.35,5.45,2.90,'CL02 UTILITY'),(5.85,.15,9.45,5.45,3.04,'CL03 LIVING')]:
            pts=[p(a,b),p(c,b),p(c,d),p(a,d)];loop=DB.CurveLoop()
            for i in range(4):loop.Append(DB.Line.CreateBound(pts[i],pts[(i+1)%4]))
            ce=DB.Ceiling.Create(doc,List[DB.CurveLoop]([loop]),typ.Id,level.Id);sp(ce,DB.BuiltInParameter.CEILING_HEIGHTABOVELEVEL_PARAM,m(z-.45));sp(ce,DB.BuiltInParameter.ALL_MODEL_MARK,mark)
        for e in DB.FilteredElementCollector(doc).OfClass(DB.DirectShape):
            if nm(e).startswith('Warm 3000K ceiling light'):
                b=e.get_BoundingBox(None)
                if b.Max.X<m(2.4):DB.ElementTransformUtils.MoveElement(doc,e.Id,p(0,0,-.16))
        for n in DB.FilteredElementCollector(doc).OfClass(DB.TextNote):
            if 'LEVELS AND BUILD-UP' in n.Text:continue
            if '+3150 Internal partition top.' in n.Text:n.Text=n.Text.replace('+3150 Internal partition top.','+2900 Bath / utility ceiling soffit.\n+3040 Living ceiling soffit.\n+3150 Internal partition top.')
            if '12 timber lining + 5 waterproofing.' in n.Text:n.Text=n.Text.replace('12 timber lining + 5 waterproofing.','12 timber lining + 5 waterproofing.\nCL-01: 12 moisture-resistant gypsum.')
        # Bed lights are pendants below the exposed timber-lined vault.
        metal=next(t for t in DB.FilteredElementCollector(doc).OfClass(DB.Material) if nm(t).startswith('AL-01'))
        R=(2.9**2+1.3**2)/2.6;zc=4.5-R
        import math
        for x,y in [(4.1,1.6),(4.1,4.4)]:
            ztop=zc+math.sqrt((R-.217)**2-(x-2.9)**2)
            r=.006;pts=[p(x-r,y-r,3.075),p(x+r,y-r,3.075),p(x+r,y+r,3.075),p(x-r,y+r,3.075)];loop=DB.CurveLoop()
            for i in range(4):loop.Append(DB.Line.CreateBound(pts[i],pts[(i+1)%4]))
            s=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([loop]),DB.XYZ.BasisZ,m(ztop-3.075),DB.SolidOptions(metal.Id,DB.ElementId.InvalidElementId))
            e=DB.DirectShape.CreateElement(doc,DB.ElementId(DB.BuiltInCategory.OST_LightingFixtures));e.Name='Bedroom pendant suspension';e.SetShape(List[DB.GeometryObject]([s]))
    doc.Regenerate();tr.Commit();doc.Save()
    with open(os.path.join(OUT,'ceiling-qa.json'),'w') as f:json.dump([{'mark':c.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString(),'soffitM':c.get_BoundingBox(None).Min.Z*.3048,'topM':c.get_BoundingBox(None).Max.Z*.3048} for c in DB.FilteredElementCollector(doc).OfClass(DB.Ceiling)],f,indent=2)
    review=r'E:\1.0 Project GPT Work\Precast-Module\tools\senior-home\review_model.py';exec(compile(open(review).read(),review,'exec'))
except:
    try:
        if tr.HasStarted():tr.RollBack()
    except:pass
    with open(os.path.join(OUT,'ceiling-error.txt'),'w') as f:f.write(traceback.format_exc())
    raise
