"""Publish metadata only for fully packaged ARC deliveries; private files stay in deliverables."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'output/revit-p61-batch'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
products=[]
pilot=ROOT/'deliverables/PM_ARC_P61_Pilot/PM-I-B3'
folders=[(pilot,'P103')]+[(p,'P104') for p in sorted((ROOT/'deliverables/PM_ARC_48_P104').glob('PM-*')) if p.is_dir()]
for folder,rev in folders:
    pid=folder.name;qa_path=folder/f'QA_{rev}.json'
    if not qa_path.exists():continue
    qa=read(qa_path)
    if rev=='P104' and not qa.get('packaged'):continue
    if rev=='P103':
        assert qa['nativeSavedReopened'] and qa['relocatedPackageTest']=='PASS' and qa['visualReview'].startswith('PASS')
    else:
        assert qa['coordinationAudit']=='PASS' and qa['relocationTest']=='PASS' and qa['visualReview'].startswith('PASS')
        assert qa['auditedRvtSha256']==sha(folder/f'{pid}_ARC_R2026_{rev}.rvt')
    manifest_path=folder/f'DeliveryManifest_{rev}.json';manifest=read(manifest_path)
    for f in manifest['files']:assert sha(folder/f['path'])==f['sha256'],f
    source=ROOT/f'deliverables/PM_Revit_48_P6/{pid}/{pid}_R2026_P01.rvt'
    assert sha(source)==qa['sourceSha256']
    entries=[('RVT',folder/f'{pid}_ARC_R2026_{rev}.rvt'),('PDF',folder/f'{pid}_ARC_A1_{rev}.pdf'),('ZIP',folder.parent/f'{pid}_ARC_{rev}_ReviewPackage.zip')]
    for p in sorted(folder.glob('*.png')):
        kind={'Exterior':'PNG_3D_EXTERIOR','Interior':'PNG_3D_INTERIOR','Plan':'PNG_PLAN','MEP':'PNG_MEP'}[p.name.split(' - ')[0]]
        entries.append((kind,p))
    for kind,prefix in [('SPEC','MaterialSpec'),('ITEMS','ARC_ItemSchedule'),('MEP','MEP_Locations'),('QA','QA')]:entries.append((kind,folder/f'{prefix}_{rev}.{ "json" if kind=="QA" else "csv"}'))
    entries.append(('README',folder/'README_TH.md'))
    files=[dict(id=f'{pid}-ARC-{rev}-{kind.replace("_","-")}',kind=kind,path=p.relative_to(ROOT).as_posix(),bytes=p.stat().st_size,sha256=sha(p)) for kind,p in entries]
    products.append(dict(productId=pid,revision=rev,status='ARCHITECT_REVIEW_NOT_FOR_CONSTRUCTION',nativeValidated=True,sourcePath=source.relative_to(ROOT).as_posix(),sourceSha256=qa['sourceSha256'],manifestPath=manifest_path.relative_to(ROOT).as_posix(),manifestSha256=sha(manifest_path),files=files))
assert len({p['productId'] for p in products})==len(products)
result=dict(stage='6.1',geometryRevision='P36',softwareVersion='2026',engineeringApproved=False,productionReleased=False,products=products)
(WORK/'delivery-manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(available=len(products),target=48)))
