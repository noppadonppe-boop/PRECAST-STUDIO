"""S2H: consistent gravity / free-sided quadratic bay, not design approval."""
import json,math,argparse
import numpy as np
from benchmark_study import ROOT,ops,sha,N20,shape,gps,six,patch,solve
from bay_study import cuts,resultant,error,physical_force
from shell_study import make_half_cells
from stress_study import point,compare,tensor_from_grad,six as local_six
from curved_study import inverse

OUT=ROOT/'output/tsc-step2h-r00';BP='knowledge/modular-tsc-step2h/basis.json';KIND='20NodeBrick'
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def write(p,v):(OUT/p).write_text(json.dumps(v,separators=(',',':'),allow_nan=False),encoding='utf-8')

def build(g,t,m):
    B,H,R,L=g['width_m'],g['overall_height_m'],g['outer_shoulder_radius_m'],g['bay_length_m']
    profile,cells=make_half_cells(g,t,m['target_m'],m['arc_divisions']);nh=len(cells)
    nw=next(i for i,c in enumerate(cells) if c['region']=='shoulder');na=m['arc_divisions'];nf=nh-nw-na
    ny=2*math.ceil(L/m['target_m']/2);nr=m['through_thickness'];nodes={};grid={};els=[];logical={}
    def xyz(key):
        i,j,k=key;h=i/2;right=h>nh
        if right:h=2*nh-h
        u=t*k/(2*nr)
        if h<=nw:x,z=t-u,t+(H-R-t)*h/nw
        elif h<=nw+na:
            a=(h-nw)*math.pi/(2*na);r=R-t+u;x,z=R-r*math.cos(a),H-R+r*math.sin(a)
        else:x,z=R+(B/2-R)*(h-nw-na)/nf,H-t+u
        return np.array([B-x if right else x,L*j/(2*ny),z])
    for i in range(2*nh):
        hand='LH' if i<nh else 'RH';ci=i if hand=='LH' else 2*nh-i-1
        for k in range(nr):
            for j in range(ny):
                ids=[]
                for q in N20:
                    key=tuple(int(v) for v in np.array([2*i,2*j,2*k])+q+1)
                    if key not in grid:
                        tag=len(nodes)+1;grid[key]=tag;logical[tag]=key;nodes[tag]=xyz(key)
                    ids.append(grid[key])
                els.append({'id':len(els)+1,'nodes':ids,'hand':hand,'row':ci if hand=='LH' else i-nh,'region':cells[ci]['region'],'indices':[i,j,k],
                            'end_nodes':[n for n,q in zip(ids,N20) if q[0]==1]})
    return nodes,els,logical,grid,profile,cells,nh,nw,na,ny,nr

def sample(p,u,elements,b,g,t,E,nu):
    lo=p.min(axis=1)-.001;hi=p.max(axis=1)+.001;hands=np.array([e['hand'] for e in elements]);samples=[];maxres=0.
    for hand in b['hands']:
        for st in b['stations']:
            for y in b['y_m']:
                group=st['zone'] if st['zone']!='regular' else ('regular_interior' if y in b['interior_y_m'] else 'side_edge')
                for f in b['thickness_fraction_from_inner']:
                    xyz,Q=point(st,hand,y,f,g,t);sides=[];us=[]
                    for idx in np.flatnonzero(np.all(xyz>=lo,axis=1)&np.all(xyz<=hi,axis=1)&(hands==hand)):
                        q,res=inverse(p[idx],xyz,KIND)
                        if max(abs(q))>1+1e-7:continue
                        if res>1e-9:raise RuntimeError('Inverse map failed')
                        maxres=max(maxres,res);N,D=shape(q,KIND);G=u[idx].T@D@np.linalg.inv(p[idx].T@D);T=Q@tensor_from_grad(G,E,nu)@Q.T
                        sides.append({'element':int(idx)+1,'natural':q.tolist(),'local_kPa':local_six(T).tolist()});us.append(N@u[idx])
                    if not sides:raise RuntimeError(f'Point not found {hand}/{st}/{y}/{f}')
                    vals=np.array([s['local_kPa'] for s in sides])
                    samples.append({'key':f'{hand}/{st["id"]}/Y{y}/F{f}','hand':hand,'station':st['id'],'y_m':y,'fraction':f,'group':group,'xyz_m':xyz.tolist(),'axes_s_y_n':Q.tolist(),
                                    'mean_kPa':vals.mean(axis=0).tolist(),'min_kPa':vals.min(axis=0).tolist(),'max_kPa':vals.max(axis=0).tolist(),'sides':sides,'displacement_m':np.mean(us,axis=0).tolist()})
    return samples,maxres

