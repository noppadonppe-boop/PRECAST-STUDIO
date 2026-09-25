"""S2J exact gravity-loaded plane-strain coupon; never a module design."""
import json,math
import numpy as np
from benchmark_study import ROOT,ops,sha,N20,shape,gps,mesh,setup,solve,patch,tensor,six
from traction_audit import integrate

BP='knowledge/modular-tsc-step2j/basis.json';OUT=ROOT/'output/tsc-step2j-r00';KIND='20NodeBrick'
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def write(p,v):(OUT/p).write_text(json.dumps(v,separators=(',',':'),allow_nan=False),encoding='utf-8')
def params(b,nu):
    g=b['geometry'];m=b['material'];a=g['length_m']/2;c=g['thickness_m']/2;gamma=m['density_kg_m3']*m['gravity_m_s2']/1000;K=3*gamma/(2*c*c);E=m['E_MPa']*1000
    return a,c,gamma,K,(1-nu*nu)/E,nu*(1+nu)/E,(1+nu)/E
def exact(p,b,nu):
    x,y,z=p;a,c,gamma,K,A,B,C=params(b,nu);H=A*a*a+c*c*(2*C-2*A/5-B/3)
    ux=K*x*z*(A*(x*x/3-a*a+2*c*c/5-2*z*z/3)-B*(z*z-c*c)/3)
    uz=K*(A*(z**4/12-c*c*z*z/6)-B*((x*x-a*a+2*c*c/5)*z*z/2-z**4/6)+H*(x*x-a*a)/2-A*(x**4-a**4)/12)
    sx=K*z*(x*x-a*a+2*c*c/5-2*z*z/3);sz=K*(z**3-c*c*z)/3;tau=K*x*(c*c-z*z);sy=nu*(sx+sz)
    uzx=K*x*(-B*z*z+H-A*x*x/3);G=np.array([[A*sx-B*sz,0,2*C*tau-uzx],[0,0,0],[uzx,0,A*sz-B*sx]])
    return np.array([ux,0,uz]),np.array([sx,sy,sz,0,0,tau]),G
def exact_cut(x,b):
    g=b['geometry'];q=b['material']['density_kg_m3']*b['material']['gravity_m_s2']/1000*g['width_m']*g['thickness_m'];a=g['length_m']/2
    return np.array([0,0,q*x,0,q*(x*x-a*a)/2,0])
def result(nodes,forces,origin=None):
    origin=np.zeros(3) if origin is None else np.array(origin)
    return np.sum([np.r_[f,np.cross(np.array(nodes[n])-origin,f)] for n,f in forces.items()],axis=0)
def exact_energy(b,nu):
    a,c,*_=params(b,nu);w=b['geometry']['width_m'];qq,ww=np.polynomial.legendre.leggauss(6);U=0.
    for x,wx in zip(qq,ww):
        for z,wz in zip(qq,ww):
            _,s,G=exact([a*x,w/2,c*z],b,nu);U+=(s[0]*G[0,0]+s[2]*G[2,2]+s[5]*(G[0,2]+G[2,0]))*a*c*w*wx*wz/2
    return U
def analytic_check(b,nu):
    a,c,gamma,*_=params(b,nu);E=b['material']['E_MPa']*1000;maximum={'gradient':0.,'constitutive_kPa':0.,'equilibrium_kPa_m':0.,'free_surface_kPa':0.,'cut_resultant':0.}
    for x in [-a,-a*.63,0,a*.21,a]:
        for z in [-c,-.3*c,0,.71*c,c]:
            p=np.array([x,.125,z]);u,s,G=exact(p,b,nu);h=1e-6
            D=np.column_stack([(exact(p+np.eye(3)[i]*h,b,nu)[0]-exact(p-np.eye(3)[i]*h,b,nu)[0])/(2*h) for i in range(3)])
            maximum['gradient']=max(maximum['gradient'],float(np.max(abs(D-G))))
            maximum['constitutive_kPa']=max(maximum['constitutive_kPa'],float(np.max(abs(s-six(tensor(G,E,nu))))))
            dx=(exact(p+[h,0,0],b,nu)[1]-exact(p-[h,0,0],b,nu)[1])/(2*h);dz=(exact(p+[0,0,h],b,nu)[1]-exact(p-[0,0,h],b,nu)[1])/(2*h)
            maximum['equilibrium_kPa_m']=max(maximum['equilibrium_kPa_m'],abs(float(dx[0]+dz[5])),abs(float(dx[5]+dz[2]-gamma)))
            if abs(abs(z)-c)<1e-10:maximum['free_surface_kPa']=max(maximum['free_surface_kPa'],abs(float(s[2])),abs(float(s[5])))
        qq,ww=np.polynomial.legendre.leggauss(6);F=np.zeros(6)
        for z,wz in zip(qq,ww):
            s=exact([x,.125,z*c],b,nu)[1];F+=np.array([s[0],0,s[5],0,z*c*s[0],0])*c*b['geometry']['width_m']*wz
        maximum['cut_resultant']=max(maximum['cut_resultant'],float(np.max(abs(F-exact_cut(x,b)))))
    if maximum['gradient']>1e-9 or maximum['constitutive_kPa']>1e-7 or maximum['equilibrium_kPa_m']>1e-5 or maximum['free_surface_kPa']>1e-10 or maximum['cut_resultant']>1e-10:raise RuntimeError('Analytic reference failed '+str(maximum))
    return {'nu':nu,**maximum,'exact_energy_kNm':exact_energy(b,nu)}
