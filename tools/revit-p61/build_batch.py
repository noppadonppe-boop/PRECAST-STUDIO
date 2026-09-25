# -*- coding: utf-8 -*-
"""P104 native ARC expansion; explicit per-product source, no writes to pilot/P6."""
import os, json, codecs, traceback, shutil, math
ROOT=r'E:\1.0 Project GPT Work\Precast-Module'
helper=os.path.join(ROOT,'tools','revit-p61','build_pilot.py')
code=open(helper).read();marker='doc=None\ntry:'
assert code.count(marker)==1
exec(compile(code.split(marker)[0],helper,'exec'))
WORK=os.path.join(ROOT,'output','revit-p61-batch')
OUT=os.path.join(ROOT,'deliverables','PM_ARC_48_P104')
LIB=os.path.join(OUT,'SharedLibrary')
PILOT=os.path.join(ROOT,'deliverables','PM_ARC_P61_Pilot','PM-I-B3')
for folder in [WORK,OUT,LIB]:
    if not os.path.isdir(folder):os.makedirs(folder)
data=json.load(open(os.path.join(WORK,'input.json')))
def log(s):
    with codecs.open(os.path.join(WORK,'build.log'),'a','utf8') as f:f.write(unicode(s)+'\n')
def load_family(d,path):
    rr=clr.Reference[DB.Family]();d.LoadFamily(path,rr);s=d.GetElement(list(rr.Value.GetFamilySymbolIds())[0]);s.Activate();return s
def polyloop(poly):
    cl=DB.CurveLoop();p=[pt(x,y) for x,y in poly]
    for i in range(len(p)):
        if p[i].DistanceTo(p[(i+1)%len(p)])>mm(.1):cl.Append(DB.Line.CreateBound(p[i],p[(i+1)%len(p)]))
    return cl

def inclined_window(typ,fp):
    # Bake the inclination into editable native extrusion sketches. Keep the
    # non-hosted Windows instance vertical: Revit can reject tilted instances.
    fd=app.NewFamilyDocument(r'C:\ProgramData\Autodesk\RVT 2026\Family Templates\English\Metric Generic Model.rft')
    try:
        tx=DB.Transaction(fd,'Native inclined window sketches');tx.Start()
        fd.OwnerFamily.FamilyCategory=fd.Settings.Categories.get_Item(DB.BuiltInCategory.OST_Windows)
        fm=fd.FamilyManager;fm.NewType('P104');mats={}
        rot=DB.Transform.CreateRotation(DB.XYZ.BasisX,-math.atan(200./2825.))
        for key in set(p[-1] for p in typ['parts']):mats[key]=material(fd,*MATS[key])
        for j,p in enumerate(typ['parts']):
            _,x,y,z,w,l,h,key=p
            points=[rot.OfPoint(pt(x,y,z)),rot.OfPoint(pt(x+w,y,z)),rot.OfPoint(pt(x+w,y+l,z)),rot.OfPoint(pt(x,y+l,z))]
            arr=DB.CurveArray()
            for k in range(4):arr.Append(DB.Line.CreateBound(points[k],points[(k+1)%4]))
            ca=DB.CurveArrArray();ca.Append(arr)
            sp=DB.SketchPlane.Create(fd,DB.Plane.CreateByNormalAndOrigin(rot.OfVector(DB.XYZ.BasisZ),points[0]))
            e=fd.FamilyCreate.NewExtrusion(True,ca,sp,mm(h));setp(e,DB.BuiltInParameter.MATERIAL_ID_PARAM,mats[key].Id)
            param=fm.AddParameter('Part_%02d_Height'%(j+1),DB.GroupTypeId.Geometry,DB.SpecTypeId.Length,False)
            fm.AssociateElementParameterToFamilyParameter(e.get_Parameter(DB.BuiltInParameter.EXTRUSION_END_PARAM),param);fm.Set(param,mm(h))
        setp(fd.OwnerFamily,DB.BuiltInParameter.ALL_MODEL_DESCRIPTION,typ['description'])
        tx.Commit();save(fd,fp)
    finally:fd.Close(False)
