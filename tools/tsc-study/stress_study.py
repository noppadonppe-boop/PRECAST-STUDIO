"""S2E: saved-displacement stress diagnostic, no new FEM solve or design approval."""
from pathlib import Path
import hashlib
import json
import math
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/tsc-step2e-r00'
BPATH='knowledge/modular-tsc-step2e/basis.json'
SIGNS=np.array([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],dtype=float)
GP=1/math.sqrt(3)
GPS=[np.array([a,b,c]) for a in [-GP,GP] for b in [-GP,GP] for c in [-GP,GP]]

def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8'))
def sha(p): return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def write(p,v): (OUT/p).write_text(json.dumps(v,separators=(',',':'),allow_nan=False),encoding='utf-8')

def shape(q):
    factors=1+SIGNS*q
    N=np.prod(factors,axis=1)/8
    dN=np.column_stack([SIGNS[:,i]*np.prod(factors[:,[j for j in range(3) if j!=i]],axis=1)/8 for i in range(3)])
    return N,dN

def tensor_from_grad(grad,E,nu):
    mu=E/(2*(1+nu)); lam=E*nu/((1+nu)*(1-2*nu))
    return mu*(grad+np.swapaxes(grad,-1,-2))+lam*np.trace(grad,axis1=-2,axis2=-1)[...,None,None]*np.eye(3)

def tensor_at(p,u,q,E,nu):
    _,dN=shape(q)
    return tensor_from_grad(u.T@dN@np.linalg.inv(p.T@dN),E,nu)

def six(T): return T[..., [0,1,2,0,0,1],[0,1,2,1,2,2]]

def inverse(p,xyz):
    q=np.zeros(3)
    for _ in range(12):
        N,dN=shape(q); delta=N@p-xyz
        if np.max(abs(delta))<1e-11: break
        q-=np.linalg.solve(p.T@dN,delta)
    residual=float(np.max(abs(shape(q)[0]@p-xyz)))
    return q,residual

def point(st,hand,y,f,g,t):
    R,H,B=g['outer_shoulder_radius_m'],g['overall_height_m'],g['width_m']
    if st['region']=='wall':
        x,z=t*(1-f),st['z_m']; a=0.
    elif st['region']=='roof':
        x,z=st['x_LH_m'],H-t+t*f; a=math.pi/2
    else:
        a=math.radians(st['angle_from_wall_deg']); radius=R-t+t*f
        x,z=R-radius*math.cos(a),H-R+radius*math.sin(a)
    s=np.array([math.sin(a),0.,math.cos(a)]); n=np.array([-math.cos(a),0.,math.sin(a)])
    if hand=='RH':
        x=B-x; s=np.array([s[0],0.,-s[2]]); n=np.array([-n[0],0.,n[2]])
    Q=np.array([s,[0.,1.,0.],n])
    return np.array([x,y,z]),Q

def synthetic_checks(E,nu):
    p=(SIGNS+1)/2
    # Affine field on a non-axis-aligned brick with translation; exact constant gradient.
    transform=np.array([[1.2,.1,.2],[.1,.8,.05],[0.,.1,1.1]])
    p=p@transform.T+np.array([.2,.3,.4])
    grad=np.array([[1e-5,2e-5,-3e-6],[-1e-5,4e-6,7e-6],[9e-6,-2e-6,-8e-6]])
    u=p@grad.T+np.array([.01,-.02,.03]); exact=tensor_from_grad(grad,E,nu)
    stress_error=0.; mapping_error=0.
    for q in GPS+[np.array([.4,-.7,.25])]:
        x=shape(q)[0]@p; qi,res=inverse(p,x)
        stress_error=max(stress_error,float(np.max(abs(tensor_at(p,u,qi,E,nu)-exact))))
        mapping_error=max(mapping_error,res,float(np.max(abs(q-qi))))
    return {'affine_stress_error_kPa':stress_error,'inverse_mapping_error':mapping_error}

