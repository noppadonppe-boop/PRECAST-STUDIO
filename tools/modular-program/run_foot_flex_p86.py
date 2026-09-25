"""Run the 24 existing W01 support groups at two mesh resolutions, with provenance."""
import concurrent.futures,hashlib,json,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/foot-flex-p86'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def case(args):
    key,owner,foot,h=args
    file=OUT/f'{key}-{owner}-F{foot}-h{h}.json'
    if file.exists():
        r=json.loads(file.read_text(encoding='utf8'))
        if r['solverSha256']==sha(ROOT/'tools/modular-program/foot_flex_p86.py') and r['mesherSha256']==sha(ROOT/'tools/modular-program/foot_mesh_p86.py') and all(sha(ROOT/i['path'])==i['sha256'] for i in r['inputs']):
            return dict(file=file.name,cached=True)
    start=time.time()
    r=subprocess.run([sys.executable,str(ROOT/'tools/modular-program/foot_flex_p86.py'),key,owner,str(foot),str(h)],cwd=ROOT,capture_output=True,text=True)
    if r.returncode:raise RuntimeError(f'{file.name}: {r.stderr}\n{r.stdout}')
    return dict(file=file.name,cached=False,seconds=time.time()-start,stderr=r.stderr)
if __name__=='__main__':
    cases=[(f'{f}-{side}-W01',owner,foot,h) for f in 'ABD' for side in ['LH','RH'] for owner in ['M01','M03'] for foot in [1,2] for h in [20,10]]
    plan=dict(revision='P86',scope='24 W01 foot groups, baseline kc1000 / Leff50 / t30; not all Stage5',cases=cases,criteria=json.loads((OUT/'benchmarks.json').read_text())['nextRefinementCriteria'],note='Pilot A-LH-M01-F1 refinement was exploratory; criteria recorded before this batch expansion.',runnerSha256=sha(__file__),stageComplete=False)
    (OUT/'batch-plan.json').write_text(json.dumps(plan,indent=2),encoding='utf8')
    records=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for future in concurrent.futures.as_completed([pool.submit(case,a) for a in cases]):
            record=future.result();records.append(record);print(f'{len(records)}/{len(cases)} '+json.dumps(record),flush=True)
            (OUT/'batch-status.json').write_text(json.dumps(dict(completed=len(records),planned=len(cases),records=records),indent=2),encoding='utf8')
