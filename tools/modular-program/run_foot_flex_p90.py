"""P89 candidate demand; native solves only, resuming verified output files."""
import concurrent.futures,hashlib,json,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/foot-flex-p90'
SOLVER=ROOT/'tools/modular-program/foot_flex_p90.py'
MESHER=ROOT/'tools/modular-program/foot_mesh_p86.py'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def filename(key,owner,foot,h,length=50):return f'{key}-{owner}-F{foot}-h{h:g}-r18.5-L{length:g}.json'
def valid(p):
    if not p.exists():return False
    r=json.loads(p.read_text(encoding='utf8'))
    return r.get('solverSha256')==sha(SOLVER) and r.get('mesherSha256')==sha(MESHER) and r.get('executionMethod')=='NATIVE_OPENSEES_SOLVE' and all(sha(ROOT/i['path'])==i['sha256'] for i in r['inputs'])
def case(args):
    key,owner,foot,h,length=args;p=OUT/filename(*args)
    if valid(p):return dict(file=p.name,cached=True)
    if p.exists():raise RuntimeError('Existing unverified/stale output; do not silently replace: '+p.name)
    start=time.time()
    cmd=[sys.executable,'-X','utf8',str(SOLVER),key,owner,str(foot),str(h),'--length',str(length)]
    r=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,encoding='utf8')
    if r.returncode:raise RuntimeError(f'{p.name}: {r.stderr}\n{r.stdout}')
    if not valid(p):raise RuntimeError('Output provenance failed '+p.name)
    return dict(file=p.name,cached=False,seconds=time.time()-start,stderr=r.stderr)
if __name__=='__main__':
    # Pilot must finish and meet the unchanged 2% criteria before batch expansion.
    a=json.loads((OUT/filename('D-RH-W01','M03',2,10)).read_text(encoding='utf8'))
    b=json.loads((OUT/filename('D-RH-W01','M03',2,7.5)).read_text(encoding='utf8'))
    norm=lambda v:sum(x*x for x in v)**.5
    dt=norm([x['tensionN']-y['tensionN'] for x,y in zip(a['boltForces'],b['boltForces'])])/norm([x['tensionN'] for x in b['boltForces']])
    dw=abs(a['maxUpwardDisplacementMm']-b['maxUpwardDisplacementMm'])/abs(b['maxUpwardDisplacementMm'])
    if dt>.02 or dw>.02:raise RuntimeError(f'Pilot refinement unresolved {dt=} {dw=}')
    cases=[(f'{f}-{side}-W01',owner,foot,h,50) for f in 'ABD' for side in ['LH','RH'] for owner in ['M01','M03'] for foot in [1,2] for h in ([10,7.5] if f=='D' else [20,10])]
    cases += [('D-RH-W01','M03',2,h,L) for L in [40,60] for h in [10,7.5]]
    OUT.mkdir(exist_ok=True,parents=True)
    plan=dict(revision='P90',cases=cases,totalNativeFiles=len(cases),runnerSha256=sha(__file__),solverSha256=sha(SOLVER),studyPlanSha256=sha(ROOT/'knowledge/modular-program-r02/foot-study-plan-p90.json'),pilotRefinement=dict(boltRelative=dt,displacementRelative=dw),mirrorDisposition='Pilot LH/RH canonical FE hashes differ; use native solves for every case. No mirror-derived results.',workers=3,stageComplete=False)
    (OUT/'batch-plan.json').write_text(json.dumps(plan,indent=2),encoding='utf8')
    records=[];errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs={pool.submit(case,a):a for a in cases}
        for future in concurrent.futures.as_completed(jobs):
            try:record=future.result();records.append(record);print(f'{len(records)}/{len(cases)} '+json.dumps(record),flush=True)
            except Exception as e:errors.append(dict(case=jobs[future],message=str(e)));print('ERROR '+str(e),flush=True)
            (OUT/'batch-status.json').write_text(json.dumps(dict(completed=len(records),planned=len(cases),errors=errors,records=records),indent=2),encoding='utf8')
    if errors:raise RuntimeError(f'{len(errors)} cases failed; see batch-status.json')
