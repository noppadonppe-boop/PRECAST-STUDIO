"""S2C diagnostics; preserves S2B. Local research, never an approval service."""
import json
import math
from pathlib import Path
import numpy as np
from shell_study import ROOT, FIELDS, sha, ops, solve

OUT = ROOT / 'output/tsc-step2c-r00'
BPATH = 'knowledge/modular-tsc-step2c/basis.json'
GP = 1 / math.sqrt(3)
SIGNS = np.array([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
                  [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]])
SHELL_GPS = np.array([[-GP,-GP],[GP,-GP],[GP,GP],[-GP,GP]])
RECOVER = np.linalg.inv(np.array([[1,x,y,x*y] for x,y in SHELL_GPS]))


def read(path):
    return json.loads((ROOT/path).read_text(encoding='utf-8'))


def brick_patch_test(E,nu=.2):
    """3D affine patch, free interior node; independently checks stress order/shear units."""
    ops.wipe(); ops.model('basic','-ndm',3,'-ndf',3)
    ops.nDMaterial('ElasticIsotropic',1,E,nu,0.)
    tag=lambda i,j,k:1+i*9+j*3+k
    for i in range(3):
        for j in range(3):
            for k in range(3): ops.node(tag(i,j,k),i/2,j/2,k/2)
    count=0
    for i in range(2):
        for j in range(2):
            for k in range(2):
                ids=[tag(i,j,k),tag(i+1,j,k),tag(i+1,j+1,k),tag(i,j+1,k),tag(i,j,k+1),tag(i+1,j,k+1),tag(i+1,j+1,k+1),tag(i,j+1,k+1)]
                count+=1; ops.element('stdBrick',count,*ids,1)
    ops.timeSeries('Linear',1); ops.pattern('Plain',1,1)
    eps,gamma=1e-5,2e-5
    for i in range(3):
        for j in range(3):
            for k in range(3):
                if (i,j,k)==(1,1,1): continue
                x,y,z=i/2,j/2,k/2
                for d,value in enumerate([eps*x+gamma*y,-nu*eps*y,-nu*eps*z],1): ops.sp(tag(i,j,k),d,value)
    solve()
    actual=np.array([ops.eleResponse(e,'stresses') for e in range(1,9)]).reshape(-1,6)
    expected=np.array([E*eps,0.,0.,E/(2*(1+nu))*gamma,0.,0.])
    return {'expected_stress_kPa':expected.tolist(),'relative_error':float(np.max(abs(actual-expected))/np.max(abs(expected))),'elements':8}


