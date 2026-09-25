"""S2G: quadratic curved coupons, independently derived Airy/displacement reference."""
import json,math
import numpy as np
from benchmark_study import ROOT,ops,sha,shape,gps,CORNERS,N20,tensor,six,setup,solve,resultant,patch
OUT=ROOT/'output/tsc-step2g-r00';BP='knowledge/modular-tsc-step2g/basis.json'
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def write(p,v):(OUT/p).write_text(json.dumps(v,separators=(',',':'),allow_nan=False),encoding='utf-8')

def reference(t,nu,b):
    R=b['geometry']['outer_radius_m'];a=R-t;rm=R-t/2;E=b['material']['E_MPa']*1000;m=b['moment_per_width_kNm_m']
    # Analytic antiderivative for end moment, independent of S2C quadrature fit.
    rows=[[1/a**2,2*math.log(a)+1,2],[1/R**2,2*math.log(R)+1,2],[-math.log(R/a),R*R*(math.log(R)+1)-a*a*(math.log(a)+1),R*R-a*a]]
    A,B,C=np.linalg.solve(rows,[0,0,m]);alpha=(1-nu*nu)/E;beta=nu*(1+nu)/E;K=4*alpha*B
    def stress(r):return A/r**2+B*(2*np.log(r)+1)+2*C,-A/r**2+B*(2*np.log(r)+3)+2*C
    def radial(r):sr,st=stress(r);return r*(alpha*st-beta*sr-K)
    datum=float(radial(rm))
    def exact(p):
        x,y,z=p;r=math.hypot(x,z);th=math.atan2(z,x);er=np.array([x/r,0,z/r]);et=np.array([-z/r,0,x/r]);sr,st=stress(r);sy=nu*(sr+st)
        T=sr*np.outer(er,er)+st*np.outer(et,et)+sy*np.diag([0,1,0]);u=radial(r)*er+K*r*th*et-np.array([datum,0,0])
        return u,T,np.array([st,sr,sy,0,0,0])
    q,w=np.polynomial.legendre.leggauss(96);r=a+(q+1)*t/2;w=w*t/2;sr,st=stress(r)
    width=b['geometry']['width_m'];angle=math.radians(b['geometry']['angle_deg'])
    energy=float(width*angle*np.dot(w*r,(1-nu**2)*(sr*sr+st*st)-2*nu*(1+nu)*sr*st)/(2*E))
    checks={'radial_face_kPa':max(abs(float(stress(a)[0])),abs(float(stress(R)[0]))),'axial_force_per_width_kN_m':float(w@st),'moment_per_width_kNm_m':float((w*r)@st)}
    # Cartesian finite differences independently verify derived displacement/stress compatibility and divergence.
    ce=0.;div=0.
    for f in [.1,.35,.7,.9]:
        for th in [.2,.7,1.3]:
            p=np.array([(a+t*f)*math.cos(th),.75,(a+t*f)*math.sin(th)]);h=1e-6
            D=np.column_stack([(exact(p+np.eye(3)[i]*h)[0]-exact(p-np.eye(3)[i]*h)[0])/(2*h) for i in range(3)])
            ce=max(ce,float(np.max(abs(tensor(D,E,nu)-exact(p)[1]))))
            dv=sum((exact(p+np.eye(3)[i]*h)[1][:,i]-exact(p-np.eye(3)[i]*h)[1][:,i])/(2*h) for i in range(3))
            div=max(div,float(np.max(abs(dv))))
    checks.update({'constitutive_fd_error_kPa':ce,'divergence_fd_kPa_m':div,'energy_kNm':energy})
    if checks['radial_face_kPa']>1e-8 or abs(checks['axial_force_per_width_kN_m'])>1e-8 or abs(checks['moment_per_width_kNm_m']-m)>1e-8 or ce>1e-4 or div>1e-4:raise RuntimeError('Reference verification failed')
    return exact,stress,[float(A),float(B),float(C)],energy,checks

def geometry(t,m,model,b):
    R=b['geometry']['outer_radius_m'];a=R-t;width=b['geometry']['width_m'];angle=math.radians(b['geometry']['angle_deg'])
    na,nr,ny=m['arc'],m['radial'],m['width'];local=CORNERS if model['element']=='stdBrick' else N20
    nodes={};grid={};els=[];logical={}
    for i in range(na):
        for k in range(nr):
            for j in range(ny):
                ids=[]
                for q in local:
                    key=tuple((np.array([2*i,2*k,2*j])+q+1).astype(int))
                    if key not in grid:
                        th=angle*key[0]/(2*na);r=a+t*key[1]/(2*nr)
                        if model['geometry']=='CHORD' and key[0]%2:r*=math.cos(angle/(2*na))
                        n=len(nodes)+1;grid[key]=n;logical[n]=key;nodes[n]=np.array([r*math.cos(th),width*key[2]/(2*ny),r*math.sin(th)])
                    ids.append(grid[key])
                els.append({'nodes':ids,'indices':[i,k,j]})
    return nodes,els,logical

