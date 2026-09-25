"""Independent thin-plate bending benchmark, not the real foot geometry."""
import json,math
from foot_flex_p86 import ROOT,ops,sha,np
SOURCE='https://ocw.mit.edu/courses/2-082-ship-structural-analysis-design-13-122-spring-2003/fb7861b5166b983233284631dcfdafb2_notes_24_plate_bendin.pdf'
def run(n):
    a=b=1000.;t=10.;E=200000.;nu=.3;q=.001
    D=E*t**3/(12*(1-nu**2));expected=q/(D*math.pi**4*(1/a**2+1/b**2)**2)
    ops.wipe();ops.model('basic','-ndm',3,'-ndf',6);ops.section('ElasticMembranePlateSection',1,E,nu,t,0.)
    node=lambda i,j:1+i*(n+1)+j
    fixed=[]
    for i in range(n+1):
        for j in range(n+1):
            tag=node(i,j);edge=i in [0,n] or j in [0,n];ops.node(tag,a*i/n,b*j/n,0.)
            ops.fix(tag,1,1,int(edge),0,0,1)
            if edge:fixed.append(tag)
    loads={}
    for i in range(n):
        for j in range(n):
            ids=[node(i,j),node(i+1,j),node(i+1,j+1),node(i,j+1)]
            ops.element('ShellMITC4',1+i*n+j,*ids,1)
            for xi in [-1/math.sqrt(3),1/math.sqrt(3)]:
                for eta in [-1/math.sqrt(3),1/math.sqrt(3)]:
                    N=[(1-xi)*(1-eta)/4,(1+xi)*(1-eta)/4,(1+xi)*(1+eta)/4,(1-xi)*(1+eta)/4]
                    x=(i+(1+xi)/2)*a/n;y=(j+(1+eta)/2)*b/n
                    F=q*math.sin(math.pi*x/a)*math.sin(math.pi*y/b)*a*b/(4*n*n)
                    for tag,w in zip(ids,N):loads[tag]=loads.get(tag,0.)+F*w
    ops.timeSeries('Linear',1);ops.pattern('Plain',1,1)
    for tag,f in loads.items():ops.load(tag,0.,0.,f,0.,0.,0.)
    ops.constraints('Transformation');ops.numberer('RCM');ops.system('UmfPack');ops.test('NormDispIncr',1e-10,20);ops.algorithm('Newton');ops.integrator('LoadControl',1.);ops.analysis('Static')
    assert ops.analyze(1)==0;ops.reactions();actual=ops.nodeDisp(node(n//2,n//2),3)
    residual=sum(loads.values())+sum(ops.nodeReaction(i,3) for i in fixed)
    return dict(divisions=n,expectedKirchhoffCentreMm=expected,actualShellCentreMm=actual,relativeError=abs(actual-expected)/expected,forceResidualN=residual)
if __name__=='__main__':
    # Criterion chosen before these runs: fine-grid displacement within1% of thin-plate solution.
    rows=[run(n) for n in [8,16,32]]
    assert rows[-1]['relativeError']<.01 and all(abs(r['forceResidualN'])<.001 for r in rows)
    report=dict(sourceURL=SOURCE,sourcePdfPage1Based=2,formula='D=Et^3/[12(1-nu^2)], wcentre=q/[D*pi^4*(1/a^2+1/b^2)^2]',basis=dict(aMm=1000,bMm=1000,tMm=10,E_MPa=200000,nu=.3,qNPerMm2=.001),note='Thin-plate analytical reference; MITC4 includes transverse shear. This checks bending scale, not contact or production capacity.',fineGridRelativeTolerance=.01,rows=rows,passed=True,sourceSha256=sha(__file__),solverVersion=ops.version())
    (ROOT/'output/foot-flex-p86/plate-benchmark.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report))
