"""S2F exact polynomial elasticity coupons; not a TS-C design analysis."""
from pathlib import Path
import sys, json, hashlib, math
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.local-engineering-runtime'))
import openseespy.opensees as ops
OUT=ROOT/'output/tsc-step2f-r00'
BP='knowledge/modular-tsc-step2f/basis.json'
CORNERS=np.array([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],float)
EDGES=np.array([[0,-1,-1],[1,0,-1],[0,1,-1],[-1,0,-1],[0,-1,1],[1,0,1],[0,1,1],[-1,0,1],[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]],float)
N20=np.vstack([CORNERS,EDGES])
N27=np.vstack([N20,[[1,0,0],[0,1,0],[0,0,1],[-1,0,0],[0,-1,0],[0,0,-1],[0,0,0]]])
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def write(p,v):(OUT/p).write_text(json.dumps(v,separators=(',',':'),allow_nan=False),encoding='utf-8')

def shape(q,kind):
    q=np.asarray(q); f=1+CORNERS*q
    if kind=='stdBrick':
        return np.prod(f,axis=1)/8,np.column_stack([CORNERS[:,k]*np.prod(f[:,[j for j in range(3) if j!=k]],axis=1)/8 for k in range(3)])
    N=[];D=[]
    for s in CORNERS:
        a=1+s*q;b=s@q-2
        N.append(np.prod(a)*b/8)
        D.append([s[k]*np.prod(np.delete(a,k))*(b+a[k])/8 for k in range(3)])
    for s in EDGES:
        k=int(np.flatnonzero(s==0)[0]);j,h=[v for v in range(3) if v!=k]
        N.append((1-q[k]**2)*(1+s[j]*q[j])*(1+s[h]*q[h])/4)
        d=np.zeros(3);d[k]=-q[k]*(1+s[j]*q[j])*(1+s[h]*q[h])/2
        d[j]=(1-q[k]**2)*s[j]*(1+s[h]*q[h])/4;d[h]=(1-q[k]**2)*s[h]*(1+s[j]*q[j])/4;D.append(d)
    return np.array(N),np.array(D)

def gps(kind):
    if kind=='stdBrick':return [(np.array([x,y,z]),1.) for x in [-1/math.sqrt(3),1/math.sqrt(3)] for y in [-1/math.sqrt(3),1/math.sqrt(3)] for z in [-1/math.sqrt(3),1/math.sqrt(3)]]
    return [(q*math.sqrt(3/5),float(np.prod(np.where(q==0,8/9,5/9)))) for q in N27]

def tensor(grad,E,nu):
    mu=E/(2*(1+nu));lam=E*nu/((1+nu)*(1-2*nu))
    return mu*(grad+grad.T)+lam*np.trace(grad)*np.eye(3)
def six(T):return T[[0,1,2,0,1,2],[0,1,2,1,2,0]]

def exact(p,case,b):
    x,y,z=p;g=b['geometry'];L,w,t=g['length_m'],g['width_m'],g['thickness_m'];I=w*t**3/12;c=t/2
    E=b['material']['E_MPa']*1000;nu=b['material']['nu'];a=(1-nu**2)/E;d=nu*(1+nu)/E;e=(1+nu)/E
    if case=='M':
        k=b['loads']['M_kNm']/I
        u=np.array([a*k*x*z,0.,-a*k*x*x/2-d*k*z*z/2]);s=k*z;tau=0.
        grad=np.array([[a*k*z,0,a*k*x],[0,0,0],[-a*k*x,0,-d*k*z]])
    else:
        k=b['loads']['V_kN']/I
        u=np.array([a*k*(L*x-x*x/2)*z+k*(e-d/2)*z**3/3,0.,-d*k*(L-x)*z*z/2-a*k*(L*x*x/2-x**3/6)-e*k*c*c*x])
        s=k*(L-x)*z;tau=k*(z*z-c*c)/2
        grad=np.array([[a*k*(L-x)*z,0,a*k*(L*x-x*x/2)+k*(e-d/2)*z*z],[0,0,0],[d*k*z*z/2-a*k*(L*x-x*x/2)-e*k*c*c,0,-d*k*(L-x)*z]])
    return u,np.array([s,nu*s,0,0,0,tau]),grad

def exact_energy(case,b):
    g=b['geometry'];L,w,t=g['length_m'],g['width_m'],g['thickness_m']
    E=b['material']['E_MPa']*1000;nu=b['material']['nu'];I=w*t**3/12;c=t/2
    if case=='M':return (1-nu**2)/E*b['loads']['M_kNm']**2*L/(2*I)
    V=b['loads']['V_kN'];return (1-nu**2)/E*V*V*L**3/(6*I)+(1+nu)/E*V*V*w*L*4*c**5/(15*I**2)

