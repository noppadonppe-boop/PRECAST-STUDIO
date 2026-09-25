"""Predeclared P83 convergence/equilibrium checks; no capacity pass implied."""
import json,math,sys
from wall_frame_p83 import ROOT,run,sha,ops
from gusset_mesh_p83 import mesh_gusset,area
OUT=ROOT/'output/wall-frame-p83';OUT.mkdir(parents=True,exist_ok=True)

def patch_benchmark(h=50):
    qs=mesh_gusset(h);nodes={};ids=[];edges={}
    for q in qs:
        tags=[]
        for p in q:
            p=tuple(round(x,5) for x in p)
            if p not in nodes:nodes[p]=len(nodes)+1
            tags.append(nodes[p])
        ids.append(tags)
        for a,b in zip(tags,tags[1:]+tags[:1]):
            e=tuple(sorted([a,b]));edges[e]=edges.get(e,0)+1
    boundary={t for e,count in edges.items() if count==1 for t in e}
    ops.wipe();ops.model('basic','-ndm',3,'-ndf',6);E=200000.;nu=.3;strain=1e-4
    for (n,z),tag in nodes.items():ops.node(tag,n,0.,z);ops.fix(tag,0,1,0,1,1,1)
    ops.section('ElasticMembranePlateSection',1,E,nu,10.,0.)
    for i,tags in enumerate(ids,1):ops.element('ShellMITC4',i,*tags,1)
    ops.timeSeries('Linear',1);ops.pattern('Plain',1,1)
    for (n,z),tag in nodes.items():
        if tag in boundary:ops.sp(tag,1,strain*n);ops.sp(tag,3,-nu*strain*z)
    from window_shell_p82 import solve
    solve()
    error=max(math.dist([ops.nodeDisp(tag,1),ops.nodeDisp(tag,3)],[strain*n,-nu*strain*z]) for (n,z),tag in nodes.items())
    work=sum(sum(a*b for a,b in zip(ops.nodeReaction(t),ops.nodeDisp(t))) for t in nodes.values())
    expected=E*strain**2*98500*10
    assert error<1e-7 and abs(work/expected-1)<1e-6
    return dict(name='Perforated triangular gusset affine membrane patch',meshMm=h,quads=len(qs),maxDisplacementErrorMm=error,reactionWorkNmm=work,expectedWorkNmm=expected,relativeWorkError=abs(work/expected-1))

if __name__=='__main__':
    benchmark=patch_benchmark()
    thresholds=dict(lastPairDisplacementRelative=.02,lastPairFootForceL2Relative=.05,lastPairFootMomentL2Relative=.05,forceResidualN=.01,momentResidualNmm=1.,freeRetainedResidualForceN=.01,freeRetainedResidualMomentNmm=1.)
    rows=[]
    keys=[sys.argv[1]] if len(sys.argv)>1 else [f'{f}-{s}-W01' for f in ['A','B','D'] for s in ['LH','RH']]
    for key in keys:
        for owner in ['M01','M03']:
            results=[]
            for h in [100,50,25]:
                r=run(key,owner,h)
                (OUT/f'{key}-{owner}-h{h}.json').write_text(json.dumps(r,indent=2),encoding='utf8');results.append(r)
            a,b=results[-2:]
            def relative(field):
                av=[x for p in a['footGroups'] for x in p[field]];bv=[x for p in b['footGroups'] for x in p[field]]
                return math.sqrt(sum((x-y)**2 for x,y in zip(av,bv))/max(1.,sum(x*x for x in bv)))
            metrics=dict(displacementRelative=abs(a['maxSkinNormalDisplacementMm']/b['maxSkinNormalDisplacementMm']-1),footForceL2Relative=relative('forceN'),footMomentL2Relative=relative('momentNmm'))
            equilibrium=all(max(abs(v) for v in r['forceResidualN'])<=.01 and max(abs(v) for v in r['momentResidualNmm'])<=1 and r['maxFreeRetainedResidualForceN']<=.01 and r['maxFreeRetainedResidualMomentNmm']<=1 for r in results)
            convergence=metrics['displacementRelative']<=.02 and metrics['footForceL2Relative']<=.05 and metrics['footMomentL2Relative']<=.05
            row=dict(key=key,owner=owner,meshes=[100,50,25],displacementsMm=[r['maxSkinNormalDisplacementMm'] for r in results],walerDisplacementsMm=[r['maxWalerNormalDisplacementMm'] for r in results],footGroups=b['footGroups'],metrics=metrics,equilibriumVerified=equilibrium,globalConvergenceVerified=convergence,stressConvergenceVerified=False)
            rows.append(row);print(json.dumps(row),flush=True)
    audit=dict(revision='P83',thresholds=thresholds,benchmark=benchmark,records=rows,solverVersion=ops.version(),binarySha256=sha(ROOT/'.local-engineering-runtime/openseespywin/opensees.pyd'),sourceHashes={p:sha(ROOT/p) for p in ['tools/modular-program/gusset_mesh_p83.py','tools/modular-program/wall_frame_p83.py','tools/modular-program/run_wall_frame_p83.py','tools/modular-program/window_shell_p82.py']},engineeringApproved=False,productionReleased=False,stageComplete=False)
    (OUT/'audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