def prep_library():
    for n in os.listdir(os.path.join(PILOT,'Families')):
        if n.endswith('.rfa') and len(n.split('.'))==2:shutil.copy2(os.path.join(PILOT,'Families',n),os.path.join(LIB,n))
    for typ in data['types']:
        fp=os.path.join(LIB,typ['key']+'.rfa');meta=fp+'.json'
        digest=hashlib.sha256((json.dumps(typ,sort_keys=True)+'|native-family-policy-v3').encode('utf8')).hexdigest()
        if os.path.isfile(fp) and os.path.isfile(meta) and json.load(open(meta)).get('definitionSha256')==digest:continue
        if typ['role']=='SlopedWindow':
            inclined_window(typ,fp)
        else:family(typ['key'],getattr(DB.BuiltInCategory,typ['category']),typ['parts'],typ['description'])
        write(meta,{'definitionSha256':digest,'nativeEditableExtrusions':True,'fullWidthDepthParametric':False})
    td=app.OpenDocumentFile(os.path.join(LIB,'P61_PPE_A1.rfa'));t=DB.Transaction(td,'P104 titleblock');t.Start()
    for n in DB.FilteredElementCollector(td).OfClass(DB.TextNote):n.Text=n.Text.replace('P103','P104').replace('ARCHITECTURAL PILOT','ARCHITECTURAL STUDY')
    t.Commit();save(td,os.path.join(LIB,'P104_PPE_A1.rfa'));td.Close(False)