def mesh(kind,nx,ny,nz,L,w,t):
    local=CORNERS if kind=='stdBrick' else N20;nodes={};lookup={};els=[]
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                ids=[]
                for q in local:
                    key=tuple((np.array([2*i,2*j,2*k])+q+1).astype(int))
                    if key not in lookup:
                        n=len(nodes)+1;lookup[key]=n;nodes[n]=np.array([key[0]*L/(2*nx),key[1]*w/(2*ny),key[2]*t/(2*nz)-t/2])
                    ids.append(lookup[key])
                els.append(ids)
    return nodes,els

def setup(nodes,els,kind,E,nu):
    ops.wipe();ops.model('basic','-ndm',3,'-ndf',3);ops.nDMaterial('ElasticIsotropic',1,E,nu)
    for n,p in nodes.items():ops.node(n,*p.tolist())
    for e,ns in enumerate(els,1):ops.element(kind,e,*ns,1)
    ops.timeSeries('Linear',1);ops.pattern('Plain',1,1)
def solve():
    ops.constraints('Transformation');ops.numberer('Plain');ops.system('SuperLU');ops.test('NormDispIncr',1e-12,10);ops.algorithm('Linear');ops.integrator('LoadControl',1.);ops.analysis('Static')
    code=ops.analyze(1)
    if code:raise RuntimeError(f'solver {code}')
    ops.reactions();return code

def patch(kind,E,nu):
    nodes,els=mesh(kind,2,2,2,1,1,1);setup(nodes,els,kind,E,nu)
    G=np.array([[1e-5,2e-5,3e-5],[4e-6,-3e-6,7e-6],[8e-6,9e-6,2e-6]])
    for n,p in nodes.items():
        if any(abs(p[i]-a)<1e-10 for i,ends in enumerate([[0,1],[0,1],[-.5,.5]]) for a in ends):
            for d,v in enumerate(G@p,1):ops.sp(n,d,float(v))
    solve();expected=six(tensor(G,E,nu));actual=np.array([ops.eleResponse(e,'stresses') for e in range(1,len(els)+1)]).reshape(-1,6)
    err=float(np.max(abs(actual-expected))/np.max(abs(expected)))
    if err>1e-8:raise RuntimeError('Affine patch/order failure')
    return {'formulation':kind,'relative_error':err,'expected_stress_kPa':expected.tolist(),'points':len(actual)}

def analytic_checks(b):
    E=b['material']['E_MPa']*1000;nu=b['material']['nu'];err=0.;de=0.;be=0.
    for case in b['cases']:
        for x in [0,.23,.78,1.5]:
            for z in [-.0875,-.043,0,.026,.0875]:
                p=np.array([x,.13,z]);u,s,G=exact(p,case,b);err=max(err,float(np.max(abs(s-six(tensor(G,E,nu))))))
                # Independent central-difference derivatives of displacement and equilibrium.
                h=1e-6;D=np.column_stack([(exact(p+np.eye(3)[i]*h,case,b)[0]-exact(p-np.eye(3)[i]*h,case,b)[0])/(2*h) for i in range(3)])
                de=max(de,float(np.max(abs(D-G))))
                sxp=exact(p+[h,0,0],case,b)[1];sxm=exact(p-[h,0,0],case,b)[1];szp=exact(p+[0,0,h],case,b)[1];szm=exact(p-[0,0,h],case,b)[1]
                be=max(be,abs(float((sxp[0]-sxm[0]+szp[5]-szm[5])/(2*h))),abs(float((sxp[5]-sxm[5]+szp[2]-szm[2])/(2*h))))
    if err>1e-7 or de>1e-9 or be>1e-5:raise RuntimeError('Analytic field check failed')
    return {'constitutive_error_kPa':err,'gradient_error':de,'equilibrium_derivative_kPa_per_m':be}

def resultant(nodes,forces):
    return np.sum([np.r_[f,np.cross(nodes[n],f)] for n,f in forces.items()],axis=0)