def fixed_stations(basis):
    spec = basis['fixed_station_study']; result=[]; paths=[]
    g=read('knowledge/modular-tsc-step2a/study_basis.json')['geometry']
    R,H,L=g['outer_shoulder_radius_m'],g['overall_height_m'],g['bay_length_m']
    for joint in spec['joints']:
        for mesh in spec['meshes']:
            path=f'output/tsc-step2b-r00/T175-{joint}-FULL-{mesh}.json'
            paths.append(path); raw=read(path); nodes=raw['nodes']; rows=[]
            for st in spec['stations']:
                def parameter(p):
                    if st['region']=='wall': return p[2]
                    if st['region']=='roof': return p[0]
                    return math.pi-math.atan2(p[2]-(H-R),p[0]-R)
                target=st.get('z_m',st.get('x_m',math.radians(st.get('angle_from_wall_deg',0))))
                selected=[]
                for e in raw['elements']:
                    if e['hand']!='LH' or e['region']!=st['region']: continue
                    p=np.array([nodes[str(n)] for n in e['nodes']]); a,b=parameter(p[0]),parameter(p[1])
                    if a-1e-9<=target<=b+1e-9:
                        selected.append((e,p,2*(target-a)/(b-a)-1,RECOVER@np.array(e['gauss_resultants'])))
                if not selected: raise RuntimeError(f'No station {st}')
                def at_y(y):
                    vals=[]
                    for e,p,xi,coef in selected:
                        if p[0,1]-1e-9<=y<=p[3,1]+1e-9:
                            eta=2*(y-p[0,1])/(p[3,1]-p[0,1])-1
                            vals.append(np.array([1,xi,eta,xi*eta])@coef)
                    if not vals: raise RuntimeError('No Y interpolation')
                    return np.mean(vals,axis=0)
                samples={str(y):dict(zip(FIELDS,at_y(y).tolist())) for y in spec['y_samples_m']}
                lo,hi=spec['integration_y_interval_m']
                cuts=sorted(set([lo,hi]+[float(v) for _,p,_,_ in selected for v in [p[0,1],p[3,1]] if lo<v<hi]))
                integral=sum((at_y((a+b)/2)*(b-a) for a,b in zip(cuts,cuts[1:])),np.zeros(8))
                rows.append({'station':st['id'],'point_values':samples,'local_component_integrals':dict(zip(FIELDS,integral.tolist()))})
            # Retain the previous selection rule and report actual Gauss point location, not only magnitude.
            candidates=[]
            for e in raw['elements']:
                x,y,z=e['centroid']
                if z>spec['thickness_m']+.3 and abs(x-g['width_m']/2)>.3 and .3<y<L-.3:
                    p=np.array([nodes[str(n)] for n in e['nodes']])
                    for k,(xi,eta) in enumerate(SHELL_GPS):
                        n=np.array([(1-xi)*(1-eta),(1+xi)*(1-eta),(1+xi)*(1+eta),(1-xi)*(1+eta)])/4
                        candidates.append({'value':e['gauss_resultants'][k][7],'xyz':(n@p).tolist(),'element':e['id'],'hand':e['hand'],'region':e['region']})
            peak=max(candidates,key=lambda c:abs(c['value']))
            result.append({'id':raw['summary']['id'],'joint':joint,'mesh':mesh,'stations':rows,'old_mask_Qy_peak':peak})
    comparisons=[]
    floor=basis['qa_targets_declared_before_run']['fixed_component_reference_floor']
    for joint in spec['joints']:
        a,b=[next(r for r in result if r['joint']==joint and r['mesh']==m) for m in ['M3','M4']]
        points={f:0. for f in FIELDS}; integrals={f:0. for f in FIELDS}
        for ar,br in zip(a['stations'],b['stations']):
            for f in FIELDS:
                for y in br['point_values']:
                    av,bv=ar['point_values'][y][f],br['point_values'][y][f]
                    points[f]=max(points[f],abs(bv-av)/max(abs(bv),floor))
                av,bv=ar['local_component_integrals'][f],br['local_component_integrals'][f]
                integrals[f]=max(integrals[f],abs(bv-av)/max(abs(bv),floor))
        comparisons.append({'joint':joint,'pair':['M3','M4'],'max_point_changes':points,'max_integral_changes':integrals,
                            'point_targets_met':max(points.values())<=.05,'integral_targets_met':max(integrals.values())<=.05})
    return {'runs':result,'comparisons':comparisons,'original_peak_criterion_superseded':False}, paths


def airy(t,R=.4,moment=1.):
    a=R-t; rm=R-t/2
    def rr_basis(r): return np.array([1/r**2,2*np.log(r)+1,np.ones_like(r)*2]).T
    def tt_basis(r): return np.array([-1/r**2,2*np.log(r)+3,np.ones_like(r)*2]).T
    q,w=np.polynomial.legendre.leggauss(64); radii=a+(q+1)*t/2; weights=w*t/2
    moment_row=np.sum(tt_basis(radii)*(radii*weights)[:,None],axis=0)
    coef=np.linalg.solve(np.array([rr_basis(a),rr_basis(R),moment_row]),np.array([0.,0.,moment]))
    def stress(r): return rr_basis(np.asarray(r))@coef,tt_basis(np.asarray(r))@coef
    sr,st=stress(radii)
    checks={'free_radial_faces':max(abs(float(stress(a)[0])),abs(float(stress(R)[0])))/(6*moment/t**2),
            'net_axial_force':float(np.dot(weights,st)), 'moment':float(np.dot(weights*radii,st))}
    return stress,coef,radii,weights,checks