def build(m):
    pid=m['id'];folder=os.path.join(OUT,pid);ref=os.path.join(folder,'References');flib=os.path.join(folder,'Families')
    for f in [folder,ref,flib,os.path.join(ref,'Baseline')]:
        if not os.path.isdir(f):os.makedirs(f)
    qa_path=os.path.join(folder,'QA_P104.json')
    dependencies={'recipe':m,'types':[q for q in data['types'] if q['key'] in set(i['family'] for i in m['items'])],'builder':sha(os.path.join(ROOT,'tools','revit-p61','build_batch.py')),'helpers':sha(helper)}
    recipeHash=hashlib.sha256(json.dumps(dependencies,sort_keys=True).encode('utf8')).hexdigest()
    if os.path.isfile(qa_path):
        old=json.load(open(qa_path))
        if old.get('recipeSha256')==recipeHash and old.get('builderRevision')==1:
            log('SKIP NATIVE BUILT '+pid);return
    log('START '+pid)
    source=os.path.join(ROOT,m['source']);assert sha(source)==m['sourceSha256']
    shutil.copy2(source,os.path.join(ref,'Baseline',os.path.basename(source)))
    sd=app.OpenDocumentFile(source);before=fingerprint(sd);oldarc=[]
    for e in DB.FilteredElementCollector(sd).WhereElementIsNotElementType():
        q=e.LookupParameter('PM_Package')
        if q and q.AsString()=='ARC':oldarc.append(e.Id)
    st=DB.Transaction(sd,'P104 remove old ARC placeholders in coordination COPY');st.Start();sd.Delete(List[DB.ElementId](oldarc));st.Commit()
    assert before==fingerprint(sd) and len(before)==m['concreteCount']
    strpath=os.path.join(ref,pid+'_STR_Coordination_P104.rvt');save(sd,strpath);sd.Close(False)
    d=app.NewProjectDocument(r'C:\ProgramData\Autodesk\RVT 2026\Templates\English\DefaultMetric.rte')
    try:
        t=DB.Transaction(d,'P104 '+pid+' architecture');t.Start()
        units=DB.Units(DB.UnitSystem.Metric);fo=DB.FormatOptions(DB.UnitTypeId.Millimeters);fo.Accuracy=1.;units.SetFormatOptions(DB.SpecTypeId.Length,fo);d.SetUnits(units)
        d.ProjectInformation.Name=pid+' '+m['useName']+' Architectural Study';d.ProjectInformation.Number='P104 / Stage6.1'
        setp(d.ProjectInformation,DB.BuiltInParameter.PROJECT_STATUS,'ARCHITECT REVIEW - NOT FOR CONSTRUCTION')
        symbols={}
        for n in sorted(set(i['family'] for i in m['items'])):
            src=os.path.join(LIB,n+'.rfa');dest=os.path.join(flib,n+'.rfa');shutil.copy2(src,dest);symbols[n]=load_family(d,dest)
        tbfile=os.path.join(flib,'P104_PPE_A1.rfa');shutil.copy2(os.path.join(LIB,'P104_PPE_A1.rfa'),tbfile);tb=load_family(d,tbfile)
        result=DB.RevitLinkType.Create(d,DB.ModelPathUtils.ConvertUserVisiblePathToModelPath(strpath),DB.RevitLinkOptions(True));link=DB.RevitLinkInstance.Create(d,result.ElementId);link.Pinned=True
        level=DB.Level.Create(d,mm(185));level.Name='ARC FFL +185';ceil=DB.Level.Create(d,mm(3000));ceil.Name='STR envelope +3000'
        mats=dict((k,material(d,*v)) for k,v in MATS.items())
        tile=mats['tile'];ft=next(iter(DB.FilteredElementCollector(d).OfClass(DB.FloorType))).Duplicate('P104 FL-01 finish10mm')
        cs=ft.GetCompoundStructure();cs.SetLayers(List[DB.CompoundStructureLayer]([DB.CompoundStructureLayer(mm(10),DB.MaterialFunctionAssignment.Structure,tile.Id)]));ft.SetCompoundStructure(cs)
        floors=[]
        for j,f in enumerate(m['finishFloors']):
            e=DB.Floor.Create(d,List[DB.CurveLoop]([polyloop(f['poly'])]),ft.Id,level.Id);setp(e,DB.BuiltInParameter.ALL_MODEL_MARK,'FL-'+str(j+1));floors.append(e)
        wt=next(e for e in DB.FilteredElementCollector(d).OfClass(DB.WallType) if e.Kind==DB.WallKind.Basic).Duplicate('P104 PT-01 lightweight75mm')
        cs=wt.GetCompoundStructure();cs.SetLayers(List[DB.CompoundStructureLayer]([DB.CompoundStructureLayer(mm(75),DB.MaterialFunctionAssignment.Structure,mats['white'].Id)]));wt.SetCompoundStructure(cs)
        partitions=[]
        for p in m['partitions']:
            x,y,z=p['minMm'];w,l,h=p['sizeMm']
            line=DB.Line.CreateBound(pt(x+w/2,y),pt(x+w/2,y+l)) if w<l else DB.Line.CreateBound(pt(x,y+l/2),pt(x+w,y+l/2))
            e=DB.Wall.Create(d,line,wt.Id,level.Id,mm(h),0,False,False);DB.WallUtils.DisallowWallJoinAtEnd(e,0);DB.WallUtils.DisallowWallJoinAtEnd(e,1);setp(e,DB.BuiltInParameter.ALL_MODEL_MARK,p['id']);partitions.append(e)
        rows=[];elements=[]
        for item in m['items']:
            x,y,z=item['p'];e=d.Create.NewFamilyInstance(pt(x,y,z),symbols[item['family']],DB.Structure.StructuralType.NonStructural)
            if item['angle']:DB.ElementTransformUtils.RotateElement(d,e.Id,DB.Line.CreateBound(pt(x,y,z),pt(x,y,z+100)),item['angle'])
            if item.get('tilt'):assert 'SlopedWindow' in item['family'],'Inclination must be implemented in native family sketches'
            setp(e,DB.BuiltInParameter.ALL_MODEL_MARK,item['mark']);setp(e,DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS,item['group']+' | '+item['note']+' | P104 preliminary')
            row=dict(item);row['elementId']=int(e.Id.Value);rows.append(row);elements.append(e)
        t.Commit()
        missing=[r['mark'] for r in rows if d.GetElement(DB.ElementId(Int64(r['elementId']))) is None]
        assert not missing,'Revit removed ARC instances: '+str(missing)
        t=DB.Transaction(d,'P104 documentation');t.Start()
        vf=list(DB.FilteredElementCollector(d).OfClass(DB.ViewFamilyType));vft=lambda f:next(v for v in vf if v.ViewFamily==f)
        sx,sy,sz=m['dimensions'];scale=25 if m['plan']=='I' else 40
        def style(v,sc=None):
            v.Scale=sc or scale;v.DetailLevel=DB.ViewDetailLevel.Fine;v.DisplayStyle=DB.DisplayStyle.HLR
            for cat in [DB.BuiltInCategory.OST_Levels,DB.BuiltInCategory.OST_Grids,DB.BuiltInCategory.OST_Sections,DB.BuiltInCategory.OST_Elev]:
                try:v.SetCategoryHidden(DB.ElementId(cat),True)
                except:pass
        base=next(iter(DB.FilteredElementCollector(d).OfClass(DB.TextNoteType)));texts={}
        def text(v,x,y,s,size=3,width=0):
            if size not in texts:
                ty=base.Duplicate('P104 Arial '+str(size));setp(ty,DB.BuiltInParameter.TEXT_SIZE,mm(size));setp(ty,DB.BuiltInParameter.TEXT_FONT,'Arial');texts[size]=ty
            opt=DB.TextNoteOptions(texts[size].Id)
            return DB.TextNote.Create(d,v.Id,pt(x,y),mm(width),s,opt) if width else DB.TextNote.Create(d,v.Id,pt(x,y),s,opt)
        def dim(v,vals,pos,axis):
            refs=DB.ReferenceArray()
            for q in vals:
                a,b=(pt(q,pos-40),pt(q,pos+40)) if axis=='x' else (pt(pos-40,q),pt(pos+40,q));c=d.Create.NewDetailCurve(v,DB.Line.CreateBound(a,b));refs.Append(c.GeometryCurve.Reference)
            a,b=(pt(vals[0],pos),pt(vals[-1],pos)) if axis=='x' else (pt(pos,vals[0]),pt(pos,vals[-1]));return d.Create.NewDimension(v,DB.Line.CreateBound(a,b),refs)
        plans=[]
        for n in ['ARC A101 Furniture and finishes','ARC A401 MEP preliminary positions']:
            v=DB.ViewPlan.Create(d,vft(DB.ViewFamily.FloorPlan).Id,level.Id);v.Name=n;style(v)
            vr=v.GetViewRange()
            for k,off in [(DB.PlanViewPlane.TopClipPlane,2900),(DB.PlanViewPlane.CutPlane,1200),(DB.PlanViewPlane.BottomClipPlane,-400),(DB.PlanViewPlane.ViewDepthPlane,-400)]:vr.SetLevelId(k,level.Id);vr.SetOffset(k,mm(off))
            v.SetViewRange(vr);bb=DB.BoundingBoxXYZ();bb.Min=pt(-1300,-2400,-500);bb.Max=pt(sx+1400,sy+1500,3600);v.CropBox=bb;v.CropBoxActive=True;v.CropBoxVisible=False
            dim(v,[0,sx],-2150,'x');dim(v,list(range(0,sy+1,1500)),-450,'y');dim(v,[0,sy],-1000,'y');plans.append(v)
        hidden=[DB.ElementId(Int64(r['elementId'])) for r in rows if r['mark'].startswith(('AC','LT','SO','DB','WP'))]
        plans[0].HideElements(List[DB.ElementId](hidden))
        for r in rows:
            x,y,z=r['p']
            if r['group']=='MEP':
                for a,b,c in [(pt(x+80,y),pt(x-80,y),pt(x,y+80)),(pt(x-80,y),pt(x+80,y),pt(x,y-80))]:d.Create.NewDetailCurve(plans[1],DB.Arc.Create(a,b,c))
                text(plans[1],x+110,y+100,r['mark'],2)
            elif r['mark'].startswith(('F','D','W')):text(plans[0],x+120,y+100,r['mark'],2)
        def section(n,origin,right,direction,width,depth):
            tr=DB.Transform.Identity;tr.Origin=pt(*origin);tr.BasisX=DB.XYZ(*right);tr.BasisY=DB.XYZ.BasisZ;tr.BasisZ=DB.XYZ(*direction)
            b=DB.BoundingBoxXYZ();b.Transform=tr;b.Min=pt(-width/2-600,-450,0);b.Max=pt(width/2+600,3300,depth)
            v=DB.ViewSection.CreateSection(d,vft(DB.ViewFamily.Section).Id,b);v.Name=n;style(v,40);v.CropBoxVisible=False;return v
        elevations=[section('ARC Front elevation',[sx/2,-2200,0],[-1,0,0],[0,1,0],sx+1000,sy+3500),section('ARC Side elevation',[sx+1800,sy/2,0],[0,-1,0],[-1,0,0],sy+3000,sx+2800)]
        sections=[section('ARC Transverse section',[sx/2,2000,0],[1,0,0],[0,-1,0],sx+1000,400),section('ARC Longitudinal section',[1500,sy/2,0],[0,1,0],[1,0,0],sy+3000,sx)]
        def vdim(v,worldpoints,position,axis):
            def loc(p):
                delta=p-v.Origin;return [delta.DotProduct(v.RightDirection),delta.DotProduct(v.UpDirection)]
            def wp(a,b):return v.Origin+v.RightDirection.Multiply(a)+v.UpDirection.Multiply(b)
            vals=sorted(loc(p)[0 if axis=='x' else 1] for p in worldpoints);pos=loc(position)[1 if axis=='x' else 0];refs=DB.ReferenceArray()
            for q in vals:
                a,b=(wp(q,pos-mm(35)),wp(q,pos+mm(35))) if axis=='x' else (wp(pos-mm(35),q),wp(pos+mm(35),q))
                c=d.Create.NewDetailCurve(v,DB.Line.CreateBound(a,b));refs.Append(c.GeometryCurve.Reference)
            a,b=(wp(vals[0],pos),wp(vals[-1],pos)) if axis=='x' else (wp(pos,vals[0]),wp(pos,vals[-1]))
            return d.Create.NewDimension(v,DB.Line.CreateBound(a,b),refs)
        for v in elevations+sections:
            if abs(v.RightDirection.X)>.5:
                sectionWidth=3000 if v.Id==sections[0].Id and m['plan']=='L' else sx
                vdim(v,[pt(0,0,0),pt(sectionWidth,0,0)],pt(0,0,-260),'x')
                vdim(v,[pt(0,0,0),pt(0,0,3000)],pt(sectionWidth+200,0,0),'y')
            else:
                vdim(v,[pt(0,0,0),pt(0,sy,0)],pt(0,0,-260),'x')
                vdim(v,[pt(0,0,0),pt(0,0,3000)],pt(0,sy+400,0),'y')
        axos=[]
        for n,cut in [('ARC 3D Exterior',False),('ARC 3D Interior cutaway',True)]:
            v=DB.View3D.CreateIsometric(d,vft(DB.ViewFamily.ThreeDimensional).Id);v.Name=n;style(v,(25 if m['plan']=='I' else 35) if not cut else 40);v.DisplayStyle=DB.DisplayStyle.ShadingWithEdges
            forward=DB.XYZ(-1,1,-1.1 if not cut else -1.8).Normalize();right=forward.CrossProduct(DB.XYZ.BasisZ).Normalize();up=right.CrossProduct(forward).Normalize();v.SetOrientation(DB.ViewOrientation3D(pt(sx+9000,-7000,9000),up,forward))
            b=DB.BoundingBoxXYZ();b.Min=pt(-100,-2000,-200);b.Max=pt(sx+1300,sy+1300,3150 if not cut else 1450);v.SetSectionBox(b);axos.append(v)
        schedules=[]
        for cat,n in [(DB.BuiltInCategory.OST_Furniture,'ARC Furniture'),(DB.BuiltInCategory.OST_Doors,'ARC Doors'),(DB.BuiltInCategory.OST_Windows,'ARC Windows'),(DB.BuiltInCategory.OST_MechanicalEquipment,'ARC AC')]:
            vs=DB.ViewSchedule.CreateSchedule(d,DB.ElementId(cat));vs.Name=n
            for b,label,w in [(DB.BuiltInParameter.ALL_MODEL_MARK,'Mark',25),(DB.BuiltInParameter.ELEM_FAMILY_AND_TYPE_PARAM,'Family / Type',115)]:
                f=vs.Definition.AddField(DB.ScheduleFieldType.Instance,DB.ElementId(b));f.ColumnHeading=label;f.GridColumnWidth=mm(w)
            schedules.append(vs)
        sheets=[];placements=[]
        def sheet(n,title):
            s=DB.ViewSheet.Create(d,tb.Id);s.SheetNumber=n;s.Name=title;text(s,24,568,n+' | '+title.upper(),5,780);text(s,548,38,pid+' | ARC P104',4,175);text(s,727,37,n,5,90);text(s,24,68,'ARCHITECTURAL STUDY / NOT FOR CONSTRUCTION | MEP POSITIONS ONLY',2.5,780);sheets.append(s);return s
        def place(s,v,x,y):
            vp=DB.Viewport.Create(d,s.Id,v.Id,pt(x,y));setp(d.GetElement(vp.GetTypeId()),DB.BuiltInParameter.VIEWPORT_ATTR_SHOW_LABEL,0);placements.append((vp,x,y))
        s=sheet('A001',m['useName']+' architectural proposal');place(s,axos[0],295,335)
        text(s,570,520,pid+'\n'+m['useName']+' / '+m['plan']+' plan / profile '+m['profile']+'\nEnvelope '+str(sx)+' x '+str(sy)+' x 3000 mm\nStandard bays1500mm\nConcrete '+str(m['concreteCount'])+' pieces unchanged\n\nSeparate ARC + relative STR Link\nNative furniture and floor finishes\nProposed MEP positions\nUnbranded outline specifications\n\nP104 extension of approved P103.\nNo new concrete openings.\nOriginal structural RVT included.',3.5,240)
        s=sheet('A101','Furniture and finish plan');place(s,plans[0],300,330)
        text(s,570,520,'FLOOR PLAN 1:'+str(scale)+' / mm\nFFL +185 = slab175 + finish10\nWindow rough900x1200\nExternal door rough1000x2100\n\nMaterial direction:\nWarm timber / black metal\nCleanable porcelain / exposed precast\nWet-area finish and waterproofing\nto be developed with architect.\n\n'+('External shared WC required.' if not m['partitions'] else 'Lightweight wet-room partitions shown.\nSanitary fixtures: spatial proposal only.')+'\n\nAccess/egress and service clearances\nare not code-certified.',3,245)
        s=sheet('A201','Front and side elevations');place(s,elevations[0],235,365);place(s,elevations[1],620,365);text(s,30,155,'Front / Side 1:40 | Structural roof envelope +3000 / slab underside +000 / slab top +175 / proposed finish +185.\nOpenings and concrete profiles follow P36 and the linked P6 RVT. No structural geometry changes.',3,770)
        s=sheet('A301','Sections and interior arrangement');place(s,sections[0],235,420);place(s,sections[1],625,420);place(s,axos[1],290,225);text(s,570,215,'SECTIONS 1:40\nInterior image is clipped at+1450\nto show furniture, not a roof deletion.\n\nCeiling/roof thermal insulation,\nwaterproofing and condensation\nstrategy require development.',3,240)
        s=sheet('A401','MEP location coordination');place(s,plans[1],300,330);text(s,570,520,'PRELIMINARY LOCATIONS 1:'+str(scale)+'\nAC-I / AC-O: cooling equipment\nLT: lighting positions\nSO: outlets / DB: distribution board\nSN/WB/WC/SHR: sanitary positions\nWP: water/waste interface\n\nNo capacities, pipe/cable sizes,\ncomputed circuits or drainage falls.\nNo new structural penetrations.\nAll supports, maintenance clearances\nand final routes need coordination.',3,240)
        s=sheet('A601','Furniture openings and equipment')
        for vs,x,y in [(schedules[0],30,525),(schedules[1],340,525),(schedules[2],340,400),(schedules[3],340,210)]:DB.ScheduleSheetInstance.Create(d,s.Id,vs.Id,pt(x,y))
        text(s,550,520,'EDITABILITY\nMove / rotate / copy family instances.\nEdit Family extrusion sketches and\nPart_N_Height parameters.\nNot fully parametric width/depth.\n\nDoors/windows are non-hosted.\nMoving frames does not move\nlinked concrete openings.\nCheck alignment after edits.\n\nQuantities exclude procurement waste\nand are not approved dead loads.',3,250)
        s=sheet('A701','Unbranded outline specifications')
        text(s,30,525,'ARCHITECTURAL MATERIAL PROPOSALS\n\nFL-01  Cleanable slip-resistant porcelain finish assembly; total10mm allowance. Confirm substrate and adhesive.\nJN-01  Moisture-resistant joinery with timber-look washable laminate; seal edges.\nCT-01  Non-porous washable worktops; cleaning and food-contact suitability to be confirmed.\nDK-01  Exterior durable timber decking28mm with6mm joints; support members are spatial reservations only.\nMT-01  Black coated metal frames; profiles, coating and fixings by supplier.\nGL-01  Safety glazing to doors/windows; glass makeup and thickness not selected.\nPT-01  Lightweight75mm partition proposal; wet-facing boards, waterproofing and head details to coordinate.\nPC-01  Exposed precast; finish preparation/sealer and movement joints by architect.\nWP/IN  Roof waterproofing, thermal/acoustic insulation and condensation strategy not fully modeled.\n\nUSE: '+m['useName'].upper()+'\nFurniture and room layout follows this product P36 spatial basis, developed with editable families.\nSanitary/cooling/electrical items are preliminary locations only; full discipline design is outside this stage.\n\nHANDOFF\nAdded fitout, terraces, awnings and equipment loads/fixings must be reviewed by the structural team.\nNo structural certification, construction approval or fabrication release is provided.\nOriginal P6 RVT is retained; the linked copy removes only superseded ARC placeholders.\n\nMODEL NOTES\nUse the packaged relative References folder. RFA files are included for architectural editing.\nNative drawings and PNGs exported from saved/reopened Revit2026 model.\nDimension witness lines and exported schedule snapshots must be checked/regenerated after edits.',3.5,775)
        d.Regenerate()
        for vp,x,y in placements:vp.SetBoxCenter(pt(x,y))
        t.Commit();rvt=os.path.join(folder,pid+'_ARC_R2026_P104.rvt');save(d,rvt);d.Close(False);d=app.OpenDocumentFile(rvt)
        assert all(d.GetElement(DB.ElementId(Int64(r['elementId']))) is not None for r in rows),'ARC instances missing after native reopen'
        li=next(iter(DB.FilteredElementCollector(d).OfClass(DB.RevitLinkInstance)));ld=li.GetLinkDocument()
        assert ld is not None and fingerprint(ld)==before
        assert li.GetTotalTransform().IsIdentity
        ss=sorted(DB.FilteredElementCollector(d).OfClass(DB.ViewSheet),key=lambda v:v.SheetNumber)
        op=DB.PDFExportOptions();op.Combine=True;op.FileName=pid+'_ARC_A1_P104';op.PaperFormat=DB.ExportPaperFormat.Default
        assert d.Export(folder,List[DB.ElementId]([s.Id for s in ss]),op)
        for vn,suffix in [('ARC 3D Exterior','Exterior'),('ARC 3D Interior cutaway','Interior'),('ARC A101 Furniture and finishes','Plan'),('ARC A401 MEP preliminary positions','MEP')]:
            v=next(v for v in DB.FilteredElementCollector(d).OfClass(DB.View) if v.Name==vn);op=DB.ImageExportOptions();op.ExportRange=DB.ExportRange.SetOfViews;op.SetViewsAndSheets(List[DB.ElementId]([v.Id]));op.FilePath=os.path.join(folder,suffix);op.HLRandWFViewsFileType=DB.ImageFileType.PNG;op.ShadowViewsFileType=DB.ImageFileType.PNG;op.ImageResolution=DB.ImageResolution.DPI_150;op.ZoomType=DB.ZoomFitType.FitToPage;op.PixelSize=2400;d.ExportImage(op)
        qa={'productId':pid,'revision':'P104','builderRevision':1,'recipeSha256':recipeHash,'nativeSavedReopened':True,'revitBuild':app.VersionBuild,'sourceSha256':m['sourceSha256'],'sourceUnchanged':sha(source)==m['sourceSha256'],'structureFingerprintMatch':True,'concreteCount':len(before),'removedOldArcPlaceholders':len(oldarc),'linkLoaded':True,'linkPathType':str(d.GetElement(li.GetTypeId()).GetExternalFileReference().PathType),'arcInstances':len(rows),'floorFinishes':len(floors),'nativePartitions':len(partitions),'sheets':[s.SheetNumber for s in ss],'warnings':[w.GetDescriptionText() for w in d.GetWarnings()],'coordinationAudit':'PENDING','relocationTest':'PENDING','visualReview':'PENDING','packaged':False,'engineeringApproved':False,'productionReleased':False}
        write(qa_path,qa);write(os.path.join(folder,'ARC_ItemRegister_P104.json'),rows);write(os.path.join(folder,'StructuralFingerprint_P104.json'),before);write(os.path.join(folder,'Recipe_P104.json'),m)
        log('NATIVE BUILT '+pid+' - coordination/visual/packaging pending')
    finally:
        if d:
            try:
                if d.IsModifiable:t.RollBack()
                d.Close(False)
            except:pass

