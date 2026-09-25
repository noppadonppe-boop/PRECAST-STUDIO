"""Rerun unchanged benchmark definitions in the P90 runtime without rewriting P86."""
import json
from foot_flex_p90 import ROOT,ops,sha
from foot_flex_bench_p86 import spring_test,offset_test
from plate_bench_p86 import run as plate
if __name__=='__main__':
    one=offset_test(1);multi=offset_test(10)
    assert one['accepted'] and not multi['accepted']
    rows=[plate(n) for n in [8,16,32]]
    assert rows[-1]['relativeError']<.01 and all(abs(r['forceResidualN'])<.001 for r in rows)
    report=dict(revision='P90',solverVersion=ops.version(),springTests=[spring_test(1000.),spring_test(-1000.)],acceptedMPC=one,rejectedMultiStepDiagnostic=multi,plateRows=rows,plateFineTolerance=.01,sourceHashes={p:sha(ROOT/p) for p in ['tools/modular-program/foot_bench_p90.py','tools/modular-program/foot_flex_p90.py','tools/modular-program/foot_mesh_p86.py','tools/modular-program/foot_flex_bench_p86.py','tools/modular-program/plate_bench_p86.py']},passed=True,scope='Spring/MPC and elastic bending-scale runtime regression; no washer/thread/connection capacity approval.')
    out=ROOT/'output/foot-flex-p90';out.mkdir(exist_ok=True,parents=True)
    (out/'benchmarks.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report))
