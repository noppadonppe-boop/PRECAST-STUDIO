"""Runtime regression cases for unilateral springs and washer MPC compatibility."""
import json
from foot_flex_p86 import ROOT,ops,sha

def solve(steps=1):
    ops.constraints('Transformation');ops.numberer('RCM');ops.system('UmfPack')
    ops.test('NormDispIncr',1e-10,50);ops.algorithm('Newton');ops.integrator('LoadControl',1/steps);ops.analysis('Static')
    assert ops.analyze(steps)==0
    ops.reactions()

def spring_test(force):
    ops.wipe();ops.model('basic','-ndm',3,'-ndf',6)
    ops.node(1,0.,0.,0.);ops.node(2,0.,0.,0.);ops.fix(1,1,1,1,1,1,1);ops.fix(2,1,1,0,1,1,1)
    ops.uniaxialMaterial('ENT',1,4000.);ops.uniaxialMaterial('ENT',2,1000.)
    ops.element('zeroLength',1,1,2,'-mat',1,'-dir',3);ops.element('zeroLength',2,2,1,'-mat',2,'-dir',3)
    ops.timeSeries('Linear',1);ops.pattern('Plain',1,1);ops.load(2,0.,0.,force,0.,0.,0.);solve()
    expected=force/(1000 if force>0 else 4000);actual=ops.nodeDisp(2,3)
    assert abs(actual-expected)<1e-12 and abs(ops.nodeReaction(1,3)+force)<1e-8
    return dict(forceN=force,expectedMm=expected,actualMm=actual)

def offset_test(steps):
    ops.wipe();ops.model('basic','-ndm',3,'-ndf',6)
    for tag,p in [(1,[0,0,0]),(2,[14,14,0]),(3,[0,0,-100])]:ops.node(tag,*p)
    ops.fix(3,1,1,1,1,1,1);ops.geomTransf('Linear',1,1.,0.,0.)
    ops.element('elasticBeamColumn',1,3,1,100.,2e5,8e4,1e4,1e4,1e4,1)
    ops.rigidLink('beam',1,2);ops.fix(1,1,1,0,0,0,1)
    ops.timeSeries('Linear',1);ops.pattern('Plain',1,1);ops.load(2,0.,0.,100.,0.,0.,0.);solve(steps)
    a=ops.nodeDisp(1);b=ops.nodeDisp(2);expected=a[2]+14*a[3]-14*a[4]
    # Axial extension plus two fixed-translation end rotations (stiffness4EI/L).
    analytical=100*100/(200000*100)+2*100*14**2*100/(4*200000*10000)
    if steps==1:assert abs(b[2]-analytical)<1e-10
    return dict(steps=steps,expectedSlaveZmm=expected,analyticalBeamResponseMm=analytical,actualSlaveZmm=b[2],compatibilityErrorMm=abs(b[2]-expected),accepted=abs(b[2]-expected)<1e-10)

if __name__=='__main__':
    one=offset_test(1);multi=offset_test(10);assert one['accepted'];assert not multi['accepted']
    report=dict(revision='P86',solverVersion=ops.version(),springTests=[spring_test(1000.),spring_test(-1000.)],acceptedMPC=one,rejectedMultiStepDiagnostic=multi,note='Observed on this local runtime/model with partially fixed retained node; multi-step project results are rejected, not re-labelled as verified.',sourceHashes={p:sha(ROOT/p) for p in ['tools/modular-program/foot_flex_bench_p86.py','tools/modular-program/foot_flex_p86.py','tools/modular-program/foot_mesh_p86.py']},nextRefinementCriteria=dict(boltForceVectorL2Relative=.02,maxUpwardDisplacementRelative=.02,forceEquilibriumN=.01,momentEquilibriumNmm=1.,washerCompatibilityMm=1e-8,freeVerticalResidualN=.01,freeBendingResidualNmm=1.))
    (ROOT/'output/foot-flex-p86/benchmarks.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report))
