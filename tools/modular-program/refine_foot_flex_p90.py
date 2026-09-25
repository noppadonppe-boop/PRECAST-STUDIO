"""Refine only A/B groups that fail the predeclared 2% displacement/force test."""
import concurrent.futures,json
from run_foot_flex_p90 import ROOT,OUT,case,sha,filename
if __name__=='__main__':
    study=ROOT/'knowledge/modular-program-r02/foot-study-plan-p90.json'
    criteria=json.loads(study.read_text(encoding='utf8'))['criteria']
    norm=lambda a:sum(x*x for x in a)**.5
    selected=[]
    for f in 'AB':
        for side in ['LH','RH']:
            for owner in ['M01','M03']:
                for foot in [1,2]:
                    key=f'{f}-{side}-W01'
                    pa=OUT/filename(key,owner,foot,20);pb=OUT/filename(key,owner,foot,10)
                    a=json.loads(pa.read_text(encoding='utf8'));b=json.loads(pb.read_text(encoding='utf8'))
                    dt=norm([x['tensionN']-y['tensionN'] for x,y in zip(a['boltForces'],b['boltForces'])])/norm([x['tensionN'] for x in b['boltForces']])
                    dw=abs(a['maxUpwardDisplacementMm']-b['maxUpwardDisplacementMm'])/abs(b['maxUpwardDisplacementMm'])
                    if dt>criteria['boltForceVectorL2Relative'] or dw>criteria['maxUpwardDisplacementRelative']:
                        selected.append(dict(args=[key,owner,foot,7.5,50],initialBoltRelative=dt,initialDisplacementRelative=dw,inputs=[dict(path=p.name,sha256=sha(p)) for p in [pa,pb]]))
    assert len(selected)>0
    plan=dict(revision='P90',reason='These A/B groups exceed the existing 2% 20-to10mm refinement criterion. Add7.5mm without relaxing criteria; preserve initial results.',selected=selected,criteria=criteria,sourceSha256=sha(__file__),workers=3,originalPlanSha256=sha(study),stageComplete=False)
    (OUT/'refinement-plan.json').write_text(json.dumps(plan,indent=2),encoding='utf8')
    records=[];errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs={pool.submit(case,s['args']):s['args'] for s in selected}
        for future in concurrent.futures.as_completed(jobs):
            try:r=future.result();records.append(r);print(f'{len(records)}/{len(selected)} '+json.dumps(r),flush=True)
            except Exception as e:errors.append(dict(case=jobs[future],message=str(e)));print('ERROR '+str(e),flush=True)
            (OUT/'refinement-status.json').write_text(json.dumps(dict(completed=len(records),planned=len(selected),records=records,errors=errors),indent=2),encoding='utf8')
    if errors:raise RuntimeError(f'{len(errors)} refinement cases failed')
