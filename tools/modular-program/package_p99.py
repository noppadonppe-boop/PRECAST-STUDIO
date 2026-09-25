"""Immutable coordinated review bundle; no claim of P40 design completion."""
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/stage5-library-p99'
ARCHIVE = ROOT / 'output/PM-STAGE5-COORDINATED-44-P99.zip'
ALLOWED = {'.json', '.png', '.svg', '.csv', '.md', '.html', '.mjs', '.py', '.tsx'}

def read(p):
    return json.loads((ROOT / p).read_text(encoding='utf8'))

def sha(p):
    h = hashlib.sha256()
    with Path(p).open('rb') as f:
        for b in iter(lambda: f.read(1024*1024), b''):
            h.update(b)
    return h.hexdigest()

def main():
    if ARCHIVE.exists():
        raise FileExistsError('Never overwrite issued P99 archive')
    qa = read('output/stage5-library-p99/qa/verification.json')
    assert qa['geometryTestsPassed'] == 3 and qa['coordinationTestsPassed'] == 2
    assert qa['backendTestsPassed'] == 2 and qa['frontendTestsPassed'] == 77
    assert qa['visual']['assemblyBoardsReviewed'] == 44 and qa['visual']['partAtlasesReviewed'] == 44
    assert not qa['stageComplete']
    files = set()
    def add(p, expected=None):
        full = (ROOT/p).resolve()
        assert full.is_relative_to(ROOT.resolve()) and full.is_file(), p
        assert full.suffix in ALLOWED and not any(s in p.lower() for s in ['server-private', 'credential', '/.env', 'source-review']), p
        if expected:
            assert sha(full) == expected, p
        files.add(full.relative_to(ROOT).as_posix())
    for folder in ['output/mould-coordinated-p99', 'output/casting-equivalence-p98', 'output/stage5-library-p99']:
        for p in (ROOT/folder).rglob('*'):
            if p.is_file() and p.suffix in ALLOWED and p.name not in ['manifest.json', 'package-verification.json']:
                add(p.relative_to(ROOT).as_posix())
    for r in read('output/mould-coordinated-p99/register.json')['records']:
        for p in read(r['model'])['inputs']:
            add(p['path'],p['sha256'])
    for r in read('output/stage5-closure-p90/register.json')['records']:
        for p in r['evidence']:
            add(p['path'],p['sha256'])
        # Keep source dimensions with the new technical boards.
        folder = Path(r['concreteReference']['path']).parent.as_posix()
        for name in ['00-TYPICAL.png','00-TYPICAL.svg','01-CAVITY.png','01-CAVITY.svg','03-GEOMETRY-REVIEW.png','03-GEOMETRY-REVIEW.svg']:
            add(folder+'/'+name)
    for reg in ['output/mould-style-p43/manifest.json', 'output/concrete-lift-p52/register.json', 'output/cap-lift-p91/register.json']:
        add(reg)
        for r in read(reg)['records']:
            for p in r.get('files',[r]):
                add(p['path'],p['sha256'])
    for folder in ['output/table-weld-p93','output/table-channel-p94','output/table-seal-p95','output/table-seal-backer-p96','output/table-lock-base-p97']:
        for p in (ROOT/folder).iterdir():
            if p.is_file() and p.suffix in ALLOWED:
                add(p.relative_to(ROOT).as_posix())
    for p in ['knowledge/modular-program-current.json','knowledge/modular-program-r02/README.md','knowledge/modular-program-r02/DATA_MODEL.md','knowledge/modular-program-r02/STAGE5_CONTINUATION_P99.md','knowledge/modular-program-r02/STAGE5_STEEL_MOULD_REQUIREMENTS_P40.md','knowledge/modular-program-r02/decision-lifting-p52.json','tools/modular-program/casting-equivalence-p98.mjs','tools/modular-program/casting-equivalence-p98.test.mjs','tools/modular-program/mould-consolidation-p99.mjs','tools/modular-program/mould-consolidation-p99.test.mjs','tools/modular-program/mould-coordinated-boards-p99.mjs','tools/modular-program/mould-review-guide-p99.mjs','tools/modular-program/contact-sheets-p99.mjs','tools/modular-program/package_p99.py','tools/catalogue/mould-coordinated-p99.mjs','tools/catalogue/p99-http.test.mjs','tools/catalogue/mould-data.mjs','tools/catalogue/mould-review.test.mjs','apps/web/src/catalogue/CoordinatedMouldPanel.tsx','apps/web/src/catalogue/coordinatedMould.test.tsx','apps/web/src/catalogue/MouldLibrary.tsx']:
        add(p)
    # All relative links from the44 review pages must work inside the bundle.
    for p in (ROOT/'output/mould-coordinated-p99').glob('*.html'):
        for link in re.findall(r'(?:href|src)="([^"]+)"',p.read_text(encoding='utf8')):
            if not link.startswith(('data:','http:','https:','#')):
                target=(p.parent/link).resolve()
                assert target.relative_to(ROOT).as_posix() in files, (p.name,link)
    entries=[dict(path=p,bytes=(ROOT/p).stat().st_size,sha256=sha(ROOT/p)) for p in sorted(files)]
    manifest=dict(revision='P99',stage=5,stageComplete=False,engineeringApproved=False,productionReleased=False,files=entries)
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    with zipfile.ZipFile(ARCHIVE,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for e in entries:
            z.write(ROOT/e['path'],e['path'])
        z.write(OUT/'manifest.json','manifest.json')
        z.writestr('START.html','<!doctype html><html lang="th"><meta charset="utf-8"><title>44 moulds P99</title><h1>ชุดตรวจแม่แบบ44setup — P99</h1><p>ขั้น5ยังไม่ครบ ไม่ใช่แบบอนุมัติผลิต</p><a href="output/mould-coordinated-p99/index.html">เปิดสารบัญ</a></html>')
    with zipfile.ZipFile(ARCHIVE) as z:
        assert len(z.namelist()) == len(entries)+2 and z.testzip() is None
        for e in entries:
            assert hashlib.sha256(z.read(e['path'])).hexdigest()==e['sha256'], e['path']
    result=dict(path=ARCHIVE.relative_to(ROOT).as_posix(),bytes=ARCHIVE.stat().st_size,sha256=sha(ARCHIVE),manifestFiles=len(entries),zipEntries=len(entries)+2,allEntryHashesVerified=True)
    (OUT/'package-verification.json').write_text(json.dumps(result,indent=2),encoding='utf8')
    print(json.dumps(result),flush=True)

if __name__=='__main__':
    main()