def run(b,m,nu):
    g=b['geometry'];L,w,t=g['length_m'],g['width_m'],g['thickness_m'];E=b['material']['E_MPa']*1000;gamma=b['material']['density_kg_m3']*b['material']['gravity_m_s2']/1000;qa=b['qa_declared_before_solving'];nx,ny,nz=m['nx'],m['ny'],m['nz']
    nodes,conn=mesh(KIND,nx,ny,nz,L,w,t);nodes={n:p-[L/2,0,0] for n,p in nodes.items()};setup(nodes,conn,KIND,E,nu);datum=[]
    for n,p in nodes.items():
        ops.sp(n,2,0.)
        if abs(p[1]-w/2)<1e-10 and abs(p[2])<1e-10:
            if abs(p[0])<1e-10:ops.sp(n,1,0.);datum.append({'node':n,'dof':1})
            if abs(abs(p[0])-L/2)<1e-10:ops.sp(n,3,0.);datum.append({'node':n,'dof':3})
    if len(datum)!=3:raise RuntimeError('Datum mapping')
    loads={n:np.zeros(3) for n in nodes};body={n:np.zeros(3) for n in nodes};ends={n:np.zeros(3) for n in nodes};els=[];volume=0.;minJ=1.;qq,ww=np.polynomial.legendre.leggauss(3)
    for ei,ns in enumerate(conn):
        i=ei//(ny*nz);j=(ei//nz)%ny;k=ei%nz;p=np.array([nodes[n] for n in ns]);ef=np.zeros((20,3));bf=np.zeros((20,3));sf=np.zeros((20,3))
        for q,wt in gps(KIND):
            N,D=shape(q,KIND);det=float(np.linalg.det(p.T@D));minJ=min(minJ,det);dv=det*wt;volume+=dv;bf[:,2]-=gamma*N*dv
        if i in (0,nx-1):
            sign=-1 if i==0 else 1
            for v,wv in zip(qq,ww):
                for z,wz in zip(qq,ww):
                    N,D=shape([sign,v,z],KIND);J=p.T@D;s=exact(N@p,b,nu)[1];area=np.linalg.norm(np.cross(J[:,1],J[:,2]))*wv*wz;sf+=N[:,None]*np.array([s[0],0,s[5]])*sign*area
        ef=bf+sf
        for n,f,bb,ss in zip(ns,ef,bf,sf):loads[n]+=f;body[n]+=bb;ends[n]+=ss
        els.append({'id':ei+1,'nodes':ns,'indices':[i,j,k],'loads':ef.tolist(),'body_loads':bf.tolist(),'end_loads':sf.tolist()})
    for n,f in loads.items():ops.load(n,*f.tolist())
    solve();u={n:np.array(ops.nodeDisp(n)) for n in nodes};R={n:np.array(ops.nodeReaction(n)) for n in nodes};err=np.zeros(6);ref=np.zeros(6);energy=0.;repro=0.
    for e in els:
        ns=e['nodes'];p=np.array([nodes[n] for n in ns]);uu=np.array([u[n] for n in ns]);sig=np.array(ops.eleResponse(e['id'],'stresses')).reshape(27,6);gauss=[]
        for gi,(q,wt) in enumerate(gps(KIND)):
            N,D=shape(q,KIND);J=p.T@D;G=uu.T@D@np.linalg.inv(J);calc=six(tensor(G,E,nu));repro=max(repro,float(np.max(abs(calc-sig[gi]))));xyz=N@p;ex=exact(xyz,b,nu)[1];dv=float(np.linalg.det(J))*wt;err+=(calc-ex)**2*dv;ref+=ex**2*dv;energy+=float(np.sum(tensor(G,E,nu)*G))*dv/2
            gauss.append({'xyz_m':xyz.tolist(),'stress_kPa':sig[gi].tolist(),'exact_kPa':ex.tolist(),'weight_m3':dv})
        e['gauss']=gauss;e['forces']=np.array(ops.eleForce(e['id'])).reshape(20,3).tolist()
    ident=f'GRAVITY-NU{round(nu*100):02d}-{m["id"]}';raw={'id':ident,'nodes':{str(n):p.tolist() for n,p in nodes.items()},'displacements':{str(n):v.tolist() for n,v in u.items()},'loads':{str(n):v.tolist() for n,v in loads.items()},'body_loads':{str(n):v.tolist() for n,v in body.items()},'end_loads':{str(n):v.tolist() for n,v in ends.items()},'reactions':{str(n):v.tolist() for n,v in R.items()},'elements':els,'datum':datum};cuts=[]
    for fraction in b['sections_x_over_L']:
        idx=round((fraction+.5)*nx);x=fraction*L;origin=np.array([x,w/2,0]);c={'id':f'X{fraction:+.2f}L','station_row':idx,'origin_m':origin.tolist()};ex=exact_cut(x,b);den=np.maximum(abs(ex),.1);traces={};nodals={}
        for side,sign in [('lower',1),('upper',-1)]:
            ff={};row=idx-1 if side=='lower' else idx
            for e in els:
                if e['indices'][0]!=row:continue
                for n,q,f,load in zip(e['nodes'],N20,e['forces'],e['loads']):
                    if q[0]==sign:ff[n]=ff.get(n,np.zeros(3))+np.array(f)-load
            nodals[side]=result(nodes,ff,origin);v4=integrate(raw,c,side,4,E,nu);v6=integrate(raw,c,side,6,E,nu);val=np.array(v6['resultant_6']);traces[side]={'order4':v4,'order6':v6,'exact_6':(sign*ex).tolist(),'error_vs_exact_6':(val-sign*ex).tolist(),'relative_vs_exact_6':(abs(val-sign*ex)/den).tolist(),'relative_vs_nodal_6':(abs(val-nodals[side])/np.maximum(abs(nodals[side]),.1)).tolist(),'quadrature_change_6':(abs(val-v4['resultant_6'])/den).tolist()}
        pair=np.array(traces['lower']['order6']['resultant_6'])+traces['upper']['order6']['resultant_6'];pairrel=abs(pair)/den
        # Exact external action on left subbody: end traction and volume force (Y reactions sum to zero).
        ext=-ex;fbd=nodals['lower']+ext
        passed=all(max(v['relative_vs_exact_6'])<=qa['traction_relative'] and max(v['relative_vs_nodal_6'])<=qa['traction_relative'] and max(v['quadrature_change_6'])<=qa['quadrature_relative'] for v in traces.values()) and max(pairrel)<=qa['traction_pair_relative']
        cuts.append({**c,'exact_lower_6':ex.tolist(),'nodal_lower_6':nodals['lower'].tolist(),'nodal_upper_6':nodals['upper'].tolist(),'nodal_exact_error':float(np.max(abs(nodals['lower']-ex))),'nodal_pair_error':float(np.max(abs(nodals['lower']+nodals['upper']))),'fbd_residual_6':fbd.tolist(),'traces':traces,'trace_pair_sum_6':pair.tolist(),'trace_pair_relative_6':pairrel.tolist(),'targets_met':bool(passed)})
    exactU=exact_energy(b,nu);work=sum(float(u[n]@(loads[n]+R[n])) for n in nodes)/2;F=result(nodes,loads);RF=result(nodes,R);scale=gamma*L*w*t;equil=float(np.max(abs(F+RF))/scale);rmsabs=np.sqrt(err/volume);rms=rmsabs/np.maximum(np.sqrt(ref/volume),qa['stress_floor_kPa']);mid=next(n for n,p in nodes.items() if np.linalg.norm(p-[0,w/2,0])<1e-10);miduz=float(u[mid][2]);exuz=float(exact([0,w/2,0],b,nu)[0][2]);ue=abs(miduz/exuz-1);enerr=abs(energy/exactU-1)
    if minJ<=0 or equiv_bad(equil,repro,work,energy,cuts,qa) or abs(volume-L*w*t)>1e-10:raise RuntimeError('Numerical QA failed')
    summary={'id':ident,'mesh':m['id'],'nu':nu,'nx':nx,'ny':ny,'nz':nz,'elements':len(els),'nodes':len(nodes),'body_resultant_6':result(nodes,body).tolist(),'end_resultant_6':result(nodes,ends).tolist(),'total_load_6':F.tolist(),'reaction_6':RF.tolist(),'equilibrium_relative':equil,'min_jacobian_m3':minJ,'volume_m3':volume,'mid_uz_mm':miduz*1000,'exact_mid_uz_mm':exuz*1000,'displacement_error_relative':ue,'energy_kNm':energy,'exact_energy_kNm':exactU,'work_energy_kNm':work,'energy_error_relative':enerr,'stress_rms_error_kPa':rmsabs.tolist(),'stress_rms_relative':rms.tolist(),'gauss_reproduction_kPa':repro,'gauss_points_checked':27*len(els),'cuts':cuts,'all_cut_targets_met':all(c['targets_met'] for c in cuts),'accuracy_targets_met':bool(ue<=qa['displacement_relative'] and enerr<=qa['energy_relative'] and max(rms)<=qa['component_rms_relative'] and all(c['targets_met'] for c in cuts))}
    raw['summary']=summary;write(ident+'.json',raw);print(ident,'cuts',sum(c['targets_met'] for c in cuts),'center trace',cuts[1]['traces']['lower']['order6']['resultant_6'][2],'accuracy',summary['accuracy_targets_met'],flush=True);return summary
