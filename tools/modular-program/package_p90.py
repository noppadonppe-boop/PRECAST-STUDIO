"""Package the coordinated P90/P91 delta without duplicating native solver files."""
import hashlib,json,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/stage5-update-p90-p91'
def sha(p):
    h=hashlib.sha256()
    with Path(p).open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
if __name__=='__main__':
    audit=json.loads((ROOT/'output/foot-flex-p90/audit.json').read_text(encoding='utf8'))
    assert audit['verifiedNativeFiles']==64 and audit['refinementAcceptedGroups']==24 and all(r['refinementAccepted'] for r in audit['sensitivity'])
    assert audit['stageComplete'] is False
    files=set()
    for folder in ['output/foot-flex-p90','output/stage5-closure-p90','output/stage5-library-p90/qa','output/cap-lift-p91']:
        for p in (ROOT/folder).rglob('*'):
            if p.is_file():files.add(p.relative_to(ROOT).as_posix())
    files.update(['output/stage5-library-p90/register.json','knowledge/modular-program-current.json','knowledge/modular-program-r02/STAGE5_CONTINUATION_P90.md','knowledge/modular-program-r02/foot-study-plan-p90.json','knowledge/modular-program-r02/DATA_MODEL.md','tools/modular-program/foot_flex_p90.py','tools/modular-program/run_foot_flex_p90.py','tools/modular-program/refine_foot_flex_p90.py','tools/modular-program/foot_bench_p90.py','tools/modular-program/foot-flex-audit-p90.mjs','tools/modular-program/foot-flex-p90.test.mjs','tools/modular-program/foot-flex-report-p90.mjs','tools/modular-program/stage5-closure-p90.mjs','tools/modular-program/stage5-closure-p90.test.mjs','tools/modular-program/catalogue-supplement-p90.mjs','tools/modular-program/package_p90.py','tools/catalogue/p90-http.test.mjs','tools/catalogue/mould-data.mjs','tools/catalogue/mould-review.test.mjs','apps/web/src/catalogue/MouldLibrary.tsx','apps/web/src/catalogue/mould.test.tsx'])
    files.add('tools/catalogue/integrity-pins-p90.test.mjs')
    files.update(['knowledge/modular-program-r02/STAGE5_CONTINUATION_P91.md','tools/modular-program/cap-lift-p91.mjs','tools/modular-program/cap-lift-p91.test.mjs','tools/catalogue/casting-lifts-p91.mjs','tools/catalogue/casting-lifts-p91.test.mjs','tools/catalogue/p91-http.test.mjs','apps/web/src/catalogue/CastingLiftPanel.tsx','apps/web/src/catalogue/castingLift.test.tsx'])
    assert all(not p.endswith('.pdf') and 'server-private' not in p for p in files)
    OUT.mkdir(parents=True,exist_ok=True)
    readme='''# P90 / P91 — Candidate foot demand, closure register and updated cap lifting layouts

Open output/foot-flex-p90/index.html for 6 source-model boards / 24 foot groups / 64 native cases. The 12 additional7.5mm A/B cases retain the unchanged2% acceptance criterion and the initial results. Leff40/60 sensitivity applies only to the stated pilot.

Open output/stage5-closure-p90/index.html for the44-setup inventory against all8 P40 deliverables. Inventory coverage100% is NOT Stage5 completion100%. No production or lifting release. P52 schematic reinforcement/development concrete lifting assumption remains.

Open output/cap-lift-p91/index.html for nine revised concrete free-suspension layouts in the actual P56 casting pose. The P90 inventory is a historical snapshot preceding this specific correction; the web displays the P91 update alongside it. Old P52 images and source geometry are preserved. Rebar routes have no sizes. The blue lifting-frame lines are schematic, not fabricated sections or rated hardware.

This is a delta package for the existing project, not a standalone solver installation or web app. Earlier P83 wall loads, P85/P89 geometry and P86 libraries remain in their prior packages; SHA references are included. No source-standard PDFs, credentials or private server logs are redistributed.

P89 remains a candidate. P90 is pressure-only, one-way, rigid-washer-patch demand, not actual washer/thread/weld capacity. Do not adopt historical P88 component checks automatically. Original gallery images remain unchanged; studies are supplementary.
'''
    (OUT/'README.md').write_text(readme,encoding='utf8')
    entries=[dict(path=p,bytes=(ROOT/p).stat().st_size,sha256=sha(ROOT/p)) for p in sorted(files)]
    manifest=dict(revision='P90-P91',stage=5,stageComplete=False,engineeringApproved=False,productionReleased=False,files=entries)
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    archive=ROOT/'output/PM-STAGE5-UPDATE-P90-P91.zip'
    with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for e in entries:z.write(ROOT/e['path'],e['path'])
        z.write(OUT/'manifest.json','manifest.json');z.write(OUT/'README.md','README.md')
    with zipfile.ZipFile(archive) as z:
        assert len(z.namelist())==len(entries)+2
        for e in entries:
            h=hashlib.sha256()
            with z.open(e['path']) as f:
                for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
            assert h.hexdigest()==e['sha256'],e['path']
    result=dict(path=archive.relative_to(ROOT).as_posix(),bytes=archive.stat().st_size,sha256=sha(archive),manifestFiles=len(entries),zipEntries=len(entries)+2,allEntryHashesVerified=True)
    (OUT/'package-verification.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result),flush=True)
