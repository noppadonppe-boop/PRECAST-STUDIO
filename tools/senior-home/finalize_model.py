# -*- coding: utf-8 -*-
import os,math,json,traceback,codecs
from pyrevit import DB,revit
from System.Collections.Generic import List
OUT=r'E:\1.0 Project GPT Work\Precast-Module\deliverables\PPE_Senior_Home'
path=os.path.join(OUT,'PPE_Engineering_Senior_Home_R2026.rvt')
def m(v):return v/.3048
def p(x,y,z=0):return DB.XYZ(m(x),m(y),m(z))
def nm(e):return DB.Element.Name.GetValue(e)
def li(a,b):return DB.Line.CreateBound(a,b)
def setp(e,b,v):
    q=e.get_Parameter(b)
    if q and not q.IsReadOnly:q.Set(v)
def mark(e):return e.get_Parameter(DB.BuiltInParameter.ALL_MODEL_MARK).AsString() or ''
try:
    uidoc=revit.uidoc.Application.OpenAndActivateDocument(path);doc=uidoc.Document
    tr=DB.Transaction(doc,'PPE home QA - roof fit, door clearances, drawing coordination');tr.Start()
    walls=list(DB.FilteredElementCollector(doc).OfClass(DB.Wall));roofs=list(DB.FilteredElementCollector(doc).OfClass(DB.RoofBase))
    flat=next(r for r in roofs if mark(r)=='RF-05')
    setp(flat,DB.BuiltInParameter.ROOF_LEVEL_OFFSET_PARAM,m(.06))
    ffl=next(l for l in DB.FilteredElementCollector(doc).OfClass(DB.Level) if nm(l)=='01 FFL +450')
    wt=next(t for t in DB.FilteredElementCollector(doc).OfClass(DB.WallType) if nm(t)=='PPE - PC-01 precast wall 150 mm')
    R=(2.9**2+1.3**2)/2.6;zc=4.5-R
    def soffit(x):return zc+math.sqrt(max(0,(R-.217)**2-(x-2.9)**2))
    if 'QA3' not in (doc.ProjectInformation.get_Parameter(DB.BuiltInParameter.PROJECT_STATUS).AsString() or ''):
        # Replace the north rectangular panels with true native curved-profile walls.
        for w in walls:
            mk=mark(w)
            if mk.startswith('PC-WN') and int(mk[-2:])<=5:
                i=int(mk[-2:])-1;a=i*1.2+.0075;b=min((i+1)*1.2-.0075,5.7925)
                doc.Delete(w.Id)
                ya=5.525;pa=p(a,ya,.45);pb=p(b,ya,.45);qa=p(a,ya,soffit(a));qb=p(b,ya,soffit(b));mid=p((a+b)/2,ya,soffit((a+b)/2))
                curves=List[DB.Curve]([li(pa,pb),li(pb,qb),DB.Arc.Create(qb,qa,mid),li(qa,pa)])
                nw=DB.Wall.Create(doc,curves,wt.Id,ffl.Id,False);setp(nw,DB.BuiltInParameter.ALL_MODEL_MARK,mk)
                setp(nw,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,'Native profiled precast panel follows vault inner radius; structural design pending')
                for k in [0,1]:DB.WallUtils.DisallowWallJoinAtEnd(nw,k)
                if i in [2,3]:doc.Create.NewOpening(nw,p(i*1.2+.18,5.5,1.55),p((i+1)*1.2-.18,5.5,2.6))
        nw=DB.Wall.Create(doc,li(p(5.8075,5.525),p(5.9925,5.525)),wt.Id,ffl.Id,m(2.81),0,False,False);setp(nw,DB.BuiltInParameter.ALL_MODEL_MARK,'PC-WN05B')
        for k in [0,1]:DB.WallUtils.DisallowWallJoinAtEnd(nw,k)
        # Clear vertical gaps under the flat roof.
        for w in DB.FilteredElementCollector(doc).OfClass(DB.Wall):
            mk=mark(w)
            if mk.startswith('PC-WE') or mk=='PC-S entrance host' or mk in ['PC-WN06','PC-WN07','PC-WN08']:
                setp(w,DB.BuiltInParameter.WALL_USER_HEIGHT_PARAM,m(2.81))
        # The stock Opening family controls dimensions at instance level.
        for d in DB.FilteredElementCollector(doc).OfClass(DB.FamilyInstance).OfCategory(DB.BuiltInCategory.OST_Doors):
            if mark(d) in ['D02','D03']:
                for obj in [d,d.Symbol]:
                    for par in obj.Parameters:
                        if par.StorageType==DB.StorageType.Double and not par.IsReadOnly:
                            if par.Definition.Name=='Width':par.Set(m(1.1))
                            elif par.Definition.Name=='Height':par.Set(m(2.2))
            if mark(d)=='D01':
                for obj in [d,d.Symbol]:
                    for par in obj.Parameters:
                        if par.StorageType==DB.StorageType.ElementId and not par.IsReadOnly and 'Material' in par.Definition.Name:
                            mat=next((q for q in DB.FilteredElementCollector(doc).OfClass(DB.Material) if nm(q).startswith('AL-01')),None)
                            if mat and any(s in par.Definition.Name.lower() for s in ['frame','trim','panel']):par.Set(mat.Id)
        # Consistent material specifications and actual category names.
        for mat in DB.FilteredElementCollector(doc).OfClass(DB.Material):
            if nm(mat).startswith('IN-01'):
                mat.Name='IN-01 - Mineral wool - thickness by roof type'
                setp(mat,DB.BuiltInParameter.ALL_MODEL_DESCRIPTION,'80 mm vault / 70 mm flat roof mineral wool. Moisture/condensation design by climate and supplier.')
            elif nm(mat).startswith('WD-02'):
                mat.Name='DK-01 - Textured exterior composite decking'
                setp(mat,DB.BuiltInParameter.ALL_MODEL_DESCRIPTION,'30 mm textured exterior composite deck, nominal 5 mm gaps. Slip resistance, span and corrosion-resistant fixings to supplier.')
            elif nm(mat).startswith('RC-01'):
                mat.Name='RC-01 - Normal concrete and cementitious substrate'
            elif nm(mat).startswith('FL-02'):
                setp(mat,DB.BuiltInParameter.ALL_MODEL_DESCRIPTION,'Slip-resistant wet-room porcelain. Waterproofing and falls 1:80 in shower toward linear drain, no threshold. Verify wet barefoot product test.')
        # Remove the stray high bedroom tracks (not an intended partition).
        for e in list(DB.FilteredElementCollector(doc).OfClass(DB.DirectShape)):
            if nm(e).startswith('Bedroom wardrobe-sliding screen head track'):doc.Delete(e.Id)
        # Annotate the nominal room dimensions and roof details with the correct material names.
        for n in DB.FilteredElementCollector(doc).OfClass(DB.TextNote):
            if 'Native Revit walls' in n.Text:n.Text=n.Text.replace('roofs, hosted doors','roofs, hosted doors')
        setp(doc.ProjectInformation,DB.BuiltInParameter.PROJECT_STATUS,'ARCHITECTURAL CONCEPT P01 - QA3')
    doc.Regenerate()
    # Add a native drafted connection / ramp sheet once.
    allviews=list(DB.FilteredElementCollector(doc).OfClass(DB.View))
    if not any(nm(v)=='S501 - Schematic connections and ramp' for v in allviews):
        tb=next(s for s in DB.FilteredElementCollector(doc).OfClass(DB.FamilySymbol).OfCategory(DB.BuiltInCategory.OST_TitleBlocks))
        sheet=DB.ViewSheet.Create(doc,tb.Id);sheet.SheetNumber='A501';sheet.Name='Schematic connections and ramp'
        tbase=next(iter(DB.FilteredElementCollector(doc).OfClass(DB.TextNoteType)))
        types={}
        def tt(size):
            if size not in types:
                t=tbase.Duplicate('PPE detail '+str(size));setp(t,DB.BuiltInParameter.TEXT_SIZE,m(size/1000.));setp(t,DB.BuiltInParameter.TEXT_FONT,'Arial');types[size]=t
            return types[size]
        def note(v,x,y,s,size=3,width=None):
            if width:return DB.TextNote.Create(doc,v.Id,p(x,y),m(width),s,tt(size).Id)
            return DB.TextNote.Create(doc,v.Id,p(x,y),s,tt(size).Id)
        note(sheet,.023,.570,'A501   /   SCHEMATIC CONNECTIONS AND RAMP',5)
        note(sheet,.546,.034,'Schematic connections and ramp',3,.17);note(sheet,.728,.034,'A501',7)
        dft=next(t for t in DB.FilteredElementCollector(doc).OfClass(DB.ViewFamilyType) if t.ViewFamily==DB.ViewFamily.Drafting)
        detail=DB.ViewDrafting.Create(doc,dft.Id);detail.Name='S501 - Schematic connections and ramp';detail.Scale=5
        def ln(x0,y0,x1,y1):return doc.Create.NewDetailCurve(detail,li(p(x0,y0),p(x1,y1)))
        def rect(x,y,w,h):
            for a,b,c,d in [(x,y,x+w,y),(x+w,y,x+w,y+h),(x+w,y+h,x,y+h),(x,y+h,x,y)]:ln(a,b,c,d)
        rect(0,0,.6,.18);rect(.15,.205,.15,.60);rect(.13,.18,.19,.025)
        note(detail,-.03,1.12,'01 WALL / FLOOR',3)
        note(detail,.34,.80,'150 PC wall\n25 grout bed',2.5)
        ln(.37,.50,.30,.21)
        note(detail,-.03,-.07,'180 PC + 30 screed + 10 tile\nSleeve / dowel design by engineer',2.5)
        rect(1.3,.2,.28,.5);rect(1.595,.2,.28,.5)
        ln(1.58,.63,1.595,.63);ln(1.58,.67,1.595,.67)
        note(detail,1.27,1.12,'02 PANEL JOINT',3)
        note(detail,1.27,.05,'15 nominal movement joint\nBacker rod + flexible sealant\nConnector capacity by engineer',2.5)
        ln(1.586,.65,1.93,.90);note(detail,1.67,1.0,'Weather seal',2.5)
        rect(2.60,.2,.30,.12);rect(2.915,.2,.30,.12)
        ln(2.60,.335,3.22,.335);ln(2.60,.12,3.22,.12);ln(2.60,.108,3.22,.108)
        note(detail,2.57,1.12,'03 VAULT JOINT',3)
        note(detail,2.57,.93,'5 membrane over 120 PC\n80 insulation + 12 lining',2.5)
        note(detail,2.57,.03,'15 joint / continuous weather cap\nBearing and tongue / groove\nsubject to supplier design',2.5)
        vp=DB.Viewport.Create(doc,sheet.Id,detail.Id,p(.410,.405));setp(doc.GetElement(vp.GetTypeId()),DB.BuiltInParameter.VIEWPORT_ATTR_SHOW_LABEL,0)
        doc.Regenerate();vp.SetBoxCenter(p(.410,.405))
        note(sheet,.040,.239,'01-03  PRECAST INTERFACES / 1:5 / SCHEMATIC',3.5)
        note(sheet,.040,.212,'RAMP AND WET-ROOM FINISH REQUIREMENTS',4)
        note(sheet,.040,.193,'Ramp rise 450 / horizontal run 5400 = 1:12; 1800-wide slab, 1800-square end landings.\nHandrails 38 dia at 700 and 900 high. Edge protection and rail returns to prevent snagging.\nMain accessible path remains clear at the north edge of the upper landing. Provide crossfall and drainage\nwithout a threshold; target crossfall no steeper than 1:50. Wet-room shower falls 1:80 to linear drain.\nFalls, waterproofing and drain connections are specifications; the floor geometry is nominal level.',3,.75)
        note(sheet,.040,.121,'No reinforcing bars, anchor capacities, lifting anchors or transport bracing are designed here.\nPrecast erection bracing, tolerances, bearing and connector design require the structural engineer and supplier.',3,.75)
    doc.Regenerate();tr.Commit();doc.Save()
    # Measured QA, including family instance-controlled openings.
    q={'doors':[],'wallBounds':[],'warnings':[w.GetDescriptionText() for w in doc.GetWarnings()]}
    for d in DB.FilteredElementCollector(doc).OfClass(DB.FamilyInstance).OfCategory(DB.BuiltInCategory.OST_Doors):
        b=d.get_BoundingBox(None);entry={'mark':mark(d),'bboxSizeM':[(b.Max.X-b.Min.X)*.3048,(b.Max.Y-b.Min.Y)*.3048,(b.Max.Z-b.Min.Z)*.3048],'parameters':[]}
        for par in d.Parameters:
            if par.Definition.Name in ['Width','Height']:entry['parameters'].append({'name':par.Definition.Name,'value':par.AsValueString()})
        q['doors'].append(entry)
    for w in DB.FilteredElementCollector(doc).OfClass(DB.Wall):
        if mark(w).startswith('PC-WN'):
            b=w.get_BoundingBox(None);q['wallBounds'].append({'mark':mark(w),'minZ':b.Min.Z*.3048,'maxZ':b.Max.Z*.3048})
    with codecs.open(os.path.join(OUT,'geometry-qa.json'),'w','utf8') as f:f.write(json.dumps(q,indent=2))
    review=r'E:\1.0 Project GPT Work\Precast-Module\tools\senior-home\review_model.py'
    exec(compile(open(review).read(),review,'exec'))
except:
    try:
        if tr.HasStarted():tr.RollBack()
    except:pass
    with open(os.path.join(OUT,'finalize-error.txt'),'w') as f:f.write(traceback.format_exc())
    raise
