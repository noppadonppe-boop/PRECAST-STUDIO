"""Traceable local-only OpenSees shell sensitivity. Never a design/approval service."""
from pathlib import Path
import hashlib
import json
import math
import sys
import platform
import importlib.metadata

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '.local-engineering-runtime'))
import numpy as np
import openseespy.opensees as ops

OUT = ROOT / 'output/tsc-step2b-r00'
BASIS_PATH = ROOT / 'knowledge/modular-tsc-step2b/basis.json'
FIELDS = ['Nss', 'Nyy', 'Nsy', 'Mss', 'Myy', 'Msy', 'Qs', 'Qy']


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def solve():
    ops.constraints('Transformation')
    ops.numberer('RCM')
    ops.system('UmfPack')
    ops.test('NormDispIncr', 1e-12, 20)
    ops.algorithm('Linear')
    ops.integrator('LoadControl', 1.0)
    ops.analysis('Static')
    code = ops.analyze(1)
    if code != 0:
        raise RuntimeError(f'OpenSees failed, code {code}')
    ops.reactions()


def benchmarks():
    # Flat, free-sided cantilever: nu=0 suppresses anticlastic coupling.
    E, t, length, width, P = 25e6, .1, 3., 1., 1.
    bending = P * length**3 / (3 * E * width * t**3 / 12)
    shear = P * length / ((5/6) * (E/2) * width * t)
    beam_results = []
    for nx, ny in [(12,4),(24,8),(48,16)]:
        ops.wipe(); ops.model('basic','-ndm',3,'-ndf',6)
        ops.section('ElasticMembranePlateSection',1,E,0.,t,0.)
        node = lambda i,j: 1+i*(ny+1)+j
        for i in range(nx+1):
            for j in range(ny+1):
                ops.node(node(i,j),length*i/nx,width*j/ny,0.)
                if i == 0: ops.fix(node(i,j),1,1,1,1,1,1)
        for i in range(nx):
            for j in range(ny):
                ops.element('ShellMITC4',1+i*ny+j,node(i,j),node(i+1,j),node(i+1,j+1),node(i,j+1),1)
        ops.timeSeries('Linear',1); ops.pattern('Plain',1,1)
        for j in range(ny+1):
            ops.load(node(nx,j),0.,0.,-P/ny*(.5 if j in (0,ny) else 1),0.,0.,0.)
        solve()
        uz = -ops.nodeDisp(node(nx,ny//2),3)
        stress = np.array(ops.eleResponse(1,'stresses')).reshape(4,8)
        beam_results.append({'mesh':[nx,ny],'uz_m':uz,'reference_m':bending+shear,'relative_error':abs(uz/(bending+shear)-1), 'root_gauss_Mss_raw':stress[:,3].tolist()})
    # Exact constant-strain membrane patch, imposed affine displacements.
    ops.wipe(); ops.model('basic','-ndm',3,'-ndf',6)
    nu, eps = .2, 1e-5
    ops.section('ElasticMembranePlateSection',1,E,nu,t,0.)
    pts = [(0.,0.,0.),(1.,0.,0.),(1.,1.,0.),(0.,1.,0.)]
    for n,p in enumerate(pts,1): ops.node(n,*p); ops.fix(n,0,0,1,1,1,1)
    ops.element('ShellMITC4',1,1,2,3,4,1)
    ops.timeSeries('Linear',1); ops.pattern('Plain',1,1)
    for n,(x,y,z) in enumerate(pts,1): ops.sp(n,1,eps*x); ops.sp(n,2,-nu*eps*y)
    solve()
    response = np.array(ops.eleResponse(1,'stresses')).reshape(4,8)
    expected = E*t*eps
    error = max(np.max(abs(response[:,0]-expected)),np.max(abs(response[:,1:]))) / expected
    return {'cantilever':beam_results,'membrane':{'Nss_expected_kN_m':expected,'gauss_resultants':response.tolist(),'relative_error':float(error)}}


def make_half_cells(g,t,h,narc):
    B,H,R,L = g['width_m'],g['overall_height_m'],g['outer_shoulder_radius_m'],g['bay_length_m']
    r,rm = R-t,R-t/2
    pts = [(t/2,t)]; cells=[]
    def push(p,volume_per_y,xg,roof_dx=0.,roof_xg=0.,region='wall'):
        cells.append({'volume_per_y':volume_per_y,'xg':xg,'roof_dx':roof_dx,'roof_xg':roof_xg,'region':region})
        pts.append(p)
    nw=math.ceil((H-R-t)/h)
    for i in range(nw):
        z0=t+(H-R-t)*i/nw; z1=t+(H-R-t)*(i+1)/nw
        push((t/2,z1),t*(z1-z0),t/2)
    radial_centroid=(2/3)*(R**3-r**3)/(R**2-r**2)
    for i in range(narc):
        a=math.pi-i*math.pi/(2*narc); b=math.pi-(i+1)*math.pi/(2*narc)
        xg=R+radial_centroid*(math.sin(a)-math.sin(b))/(a-b)
        xo0=R+R*math.cos(a); xo1=R+R*math.cos(b)
        push((R+rm*math.cos(b),H-R+rm*math.sin(b)),(R**2-r**2)*(a-b)/2,xg,xo1-xo0,(xo0+xo1)/2,'shoulder')
    nr=math.ceil((B/2-R)/h)
    for i in range(nr):
        x0=R+(B/2-R)*i/nr; x1=R+(B/2-R)*(i+1)/nr
        push((x1,H-t/2),t*(x1-x0),(x0+x1)/2,x1-x0,(x0+x1)/2,'roof')
    return pts,cells


def run_case(basis,g,t,mesh,joint,pattern,E_scale=1.,save=False):
    mat=basis['material']; L=g['bay_length_m']; B=g['width_m']; H=g['overall_height_m']
    rho=mat['density_kg_m3']; gamma=rho*basis['gravity_m_s2']/1000
    E=.043*rho**1.5*math.sqrt(mat['fc_ksc']*mat['ksc_to_MPa'])*1000*E_scale
    q=basis['roof_LL_kgf_m2']*basis['gravity_m_s2']/1000
    ny=2*math.ceil(L/mesh['target_m']/2)
    lh,cells=make_half_cells(g,t,mesh['target_m'],mesh['arc_divisions'])
    rh=[(B-x,z) for x,z in reversed(lh)]
    rcells=[{**c,'xg':B-c['xg'],'roof_xg':B-c['roof_xg']} for c in reversed(cells)]
    ops.wipe(); ops.model('basic','-ndm',3,'-ndf',6)
    ops.section('ElasticMembranePlateSection',1,E,mat['nu'],t,0.)
    nodes={}; loads={}; elements=[]; grids={}; bases={}; crowns={}; parts={}
    for hand,profile,cell_data in [('LH',lh,cells),('RH',rh,rcells)]:
        grid=[]
        for i,(x,z) in enumerate(profile):
            row=[]
            for j in range(ny+1):
                tag=len(nodes)+1; p=np.array([x,L*j/ny,z]); nodes[tag]=p; loads[tag]=np.zeros(6)
                ops.node(tag,*p); row.append(tag); parts[tag]=hand
            grid.append(row)
        grids[hand]=grid
        bases[hand]=grid[0] if hand=='LH' else grid[-1]
        crowns[hand]=grid[-1] if hand=='LH' else grid[0]
        for j,tag in enumerate(bases[hand]):
            fixed=int(joint['base']=='FIXED_LINE')
            ops.fix(tag,1,int(j==ny//2),1,fixed,fixed,fixed)
        for i,c in enumerate(cell_data):
            for j in range(ny):
                tags=[grid[i][j],grid[i+1][j],grid[i+1][j+1],grid[i][j+1]]
                tag=len(elements)+1
                ops.element('ShellMITC4',tag,*tags,1)
                p=np.array([nodes[n] for n in tags]); mean=p.mean(axis=0)
                e1=(p[1]-p[0]); e1/=np.linalg.norm(e1); e2=np.array([0.,1.,0.]); normal=np.cross(e1,e2)
                weight=gamma*c['volume_per_y']*L/ny
                roof=q*c['roof_dx']*L/ny if pattern=='FULL' or hand=='LH' else 0.
                my=weight*(c['xg']-mean[0])+roof*(c['roof_xg']-mean[0])
                for n in tags:
                    loads[n][2]-=(weight+roof)/4
                    loads[n][4]+=my/4
                elements.append({'id':tag,'nodes':tags,'hand':hand,'region':c['region'],'centroid':mean.tolist(),'e1':e1.tolist(),'e2':e2.tolist(),'normal':normal.tolist()})
    for left,right in zip(crowns['LH'],crowns['RH']):
        ops.equalDOF(left,right,*([1,2,3,4,5,6] if joint['crown']=='RIGID' else [1,2,3,4,6]))
    ops.timeSeries('Linear',1); ops.pattern('Plain',1,1)
    for tag,load in loads.items(): ops.load(tag,*load)
    solve()
    reactions={n:np.array(ops.nodeReaction(n)) for n in nodes}
    displacements={n:np.array(ops.nodeDisp(n)) for n in nodes}
    def resultant(vectors,tags,origin=(0.,0.,0.)):
        f=np.zeros(3); m=np.zeros(3)
        for n in tags:
            f+=vectors[n][:3]; m+=vectors[n][3:]+np.cross(nodes[n]-origin,vectors[n][:3])
        return np.r_[f,m]
    total_load=resultant(loads,nodes)
    all_base=bases['LH']+bases['RH']
    total_reaction=resultant(reactions,all_base)
    residual=total_load+total_reaction
    refF=max(abs(total_load[2]),1.); refM=refF*max(B,H,L)
    eq=max(np.max(abs(residual[:3]))/refF,np.max(abs(residual[3:]))/refM)
    cr_ref=np.array([B/2,L/2,H-t/2])
    crown={hand:resultant(reactions,ids,cr_ref) for hand,ids in crowns.items()}
    pair=crown['LH']+crown['RH']
    pair_error=max(np.max(abs(pair[:3]))/refF,np.max(abs(pair[3:]))/refM)
    base={hand:resultant(reactions,ids,np.array([t/2 if hand=='LH' else B-t/2,L/2,t])) for hand,ids in bases.items()}
    rows=[]; interior=[]
    for e in elements:
        stress=np.array(ops.eleResponse(e['id'],'stresses')).reshape(4,8)
        if not np.all(np.isfinite(stress)): raise RuntimeError('Non-finite resultants')
        e['gauss_resultants']=stress.tolist(); e['mean_resultants']=stress.mean(axis=0).tolist()
        rows.extend(stress.tolist())
        x,y,z=e['centroid']; d=basis['qa_criteria_set_before_run']['resultant_exclusion_m']
        if z>t+d and abs(x-B/2)>d and d<y<L-d: interior.extend(stress.tolist())
    values=np.array(rows); inner=np.array(interior)
    def stats(v):
        return {k:{'min':float(v[:,i].min()),'max':float(v[:,i].max()),'abs_max':float(abs(v[:,i]).max())} for i,k in enumerate(FIELDS)}
    max_u=max(np.linalg.norm(u[:3]) for u in displacements.values())
    work=sum(np.dot(loads[n],displacements[n]) for n in nodes)
    if not math.isfinite(max_u) or work<=0: raise RuntimeError('Invalid displacement/energy')
    summary={'id':f'T{round(t*1000)}-{joint["id"]}-{pattern}-{mesh["id"]}', 't_m':t,'joint':joint['id'],'pattern':pattern,'mesh':mesh['id'], 'nodes':len(nodes),'elements':len(elements),'E_MPa':E/1000,'gamma_kN_m3':gamma,'total_load_6':total_load.tolist(),'support_resultant_6':total_reaction.tolist(),'equilibrium_residual_6':residual.tolist(),'equilibrium_relative':float(eq),'interface_pair_relative':float(pair_error),'base':{k:v.tolist() for k,v in base.items()},'crown_on_half':{k:v.tolist() for k,v in crown.items()},'max_displacement_mm':float(max_u*1000),'crown_mid_uz_mm':float(displacements[crowns['LH'][ny//2]][2]*1000),'strain_energy_kNm':float(work/2),'all_gauss_extrema':stats(values),'interior_gauss_extrema':stats(inner),'solver_exit':0}
    # Exact S2A three-hinge equilibrium, independently reconstructed from physical cells.
    w=gamma*sum(c['volume_per_y'] for c in cells)*L
    xg=sum(c['volume_per_y']*c['xg'] for c in cells)/sum(c['volume_per_y'] for c in cells)
    pl=q*B*L/2; pr=pl if pattern=='FULL' else 0.; a=t/2
    rzR=(w*(xg-a)+w*(B-xg-a)+pl*(B/4-a)+pr*(3*B/4-a))/(B-2*a)
    rzL=2*w+pl+pr-rzR; cz=w+pl-rzL
    thrust=(w*(xg-a)+pl*(B/4-a)-(B/2-a)*cz)/(H-t/2-t)
    if joint['id']=='P-H':
        expected=np.array([thrust,rzL,rzR,cz]); actual=np.array([base['LH'][0],base['LH'][2],base['RH'][2],crown['LH'][2]])
        summary['three_hinge_check']={'expected_H_RLz_RRz_Cz':expected.tolist(),'actual':actual.tolist(),'relative_error':float(max(abs(actual-expected)/np.maximum(abs(expected),.1)))}
    if save:
        payload={'summary':summary,'nodes':{str(n):p.tolist() for n,p in nodes.items()},'loads':{str(n):f.tolist() for n,f in loads.items()},'displacements':{str(n):u.tolist() for n,u in displacements.items()},'elements':elements,'bases':bases,'crowns':crowns,'gauss_order':'(-,-),(+,-),(+,+),(-,+)','fields':FIELDS,'units':'N,Q kN/m; M kNm/m; displacement m; rotations rad'}
        (OUT/f'{summary["id"]}.json').write_text(json.dumps(payload,separators=(',',':')),encoding='utf-8')
    return summary


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    basis=json.loads(BASIS_PATH.read_text(encoding='utf-8'))
    clause=json.loads((ROOT/'knowledge/modular-tsc-step2b/clause_register.json').read_text(encoding='utf-8'))
    if sha(ROOT/'วสท อนุญาติแล้ว.pdf')!=clause['source_sha256']:
        raise RuntimeError('Code source changed; recheck Ec clause before solving')
    g=json.loads((ROOT/basis['geometry_source']).read_text(encoding='utf-8'))['geometry']
    if ops.version()!=basis['solver']['expected_version']: raise RuntimeError('Solver version mismatch')
    checks=benchmarks(); qa=basis['qa_criteria_set_before_run']
    if checks['cantilever'][-1]['relative_error']>qa['flat_cantilever_displacement_relative'] or checks['membrane']['relative_error']>qa['membrane_patch_relative']: raise RuntimeError('Independent benchmark failed')
    print('BENCHMARKS',json.dumps(checks),flush=True)
    results=[]
    for t in basis['thicknesses_m']:
        for joint in basis['joints']:
            for pattern in basis['load_patterns']:
                for mesh in basis['mesh_levels']:
                    result=run_case(basis,g,t,mesh,joint,pattern,save=True)
                    results.append(result)
                    print(result['id'],result['elements'],'elements',round(result['max_displacement_mm'],6),'mm','eq',result['equilibrium_relative'],flush=True)
    follow=basis['refinement_followup']
    for joint in basis['joints']:
        if joint['id'] in follow['joint_ids']:
            result=run_case(basis,g,follow['t_m'],follow['mesh'],joint,follow['pattern'],save=True)
            results.append(result)
            print('REFINEMENT',result['id'],result['elements'],'elements',flush=True)
    ref=next(r for r in results if r['id']=='T175-P-R-FULL-M2')
    scaled=run_case(basis,g,.175,basis['mesh_levels'][1],basis['joints'][1],'FULL',E_scale=.5)
    checks['E_scaling']={'E_multiplier':.5,'displacement_ratio':scaled['max_displacement_mm']/ref['max_displacement_mm'],'expected_ratio':2.,'base_force_max_difference_kN':max(abs(scaled['base'][h][k]-ref['base'][h][k]) for h in ['LH','RH'] for k in [0,1,2])}
    convergence=[]
    for t in basis['thicknesses_m']:
        for j in basis['joints']:
            for p in basis['load_patterns']:
                rows=[r for r in results if r['t_m']==t and r['joint']==j['id'] and r['pattern']==p]
                a,b=rows[-2:]
                u=abs(b['max_displacement_mm']-a['max_displacement_mm'])/max(abs(b['max_displacement_mm']),.001)
                reaction=max(abs(b['base'][h][k]-a['base'][h][k])/max(abs(b['base'][h][k]),.1) for h in ['LH','RH'] for k in [0,2,4])
                fields={k:abs(b['interior_gauss_extrema'][k]['abs_max']-a['interior_gauss_extrema'][k]['abs_max'])/max(b['interior_gauss_extrema'][k]['abs_max'],.1) for k in FIELDS}
                convergence.append({'t_m':t,'joint':j['id'],'pattern':p,'last_pair':[a['mesh'],b['mesh']],'displacement_change':u,'reaction_change':reaction,'interior_resultant_changes':fields,'global_targets_met':bool(u<=qa['mesh_last_pair_global_displacement_relative'] and reaction<=qa['mesh_last_pair_reaction_relative']),'interior_targets_met':bool(max(fields.values())<=qa['mesh_last_pair_interior_resultant_relative'])})
    dependencies=['knowledge/modular-tsc-step2a/study_basis.json','knowledge/modular-tsc-step2b/basis.json','knowledge/modular-tsc-step2b/clause_register.json','tools/tsc-study/shell_study.py','tools/tsc-study/requirements-shell.txt']
    report={'id':basis['id'],'revision':basis['revision'],'status':'ANALYSED_QA_INCOMPLETE_NOT_FOR_DESIGN','basis':basis,'solver':{'version':ops.version(),'python':platform.python_version(),'numpy':np.__version__,'openseespy':importlib.metadata.version('openseespy'),'openseespywin':importlib.metadata.version('openseespywin'),'binary_hash':sha(ROOT/'.local-engineering-runtime/openseespywin/opensees.pyd')},'benchmarks':checks,'runs':results,'convergence':convergence,'dependency_hashes':{p:sha(ROOT/p) for p in dependencies},'solid_comparison':'NOT_RUN','engineering_approval':False,'manufacturing_release':False}
    (OUT/'shell_results.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('SUMMARY',len(results),'runs; global mesh targets',sum(c['global_targets_met'] for c in convergence),'of',len(convergence),'interior',sum(c['interior_targets_met'] for c in convergence),flush=True)


if __name__=='__main__': main()
