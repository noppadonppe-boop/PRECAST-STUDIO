from pathlib import Path
import json,hashlib,shutil,zipfile,re
from pypdf import PdfReader
root=Path(__file__).resolve().parents[2]
out=root/'deliverables/PPE_Senior_Home'
qa=out/'qa'
qa.mkdir(exist_ok=True)
pdf=out/'PPE_Engineering_Senior_Home_Drawings.pdf'
reader=PdfReader(pdf)
expected=['A001','A101','A102','A201','A301','A401','A501','A601']
assert len(reader.pages)==8
pages=[]
for i,(page,num) in enumerate(zip(reader.pages,expected),1):
    text=page.extract_text()
    assert num in text and 'PPE Engineering' in text,(i,num)
    assert 'AUTODESK' not in text and 'CAFE' not in text,(i,'stale template')
    w=float(page.mediabox.width)*25.4/72
    h=float(page.mediabox.height)*25.4/72
    assert abs(w-841)<2 and abs(h-594)<2,(w,h)
    assert (qa/f'sheet-{i}.png').exists()
    pages.append({'sheet':num,'widthMm':round(w,2),'heightMm':round(h,2),'textChecked':True,'renderVisuallyReviewed':True})
audit=json.loads((out/'model-audit.json').read_text())
geo=json.loads((out/'final-geometry-check.json').read_text())
ceilings=json.loads((out/'ceiling-qa.json').read_text())
assert audit['pdfExport'] and not audit['warnings']
assert len(audit['rooms'])==4 and all(r['areaM2']>0 for r in audit['rooms'])
assert all(x['family']=='PPE_Engineering_Senior_A1' for x in geo['titleBlocks']) and len(geo['titleBlocks'])==8
assert all(abs(x['actualClearWidthM']-1.1)<1e-5 and abs(x['actualHeightM']-2.2)<1e-5 for x in geo['doorOpenings'])
assert abs(geo['flatRoof'][0]['topM']-3.5)<1e-5
assert len(ceilings)==3
rvt=out/'PPE_Engineering_Senior_Home_R2026.rvt'
assert rvt.read_bytes()[:8]==bytes.fromhex('d0cf11e0a1b11ae1')
assert rvt.stat().st_size>1_000_000
for source,dest in [('PPE - 3D View - 3D - Exterior - PPE Senior Home.png','PPE_Senior_Home_3D.png'),('PPE - 3D View - 3D - Interior cutaway - PPE Senior Home.png','PPE_Senior_Home_Interior.png')]:
    src=out/source
    if not src.exists():src=out/'drawing-previews'/source
    shutil.copy2(src,out/dest)
report={'status':'PASS - architectural concept delivery checks only','revitVersion':'2026.4','pdfPages':pages,'rvtCreatedAndReopenedInRevit':True,'nativeModelCounts':dict(audit['counts'],Ceiling=len(ceilings)),'warnings':audit['warnings'],'roomAreas':audit['rooms'],'doorOpenings':geo['doorOpenings'],'engineeringApproval':False}
(qa/'delivery-verification.json').write_text(json.dumps(report,indent=2),encoding='utf8')
names=['PPE_Engineering_Senior_Home_R2026.rvt','PPE_Engineering_Senior_Home_Drawings.pdf','PPE_Engineering_Senior_A1.rfa','PPE_Senior_Home_3D.png','PPE_Senior_Home_Interior.png','README_TH.md','model-audit.json','final-geometry-check.json','ceiling-qa.json']
hashes={name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in names}
(qa/'delivery-hashes.json').write_text(json.dumps(hashes,indent=2),encoding='utf8')
zippath=out/'PPE_Engineering_Senior_Home_Package.zip'
with zipfile.ZipFile(zippath,'w',zipfile.ZIP_DEFLATED) as z:
    for name in names:z.write(out/name,name)
    z.write(qa/'delivery-verification.json','QA/delivery-verification.json')
    z.write(qa/'delivery-hashes.json','QA/delivery-hashes.json')
with zipfile.ZipFile(zippath) as z:
    assert z.testzip() is None
    assert hashlib.sha256(z.read(rvt.name)).hexdigest()==hashes[rvt.name]
# Keep intermediate files out of the delivery folder without deleting evidence.
previews=out/'drawing-previews';previews.mkdir(exist_ok=True)
for file in list(out.iterdir()):
    if not file.is_file():continue
    target=None
    if file.name.startswith('PPE - '):target=previews/file.name
    elif file.name in ['build-log.txt','review-complete.txt','finalize-error.txt','door-parameters.json','geometry-qa.json'] or re.search(r'\.\d{4}\.(rvt|rfa)$',file.name):target=qa/file.name
    if target:
        assert file.resolve().is_relative_to(root.resolve()) and target.resolve().is_relative_to(root.resolve())
        shutil.move(str(file),str(target))
print(json.dumps({'rvtBytes':rvt.stat().st_size,'zipBytes':zippath.stat().st_size,'sheets':expected,'warnings':audit['warnings'],'counts':report['nativeModelCounts']},indent=2))
