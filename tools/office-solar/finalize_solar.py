# -*- coding: utf-8 -*-
import os,math,json,codecs,traceback
from System.Collections.Generic import List
from pyrevit import DB,revit
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
OUT=os.path.join(ROOT,'deliverables','PPE_Modular_Office_Shed_Solar')
PATH=os.path.join(OUT,'PPE_Engineering_Precast_Office_Shed_Solar_3x6_R2026.rvt')
uidoc=revit.uidoc;doc=uidoc.Document;app=doc.Application
assert doc.PathName==PATH
def m(v):return v/.3048
def p(x,y,z=0):return DB.XYZ(m(x),m(y),m(z))
def nm(e):return DB.Element.Name.GetValue(e)
def log(s):
    with codecs.open(os.path.join(OUT,'finalize-log.txt'),'a','utf8') as f:f.write(str(s)+'\n')
tr=DB.Transaction(doc,'Review solar mounting and section annotations');tr.Start()
try:
    views=list(DB.FilteredElementCollector(doc).OfClass(DB.View));view=lambda n:next(v for v in views if nm(v)==n)
    axo=view('3D - SHED SOLAR OFFICE exterior');cut=view('3D - Office interior cutaway');modular=view('3D - MOD precast components only');classified=view('3D - MOD ARC SITE SOLAR work packages')
    for v in views:
        if not nm(v).startswith('SECTION '):continue
        along=nm(v).startswith('SECTION A-A')
        log(nm(v)+' origin '+str(v.Origin)+' right '+str(v.RightDirection))
        for n in DB.FilteredElementCollector(doc,v.Id).OfClass(DB.TextNote):
            label=n.Text.strip()
            z=3.555 if label.startswith('HIGH') else (2.95 if label.startswith('LOW') else (.45 if label.startswith('FFL') else 0))
            target=p(9.3,1.5,z+.10) if along else p(2.7,4.4,z+.10)
            DB.ElementTransformUtils.MoveElement(doc,n.Id,target-n.Coord)
        # Previous datum witness lines used displaced view origins. Replace with true model heights.
        for e in list(DB.FilteredElementCollector(doc,v.Id).OfClass(DB.CurveElement)):
            if isinstance(e,DB.DetailCurve):doc.Delete(e.Id)
        for z in [0,.45,2.95,3.555]:
            a,b=(p(8.65,1.5,z),p(8.15,1.5,z)) if along else (p(2.7,3.75,z),p(2.7,3.25,z))
            doc.Create.NewDetailCurve(v,DB.Line.CreateBound(a,b))
    metal=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.Material) if nm(e).startswith('AL-01'))
    for e in DB.FilteredElementCollector(doc).OfClass(DB.DirectShape):
        if nm(e)=='SOLAR - Aluminium mounting rail':DB.ElementTransformUtils.MoveElement(doc,e.Id,p(0,0,.02))
        elif nm(e)=='SOLAR - Flashed mounting pedestal':
            b=e.get_BoundingBox(None);a=b.Min;dx=b.Max.X-a.X;dy=b.Max.Y-a.Y
            vs=[a,a+DB.XYZ(dx,0,0),a+DB.XYZ(dx,dy,0),a+DB.XYZ(0,dy,0)];cl=DB.CurveLoop()
            for i in range(4):cl.Append(DB.Line.CreateBound(vs[i],vs[(i+1)%4]))
            so=DB.GeometryCreationUtilities.CreateExtrusionGeometry(List[DB.CurveLoop]([cl]),DB.XYZ.BasisZ,m(.09),DB.SolidOptions(metal.Id,DB.ElementId.InvalidElementId));e.SetShape(List[DB.GeometryObject]([so]))
        for key in ['PPE_Specification']:
            q=e.LookupParameter(key)
            if q and q.AsString():q.Set(q.AsString().replace('curved','sloping').replace('arched','sloping').replace('Arched','Sloping').replace('M01','M02'))
    doc.Regenerate()
    for vp in DB.FilteredElementCollector(doc).OfClass(DB.Viewport):
        vn=nm(doc.GetElement(vp.ViewId))
        if vn.startswith('SECTION A-A'):vp.SetBoxCenter(p(.248,.370))
        elif vn.startswith('SECTION B-B'):vp.SetBoxCenter(p(.650,.370))
    tr.Commit();doc.Save();log('Review saved')
    concrete=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.Material) if nm(e).startswith('PC-01'))
    theta=math.atan(.2);assembly=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.AssemblyInstance)))
    sheets=sorted(list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet)),key=lambda s:s.SheetNumber)
    src=open(os.path.join(ROOT,'tools','office-solar','build_solar.py')).read()
    chunk=src[src.index('    opts=DB.PDFExportOptions()'):src.index('\nexcept Exception:')]
    exec(compile('\n'.join(line[4:] if line.startswith('    ') else line for line in chunk.splitlines()),'solar_reexport','exec'))
except:
    log(traceback.format_exc())
    if tr.HasStarted():tr.RollBack()
    raise
