from pathlib import Path
import importlib.util, json, math, sys
from window_shell_p82 import ROOT, run, ops, sha
OUT=ROOT/'output/window-shell-p82'
spec=importlib.util.spec_from_file_location('prior_shell',ROOT/'tools/tsc-study/shell_study.py')
prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)
checks=prior.benchmarks()
assert checks['cantilever'][-1]['relative_error']<.03
assert checks['membrane']['relative_error']<1e-6
# Rigid offset benchmark: tip force parallel to the rigid-link offset.
ops.wipe();ops.model('basic','-ndm',3,'-ndf',6)
ops.node(1,0.,0.,0.);ops.node(2,0.,0.,1000.);ops.node(3,53.,0.,1000.)
ops.fix(1,1,1,1,1,1,1);ops.rigidLink('beam',2,3);ops.geomTransf('Linear',1,1.,0.,0.)
I=(50*100**3-40*90**3)/12
ops.element('elasticBeamColumn',1,1,2,1400.,200000.,200000/2.6,1.3e6,I,561666.666666667,1)
ops.timeSeries('Linear',1);ops.pattern('Plain',1,1);ops.load(3,1000.,0.,0.,0.,0.,0.)
prior.solve();expected=1000*1000**3/(3*200000*I);actual=ops.nodeDisp(3,1)
assert abs(actual/expected-1)<1e-8
checks['rigidOffsetBeam']={'expectedMm':expected,'actualMm':actual,'relativeError':abs(actual/expected-1)}
thresholds={'lastPairDisplacementRelative':.02,'lastPairInterfaceForceL2Relative':.05,'lastPairInterfaceMomentL2Relative':.05,'forceResidualN':.01,'momentResidualNmm':1.,'freeRetainedResidualForceN':.01,'freeRetainedResidualMomentNmm':1.}
rows=[]
for family in ['A','B','D']:
    for side in ['LH','RH']:
        key=f'{family}-{side}-W01'
        for owner in ['M01','M03']:
            runs=[]
            for mesh in [100,50,25]:
                r=run(key,owner,mesh)
                out=OUT/f'{key}-{owner}-h{mesh}.json';out.write_text(json.dumps(r,indent=2),encoding='utf8')
                runs.append(r)
            a,b=runs[-2:]
            def error(field):
                # Node IDs change under refinement: compare by support coordinates, not node tag.
                old={tuple(x['xyzMm']):x[field] for x in a['reactions']}
                diff=sum(sum((u-v)**2 for u,v in zip(old[tuple(x['xyzMm'])],x[field])) for x in b['reactions'])
                den=sum(sum(v*v for v in x[field]) for x in b['reactions'])
                return math.sqrt(diff/max(1.,den))
            metrics={'displacementRelative':abs(a['maxSkinNormalDisplacementMm']/b['maxSkinNormalDisplacementMm']-1),'interfaceForceL2Relative':error('forceN'),'interfaceMomentL2Relative':error('momentNmm')}
            equilibrium=all(max(abs(v) for v in r['forceResidualN'])<=thresholds['forceResidualN'] and max(abs(v) for v in r['momentResidualNmm'])<=thresholds['momentResidualNmm'] and r['maxFreeRetainedResidualForceN']<=thresholds['freeRetainedResidualForceN'] and r['maxFreeRetainedResidualMomentNmm']<=thresholds['freeRetainedResidualMomentNmm'] for r in runs)
            passed=metrics['displacementRelative']<=.02 and metrics['interfaceForceL2Relative']<=.05 and metrics['interfaceMomentL2Relative']<=.05
            row={'key':key,'owner':owner,'input':b['input'],'meshes':[100,50,25],'displacementsMm':[r['maxSkinNormalDisplacementMm'] for r in runs],'metrics':metrics,'equilibriumVerified':equilibrium,'globalConvergenceVerified':passed,'stressConvergenceVerified':False,'pressureForceN':b['appliedForceN'][0],'cellCount':len(b['shellCells'])}
            rows.append(row);print(json.dumps(row),flush=True)
report={'revision':'P82','solverVersion':ops.version(),'binarySha256':sha(ROOT/'.local-engineering-runtime/openseespywin/opensees.pyd'),'benchmarks':checks,'thresholds':thresholds,'records':rows,'engineeringApproved':False,'productionReleased':False,'stageComplete':False,'sourceHashes':{p:sha(ROOT/p) for p in ['tools/modular-program/window_shell_p82.py','tools/modular-program/run_window_shell_p82.py','tools/tsc-study/shell_study.py']}}
(OUT/'audit.json').write_text(json.dumps(report,indent=2),encoding='utf8')