try:
    prep_library()
    auditfile=os.path.join(ROOT,'tools','revit-p61','audit_batch.py')
    auditnamespace={'__revit__':__revit__}
    auditprefix=open(auditfile).read().split('\nselection=os.path.join')[0]
    exec(compile(auditprefix,auditfile,'exec'),auditnamespace)
    selector=os.path.join(WORK,'selection.json');ids=json.load(open(selector)) if os.path.isfile(selector) else None
    selected=[m for m in data['models'] if ids is None or m['id'] in ids];fail=[];audits=[];processed=[]
    for m in selected:
        try:
            build(m)
            auditresult=auditnamespace['audit'](m['id']);audits.append(auditresult)
            if auditresult['coordination']!='PASS':fail.append({'id':m['id'],'error':'Native coordination needs correction; see Coordination_QA_P104.json'})
        except:
            error=traceback.format_exc();log(error);fail.append({'id':m['id'],'error':error})
        processed.append(m['id'])
        write(os.path.join(WORK,'batch-run-state.json'),{'selected':[x['id'] for x in selected],'processed':processed,'audits':audits,'failed':fail,'terminal':False})
    write(os.path.join(WORK,'batch-run-state.json'),{'selected':[x['id'] for x in selected],'processed':processed,'audits':audits,'failed':fail,'terminal':True})
    write(os.path.join(WORK,'last-build-result.json'),{'attempted':[m['id'] for m in selected],'failed':fail,'complete':not fail,'deliveryComplete':False})
except:
    log(traceback.format_exc());raise