def run(kind,case,m,b,mapping='consistent'):
    g=b['geometry'];L,w,t=g['length_m'],g['width_m'],g['thickness_m'];E=b['material']['E_MPa']*1000;nu=b['material']['nu']
    nodes,els=mesh(kind,m['nx'],m['ny'],m['nz'],L,w,t);setup(nodes,els,kind,E,nu)
    loads={n:np.zeros(3) for n in nodes}
    for n,p in nodes.items():
        ops.sp(n,2,0.)
        if p[0]<1e-10:
            u=exact(p,case,b)[0];ops.sp(n,1,float(u[0]));ops.sp(n,3,float(u[2]))
    q1,weights=np.polynomial.legendre.leggauss(3)
    if mapping=='consistent':
        for ns in els:
            p=np.array([nodes[n] for n in ns])
            if abs(p[:,0].max()-L)>1e-10:continue
            for j,qy in enumerate(q1):
                for k,qz in enumerate(q1):
                    N,D=shape([1,qy,qz],kind);xyz=N@p;S=exact(xyz,case,b)[1];traction=np.array([S[0],0,S[5]])
                    area=np.linalg.norm(np.cross(p.T@D[:,1],p.T@D[:,2]))*weights[j]*weights[k]
                    for n,v in zip(ns,N):loads[n]+=v*traction*area
    else:
        end=[n for n,p in nodes.items() if abs(p[0]-L)<1e-10]
        for n in end:loads[n][2]=-b['loads']['V_kN']/len(end)
    for n,f in loads.items():
        if np.max(abs(f))>1e-15:ops.load(n,*f.tolist())
    solve();u={n:np.array(ops.nodeDisp(n)) for n in nodes};reactions={n:np.array(ops.nodeReaction(n)) for n in nodes}
    F=resultant(nodes,loads);R=resultant(nodes,reactions);equil=float(np.max(abs(F+R))/max(np.max(abs(F)),1.))
    expectedF=np.array([0,0,0,0,b['loads']['M_kNm'],0.]) if case=='M' else np.array([0,0,-b['loads']['V_kN'],-w/2*b['loads']['V_kN'],L*b['loads']['V_kN'],0])
    loaderror=float(np.max(abs(F-expectedF)))
    records=[];err2=np.zeros(6);ref2=np.zeros(6);maxerr=np.zeros(6);volume=0;energy=0;reproduce=0;minJ=1.
    for e,ns in enumerate(els,1):
        p=np.array([nodes[n] for n in ns]);disp=np.array([u[n] for n in ns]);sig=np.array(ops.eleResponse(e,'stresses')).reshape(-1,6);points=[]
        for gi,(q,wt) in enumerate(gps(kind)):
            N,D=shape(q,kind);J=p.T@D;det=float(np.linalg.det(J));minJ=min(minJ,det);grad=disp.T@D@np.linalg.inv(J);calc=six(tensor(grad,E,nu));reproduce=max(reproduce,float(np.max(abs(calc-sig[gi]))))
            xyz=N@p;exactS=exact(xyz,case,b)[1];dv=det*wt;diff=sig[gi]-exactS;err2+=diff**2*dv;ref2+=exactS**2*dv;volume+=dv;maxerr=np.maximum(maxerr,abs(diff));energy+=float(np.sum(tensor(grad,E,nu)*grad))*dv/2
            points.append({'xyz_m':xyz.tolist(),'stress_kPa':sig[gi].tolist(),'exact_kPa':exactS.tolist(),'weight_m3':dv})
        records.append({'id':e,'nodes':ns,'gauss':points})
    qa=b['qa_declared_before_solving'];rms_abs=np.sqrt(err2/volume);rms_ref=np.sqrt(ref2/volume);rms=rms_abs/np.maximum(rms_ref,qa['stress_floor_kPa'])
    tip=[n for n,p in nodes.items() if abs(p[0]-L)<1e-10 and abs(p[2])<1e-10];tipuz=float(np.mean([u[n][2] for n in tip]));exacttip=float(exact([L,w/2,0],case,b)[0][2]);tiperr=abs(tipuz/exacttip-1)
    U=exact_energy(case,b);energyerr=abs(energy/U-1);work=sum(float(u[n]@(loads[n]+reactions[n])) for n in nodes)/2
    if minJ<=0 or equil>qa['equilibrium_relative'] or reproduce>qa['gauss_reproduction_kPa'] or loaderror>1e-8 or abs(work-energy)>1e-9:raise RuntimeError('Numerical QA failed')
    ident=f'{kind}-{case}-{m["id"]}-{mapping}'
    summary={'id':ident,'formulation':kind,'case':case,'mesh':m['id'],'nx':m['nx'],'nz':m['nz'],'aspect_x_over_z':(L/m['nx'])/(t/m['nz']),'nodes':len(nodes),'elements':len(els),'mapping':mapping,'solver_exit':0,'total_load_6':F.tolist(),'reaction_6':R.tolist(),'equilibrium_relative':equil,'load_resultant_error':loaderror,'min_jacobian_m3':minJ,'volume_m3':volume,'gauss_reproduction_kPa':reproduce,'energy_kNm':energy,'work_energy_kNm':work,'tip_uz_mm':tipuz*1000,'exact_tip_uz_mm':exacttip*1000,'exact_energy_kNm':U,'tip_error_relative':tiperr if mapping=='consistent' else None,'energy_error_relative':energyerr if mapping=='consistent' else None,'stress_rms_relative':rms.tolist() if mapping=='consistent' else None,'stress_max_error_kPa':maxerr.tolist() if mapping=='consistent' else None,'accuracy_targets_met':bool(mapping=='consistent' and tiperr<=qa['tip_displacement_relative'] and energyerr<=qa['energy_relative'] and max(rms)<=qa['component_rms_relative'])}
    summary['stress_rms_error_kPa']=rms_abs.tolist() if mapping=='consistent' else None
    summary['stress_reference_rms_kPa']=rms_ref.tolist() if mapping=='consistent' else None
    raw={'summary':summary,'stress_order':b['stress_order'],'nodes':{n:p.tolist() for n,p in nodes.items()},'displacements':{n:v.tolist() for n,v in u.items()},'loads':{n:v.tolist() for n,v in loads.items() if max(abs(v))>1e-15},'elements':records}
    write(ident+'.json',raw);print(ident,'tip error',summary['tip_error_relative'],'RMS',summary['stress_rms_relative'],flush=True)
    return summary