def local(T,p):
    r=math.hypot(p[0],p[2]);er=np.array([p[0]/r,0,p[2]/r]);et=np.array([-er[2],0,er[0]]);ey=np.array([0,1,0])
    return np.array([et@T@et,er@T@er,T[1,1],er@T@et,er@T@ey,et@T@ey])

def inverse(p,xyz,kind):
    q=np.zeros(3)
    for _ in range(15):
        N,D=shape(q,kind);delta=N@p-xyz
        if max(abs(delta))<1e-12:break
        q-=np.linalg.solve(p.T@D,delta)
    return q,float(max(abs(shape(q,kind)[0]@p-xyz)))

def run(t,nu,m,model,b):
    kind=model['element'];R=b['geometry']['outer_radius_m'];a=R-t;W=b['geometry']['width_m'];ang=math.radians(b['geometry']['angle_deg']);E=b['material']['E_MPa']*1000;moment=b['moment_per_width_kNm_m'];qa=b['qa_declared_before_solving']
    exact,stress,coef,Uexact,checks=reference(t,nu,b);nodes,els,logical=geometry(t,m,model,b);setup(nodes,[e['nodes'] for e in els],kind,E,nu)
    loads={n:np.zeros(3) for n in nodes}
    for n,key in logical.items():
        ops.sp(n,2,0.)
        if key[0]==0:ops.sp(n,3,0.)
        if key==(0,m['radial'],m['width']):ops.sp(n,1,0.)
    qr,wr=np.polynomial.legendre.leggauss(b['load_integration']['radial_gauss']);qy,wy=np.polynomial.legendre.leggauss(b['load_integration']['width_gauss'])
    et=np.array([-math.sin(ang),0,math.cos(ang)])
    for e in els:
        if e['indices'][0]!=m['arc']-1:continue
        p=np.array([nodes[n] for n in e['nodes']])
        for k,q in enumerate(qr):
            for j,z in enumerate(qy):
                N,D=shape([1,q,z],kind);xyz=N@p;area=np.linalg.norm(np.cross(p.T@D[:,1],p.T@D[:,2]))*wr[k]*wy[j];traction=et*stress(math.hypot(xyz[0],xyz[2]))[1]
                for n,v in zip(e['nodes'],N):loads[n]+=area*v*traction
    for n,f in loads.items():
        if max(abs(f))>1e-15:ops.load(n,*f.tolist())
    solve();disp={n:np.array(ops.nodeDisp(n)) for n in nodes};react={n:np.array(ops.nodeReaction(n)) for n in nodes};F=resultant(nodes,loads);RF=resultant(nodes,react)
    equiv=float(max(abs(F+RF))/max(moment*W,1));loaderr=float(max(abs(F-np.array([0,0,0,0,-moment*W,0]))));work=sum(float(loads[n]@disp[n]) for n in nodes)/2
    err2=np.zeros(6);ref2=np.zeros(6);vol=0.;energy=0.;minJ=1.;rep=0.;radialgap=0.;rawels=[]
    for ei,e in enumerate(els,1):
        p=np.array([nodes[n] for n in e['nodes']]);u=np.array([disp[n] for n in e['nodes']]);recorded=np.array(ops.eleResponse(ei,'stresses')).reshape(-1,6);gauss=[]
        for gi,(q,w) in enumerate(gps(kind)):
            N,D=shape(q,kind);J=p.T@D;det=float(np.linalg.det(J));minJ=min(minJ,det);xyz=N@p;G=u.T@D@np.linalg.inv(J);T=tensor(G,E,nu);v=local(T,xyz);ref=exact(xyz)[2];dv=det*w
            rep=max(rep,float(max(abs(six(T)-recorded[gi]))));vol+=dv;energy+=float(np.sum(T*G))*dv/2;err2+=(v-ref)**2*dv;ref2+=ref**2*dv
            gauss.append({'xyz_m':xyz.tolist(),'local_kPa':v.tolist(),'exact_kPa':ref.tolist(),'weight_m3':dv})
        for q in [-1,-.5,0,.5,1]:
            for rad,expect in [(-1,a),(1,R)]:
                if (rad==-1 and e['indices'][1]!=0) or (rad==1 and e['indices'][1]!=m['radial']-1):continue
                xyz=shape([q,rad,0],kind)[0]@p;radialgap=max(radialgap,abs(math.hypot(xyz[0],xyz[2])-expect))
        rawels.append({'id':ei,**e,'gauss':gauss})
    pa=np.array([[nodes[n] for n in e['nodes']] for e in els]);ua=np.array([[disp[n] for n in e['nodes']] for e in els]);samples=[];maxinverse=0
    # Bounding boxes of curved isoparametric nodes plus small padding; acceptance is inverse-map based.
    lo=pa.min(axis=1)-.001;hi=pa.max(axis=1)+.001
    for thdeg in b['sample_grid']['theta_deg']:
        th=math.radians(thdeg)
        for y in b['sample_grid']['y_m']:
            for f in b['sample_grid']['fraction_from_inner']:
                r=a+f*t;xyz=np.array([r*math.cos(th),y,r*math.sin(th)]);sides=[];us=[]
                for i in np.flatnonzero(np.all(xyz>=lo,axis=1)&np.all(xyz<=hi,axis=1)):
                    q,res=inverse(pa[i],xyz,kind)
                    if max(abs(q))>1+1e-8:continue
                    if res>qa['inverse_residual_m']:raise RuntimeError('inverse mapping failed')
                    maxinverse=max(maxinverse,res);N,D=shape(q,kind);G=ua[i].T@D@np.linalg.inv(pa[i].T@D);v=local(tensor(G,E,nu),xyz);sides.append({'element':int(i)+1,'natural':q.tolist(),'local_kPa':v.tolist()});us.append(N@ua[i])
                if not sides:raise RuntimeError('No element for common point')
                vs=np.array([s['local_kPa'] for s in sides]);ue,_,se=exact(xyz)
                samples.append({'key':f'A{thdeg}/Y{y}/F{f}','theta_deg':thdeg,'y_m':y,'fraction':f,'xyz_m':xyz.tolist(),'mean_kPa':vs.mean(axis=0).tolist(),'min_kPa':vs.min(axis=0).tolist(),'max_kPa':vs.max(axis=0).tolist(),'exact_kPa':se.tolist(),'displacement_m':np.mean(us,axis=0).tolist(),'exact_displacement_m':ue.tolist(),'sides':sides})
    val=np.array([s['mean_kPa'] for s in samples]);ref=np.array([s['exact_kPa'] for s in samples]);spread=np.array([s['max_kPa'] for s in samples])-np.array([s['min_kPa'] for s in samples]);floor=qa['stress_floor_kPa'];den=np.maximum(abs(ref),floor)
    fixedrms=np.sqrt(np.mean((val-ref)**2,axis=0))/np.maximum(np.sqrt(np.mean(ref**2,axis=0)),floor);point=np.max(abs(val-ref)/den,axis=0);spreadrel=np.max(spread/den,axis=0)
    ud=np.array([s['displacement_m'] for s in samples]);ue=np.array([s['exact_displacement_m'] for s in samples]);uerr=float(np.max(np.linalg.norm(ud-ue,axis=1))/np.max(np.linalg.norm(ue,axis=1)))
    rms_abs=np.sqrt(err2/vol);rms=rms_abs/np.maximum(np.sqrt(ref2/vol),floor);exactvol=W*ang*(R*R-a*a)/2;verr=abs(vol/exactvol-1);eerr=abs(energy/Uexact-1)
    if equiv>qa['equilibrium_relative'] or loaderr>qa['load_resultant_error'] or minJ<=0 or rep>qa['stress_reproduction_kPa'] or abs(work-energy)>1e-9:raise RuntimeError('Basic FE QA failed')
    met=bool(eerr<=qa['energy_exact_relative'] and uerr<=qa['sample_displacement_relative'] and verr<=qa['relative_volume_error'] and max(rms)<=qa['gauss_component_rms_relative'] and max(fixedrms)<=qa['fixed_component_rms_relative'] and max(point)<=qa['fixed_max_point_relative'] and max(spreadrel)<=qa['fixed_one_sided_spread_relative'])
    ident=f'{model["id"]}-T{round(t*1000)}-NU{round(nu*100):02d}-{m["id"]}'
    summary={'id':ident,'model':model['id'],'element':kind,'t_m':t,'nu':nu,'mesh':m['id'],'elements':len(els),'nodes':len(nodes),'solver_exit':0,'equilibrium_relative':equiv,'load_resultant_error':loaderr,'applied_6':F.tolist(),'reaction_6':RF.tolist(),'min_jacobian_m3':minJ,'volume_m3':vol,'exact_volume_m3':exactvol,'volume_error_relative':verr,'sampled_radial_geometry_error_mm':radialgap*1000,'stress_reproduction_kPa':rep,'energy_kNm':energy,'work_energy_kNm':work,'exact_energy_kNm':Uexact,'energy_error_relative':eerr,'sample_displacement_error_relative':uerr,'gauss_rms_relative':rms.tolist(),'gauss_rms_error_kPa':rms_abs.tolist(),'fixed_rms_relative':fixedrms.tolist(),'fixed_max_point_relative':point.tolist(),'fixed_spread_relative':spreadrel.tolist(),'sample_count':len(samples),'max_inverse_residual_m':maxinverse,'accuracy_targets_met':met,'reference_checks':checks,'airy_coefficients':coef}
    write(ident+'.json',{'summary':summary,'stress_order':b['stress_order'],'nodes':{n:p.tolist() for n,p in nodes.items()},'displacements':{n:u.tolist() for n,u in disp.items()},'loads':{n:f.tolist() for n,f in loads.items() if max(abs(f))>1e-15},'elements':rawels,'samples':samples})
    print(ident,'energy%',round(eerr*100,5),'max point%',round(max(point)*100,3),'spread%',round(max(spreadrel)*100,3),'met',met,flush=True)
    return summary