def run(b,g,m,pattern,localbasis,cutbasis):
    t=b['thickness_m'];mat=b['material'];E=mat['E_MPa']*1000;nu=mat['nu'];gamma=mat['density_kg_m3']*b['gravity_m_s2']/1000
    qroof=b['roof_LL_kgf_m2']*b['gravity_m_s2']/1000;L=g['bay_length_m'];R=g['outer_shoulder_radius_m'];B=g['width_m']
    nodes,els,logical,grid,profile,cells,nh,nw,na,ny,nr=build(g,t,m)
    ops.wipe();ops.model('basic','-ndm',3,'-ndf',3);ops.nDMaterial('ElasticIsotropic',1,E,nu)
    bases={'LH':[],'RH':[]};loads={n:np.zeros(3) for n in nodes};reactions={};minJ=1.;volume=0.;geometry_cache={}
    for n,p in nodes.items():
        ops.node(n,*p.tolist());i,j,k=logical[n]
        if i in (0,4*nh):
            ops.fix(n,1,int(j==ny and k==nr),1);bases['LH' if i==0 else 'RH'].append(n)
    qp,wp=np.polynomial.legendre.leggauss(3);volume_rule=[(*shape(v,KIND),w) for v,w in gps(KIND)]
    face_rule=[(*shape([a,c,1],KIND),wa*wc) for a,wa in zip(qp,wp) for c,wc in zip(qp,wp)]
    dy=L/ny
    for e in els:
        i,j,k=e['indices'];hand=e['hand'];ci=i if hand=='LH' else 2*nh-i-1;c=cells[ci];p=np.array([nodes[n] for n in e['nodes']])
        ops.element(KIND,e['id'],*e['nodes'],1)
        if (i,k) not in geometry_cache:
            grav=np.zeros(20);roof=np.zeros(20);vol=0.
            for N,D,w in volume_rule:
                det=float(np.linalg.det(p.T@D));minJ=min(minJ,det);dv=det*w;vol+=dv;grav-=gamma*N*dv
            if k==nr-1 and c['region']!='wall' and (pattern=='FULL' or hand=='LH'):
                for N,D,w in face_rule:
                    J=p.T@D;projected=abs(J[0,0]*J[1,1]-J[0,1]*J[1,0]);roof-=qroof*N*projected*w
            geometry_cache[i,k]=(grav,roof,vol)
        grav,roof,vol=geometry_cache[i,k];volume+=vol
        ef=np.zeros((20,3));ef[:,2]=grav+roof
        for n,v in zip(e['nodes'],ef):loads[n]+=v
        # Independent exact circular-cell gravity/first moment, not the stiffness Jacobian.
        if c['region']=='shoulder':
            a=math.pi-(ci-nw)*math.pi/(2*na);bb=a-math.pi/(2*na);r0=R-t+t*k/nr;r1=R-t+t*(k+1)/nr
            area=(r1*r1-r0*r0)*(a-bb)/2;xg=R+(2/3)*(r1**3-r0**3)/(r1*r1-r0*r0)*(math.sin(a)-math.sin(bb))/(a-bb)
        else:area=c['volume_per_y']/nr;xg=t-(k+.5)*t/nr if c['region']=='wall' else c['xg']
        if hand=='RH':xg=B-xg
        ll=qroof*c['roof_dx']*dy if k==nr-1 and (pattern=='FULL' or hand=='LH') else 0.
        rxg=c['roof_xg'] if hand=='LH' else B-c['roof_xg'];yg=(j+.5)*dy
        e['loads']=ef.tolist();e['physical_load_6']=(physical_force(gamma*area*dy,xg,yg)+physical_force(ll,rxg,yg)).tolist()
        e['mapped_load_6']=resultant(nodes,dict(zip(e['nodes'],ef)),np.zeros(3)).tolist()
    if minJ<=0:raise RuntimeError('Nonpositive Jacobian')
    ops.timeSeries('Linear',1);ops.pattern('Plain',1,1)
    for n,f in loads.items():ops.load(n,*f.tolist())
    ident=f'QSB-T175-FR-{pattern}-{m["id"]}';print('SOLVING',ident,len(els),'elements',len(nodes),'nodes',flush=True)
    solve();u={n:np.array(ops.nodeDisp(n)) for n in nodes};reactions={n:np.array(ops.nodeReaction(n)) for tags in bases.values() for n in tags}
    applied=resultant(nodes,loads,np.zeros(3));reaction=resultant(nodes,reactions,np.zeros(3));refF=-applied[2]
    physical=np.sum([e['physical_load_6'] for e in els],axis=0);base={h:resultant(nodes,{n:reactions[n] for n in tags},np.array([t/2 if h=='LH' else B-t/2,L/2,t])).tolist() for h,tags in bases.items()}
    for e in els:
        e['forces']=np.array(ops.eleForce(e['id'])).reshape(20,3).tolist();e['gauss_stress_kPa']=np.array(ops.eleResponse(e['id'],'stresses')).reshape(27,6).tolist()
    # Sum consistent mapped loads for numerical cut equilibrium; report exact physical difference separately.
    numerical=[{**e,'physical_load_6':e['mapped_load_6']} for e in els]
    checks=cuts(cutbasis,profile,[c['region'] for c in cells],nodes,numerical,{n:reactions[n] for n in bases['LH']},refF)
    for ch in checks:
        exact=sum((np.array(e['physical_load_6']) for e in els if e['hand']=='LH' and e['row']<ch['station_row']),np.zeros(6));origin=np.array(ch['origin_m']);exact[3:]-=np.cross(origin,exact[:3])
        ch['exact_physical_load_about_cut_6']=exact.tolist();ch['mapping_difference_relative']=error(np.array(ch['physical_load_about_cut_6'])-exact,refF)
    pa=np.array([[nodes[n] for n in e['nodes']] for e in els]);ua=np.array([[u[n] for n in e['nodes']] for e in els]);recorded=np.array([e['gauss_stress_kPa'] for e in els]);rep=0.;energy=0.
    for idx,(N,D,w) in enumerate(volume_rule):
        J=np.einsum('eni,nj->eij',pa,D);G=np.einsum('eni,nj->eij',ua,D)@np.linalg.inv(J);T=tensor_from_grad(G,E,nu)
        calc=T[:,[0,1,2,0,1,2],[0,1,2,1,2,0]];rep=max(rep,float(np.max(abs(calc-recorded[:,idx,:]))));energy+=float(np.sum(np.einsum('eij,eij->e',T,G)*np.linalg.det(J)*w/2))
    work=sum(float(loads[n]@u[n]) for n in nodes)/2;energyerr=abs(energy/work-1)
    samples,maxres=sample(pa,ua,els,localbasis,g,t,E,nu);eq=error(applied+reaction,refF);mapping=error(applied-physical,refF)
    exactvol=sum(c['volume_per_y'] for c in cells)*L*2;volerr=abs(volume/exactvol-1);qa=b['qa_declared_before_solving']
    if eq>qa['equilibrium_relative'] or mapping>qa['physical_load_mapping_relative'] or volerr>qa['volume_relative'] or rep>qa['gauss_reproduction_kPa'] or energyerr>qa['energy_work_relative'] or max(c['fbd_relative'] for c in checks)>qa['section_fbd_relative'] or max(c['pair_relative'] for c in checks)>qa['section_fbd_relative']:raise RuntimeError('Basic numerical QA failed')
    summary={'id':ident,'mesh':m['id'],'pattern':pattern,'t_m':t,'nodes':len(nodes),'elements':len(els),'solver_exit':0,'total_load_6':applied.tolist(),'exact_physical_load_6':physical.tolist(),'support_resultant_6':reaction.tolist(),'base':base,'cuts':checks,
             'equilibrium_relative':eq,'physical_load_mapping_relative':mapping,'mesh_volume_m3':volume,'exact_physical_volume_m3':exactvol,'mesh_volume_error_relative':volerr,'min_jacobian_m3':minJ,'gauss_reproduction_kPa':rep,'gauss_points_checked':len(els)*27,
             'strain_energy_kNm':energy,'work_energy_kNm':work,'energy_work_relative':energyerr,'max_displacement_mm':float(max(np.linalg.norm(v) for v in u.values())*1000),'crown_mid_uz_mm':float(u[grid[2*nh,ny,nr]][2]*1000),'sample_count':len(samples),'max_inverse_residual_m':maxres}
    write(ident+'.json',{'summary':summary,'nodes':{n:p.tolist() for n,p in nodes.items()},'loads':{n:f.tolist() for n,f in loads.items()},'displacements':{n:v.tolist() for n,v in u.items()},'reactions':{n:v.tolist() for n,v in reactions.items()},'bases':bases,'elements':els,'samples':samples,'solver_stress_order':['xx','yy','zz','xy','yz','zx'],'local_stress_order':localbasis['stress_order'],'gauss_order':'Step2F N27 order *sqrt(3/5)','stress_unit':'kPa; tension positive'})
    print('DONE',ident,'Umax',summary['max_displacement_mm'],'mm; equilibrium',eq,'recovery',rep,flush=True)
    return summary

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--reuse',action='store_true');args=parser.parse_args()
    b=read(BP);OUT.mkdir(parents=True,exist_ok=True);g=read(b['geometry_source'])['geometry'];prior=read(b['prior_solid']);stress=read(b['prior_stress']);coupon=read(b['coupon_source']);localbasis=read(b['local_points_source']);cutbasis=read(b['section_cuts_source'])
    if ops.version()!=b['solver_version'] or sha('.local-engineering-runtime/openseespywin/opensees.pyd')!=coupon['solver']['dll_sha256']:raise RuntimeError('Runtime differs')
    deps={}
    for source in [prior,stress,coupon]:
        for p,h in {**source['dependency_hashes'],**source.get('raw_source_hashes',{}),**source['raw_output_hashes']}.items():
            if sha(p)!=h:raise RuntimeError('Stale dependency '+p)
            deps[p]=h
    for p in [BP,b['geometry_source'],b['prior_solid'],b['prior_stress'],b['coupon_source'],b['local_points_source'],b['section_cuts_source'],'tools/tsc-study/quadratic_bay_study.py','tools/tsc-study/curved_study.py','tools/tsc-study/benchmark_study.py','tools/tsc-study/bay_study.py','tools/tsc-study/stress_study.py','tools/tsc-study/shell_study.py']:deps[p]=sha(p)
    fingerprint=json.dumps(deps,sort_keys=True)+coupon['solver']['dll_sha256'];patches=[patch(KIND,b['material']['E_MPa']*1000,b['material']['nu'])];runs=[]
    for pattern in b['patterns']:
        for m in b['meshes']:
            ident=f'QSB-T175-FR-{pattern}-{m["id"]}';cache=OUT/f'cache-{ident}.json'
            saved=json.loads(cache.read_text()) if args.reuse and cache.exists() else None
            if saved and saved['fingerprint']==fingerprint and sha(f'output/tsc-step2h-r00/{ident}.json')==saved['raw_sha256']:s=saved['summary'];print('REUSE',ident,flush=True)
            else:s=run(b,g,m,pattern,localbasis,cutbasis);write(cache.name,{'fingerprint':fingerprint,'raw_sha256':sha(f'output/tsc-step2h-r00/{ident}.json'),'summary':s})
            runs.append(s)
    globalqa=[];localqa=[];oldcomparisons=[];profiles=[];qa=b['qa_declared_before_solving']
    for pattern in b['patterns']:
        a,c=[r for r in runs if r['pattern']==pattern][-2:];ar=read(f'output/tsc-step2h-r00/{a["id"]}.json');cr=read(f'output/tsc-step2h-r00/{c["id"]}.json')
        rd=max(abs(c['base'][h][k]-a['base'][h][k])/max(abs(c['base'][h][k]),.1) for h in ['LH','RH'] for k in [0,2,4])
        cd=max(abs(x['cut_on_lower_LH_6'][k]-y['cut_on_lower_LH_6'][k])/max(abs(x['cut_on_lower_LH_6'][k]),.1) for x,y in zip(c['cuts'],a['cuts']) for k in [0,2,4])
        ud=abs(c['max_displacement_mm']-a['max_displacement_mm'])/max(abs(c['max_displacement_mm']),.001);ed=abs(c['strain_energy_kNm']/a['strain_energy_kNm']-1)
        globalqa.append({'pattern':pattern,'pair':[a['mesh'],c['mesh']],'displacement_change':ud,'reaction_change':rd,'cut_change':cd,'energy_change':ed,'selected_global_targets_met':bool(ud<=qa['displacement_relative'] and rd<=qa['reaction_relative'] and cd<=qa['cut_relative'] and ed<=qa['energy_relative'])})
        ca={'mesh':a['mesh'],'pattern':pattern,'samples':ar['samples']};cc={'mesh':c['mesh'],'pattern':pattern,'samples':cr['samples']};localqa.append(compare(ca,cc,localbasis))
        old=next(r for r in prior['solid_runs'] if r['pattern']==pattern and r['mesh']=='D3');os=read(f'output/tsc-step2e-r00/STRESS-{old["id"]}.json')
        difference=compare(os,cc,localbasis)
        # Cross-model differences are not a convergence acceptance test.
        for group in difference['groups']:
            group.pop('all_six_targets_met')
            for field in group['fields']:field.pop('targets_met')
        oldcomparisons.append({'pattern':pattern,'source_id':old['id'],'quadratic_id':c['id'],'crown_uz_relative_difference':c['crown_mid_uz_mm']/old['crown_mid_uz_mm']-1,'LH_base_difference_6':(np.array(c['base']['LH'])-old['base']['LH']).tolist(),'local_difference':difference,'warning':'Geometry, interpolation and load mapping differ; not pure element-formulation comparison and not acceptance.'})
        profiles.append({'pattern':pattern,'points':[{k:v for k,v in s.items() if k!='sides'} for s in cr['samples'] if s['hand']=='LH' and s['station']=='C45' and s['y_m']==.75]})
    report={'id':b['id'],'revision':b['revision'],'status':'QUADRATIC_BAY_SENSITIVITY_NOT_FOR_DESIGN','basis':b,'solver':coupon['solver'],'patch_checks':patches,'runs':runs,'global_comparisons':globalqa,'local_comparisons':localqa,'prior_model_comparisons':oldcomparisons,'profiles':profiles,'dependency_hashes':deps,'raw_output_hashes':{f'output/tsc-step2h-r00/{r["id"]}.json':sha(f'output/tsc-step2h-r00/{r["id"]}.json') for r in runs},'whole_model_local_stress_convergence':'NOT_ESTABLISHED','full_bay_quadratic_scope':'SIX_TRIAL_RUNS_NOT_INDEPENDENT_FULL_VALIDATION','engineering_approval':False,'manufacturing_release':False}
    write('quadratic_bay_results.json',report);print('FINISHED',json.dumps(globalqa),json.dumps([{ 'pattern':c['pattern'],'groups':[{ 'group':g['group'],'met':g['all_six_targets_met'],'maxchange':max(f['max_point_change'] for f in g['fields']),'maxspread':max(f['max_spread_relative'] for f in g['fields'])} for g in c['groups']]} for c in localqa]),flush=True)

if __name__=='__main__':main()