def coupon(t,nu,mesh,E,kind,spec):
    R=spec['outer_radius_m']; a=R-t; rm=(a+R)/2; width=spec['width_m']; angle=math.radians(spec['angle_deg'])
    moment=spec['moment_per_width_kNm_m']; na,nr,ny=mesh['arc'],mesh['radial'],mesh['width']
    stress,coef,radii,weights,analytic_checks=airy(t,R,moment)
    sr,st=stress(radii)
    exact_energy=float(width*angle*np.dot(weights*radii,((1-nu**2)*(sr**2+st**2)-2*nu*(1+nu)*sr*st))/(2*E))
    shell_limit=width*moment**2*(rm*angle)*(1-nu**2)/(2*E*(t**3/12))
    ops.wipe(); ops.model('basic','-ndm',3,'-ndf',3 if kind=='solid' else 6)
    nodes={}; loads={}; elements=[]
    if kind=='solid': ops.nDMaterial('ElasticIsotropic',1,E,nu,0.)
    else: ops.section('ElasticMembranePlateSection',1,E,nu,t,0.)
    grid={}
    for i in range(na+1):
        theta=angle*i/na
        for k in range(nr+1 if kind=='solid' else 1):
            r=a+t*k/nr if kind=='solid' else rm
            for j in range(ny+1):
                n=len(nodes)+1; p=np.array([r*math.cos(theta),width*j/ny,r*math.sin(theta)])
                nodes[n]=p; loads[n]=np.zeros(3 if kind=='solid' else 6); grid[i,k,j]=n
                ops.node(n,*p)
                datum=i==0 and j==ny//2 and (kind=='shell' or k==nr//2)
                if kind=='solid': ops.fix(n,int(datum),1,int(i==0))
                else: ops.fix(n,int(datum),1,int(i==0),1,int(i==0),1)
    for i in range(na):
        for k in range(nr if kind=='solid' else 1):
            for j in range(ny):
                if kind=='solid':
                    ids=[grid[i,k,j],grid[i+1,k,j],grid[i+1,k+1,j],grid[i,k+1,j],
                         grid[i,k,j+1],grid[i+1,k,j+1],grid[i+1,k+1,j+1],grid[i,k+1,j+1]]
                else: ids=[grid[i,0,j],grid[i+1,0,j],grid[i+1,0,j+1],grid[i,0,j+1]]
                tag=len(elements)+1; ops.element('stdBrick' if kind=='solid' else 'ShellMITC4',tag,*ids,1)
                elements.append({'id':tag,'nodes':ids,'indices':[i,k,j]})
    # Consistent solid end-face nodal forces: 8-point radial integration, exact linear Y weights.
    if kind=='solid':
        q,w=np.polynomial.legendre.leggauss(8)
        for k in range(nr):
            r0=a+t*k/nr; dr=t/nr
            for u,v in zip(q,w):
                r=r0+(u+1)*dr/2; sig=float(stress(r)[1]); traction=np.array([-math.sin(angle),0.,math.cos(angle)])*sig
                for j in range(ny+1):
                    wy=width/ny*(.5 if j in (0,ny) else 1)
                    loads[grid[na,k,j]]+=traction*(1-u)/2*v*dr/2*wy
                    loads[grid[na,k+1,j]]+=traction*(1+u)/2*v*dr/2*wy
    else:
        for j in range(ny+1): loads[grid[na,0,j]][4]=-moment*width/ny*(.5 if j in (0,ny) else 1)
    ops.timeSeries('Linear',1); ops.pattern('Plain',1,1)
    for n,f in loads.items():
        if np.any(f): ops.load(n,*f)
    solve()
    disp={n:np.array(ops.nodeDisp(n)) for n in nodes}
    react={n:np.array(ops.nodeReaction(n)) for n in nodes}
    def total(vectors):
        f=np.zeros(3); m=np.zeros(3)
        for n,v in vectors.items():
            f+=v[:3]; m+=np.cross(nodes[n],v[:3])+(v[3:] if len(v)==6 else np.zeros(3))
        return np.r_[f,m]
    applied=total(loads); reactions=total(react); residual=applied+reactions
    energy=float(sum(np.dot(loads[n],disp[n]) for n in nodes)/2)
    eq=max(np.max(abs(residual[:3]))/(moment*width/R),np.max(abs(residual[3:]))/(moment*width))
    samples=[]; min_det=float('inf'); squared=[]
    if kind=='solid':
        gps=[(x,y,z) for x in [-GP,GP] for y in [-GP,GP] for z in [-GP,GP]]
        for e in elements:
            p=np.array([nodes[n] for n in e['nodes']]); response=np.array(ops.eleResponse(e['id'],'stresses')).reshape(8,6)
            for index,gp in enumerate(gps):
                natural=np.array(gp); factors=1+SIGNS*natural
                N=np.prod(factors,axis=1)/8
                dN=np.column_stack([SIGNS[:,d]*np.prod(factors[:,[h for h in range(3) if h!=d]],axis=1)/8 for d in range(3)])
                det=float(np.linalg.det(p.T@dN)); min_det=min(min_det,det)
                if det<=0: raise RuntimeError('Nonpositive Jacobian')
                if e['indices'][0] not in [na//2-1,na//2]: continue
                xyz=N@p; r=math.hypot(xyz[0],xyz[2]); er=np.array([xyz[0]/r,0,xyz[2]/r]); et=np.array([-er[2],0,er[0]])
                sx,sy,sz,txy,tyz,tzx=response[index]; tensor=np.array([[sx,txy,tzx],[txy,sy,tyz],[tzx,tyz,sz]])
                ar,at=stress(r); actual=np.array([er@tensor@er,et@tensor@et,sy,er@tensor@et]); exact=np.array([ar,at,nu*(ar+at),0.])
                squared.append((actual-exact)**2)
                if e['indices'][2]==0:
                    samples.append({'radius_m':r,'theta_deg':math.degrees(math.atan2(xyz[2],xyz[0])),
                                    'stress_rr_tt_yy_rt_kPa':actual.tolist(),'exact_rr_tt_yy_rt_kPa':exact.tolist()})
            e['gauss_stress_kPa']=response.tolist()
    else:
        for e in elements: e['gauss_resultants']=np.array(ops.eleResponse(e['id'],'stresses')).reshape(4,8).tolist()
    nominal=6*moment/t**2
    stress_error=(np.sqrt(np.mean(np.array(squared),axis=0))/nominal).tolist() if squared else None
    identifier=f'{kind.upper()}-T{round(t*1000)}-NU{round(nu*100):02d}-{mesh["id"]}'
    summary={'id':identifier,'model':kind,'t_m':t,'nu':nu,'mesh':mesh,'elements':len(elements),'nodes':len(nodes),
             'energy_kNm':energy,'exact_plane_strain_energy_kNm':exact_energy,'shell_straight_section_limit_energy_kNm':shell_limit,
             'energy_exact_relative_error':abs(energy/exact_energy-1),'energy_shell_limit_relative_error':abs(energy/shell_limit-1),
             'global_equilibrium_relative':float(eq),'applied_6':applied.tolist(),'reaction_6':reactions.tolist(),
             'minimum_jacobian_m3':min_det if kind=='solid' else None,'midsection_stress_normalized_rms':stress_error,
             'analytic_boundary_checks':analytic_checks,'stress_samples':samples,'solver_exit':0}
    payload={'summary':summary,'nodes':{str(k):v.tolist() for k,v in nodes.items()},'elements':elements,
             'displacements':{str(k):v.tolist() for k,v in disp.items()},'loads':{str(k):v.tolist() for k,v in loads.items()},
             'gauss_order_solid':'xi outer loop, eta middle, zeta inner, each -1/sqrt(3),+1/sqrt(3)',
             'stress_order':['xx','yy','zz','xy','yz','zx'],'solid_stress_units':'kN/m2 = kPa',
             'axes':'X,Z quarter circle; Y extrusion with all Uy fixed; engineering shear stresses, no factor 2'}
    (OUT/f'{identifier}.json').write_text(json.dumps(payload,separators=(',',':')),encoding='utf-8')
    print(identifier,len(elements),'energy error',round(summary['energy_exact_relative_error']*100,4),'%',flush=True)
    return summary


def main():
    basis=read(BPATH); upstream=read(basis['upstream'])
    for path,digest in upstream['dependency_hashes'].items():
        if sha(ROOT/path)!=digest: raise RuntimeError(f'Stale upstream: {path}')
    if ops.version()!=upstream['solver']['version']: raise RuntimeError('Solver changed')
    clause=read('knowledge/modular-tsc-step2b/clause_register.json')
    if sha(ROOT/'วสท อนุญาติแล้ว.pdf')!=clause['source_sha256']: raise RuntimeError('Code source changed')
    OUT.mkdir(parents=True,exist_ok=True)
    fixed,rawpaths=fixed_stations(basis); print('FIXED',json.dumps(fixed['comparisons']),flush=True)
    E=upstream['runs'][0]['E_MPa']*1000; spec=basis['coupon']; runs=[]
    patch=brick_patch_test(E)
    if patch['relative_error']>1e-8: raise RuntimeError('Brick affine patch failed')
    for t in spec['thicknesses_m']:
        for nu in spec['poisson_ratios']:
            for mesh in spec['meshes']:
                for kind in ['solid','shell']: runs.append(coupon(t,nu,mesh,E,kind,spec))
    comparisons=[]; qa=basis['qa_targets_declared_before_run']
    for t in spec['thicknesses_m']:
        stress,coef,r,w,checks=airy(t,spec['outer_radius_m'],spec['moment_per_width_kNm_m'])
        profile=[{'radius_m':float(r),'rr_kPa':float(stress(r)[0]),'tt_kPa':float(stress(r)[1]),
                  'linear_tt_kPa':12*spec['moment_per_width_kNm_m']*(r-(spec['outer_radius_m']-t/2))/t**3}
                 for r in np.linspace(spec['outer_radius_m']-t,spec['outer_radius_m'],81)]
        for nu in spec['poisson_ratios']:
            rs={k:[r for r in runs if r['model']==k and r['t_m']==t and r['nu']==nu] for k in ['solid','shell']}
            solid,shell=rs['solid'][-1],rs['shell'][-1]
            changes={k:abs(v[-1]['energy_kNm']/v[-2]['energy_kNm']-1) for k,v in rs.items()}
            comparisons.append({'t_m':t,'nu':nu,'last_pair':['C2','C3'],'energy_changes':changes,
                                'solid_exact_energy_error':solid['energy_exact_relative_error'],
                                'shell_vs_solid_energy_difference':shell['energy_kNm']/solid['energy_kNm']-1,
                                'solid_stress_rms':solid['midsection_stress_normalized_rms'],
                                'solid_targets_met':bool(solid['energy_exact_relative_error']<=qa['coupon_solid_energy_exact_relative'] and changes['solid']<=qa['coupon_last_pair_energy_relative'] and max(solid['midsection_stress_normalized_rms'])<=qa['coupon_midsection_stress_normalized_rms_relative']),
                                'inner_stress_to_straight_nominal':abs(profile[0]['tt_kPa'])/(6/t**2),
                                'outer_stress_to_straight_nominal':abs(profile[-1]['tt_kPa'])/(6/t**2),'exact_stress_profile':profile})
    dependencies=[BPATH,basis['upstream'],'tools/tsc-study/diagnostic_study.py',*upstream['dependency_hashes']]
    report={'id':basis['id'],'revision':basis['revision'],'status':'DIAGNOSTIC_ONLY_NOT_FOR_DESIGN','basis':basis,'solver':upstream['solver'],
            'E_MPa':E/1000,'brick_patch':patch,'fixed_stations':fixed,'coupon_runs':runs,'coupon_comparisons':comparisons,
            'dependency_hashes':{p:sha(ROOT/p) for p in dependencies},'raw_source_hashes':{p:sha(ROOT/p) for p in rawpaths},
            'raw_output_hashes':{f'output/tsc-step2c-r00/{r["id"]}.json':sha(OUT/f'{r["id"]}.json') for r in runs},
            'full_bay_solid_validation':'NOT_RUN','engineering_approval':False,'manufacturing_release':False}
    (OUT/'diagnostic_results.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('FINISHED',len(runs),'coupon runs; solid diagnostic targets',sum(c['solid_targets_met'] for c in comparisons),'of',len(comparisons),flush=True)


if __name__=='__main__': main()