def main():
    b=read(BP);OUT.mkdir(parents=True,exist_ok=True);prior=read('output/tsc-step2f-r00/benchmark_results.json')
    for p,h in prior['dependency_hashes'].items():
        if sha(p)!=h:raise RuntimeError('Stale S2F source '+p)
    if ops.version()!=prior['solver']['version'] or sha('.local-engineering-runtime/openseespywin/opensees.pyd')!=prior['solver']['dll_sha256']:raise RuntimeError('Solver changed')
    patches=[patch(k,b['material']['E_MPa']*1000,b['material']['nu']) for k in ['stdBrick','20NodeBrick']];runs=[]
    for t in b['geometry']['thicknesses_m']:
        for model in b['models']:
            for m in b['meshes']:runs.append(run(t,b['material']['nu'],m,model,b))
    for m in b['meshes']:runs.append(run(b['nu_zero_control']['t_m'],0.,m,b['models'][2],b))
    groups=[];profiles=[]
    for t,nu in [(t,b['material']['nu']) for t in b['geometry']['thicknesses_m']]+[(b['nu_zero_control']['t_m'],0.)]:
        for model in b['models']:
            selected=[r for r in runs if r['t_m']==t and r['nu']==nu and r['model']==model['id']]
            if not selected:continue
            a,c=selected[-2:];change=abs(c['energy_kNm']/a['energy_kNm']-1)
            groups.append({'model':model['id'],'t_m':t,'nu':nu,'last_pair':['G2','G3'],'energy_change':change,'finest_run':c['id'],'all_targets_met':c['accuracy_targets_met'] and change<=b['qa_declared_before_solving']['last_pair_energy_change']})
            raw=read(f'output/tsc-step2g-r00/{c["id"]}.json');profiles.append({'id':c['id'],'model':model['id'],'t_m':t,'nu':nu,'points':[{k:v for k,v in s.items() if k!='sides'} for s in raw['samples'] if s['theta_deg']==45 and s['y_m']==.75]})
    deps=[BP,'tools/tsc-study/curved_study.py','tools/tsc-study/benchmark_study.py','knowledge/modular-tsc-step2f/basis.json','output/tsc-step2f-r00/benchmark_results.json','knowledge/modular-tsc-step2c/basis.json','output/tsc-step2c-r00/diagnostic_results.json']
    report={'id':b['id'],'revision':b['revision'],'status':'CURVED_COUPON_BENCHMARK_NOT_FOR_DESIGN','basis':b,'solver':prior['solver'],'patch_checks':patches,'runs':runs,'comparisons':groups,'profiles':profiles,'dependency_hashes':{p:sha(p) for p in deps},'raw_output_hashes':{f'output/tsc-step2g-r00/{r["id"]}.json':sha(f'output/tsc-step2g-r00/{r["id"]}.json') for r in runs},'full_bay_quadratic_validation':'NOT_RUN','whole_model_local_stress_convergence':'NOT_ESTABLISHED','engineering_approval':False,'manufacturing_release':False}
    write('curved_results.json',report);print('FINISHED',len(runs),'runs;',sum(c['all_targets_met'] for c in groups),'/',len(groups),'groups met',flush=True)

if __name__=='__main__':main()
