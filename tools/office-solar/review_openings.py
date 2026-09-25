# -*- coding: utf-8 -*-
import os,math,json,codecs
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
    with codecs.open(os.path.join(OUT,'opening-review.txt'),'a','utf8') as f:f.write(str(s)+'\n')
walls={e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString():e for e in DB.FilteredElementCollector(doc).OfClass(DB.Wall)}
tr=DB.Transaction(doc,'Align precast openings with fixed glazing dimensions');tr.Start()
try:
    for e in list(DB.FilteredElementCollector(doc).OfClass(DB.Opening)):
        if isinstance(e.Host,DB.Wall):
            log('Before '+str(e.Host.Id.Value)+' '+str(list(e.BoundaryRect)))
            doc.Delete(e.Id)
    for side,y in [('S',.075),('N',2.925)]:
        for j in range(4 if side=='N' else 3):
            w=walls['PC-W'+side+str(j+1)]
            e=doc.Create.NewOpening(w,p(j*1.5+.22,y,1.35),p((j+1)*1.5-.22,y,2.35))
    doc.Regenerate();tr.Commit();doc.Save()
except:
    if tr.HasStarted():tr.RollBack()
    raise
openings=list(DB.FilteredElementCollector(doc).OfClass(DB.Opening))
for e in openings:
    if isinstance(e.Host,DB.Wall):
        zs=sorted(v.Z*.3048 for v in e.BoundaryRect)
        assert abs(zs[0]-1.35)<.001 and abs(zs[-1]-2.35)<.001
pv=[e for e in DB.FilteredElementCollector(doc).OfClass(DB.DirectShape) if nm(e).startswith('SOLAR - 450 W module')]
assert len(pv)==6
assert sum(e.LookupParameter('PPE_PV_Rated_Wp').AsDouble() for e in pv)==2700
log('Verified 7 fixed-height wall openings and native PV parameter total 2700 Wp')
views=list(DB.FilteredElementCollector(doc).OfClass(DB.View));view=lambda n:next(v for v in views if nm(v)==n)
axo=view('3D - SHED SOLAR OFFICE exterior');cut=view('3D - Office interior cutaway');modular=view('3D - MOD precast components only');classified=view('3D - MOD ARC SITE SOLAR work packages')
concrete=next(e for e in DB.FilteredElementCollector(doc).OfClass(DB.Material) if nm(e).startswith('PC-01'))
theta=math.atan(.2);assembly=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.AssemblyInstance)))
sheets=sorted(list(DB.FilteredElementCollector(doc).OfClass(DB.ViewSheet)),key=lambda s:s.SheetNumber)
src=open(os.path.join(ROOT,'tools','office-solar','build_solar.py')).read()
chunk=src[src.index('    opts=DB.PDFExportOptions()'):src.index('\nexcept Exception:')]
exec(compile('\n'.join(line[4:] if line.startswith('    ') else line for line in chunk.splitlines()),'solar_reexport','exec'))
