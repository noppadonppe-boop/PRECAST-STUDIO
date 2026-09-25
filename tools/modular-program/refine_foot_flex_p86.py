"""Additional D-only refinement; retain original 20/10 results and the 2% criteria."""
import concurrent.futures,json
from run_foot_flex_p86 import ROOT,OUT,case,sha
if __name__=='__main__':
    cases=[(f'D-{side}-W01',owner,foot,7.5) for side in ['LH','RH'] for owner in ['M01','M03'] for foot in [1,2]]
    criteria=json.loads((OUT/'batch-plan.json').read_text())['criteria']
    plan=dict(revision='P86',reason='D 20-to10mm uplift differences exceed the existing2% criterion in initial results; refine all8 D groups without relaxing criteria.',cases=cases,comparison='10mm to7.5mm; original20/10 results retained',criteria=criteria,sourceSha256=sha(__file__),stageComplete=False)
    (OUT/'refinement-plan.json').write_text(json.dumps(plan,indent=2),encoding='utf8')
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for future in concurrent.futures.as_completed([pool.submit(case,c) for c in cases]):
            r=future.result();results.append(r);print(f'{len(results)}/8 '+json.dumps(r),flush=True)
            (OUT/'refinement-status.json').write_text(json.dumps(dict(completed=len(results),planned=8,records=results),indent=2),encoding='utf8')
