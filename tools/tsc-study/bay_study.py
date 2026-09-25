"""S2D: global section-force audit and free-sided solid bay. No design approval."""
import json
import math
import argparse
import numpy as np
from shell_study import ROOT, ops, sha, solve, run_case, make_half_cells
from diagnostic_study import brick_patch_test, SIGNS, GP

OUT=ROOT/'output/tsc-step2d-r00'
BPATH='knowledge/modular-tsc-step2d/basis.json'
def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8'))
def write(p,v): (OUT/p).write_text(json.dumps(v,separators=(',',':')),encoding='utf-8')
def resultant(nodes,vectors,origin):
    out=np.zeros(6)
    for n,v in vectors.items():
        out[:3]+=v[:3]; out[3:]+=np.cross(nodes[n]-origin,v[:3])
        if len(v)==6: out[3:]+=v[3:]
    return out
def physical_force(weight,x,y): return np.array([0.,0.,-weight,-y*weight,x*weight,0.])
def shift(v,origin): return np.r_[v[:3],v[3:]-np.cross(origin,v[:3])]
def error(v,refF,length=3.): return float(max(np.max(abs(v[:3]))/refF,np.max(abs(v[3:]))/(refF*length)))


def cuts(basis,profile,regions,nodes,elements,base_reactions,refF,crown_other=None):
    arc_start=regions.index('shoulder'); arc_end=arc_start+regions.count('shoulder')
    rows=[]
    for c in basis['cuts']:
        index=len(profile)-1 if c['kind']=='crown' else arc_start+round((arc_end-arc_start)*c['degrees']/90)
        x,z=profile[index]; origin=np.array([x,0.75,z])
        selected=[e for e in elements if e['hand']=='LH' and e['row']<index]
        # Last row ends at this station; local-node layout differs between shell/solid.
        tags=set(n for e in selected if e['row']==index-1 for n in e['end_nodes'])
        node_force={n:np.zeros(len(next(iter(base_reactions.values())))) for n in tags}
        applied=np.zeros(6)
        for e in selected:
            applied+=np.array(e['physical_load_6'])
            for k,n in enumerate(e['nodes']):
                if n in tags: node_force[n]+=np.array(e['forces'][k])-np.array(e['loads'][k])
        action=resultant(nodes,node_force,origin)
        base=resultant(nodes,base_reactions,origin)
        applied=shift(applied,origin)
        expected=-base-applied; residual=action-expected
        other_tags=tags
        if c['kind']=='crown' and crown_other is not None: other_tags=set(crown_other)
        other_force={n:np.zeros(len(next(iter(base_reactions.values())))) for n in other_tags}
        for e in elements:
            if e['hand']=='LH' and e['row']<index: continue
            for k,n in enumerate(e['nodes']):
                if n in other_tags: other_force[n]+=np.array(e['forces'][k])-np.array(e['loads'][k])
        opposite=resultant(nodes,other_force,origin)
        rows.append({'id':c['id'],'station_row':index,'origin_m':origin.tolist(),'selected_elements':len(selected),
                     'cut_on_lower_LH_6':action.tolist(),'base_about_cut_6':base.tolist(),'physical_load_about_cut_6':applied.tolist(),
                     'fbd_expected_6':expected.tolist(),'fbd_residual_6':residual.tolist(),'fbd_relative':error(residual,refF),
                     'opposite_cut_6':opposite.tolist(),'pair_relative':error(action+opposite,refF)})
    return rows