def equiv_bad(eq,rep,work,energy,cuts,qa):return eq>qa['equilibrium_relative'] or rep>qa['gauss_reproduction_kPa'] or abs(work-energy)>1e-9 or max(c['nodal_exact_error'] for c in cuts)>1e-7 or max(c['nodal_pair_error'] for c in cuts)>1e-7
def main():
    b=read(BP);OUT.mkdir(parents=True,exist_ok=True);up=read(b['context']);deps={**up['dependency_hashes'],**up['raw_output_hashes']}
    for p,h in deps.items():
        if sha(p)!=h:raise RuntimeError('Stale upstream '+p)
    old=read('output/tsc-step2i-r00/local_mesh_results.json')['solver']
    if ops.version()!=old['version'] or sha('.local-engineering-runtime/openseespywin/opensees.pyd')!=old['dll_sha256']:raise RuntimeError('Runtime changed')
    for p in [BP,b['context'],'tools/tsc-study/gravity_coupon.py','tools/tsc-study/traction_audit.py','tools/tsc-study/benchmark_study.py']:deps[p]=sha(p)
    analytic=[analytic_check(b,nu) for nu in [b['material']['nu'],0.]];patches=[patch(KIND,b['material']['E_MPa']*1000,nu) for nu in [b['material']['nu'],0.]];runs=[]
    for nu in [b['material']['nu'],0.]:
        for m in b['meshes']:
            if nu!=0 or m['id'] in b['nu_zero_controls']:runs.append(run(b,m,nu))
    report={'id':b['id'],'revision':b['revision'],'status':'GRAVITY_COUPON_TRACTION_BENCHMARK_NOT_FOR_DESIGN','basis':b,'solver':old,'analytic_checks':analytic,'patch_checks':patches,'runs':runs,'dependency_hashes':deps,'raw_output_hashes':{f'output/tsc-step2j-r00/{v["id"]}.json':sha(f'output/tsc-step2j-r00/{v["id"]}.json') for v in runs},'whole_model_local_stress_convergence':'NOT_ESTABLISHED','engineering_approval':False,'manufacturing_release':False}
    write('gravity_coupon_results.json',report);print('FINISHED',len(runs),'runs',flush=True)
if __name__=='__main__':main()
