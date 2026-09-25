"""Immutable P95 delta with per-entry hash verification."""
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/stage5-update-p95'
ARCHIVE = ROOT / 'output/PM-STAGE5-UPDATE-P95.zip'

def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for b in iter(lambda: f.read(1024*1024), b''):
            h.update(b)
    return h.hexdigest()

def main():
    if ARCHIVE.exists():
        raise FileExistsError('Issued P95 archive must not be overwritten')
    qa = json.loads((ROOT/'output/stage5-library-p95/qa/verification.json').read_text(encoding='utf8'))
    assert qa['calculation']['passed'] == 8 and qa['backend']['passed'] == 3 and qa['frontend']['passed'] == 68
    assert len(qa['visual']['finalBoardsInspected']) == 6 and not qa['stageComplete']
    files = {p.relative_to(ROOT).as_posix() for p in (ROOT/'output/table-seal-p95').iterdir() if p.is_file() and p.suffix in ['.json','.png','.svg','.csv','.md','.html']}
    files.update([
        'output/stage5-library-p95/qa/verification.json', 'knowledge/modular-program-current.json',
        'knowledge/modular-program-r02/README.md', 'knowledge/modular-program-r02/DATA_MODEL.md',
        'knowledge/modular-program-r02/STAGE5_CONTINUATION_P95.md',
        'tools/modular-program/table-seal-p95.mjs', 'tools/modular-program/table-seal-p95.test.mjs',
        'tools/modular-program/table-seal-boards-p95.mjs', 'tools/modular-program/package_p95.py',
        'tools/modular-program/convex-clip-p95.mjs', 'tools/modular-program/table-seal-assets-p95.mjs',
        'tools/catalogue/table-seal-p95.mjs', 'tools/catalogue/mould-data.mjs',
        'tools/catalogue/mould-review.test.mjs', 'tools/catalogue/p95-http.test.mjs',
        'apps/web/src/catalogue/TableSealPanel.tsx', 'apps/web/src/catalogue/tableSeal.test.tsx',
        'apps/web/src/catalogue/MouldLibrary.tsx',
    ])
    assert all('server-private' not in p and 'source-review' not in p and not p.endswith('.pdf') for p in files)
    entries = [dict(path=p,bytes=(ROOT/p).stat().st_size,sha256=sha(ROOT/p)) for p in sorted(files)]
    manifest = dict(revision='P95',stage=5,stageComplete=False,engineeringApproved=False,productionReleased=False,files=entries)
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    with zipfile.ZipFile(ARCHIVE,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for e in entries:
            z.write(ROOT/e['path'],e['path'])
        for p in ['manifest.json','README.md']:
            z.write(OUT/p,p)
    with zipfile.ZipFile(ARCHIVE) as z:
        assert len(z.namelist())==len(entries)+2 and z.testzip() is None
        for e in entries:
            assert hashlib.sha256(z.read(e['path'])).hexdigest()==e['sha256'],e['path']
        for p in ['manifest.json','README.md']:
            assert hashlib.sha256(z.read(p)).hexdigest()==sha(OUT/p)
    result=dict(path=ARCHIVE.relative_to(ROOT).as_posix(),bytes=ARCHIVE.stat().st_size,sha256=sha(ARCHIVE),manifestFiles=len(entries),zipEntries=len(entries)+2,allEntryHashesVerified=True)
    (OUT/'package-verification.json').write_text(json.dumps(result,indent=2),encoding='utf8')
    print(json.dumps(result),flush=True)

if __name__=='__main__':
    main()