def process(raw,basis,g,E,nu):
    summary=raw['summary']; elements=raw['elements']
    p=np.array([[raw['nodes'][str(n)] for n in e['nodes']] for e in elements])
    u=np.array([[raw['displacements'][str(n)] for n in e['nodes']] for e in elements])
    low=p.min(axis=1); high=p.max(axis=1)
    recorded=np.array([e['gauss_stress_kPa'] for e in elements])
    # All Gauss points, not a selected stress subset; legacy order xx yy zz xy yz zx.
    gauss_error=0.
    for k,q in enumerate(GPS):
        _,dN=shape(q); J=np.einsum('eni,nj->eij',p,dN)
        grad=np.einsum('eni,nj->eij',u,dN)@np.linalg.inv(J)
        T=tensor_from_grad(grad,E,nu)
        actual=T[:,[0,1,2,0,1,2],[0,1,2,1,2,0]]
        gauss_error=max(gauss_error,float(np.max(abs(actual-recorded[:,k,:]))))
    qa=basis['qa_declared_before_postprocessing']
    if gauss_error>qa['gauss_reproduction_max_absolute_kPa']: raise RuntimeError('Saved Gauss reproduction failed')
    samples=[]; max_residual=0.
    hands=np.array([e['hand'] for e in elements])
    for hand in basis['hands']:
        for st in basis['stations']:
            for y in basis['y_m']:
                group=st['zone'] if st['zone']!='regular' else ('regular_interior' if y in basis['interior_y_m'] else 'side_edge')
                for f in basis['thickness_fraction_from_inner']:
                    xyz,Q=point(st,hand,y,f,g,summary['t_m'])
                    indices=np.flatnonzero(np.all(xyz>=low-1e-9,axis=1)&np.all(xyz<=high+1e-9,axis=1)&(hands==hand))
                    sides=[]
                    for i in indices:
                        q,res=inverse(p[i],xyz)
                        if np.max(abs(q))>1+1e-7: continue
                        if res>qa['inverse_mapping_residual_m']: raise RuntimeError('Inverse map failed')
                        max_residual=max(max_residual,res)
                        T=tensor_at(p[i],u[i],q,E,nu); local=Q@T@Q.T
                        sides.append({'element':elements[i]['id'],'natural':q.tolist(),'local_kPa':six(local).tolist()})
                    if not sides: raise RuntimeError(f'Point outside faceted mesh: {hand} {st} {y} {f}')
                    vals=np.array([s['local_kPa'] for s in sides])
                    samples.append({'key':f'{hand}/{st["id"]}/Y{y}/F{f}','hand':hand,'station':st['id'],'y_m':y,'fraction':f,'group':group,
                                    'xyz_m':xyz.tolist(),'axes_s_y_n':Q.tolist(),'mean_kPa':vals.mean(axis=0).tolist(),
                                    'min_kPa':vals.min(axis=0).tolist(),'max_kPa':vals.max(axis=0).tolist(),'sides':sides})
    result={'id':summary['id'],'mesh':summary['mesh'],'pattern':summary['pattern'],'samples':samples,'sample_count':len(samples),
            'gauss_reproduction_max_error_kPa':gauss_error,'gauss_points_checked':len(elements)*8,'max_inverse_mapping_residual_m':max_residual}
    write('STRESS-'+summary['id']+'.json',result)
    print(summary['id'],len(samples),'points; Gauss reproduction error',gauss_error,flush=True)
    return result