def shell_audit(basis,up,g,joint_id,mesh_id):
    t=basis['thickness_m']; mesh=next(m for m in up['basis']['mesh_levels']+[up['basis']['refinement_followup']['mesh']] if m['id']==mesh_id)
    joint=next(j for j in up['basis']['joints'] if j['id']==joint_id)
    summary=run_case(up['basis'],g,t,mesh,joint,'FULL',save=False)
    previous=next(r for r in up['runs'] if r['id']==summary['id'])
    reproduction=max(abs(summary['max_displacement_mm']/previous['max_displacement_mm']-1),max(abs(np.array(summary['base'][h])-previous['base'][h]).max() for h in ['LH','RH']))
    raw_path=f'output/tsc-step2b-r00/{summary["id"]}.json'; raw=read(raw_path)
    nodes={int(n):np.array(p) for n,p in raw['nodes'].items()}
    profile,cells=make_half_cells(g,t,mesh['target_m'],mesh['arc_divisions'])
    ny=2*math.ceil(g['bay_length_m']/mesh['target_m']/2); dy=g['bay_length_m']/ny
    gamma=summary['gamma_kN_m3']; q=up['basis']['roof_LL_kgf_m2']*up['basis']['gravity_m_s2']/1000
    elements=[]; load_sum={n:np.zeros(6) for n in nodes}
    for index,e in enumerate(raw['elements']):
        i=(index//ny)%len(cells); cell=cells[i if e['hand']=='LH' else len(cells)-1-i]
        xg=cell['xg'] if e['hand']=='LH' else g['width_m']-cell['xg']
        rxg=cell['roof_xg'] if e['hand']=='LH' else g['width_m']-cell['roof_xg']
        p=np.array([nodes[n] for n in e['nodes']]); mean=p.mean(axis=0)
        w=gamma*cell['volume_per_y']*dy; ll=q*cell['roof_dx']*dy
        each=np.array([0.,0.,-(w+ll)/4,0.,(w*(xg-mean[0])+ll*(rxg-mean[0]))/4,0.])
        loads=np.tile(each,(4,1))
        for n in e['nodes']: load_sum[n]+=each
        force=np.array(ops.eleForce(e['id'])).reshape(4,6)
        elements.append({'id':e['id'],'nodes':e['nodes'],'hand':e['hand'],'row':i,'end_nodes':[e['nodes'][1],e['nodes'][2]],
                         'forces':force.tolist(),'loads':loads.tolist(),'physical_load_6':(physical_force(w,xg,mean[1])+physical_force(ll,rxg,mean[1])).tolist()})
    mapping_error=max(float(np.max(abs(load_sum[n]-raw['loads'][str(n)]))) for n in nodes)
    base_reactions={n:np.array(ops.nodeReaction(n)) for n in raw['bases']['LH']}
    checks=cuts(basis,profile,[c['region'] for c in cells],nodes,elements,base_reactions,-summary['total_load_6'][2],raw['crowns']['RH'])
    result={'id':'AUDIT-'+summary['id'],'model':'shell','source_id':summary['id'],'joint':joint_id,'mesh':mesh_id,'pattern':'FULL',
            'reproduction_error':reproduction,'nodal_load_reconstruction_max_error':mapping_error,'summary':summary,'cuts':checks,'source_hash':sha(ROOT/raw_path)}
    write(result['id']+'.json',{'result':result,'nodes':raw['nodes'],'elements':elements})
    print(result['id'],'cut FBD',max(c['fbd_relative'] for c in checks),'pair',max(c['pair_relative'] for c in checks),flush=True)
    return result


def solid_run(basis,up,g,mesh,pattern):
    t=basis['thickness_m']; B,H,R,L=g['width_m'],g['overall_height_m'],g['outer_shoulder_radius_m'],g['bay_length_m']
    E=up['runs'][0]['E_MPa']*1000; gamma=up['runs'][0]['gamma_kN_m3']; nu=up['basis']['material']['nu']
    q=up['basis']['roof_LL_kgf_m2']*up['basis']['gravity_m_s2']/1000
    lh,cells=make_half_cells(g,t,mesh['target_m'],mesh['arc_divisions']); nHalf=len(cells)
    ny=2*math.ceil(L/mesh['target_m']/2); nr=mesh['through_thickness']; dy=L/ny
    nw=next(i for i,c in enumerate(cells) if c['region']=='shoulder'); na=mesh['arc_divisions']
    def coord(i,j,k):
        right=i>nHalf; h=2*nHalf-i if right else i; u=t*k/nr
        if h<=nw: x,z=t-u,lh[h][1]
        elif h<=nw+na:
            theta=math.pi-(h-nw)*math.pi/(2*na); radius=R-t+u
            x,z=R+radius*math.cos(theta),H-R+radius*math.sin(theta)
        else: x,z=lh[h][0],H-t+u
        return np.array([B-x if right else x,L*j/ny,z])
    ops.wipe(); ops.model('basic','-ndm',3,'-ndf',3); ops.nDMaterial('ElasticIsotropic',1,E,nu,0.)
    grid={}; nodes={}; loads={}; bases={'LH':[],'RH':[]}
    for i in range(2*nHalf+1):
        for j in range(ny+1):
            for k in range(nr+1):
                n=len(nodes)+1; p=coord(i,j,k); grid[i,j,k]=n; nodes[n]=p; loads[n]=np.zeros(3); ops.node(n,*p)
                if i in (0,2*nHalf):
                    ops.fix(n,1,int(j==ny//2 and k==nr//2),1); bases['LH' if i==0 else 'RH'].append(n)
    elements=[]; min_weight=1.; mesh_volume=0.; min_det=float('inf')
    # Geometry Jacobian is constant in Y; evaluate 8 integration points, once per profile/thickness cell.
    gp_data=[]
    for xi in [-GP,GP]:
        for eta in [-GP,GP]:
            for zeta in [-GP,GP]:
                factors=1+SIGNS*np.array([xi,eta,zeta]); dN=np.column_stack([SIGNS[:,d]*np.prod(factors[:,[h for h in range(3) if h!=d]],axis=1)/8 for d in range(3)])
                gp_data.append(dN)
    for i in range(2*nHalf):
        hand='LH' if i<nHalf else 'RH'; ci=i if hand=='LH' else 2*nHalf-i-1; c=cells[ci]
        for k in range(nr):
            if c['region']=='shoulder':
                a=math.pi-(ci-nw)*math.pi/(2*na); b=a-math.pi/(2*na)
                r0=R-t+t*k/nr; r1=R-t+t*(k+1)/nr
                area=(r1*r1-r0*r0)*(a-b)/2
                xg=R+(2/3)*(r1**3-r0**3)/(r1*r1-r0*r0)*(math.sin(a)-math.sin(b))/(a-b)
            else:
                area=c['volume_per_y']/nr
                xg=t-(k+.5)*t/nr if c['region']=='wall' else c['xg']
            if hand=='RH': xg=B-xg
            for j in range(ny):
                ids=[grid[i,j,k],grid[i+1,j,k],grid[i+1,j+1,k],grid[i,j+1,k],grid[i,j,k+1],grid[i+1,j,k+1],grid[i+1,j+1,k+1],grid[i,j+1,k+1]]
                p=np.array([nodes[n] for n in ids]); mean=p.mean(axis=0)
                if j==0:
                    determinants=[float(np.linalg.det(p.T@dN)) for dN in gp_data]; min_det=min(min_det,*determinants)
                    cell_mesh_volume=sum(determinants); mesh_volume+=cell_mesh_volume*ny
                tag=len(elements)+1; ops.element('stdBrick',tag,*ids,1)
                dx=p[:,0]-mean[0]; weights=np.ones(8)/8+dx*(xg-mean[0])/np.dot(dx,dx)
                min_weight=min(min_weight,float(min(weights))); weight=gamma*area*dy
                eload=np.zeros((8,3)); eload[:,2]=-weight*weights
                ll=q*c['roof_dx']*dy if k==nr-1 and (pattern=='FULL' or hand=='LH') else 0.
                eload[4:,2]-=ll/4
                rxg=c['roof_xg'] if hand=='LH' else B-c['roof_xg']
                for n,f in zip(ids,eload): loads[n]+=f
                elements.append({'id':tag,'nodes':ids,'hand':hand,'row':ci if hand=='LH' else i-nHalf,'region':c['region'],
                                 'end_nodes':[ids[n] for n in [1,2,5,6]],'loads':eload.tolist(),
                                 'physical_load_6':(physical_force(weight,xg,mean[1])+physical_force(ll,rxg,mean[1])).tolist()})
    if min_weight<0 or min_det<=0: raise RuntimeError('Invalid load weights or solid Jacobian')
    ops.timeSeries('Linear',1); ops.pattern('Plain',1,1)
    for n,f in loads.items(): ops.load(n,*f)
    print('SOLVING',mesh['id'],pattern,len(elements),'bricks',len(nodes),'nodes',flush=True)
    ops.constraints('Transformation'); ops.numberer('Plain'); ops.system('SuperLU')
    ops.algorithm('Linear'); ops.integrator('LoadControl',1.); ops.analysis('Static')
    code=ops.analyze(1)
    if code!=0: raise RuntimeError(f'Solid solve failed: {code}')
    ops.reactions()
    disps={n:np.array(ops.nodeDisp(n)) for n in nodes}; reactions={n:np.array(ops.nodeReaction(n)) for tags in bases.values() for n in tags}
    applied=resultant(nodes,loads,np.zeros(3)); reaction=resultant(nodes,reactions,np.zeros(3)); refF=-applied[2]
    physical=np.sum([e['physical_load_6'] for e in elements],axis=0)
    base={h:resultant(nodes,{n:reactions[n] for n in tags},np.array([t/2 if h=='LH' else B-t/2,L/2,t])).tolist() for h,tags in bases.items()}
    for e in elements:
        e['forces']=np.array(ops.eleForce(e['id'])).reshape(8,3).tolist()
        e['gauss_stress_kPa']=np.array(ops.eleResponse(e['id'],'stresses')).reshape(8,6).tolist()
    checks=cuts(basis,lh,[c['region'] for c in cells],nodes,elements,{n:reactions[n] for n in bases['LH']},refF)
    max_u=max(np.linalg.norm(u) for u in disps.values())*1000
    crown=disps[grid[nHalf,ny//2,nr//2]][2]*1000
    energy=sum(np.dot(loads[n],disps[n]) for n in nodes)/2
    exact_volume=sum(c['volume_per_y'] for c in cells)*L*2
    identifier=f'SOLID-T175-FR-{pattern}-{mesh["id"]}'
    summary={'id':identifier,'model':'solid','pattern':pattern,'mesh':mesh['id'],'t_m':t,'nodes':len(nodes),'elements':len(elements),'linear_system':'SuperLU / Plain numbering','solver_exit':0,
             'base':base,'max_displacement_mm':float(max_u),'crown_mid_uz_mm':float(crown),'strain_energy_kNm':float(energy),
             'total_load_6':applied.tolist(),'support_resultant_6':reaction.tolist(),'equilibrium_relative':error(applied+reaction,refF),
             'exact_load_mapping_relative':error(applied-physical,refF),'mesh_volume_m3':mesh_volume,'exact_physical_volume_m3':exact_volume,
             'mesh_volume_error_relative':abs(mesh_volume/exact_volume-1),'min_jacobian_m3':min_det,'minimum_gravity_nodal_fraction':min_weight,'cuts':checks}
    write(identifier+'.json',{'summary':summary,'nodes':{n:p.tolist() for n,p in nodes.items()},'loads':{n:f.tolist() for n,f in loads.items()},'displacements':{n:u.tolist() for n,u in disps.items()},'elements':elements,'bases':bases,'stress_order':['xx','yy','zz','xy','yz','zx'],'stress_units':'kPa; tension positive','gauss_order':'xi(s) outer loop, eta(Y) middle, zeta(thickness) inner; -GP,+GP'})
    print('DONE',identifier,'Umax',max_u,'mm','cut',max(c['fbd_relative'] for c in checks),flush=True)
    return summary


def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--reuse',action='store_true'); args=parser.parse_args()
    basis=read(BPATH); up=read(basis['upstream']); bench=read(basis['benchmark_source'])
    for report in [up,bench]:
        for p,h in report['dependency_hashes'].items():
            if sha(ROOT/p)!=h: raise RuntimeError('Stale dependency '+p)
    clause=read('knowledge/modular-tsc-step2b/clause_register.json')
    if sha(ROOT/'วสท อนุญาติแล้ว.pdf')!=clause['source_sha256']: raise RuntimeError('Code source changed')
    if ops.version()!=basis['solid']['solver_version']: raise RuntimeError('Solver version mismatch')
    g=read('knowledge/modular-tsc-step2a/study_basis.json')['geometry']; OUT.mkdir(parents=True,exist_ok=True)
    patch=brick_patch_test(up['runs'][0]['E_MPa']*1000)
    if patch['relative_error']>1e-8: raise RuntimeError('Patch test failed')
    audits=[]; solids=[]
    # Reuse only with an exact source/basis/solver fingerprint, never just a matching filename.
    raw_sources=[f'output/tsc-step2b-r00/T175-{j}-FULL-{m}.json' for j in basis['shell_audit']['joints'] for m in basis['shell_audit']['meshes']]
    inputs={p:sha(ROOT/p) for p in [BPATH,basis['upstream'],basis['benchmark_source'],'tools/tsc-study/bay_study.py',*up['dependency_hashes'],*bench['dependency_hashes'],*raw_sources]}
    fingerprint=sha(ROOT/'.local-engineering-runtime/openseespywin/opensees.pyd')+json.dumps(inputs,sort_keys=True)
    for j in basis['shell_audit']['joints']:
        for m in basis['shell_audit']['meshes']:
            cache=OUT/f'cache-AUDIT-T175-{j}-FULL-{m}.json'
            if args.reuse and cache.exists() and json.loads(cache.read_text())['fingerprint']==fingerprint: result=json.loads(cache.read_text())['result']
            else: result=shell_audit(basis,up,g,j,m); write(cache.name,{'fingerprint':fingerprint,'result':result})
            audits.append(result)
    for pattern in basis['solid']['patterns']:
        for mesh in basis['solid']['meshes']:
            cache=OUT/f'cache-SOLID-{pattern}-{mesh["id"]}.json'
            if args.reuse and cache.exists() and json.loads(cache.read_text())['fingerprint']==fingerprint: result=json.loads(cache.read_text())['result']
            else: result=solid_run(basis,up,g,mesh,pattern); write(cache.name,{'fingerprint':fingerprint,'result':result})
            solids.append(result)
    comparisons=[]
    for pattern in basis['solid']['patterns']:
        a,b=[s for s in solids if s['pattern']==pattern][-2:]
        shell=next(s for s in up['runs'] if s['id']==f'T175-F-R-{pattern}-'+('M4' if pattern=='FULL' else 'M3'))
        reaction=max(abs(b['base'][h][k]-a['base'][h][k])/max(abs(b['base'][h][k]),.1) for h in ['LH','RH'] for k in [0,2,4])
        cut=max(abs(bc['cut_on_lower_LH_6'][k]-ac['cut_on_lower_LH_6'][k])/max(abs(bc['cut_on_lower_LH_6'][k]),.1) for ac,bc in zip(a['cuts'],b['cuts']) for k in [0,2,4])
        displacement=abs(b['max_displacement_mm']-a['max_displacement_mm'])/max(abs(b['max_displacement_mm']),.001)
        comparisons.append({'pattern':pattern,'solid_last_pair':[a['mesh'],b['mesh']],'displacement_change':displacement,'reaction_change':reaction,'cut_change':cut,
                            'global_mesh_targets_met':bool(displacement<=.05 and reaction<=.02 and cut<=.05),'shell_reference':shell['id'],
                            'solid_vs_shell_crown_uz_relative':b['crown_mid_uz_mm']/shell['crown_mid_uz_mm']-1,
                            'solid_vs_shell_base_LH_6_difference':(np.array(b['base']['LH'])-shell['base']['LH']).tolist()})
    report={'id':basis['id'],'revision':basis['revision'],'status':'PARTIAL_SOLID_AND_CUT_QA_NOT_FOR_DESIGN','basis':basis,'solver':up['solver'],'brick_patch':patch,
            'shell_audits':audits,'solid_runs':solids,'comparisons':comparisons,'dependency_hashes':inputs,
            'raw_output_hashes':{f'output/tsc-step2d-r00/{r["id"]}.json':sha(OUT/f'{r["id"]}.json') for r in audits+solids},
            'local_stress_convergence':'NOT_ESTABLISHED','engineering_approval':False,'manufacturing_release':False}
    write('bay_results.json',report); print('FINISHED',json.dumps(comparisons),flush=True)


if __name__=='__main__': main()
