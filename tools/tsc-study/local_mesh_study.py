"""S2I directional graded meshes. Old solvers/results remain immutable."""
import json,math,argparse
import numpy as np
from benchmark_study import ROOT,ops,sha,N20,shape,gps,patch,solve
from quadratic_bay_study import sample
from bay_study import cuts,resultant,error,physical_force
from stress_study import tensor_from_grad,compare

OUT=ROOT/'output/tsc-step2i-r00';BP='knowledge/modular-tsc-step2i/basis.json';KIND='20NodeBrick'
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def write(p,v):(OUT/p).write_text(json.dumps(v,separators=(',',':'),allow_nan=False),encoding='utf-8')

def split_knots(knots,factors):
    out=[float(knots[0])]
    for i,(a,b) in enumerate(zip(knots,knots[1:])):out.extend(float(v) for v in np.linspace(a,b,factors.get(i,1)+1)[1:])
    return out

def build(g,t,m,reference):
    B,H,R,L=g['width_m'],g['overall_height_m'],g['outer_shoulder_radius_m'],g['bay_length_m']
    nw=math.ceil((H-R-t)/reference['target_m']);nf=math.ceil((B/2-R)/reference['target_m']);na=reference['arc_divisions'];ny=2*math.ceil(L/reference['target_m']/2);nr=reference['through_thickness']
    wall=split_knots(np.linspace(t,H-R,nw+1),{i:4 for i in range(3)} if m['base_refine'] else {})
    yy=split_knots(np.linspace(0,L,ny+1),{0:4,1:2,ny-2:2,ny-1:4} if m['edge_refine'] else {});ny=len(yy)-1
    arc=np.linspace(0,math.pi/2,na+1);roof=np.linspace(R,B/2,nf+1);cells=[]
    for region,knots in [('wall',wall),('shoulder',arc),('roof',roof)]:
        for a,b in zip(knots,knots[1:]):cells.append({'region':region,'a':float(a),'b':float(b)})
    nh=len(cells);nodes={};grid={};logical={};els=[]
    def xz(h,f):
        ci=min(int(h),nh-1);c=cells[ci];v=c['a']+(c['b']-c['a'])*(h-ci)
        if c['region']=='wall':return t*(1-f),v
        if c['region']=='roof':return v,H-t+t*f
        rad=R-t+t*f;return R-rad*math.cos(v),H-R+rad*math.sin(v)
    def coord(key):
        i,j,k=key;h=i/2;right=h>nh
        if right:h=2*nh-h
        x,z=xz(h,k/(2*nr));yi=min(j//2,ny-1);y=yy[yi]+(yy[yi+1]-yy[yi])*(j/2-yi)
        return np.array([B-x if right else x,y,z])
    for i in range(2*nh):
        hand='LH' if i<nh else 'RH';ci=i if hand=='LH' else 2*nh-i-1
        for k in range(nr):
            for j in range(ny):
                ids=[]
                for q in N20:
                    key=tuple(int(v) for v in np.array([2*i,2*j,2*k])+q+1)
                    if key not in grid:
                        n=len(nodes)+1;grid[key]=n;logical[n]=key;nodes[n]=coord(key)
                    ids.append(grid[key])
                els.append({'id':len(els)+1,'nodes':ids,'hand':hand,'row':ci if hand=='LH' else i-nh,'region':cells[ci]['region'],'indices':[i,j,k],'end_nodes':[n for n,q in zip(ids,N20) if q[0]==1]})
    return nodes,els,logical,grid,[xz(i,.5) for i in range(nh+1)],cells,yy,nh,ny,nr,wall

def run(b,g,m,parent,lb,cb):
    t=parent['thickness_m'];mat=parent['material'];E=mat['E_MPa']*1000;nu=mat['nu'];gamma=mat['density_kg_m3']*parent['gravity_m_s2']/1000;qroof=parent['roof_LL_kgf_m2']*parent['gravity_m_s2']/1000
    B,R,L=g['width_m'],g['outer_shoulder_radius_m'],g['bay_length_m'];nodes,els,logical,grid,profile,cells,yy,nh,ny,nr,wall=build(g,t,m,b['reference_mesh'])
    ops.wipe();ops.model('basic','-ndm',3,'-ndf',3);ops.nDMaterial('ElasticIsotropic',1,E,nu);bases={'LH':[],'RH':[]};loads={n:np.zeros(3) for n in nodes};cache={};volume=0.;minJ=1.
    for n,p in nodes.items():
        ops.node(n,*p.tolist());i,j,k=logical[n]
        if i in (0,4*nh):ops.fix(n,1,int(j==ny and k==nr),1);bases['LH' if i==0 else 'RH'].append(n)
    qp,wp=np.polynomial.legendre.leggauss(3);vr=[(*shape(q,KIND),w) for q,w in gps(KIND)];fr=[(*shape([a,c,1],KIND),wa*wc) for a,wa in zip(qp,wp) for c,wc in zip(qp,wp)]
    for e in els:
        i,j,k=e['indices'];hand=e['hand'];ci=i if hand=='LH' else 2*nh-i-1;c=cells[ci];p=np.array([nodes[n] for n in e['nodes']]);dy=yy[j+1]-yy[j];key=(i,k,round(dy,12));ops.element(KIND,e['id'],*e['nodes'],1)
        if key not in cache:
            ef=np.zeros((20,3));vol=0.;mind=1.
            for N,D,w in vr:
                det=float(np.linalg.det(p.T@D));mind=min(mind,det);dv=det*w;vol+=dv;ef[:,2]-=gamma*N*dv
            if k==nr-1 and c['region']!='wall':
                for N,D,w in fr:
                    J=p.T@D;ef[:,2]-=qroof*N*abs(J[0,0]*J[1,1]-J[0,1]*J[1,0])*w
            cache[key]=(ef,vol,mind)
        ef,vol,mind=cache[key];volume+=vol;minJ=min(minJ,mind)
        for n,v in zip(e['nodes'],ef):loads[n]+=v
        a,bb=c['a'],c['b'];r0=R-t+t*k/nr;r1=R-t+t*(k+1)/nr
        if c['region']=='wall':area=t/nr*(bb-a);xg=t-(k+.5)*t/nr;dx=0.;rxg=0.
        elif c['region']=='roof':area=t/nr*(bb-a);xg=(a+bb)/2;dx=bb-a;rxg=xg
        else:
            area=(r1*r1-r0*r0)*(bb-a)/2;xg=R-(2/3)*(r1**3-r0**3)/(r1*r1-r0*r0)*(math.sin(bb)-math.sin(a))/(bb-a)
            xa,xb=R-R*math.cos(a),R-R*math.cos(bb);dx=xb-xa;rxg=(xa+xb)/2
        if hand=='RH':xg=B-xg;rxg=B-rxg
        ll=qroof*dx*dy if k==nr-1 else 0.;yg=(yy[j]+yy[j+1])/2
        e['loads']=ef.tolist();e['physical_load_6']=(physical_force(gamma*area*dy,xg,yg)+physical_force(ll,rxg,yg)).tolist();e['mapped_load_6']=resultant(nodes,dict(zip(e['nodes'],ef)),np.zeros(3)).tolist()
    if minJ<=0:raise RuntimeError('Jacobian')
    ops.timeSeries('Linear',1);ops.pattern('Plain',1,1)
    for n,v in loads.items():ops.load(n,*v.tolist())
    ident=f'LOCAL-T175-FR-FULL-{m["id"]}';print('SOLVING',ident,len(els),'elements',len(nodes),'nodes',flush=True);solve()
    u={n:np.array(ops.nodeDisp(n)) for n in nodes};reactions={n:np.array(ops.nodeReaction(n)) for tags in bases.values() for n in tags}
    applied=resultant(nodes,loads,np.zeros(3));reaction=resultant(nodes,reactions,np.zeros(3));physical=np.sum([e['physical_load_6'] for e in els],axis=0);refF=-applied[2]
    base={h:resultant(nodes,{n:reactions[n] for n in tags},np.array([t/2 if h=='LH' else B-t/2,L/2,t])).tolist() for h,tags in bases.items()}
    for e in els:e['forces']=np.array(ops.eleForce(e['id'])).reshape(20,3).tolist();e['gauss_stress_kPa']=np.array(ops.eleResponse(e['id'],'stresses')).reshape(27,6).tolist()
    checks=cuts(cb,profile,[c['region'] for c in cells],nodes,[{**e,'physical_load_6':e['mapped_load_6']} for e in els],{n:reactions[n] for n in bases['LH']},refF)
    pa=np.array([[nodes[n] for n in e['nodes']] for e in els]);ua=np.array([[u[n] for n in e['nodes']] for e in els]);recorded=np.array([e['gauss_stress_kPa'] for e in els]);energy=0.;rep=0.
    for idx,(N,D,w) in enumerate(vr):
        J=np.einsum('eni,nj->eij',pa,D);G=np.einsum('eni,nj->eij',ua,D)@np.linalg.inv(J);T=tensor_from_grad(G,E,nu);calc=T[:,[0,1,2,0,1,2],[0,1,2,1,2,0]]
        rep=max(rep,float(np.max(abs(calc-recorded[:,idx,:]))));energy+=float(np.sum(np.einsum('eij,eij->e',T,G)*np.linalg.det(J)*w/2))
    work=sum(float(loads[n]@u[n]) for n in nodes)/2;samples,maxres=sample(pa,ua,els,lb,g,t,E,nu);eq=error(applied+reaction,refF);mapping=error(applied-physical,refF)
    exactvol=2*L*(t*(g['overall_height_m']-R-t)+(R**2-(R-t)**2)*math.pi/4+t*(B/2-R));volerr=abs(volume/exactvol-1)
    if eq>1e-6 or mapping>1e-5 or volerr>1e-5 or rep>1e-6 or abs(energy/work-1)>1e-6 or max(c['fbd_relative'] for c in checks)>1e-6 or maxres>1e-9:raise RuntimeError('Numerical QA')
    summary={'id':ident,'mesh':m['id'],'pattern':'FULL','t_m':t,'elements':len(els),'nodes':len(nodes),'solver_exit':0,'total_load_6':applied.tolist(),'support_resultant_6':reaction.tolist(),'exact_physical_load_6':physical.tolist(),'base':base,'cuts':checks,'equilibrium_relative':eq,'physical_load_mapping_relative':mapping,'mesh_volume_m3':volume,'exact_physical_volume_m3':exactvol,'mesh_volume_error_relative':volerr,'min_jacobian_m3':minJ,'gauss_reproduction_kPa':rep,'gauss_points_checked':len(els)*27,'strain_energy_kNm':energy,'work_energy_kNm':work,'energy_work_relative':abs(energy/work-1),'max_displacement_mm':float(max(np.linalg.norm(v) for v in u.values())*1000),'crown_mid_uz_mm':float(u[grid[2*nh,ny,nr]][2]*1000),'sample_count':len(samples),'max_inverse_residual_m':maxres,'mesh_knots':{'wall_z_m':wall,'y_m':yy,'arc_divisions':24,'through_thickness':nr},'boundary_conditions_changed':False}
    write(ident+'.json',{'summary':summary,'nodes':{n:p.tolist() for n,p in nodes.items()},'loads':{n:v.tolist() for n,v in loads.items()},'displacements':{n:v.tolist() for n,v in u.items()},'reactions':{n:v.tolist() for n,v in reactions.items()},'bases':bases,'elements':els,'samples':samples,'solver_stress_order':['xx','yy','zz','xy','yz','zx'],'local_stress_order':lb['stress_order']})
    print('DONE',ident,'umax',summary['max_displacement_mm'],'Gauss recovery',rep,flush=True);return summary

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--reuse',action='store_true');args=parser.parse_args();b=read(BP);up=read(b['upstream']);parent=up['basis'];g=read(parent['geometry_source'])['geometry'];lb=read(parent['local_points_source']);cb=read(parent['section_cuts_source']);OUT.mkdir(parents=True,exist_ok=True)
    deps={**up['dependency_hashes'],**up['raw_output_hashes']}
    for p,h in deps.items():
        if sha(p)!=h:raise RuntimeError('Stale upstream '+p)
    for p in [BP,b['upstream'],'tools/tsc-study/local_mesh_study.py']:deps[p]=sha(p)
    if ops.version()!=up['solver']['version'] or sha('.local-engineering-runtime/openseespywin/opensees.pyd')!=up['solver']['dll_sha256']:raise RuntimeError('Runtime changed')
    patches=[patch(KIND,parent['material']['E_MPa']*1000,parent['material']['nu'])];fp=json.dumps(deps,sort_keys=True)+up['solver']['dll_sha256'];runs=[]
    for m in b['new_meshes']:
        ident=f'LOCAL-T175-FR-FULL-{m["id"]}';cache=OUT/f'cache-{ident}.json';saved=read(f'output/tsc-step2i-r00/{cache.name}') if args.reuse and cache.exists() else None
        if saved and saved['fingerprint']==fp and sha(f'output/tsc-step2i-r00/{ident}.json')==saved['raw_sha256']:s=saved['summary'];print('REUSE',ident,flush=True)
        else:s=run(b,g,m,parent,lb,cb);write(cache.name,{'fingerprint':fp,'summary':s,'raw_sha256':sha(f'output/tsc-step2i-r00/{ident}.json')})
        runs.append(s)
    reference=read('output/tsc-step2h-r00/QSB-T175-FR-FULL-H4.json');samples={'H4':{'mesh':'H4','pattern':'FULL','samples':reference['samples']}};allruns={'H4':reference['summary']};comparisons=[];globalqa=[]
    for s in runs:samples[s['mesh']]={'mesh':s['mesh'],'pattern':'FULL','samples':read(f'output/tsc-step2i-r00/{s["id"]}.json')['samples']};allruns[s['mesh']]=s
    for a,c in [('H4','IB'),('H4','IY'),('IB','IBY'),('IY','IBY')]:
        comparisons.append(compare(samples[a],samples[c],lb));x,y=allruns[a],allruns[c]
        globalqa.append({'pair':[a,c],'displacement_change':abs(y['max_displacement_mm']/x['max_displacement_mm']-1),'energy_change':abs(y['strain_energy_kNm']/x['strain_energy_kNm']-1),'reaction_change':max(abs(y['base'][h][k]-x['base'][h][k])/max(abs(y['base'][h][k]),.1) for h in ['LH','RH'] for k in [0,2,4]),'interpretation':'Directional sensitivity, not whole-model convergence'})
    report={'id':b['id'],'revision':b['revision'],'status':'LOCAL_MESH_AND_TRACTION_DIAGNOSTIC_NOT_FOR_DESIGN','basis':b,'inherited_basis':parent,'solver':up['solver'],'patch_checks':patches,'reference_run':reference['summary'],'runs':runs,'local_comparisons':comparisons,'global_comparisons':globalqa,'profiles':[{ 'mesh':m,'points':[{k:v for k,v in p.items() if k!='sides'} for p in s['samples'] if p['hand']=='LH' and p['station']=='BASE50' and p['y_m']==.75]} for m,s in samples.items()],'dependency_hashes':deps,'raw_output_hashes':{f'output/tsc-step2i-r00/{s["id"]}.json':sha(f'output/tsc-step2i-r00/{s["id"]}.json') for s in runs},'whole_model_local_stress_convergence':'NOT_ESTABLISHED','engineering_approval':False,'manufacturing_release':False}
    write('local_mesh_results.json',report);print('FINISHED',json.dumps([{ 'pair':c['pair'],'groups':[{ 'name':g['group'],'met':g['all_six_targets_met'],'change':max(f['max_point_change'] for f in g['fields']),'spread':max(f['max_spread_relative'] for f in g['fields'])} for g in c['groups']]} for c in comparisons]),flush=True)
if __name__=='__main__':main()