def compare(a,b,basis):
    qa=basis['qa_declared_before_postprocessing']; floor=qa['stress_reference_floor_kPa']; groups=[]
    for group in basis['groups']:
        ap=[p for p in a['samples'] if p['group']==group]; bp=[p for p in b['samples'] if p['group']==group]
        if [p['key'] for p in ap]!=[p['key'] for p in bp]: raise RuntimeError('Point grid differs')
        av=np.array([p['mean_kPa'] for p in ap]); bv=np.array([p['mean_kPa'] for p in bp])
        diff=abs(bv-av); norm=np.maximum(abs(bv),floor); change=diff/norm
        spread=np.array([np.array(p['max_kPa'])-p['min_kPa'] for p in bp]); relspread=spread/norm
        rms=np.sqrt(np.mean(diff**2,axis=0))/np.maximum(np.sqrt(np.mean(bv**2,axis=0)),floor)
        fields=[]
        for k,name in enumerate(basis['stress_order']):
            i=int(np.argmax(change[:,k])); j=int(np.argmax(relspread[:,k]))
            fields.append({'component':name,'max_point_change':float(change[i,k]),'rms_change':float(rms[k]),
                           'max_spread_relative':float(relspread[j,k]),'worst_point':bp[i]['key'],
                           'coarse_kPa':float(av[i,k]),'fine_kPa':float(bv[i,k]),'difference_kPa':float(diff[i,k]),
                           'spread_point':bp[j]['key'],'spread_kPa':float(spread[j,k]),
                           'targets_met':bool(change[i,k]<=qa['max_point_relative_change'] and rms[k]<=qa['component_rms_relative_change'] and relspread[j,k]<=qa['one_sided_spread_relative'])})
        groups.append({'group':group,'points':len(bp),'fields':fields,'all_six_targets_met':all(f['targets_met'] for f in fields)})
    return {'pattern':b['pattern'],'pair':[a['mesh'],b['mesh']],'groups':groups}

def main():
    basis=read(BPATH); upstream=read(basis['upstream']); OUT.mkdir(parents=True,exist_ok=True)
    for p,h in {**upstream['dependency_hashes'],**upstream['raw_output_hashes']}.items():
        if sha(p)!=h: raise RuntimeError('Stale upstream '+p)
    clause=read('knowledge/modular-tsc-step2b/clause_register.json')
    if sha('วสท อนุญาติแล้ว.pdf')!=clause['source_sha256']: raise RuntimeError('Code source changed')
    previous=read('output/tsc-step2b-r00/shell_results.json'); E=previous['runs'][0]['E_MPa']*1000; nu=previous['basis']['material']['nu']
    g=read('knowledge/modular-tsc-step2a/study_basis.json')['geometry']; checks=synthetic_checks(E,nu)
    if checks['affine_stress_error_kPa']>1e-6 or checks['inverse_mapping_error']>1e-9: raise RuntimeError('Synthetic check failed')
    runs=[]; raw_paths=[]
    for pattern in basis['patterns']:
        for mesh in basis['meshes']:
            path=f'output/tsc-step2d-r00/SOLID-T175-FR-{pattern}-{mesh}.json'; raw_paths.append(path)
            runs.append(process(read(path),basis,g,E,nu))
    comparisons=[]
    for pattern in basis['patterns']:
        a,b=[r for r in runs if r['pattern']==pattern][-2:]; comparisons.append(compare(a,b,basis))
    dependencies={p:sha(p) for p in [*upstream['dependency_hashes'],basis['upstream'],BPATH,'tools/tsc-study/stress_study.py']}
    report={'id':basis['id'],'revision':basis['revision'],'status':'LOCAL_STRESS_DIAGNOSTIC_NOT_FOR_DESIGN','basis':basis,'source_solver':upstream['solver'],
            'E_MPa':E/1000,'nu':nu,'postprocessor_numpy_version':np.__version__,'synthetic_checks':checks,'runs':runs,'comparisons':comparisons,
            'dependency_hashes':dependencies,'raw_source_hashes':{p:sha(p) for p in raw_paths},
            'raw_output_hashes':{f'output/tsc-step2e-r00/STRESS-{r["id"]}.json':sha(f'output/tsc-step2e-r00/STRESS-{r["id"]}.json') for r in runs},
            'new_FEM_solves':0,'prior_peak_criteria_superseded':False,'whole_model_local_stress_convergence':'NOT_ESTABLISHED',
            'engineering_approval':False,'manufacturing_release':False}
    write('stress_results.json',report)
    print('FINISHED',json.dumps([{'pattern':c['pattern'],'groups':[{ 'group':g['group'],'met':g['all_six_targets_met'],'max_change':max(f['max_point_change'] for f in g['fields']),'max_spread':max(f['max_spread_relative'] for f in g['fields'])} for g in c['groups']]} for c in comparisons]),flush=True)

if __name__=='__main__': main()
