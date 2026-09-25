"""Immutable P92 delta, excluding private logs and source-standard material."""
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/stage5-update-p92'
ARCHIVE = ROOT / 'output/PM-STAGE5-UPDATE-P92.zip'


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def main():
    if ARCHIVE.exists():
        raise FileExistsError('Issued P92 archive must not be overwritten')
    qa = json.loads((ROOT / 'output/stage5-library-p92/qa/verification.json').read_text(encoding='utf8'))
    assert qa['calculationAndHttp']['passed'] == 17 and qa['frontend']['passed'] == 59
    assert len(qa['visual']['finalBoardsInspected']) == 6 and not qa['stageComplete']
    register = json.loads((ROOT / 'output/connection-disposition-p92/register.json').read_text(encoding='utf8'))
    assert len(register['groups']) == 26 and not register['productionReleased']
    files = set()
    for path in (ROOT / 'output/connection-disposition-p92').iterdir():
        if path.is_file() and path.suffix in ['.json', '.csv', '.svg', '.png', '.html', '.md']:
            files.add(path.relative_to(ROOT).as_posix())
    files.update([
        'output/stage5-library-p92/register.json',
        'output/stage5-library-p92/qa/verification.json',
        'knowledge/modular-program-current.json',
        'knowledge/modular-program-r02/README.md',
        'knowledge/modular-program-r02/DATA_MODEL.md',
        'knowledge/modular-program-r02/STAGE5_CONTINUATION_P92.md',
        'tools/modular-program/connection-disposition-p92.mjs',
        'tools/modular-program/connection-disposition-p92.test.mjs',
        'tools/modular-program/connection-boards-p92.mjs',
        'tools/modular-program/catalogue-supplement-p92.mjs',
        'tools/modular-program/package_p92.py',
        'tools/catalogue/mould-data.mjs',
        'tools/catalogue/mould-review.test.mjs',
        'tools/catalogue/p90-http.test.mjs',
        'tools/catalogue/p91-http.test.mjs',
        'tools/catalogue/p92-http.test.mjs',
        'apps/web/src/catalogue/MouldLibrary.tsx',
        'apps/web/src/catalogue/mould.test.tsx',
    ])
    assert all('server-private' not in name and 'source-review' not in name and not name.endswith('.pdf') for name in files)
    entries = [dict(path=name, bytes=(ROOT/name).stat().st_size, sha256=sha(ROOT/name)) for name in sorted(files)]
    manifest = dict(revision='P92', stage=5, stageComplete=False, engineeringApproved=False, productionReleased=False, files=entries)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf8')
    with zipfile.ZipFile(ARCHIVE, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for entry in entries:
            archive.write(ROOT/entry['path'], entry['path'])
        archive.write(OUT/'manifest.json', 'manifest.json')
        archive.write(OUT/'README.md', 'README.md')
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert len(archive.namelist()) == len(entries) + 2
        assert archive.testzip() is None
        for entry in entries:
            assert hashlib.sha256(archive.read(entry['path'])).hexdigest() == entry['sha256'], entry['path']
        for name in ['README.md', 'manifest.json']:
            assert hashlib.sha256(archive.read(name)).hexdigest() == sha(OUT/name)
    result = dict(path=ARCHIVE.relative_to(ROOT).as_posix(), bytes=ARCHIVE.stat().st_size, sha256=sha(ARCHIVE), manifestFiles=len(entries), zipEntries=len(entries)+2, allEntryHashesVerified=True)
    (OUT/'package-verification.json').write_text(json.dumps(result, indent=2), encoding='utf8')
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    main()
