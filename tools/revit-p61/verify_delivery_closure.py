"""Independent read-only package/content verification; emits closure evidence, not approval."""
from pathlib import Path
import hashlib,json,zipfile
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'output/revit-p61-batch'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for m in read(WORK/'input.json')['models']:
    pid=m['id'];d=ROOT/'deliverables/PM_ARC_48_P104'/pid
    q=read(d/'QA_P104.json');manifest=read(d/'DeliveryManifest_P104.json')
    assert all(q.get(k) is True for k in ['nativeSavedReopened','sourceUnchanged','structureFingerprintMatch','linkLoaded','packaged']),pid
    assert q['coordinationAudit']=='PASS' and q['relocationTest']=='PASS',pid
    assert q['auditedRvtSha256']==sha(d/(pid+'_ARC_R2026_P104.rvt')),pid
    assert q['auditedStrSha256']==sha(d/'References'/(pid+'_STR_Coordination_P104.rvt')),pid
    assert sha(ROOT/m['source'])==m['sourceSha256'],pid
    assert manifest['engineeringApproved'] is False and manifest['productionReleased'] is False
    review=read(d/'VisualReview_P104.json');assert review['approved'] is True
    for name,h in review['sha256'].items():assert sha(d/name)==h,(pid,name)
    pdf=d/(pid+'_ARC_A1_P104.pdf');assert len(PdfReader(pdf).pages)==7,pid
    assert len(list(d.glob('*.png')))==4,pid
    assert list((d/'Families').glob('*.rfa')),pid
    for name in ['MaterialSpec_P104.csv','MEP_Locations_P104.csv','README_TH.md']:assert (d/name).stat().st_size>0,(pid,name)
    archive=d.parent/(pid+'_ARC_P104_ReviewPackage.zip')
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None,pid
        for f in manifest['files']:
            assert sha(d/f['path'])==f['sha256'],(pid,f['path'])
            assert hashlib.sha256(z.read(pid+'/'+f['path'])).hexdigest()==f['sha256'],(pid,f['path'])
    rows.append(dict(id=pid,status='PASS',zipSha256=sha(archive),files=len(manifest['files']),pdfSheets=7,pngs=4))
assert len(rows)==47
pilot=ROOT/'deliverables/PM_ARC_P61_Pilot/PM-I-B3'
q=read(pilot/'QA_P103.json');assert q['nativeSavedReopened'] and q['structureFingerprintMatch'] and q['relocatedPackageTest']=='PASS'
with zipfile.ZipFile(pilot.parent/'PM-I-B3_ARC_P103_ReviewPackage.zip') as z:
    assert z.testzip() is None
    manifest=read(pilot/'DeliveryManifest_P103.json')
    for f in manifest['files']:
        assert hashlib.sha256(z.read('PM-I-B3/'+f['path'])).hexdigest()==f['sha256'],f
assert len(read(WORK/'delivery-manifest.json')['products'])==48
result=dict(status='PASS',newProducts=47,acceptedPilot=1,total=48,products=rows,engineeringApproved=False,productionReleased=False,websiteAuditSeparate=True)
(WORK/'delivery-closure-audit.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='products'}))
