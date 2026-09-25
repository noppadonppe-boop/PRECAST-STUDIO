from pathlib import Path
root=Path(__file__).resolve().parents[2]
base=(root/'tools/pyrevit_extensions/PrecastModuleTools.extension/Precast Module.tab/BIM Export.panel/Build PPE Cafe.pushbutton/script.py').read_text(encoding='utf-8-sig')
out=root/'tools/senior-home/build_model.py'
header=base[:base.index('repair=os.path')]
header=header.replace("'PPE_Cafe'","'PPE_Senior_Home'")
header+='LOG = os.path.join(OUT, "build-log.txt")\n'
helpers=base[base.index('def log(s):'):base.index("log('\\nSTART PPE CAFE')")]
init=base[base.index('app=revit.doc.Application'):base.index('    levs=list(')]
init=init.replace('PPE cafe','PPE senior home').replace('PRECAST MODULE CAFE','SENIOR LIVING PRECAST HOME').replace('PPE-PC-CAFE-001','PPE-SH-001').replace('Barrel-vault cafe 3200 x 6000','Senior home 9600 x 5600')
init=init.replace(' Reference image says 1200 kg/m3; not adopted as structural proof.','')
init=init.replace('(111,115,110)','(191,188,178)')
init=init.replace("[(.18,structure,concrete)]","[(.01,finish,tile),(.03,finish,normal),(.18,structure,concrete)]")
init=init.replace('Precast floor 180 mm','Floor 220 - tile screed PC180')
init=init.replace('Vault 187 mm','Vault 217 mm').replace('(.05,DB.MaterialFunctionAssignment.Insulation,insul)','(.08,DB.MaterialFunctionAssignment.Insulation,insul)')
shapes=base[base.index('    dsels=[]'):base.index('    # Foundation placeholders')]
title=base[base.index('    # Reusable A1 title'):base.index('    tr=DB.Transaction(doc,\'PPE cafe - views')]
title=title.replace('PRECAST MODULE CAFE  -  3.20 x 6.00 m','SENIOR LIVING HOME  -  9.60 x 5.60 m').replace('PPE-PC-CAFE-001','PPE-SH-001').replace('PPE_Engineering_A1.rfa','PPE_Engineering_Senior_A1.rfa')
ann=base[base.index('    tr=DB.Transaction(doc,\'PPE cafe - views'):base.index('    for v in [plan,roofplan]: style(v);')]
ann=ann.replace('PPE cafe','PPE senior home')
dim=base[base.index('    def plan_dimension'):base.index('    plan_dimension(plan,')]
sheet=base[base.index('    sheets=[]'):base.index("    s0=sheet('A001'")]
sheet=sheet[:sheet.index('    def vp(')]+'''    def vp(s,v,x,y,label=None):
        e=DB.Viewport.Create(doc,s.Id,v.Id,p(x/1000.,y/1000.)); doc.Regenerate()
        setp(doc.GetElement(e.GetTypeId()),DB.BuiltInParameter.VIEWPORT_ATTR_SHOW_LABEL,0)
        e.SetBoxCenter(p(x/1000.,y/1000.))
        return e
'''
content=header+helpers+init+shapes+(root/'tools/senior-home/model_body.txt').read_text()+title+ann+dim+(root/'tools/senior-home/views_body.txt').read_text()+sheet+(root/'tools/senior-home/sheets_body.txt').read_text()
out.write_text(content,encoding='utf-8')
print(out)