def mapping_comparison(kind,m):
    a=read(f'output/tsc-step2f-r00/{kind}-V-{m}-consistent.json');b=read(f'output/tsc-step2f-r00/{kind}-V-{m}-equal_nodes.json');regions=[]
    ap=[p for e in a['elements'] for p in e['gauss']];bp=[p for e in b['elements'] for p in e['gauss']]
    for region,lo,hi in [('near',.9,1),('far',.25,.75)]:
        ds=[];rs=[];weights=[]
        for p,q in zip(ap,bp):
            if lo<=p['xyz_m'][0]/1.5<=hi:
                ds.append(np.array(q['stress_kPa'])-p['stress_kPa']);rs.append(p['stress_kPa']);weights.append(p['weight_m3'])
        d=np.array(ds);r=np.array(rs);weights=np.array(weights);rms=np.sqrt(np.average(d*d,weights=weights,axis=0));ref=np.maximum(np.sqrt(np.average(r*r,weights=weights,axis=0)),10.)
        regions.append({'region':region,'rms_difference_kPa':rms.tolist(),'relative_to_consistent_or_10kPa':(rms/ref).tolist()})
    return {'formulation':kind,'mesh':m,'tip_difference_relative':abs(b['summary']['tip_uz_mm']/a['summary']['tip_uz_mm']-1),'regions':regions}

def main():
    b=read(BP);OUT.mkdir(parents=True,exist_ok=True);checks=analytic_checks(b)
    patchqa=[patch(k,b['material']['E_MPa']*1000,b['material']['nu']) for k in b['formulations']];runs=[]
    for kind in b['formulations']:
        for case in b['cases']:
            for m in b['meshes']:runs.append(run(kind,case,m,b))
        for m in b['meshes']:
            if m['id'] in b['load_sensitivity']['meshes']:runs.append(run(kind,'V',m,b,'equal_nodes'))
    pairs=[mapping_comparison(k,m) for k in b['formulations'] for m in b['load_sensitivity']['meshes']]
    dependencies=[BP,'tools/tsc-study/benchmark_study.py',b['context'],'output/tsc-step2b-r00/shell_results.json']
    report={'id':b['id'],'revision':b['revision'],'status':'COUPON_BENCHMARK_NOT_FOR_DESIGN','basis':b,'solver':{'name':'OpenSees','version':ops.version(),'system':'SuperLU / Plain','dll_sha256':sha('.local-engineering-runtime/openseespywin/opensees.pyd')},'analytic_checks':checks,'patch_checks':patchqa,'runs':runs,'mapping_comparisons':pairs,'dependency_hashes':{p:sha(p) for p in dependencies},'raw_output_hashes':{f'output/tsc-step2f-r00/{r["id"]}.json':sha(f'output/tsc-step2f-r00/{r["id"]}.json') for r in runs},'whole_model_local_stress_convergence':'NOT_ESTABLISHED','engineering_approval':False,'manufacturing_release':False}
    write('benchmark_results.json',report);print('FINISHED',len(runs),'runs',flush=True)

if __name__=='__main__':main()
