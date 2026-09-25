"""S2I integrate Cauchy traction on both traces; never smooth interface stress."""
import argparse,json
import numpy as np
from local_mesh_study import ROOT,OUT,BP,read,write,sha
from benchmark_study import shape
from stress_study import tensor_from_grad

def integrate(raw,station,side,order,E,nu,affine=None):
    idx=station['station_row'];row=idx-1 if side=='lower' else idx;sgn=1 if side=='lower' else -1
    els=[e for e in raw['elements'] if e['indices'][0]==row];p=np.array([[raw['nodes'][str(n)] for n in e['nodes']] for e in els])
    u=p@affine.T if affine is not None else np.array([[raw['displacements'][str(n)] for n in e['nodes']] for e in els])
    sums=np.zeros((len(els),6));areas=np.zeros(len(els));origin=np.array(station['origin_m']);qp,wp=np.polynomial.legendre.leggauss(order)
    for a,wa in zip(qp,wp):
        for b,wb in zip(qp,wp):
            N,D=shape([sgn,a,b],'20NodeBrick');J=np.einsum('eni,nj->eij',p,D);G=np.einsum('eni,nj->eij',u,D)@np.linalg.inv(J);T=tensor_from_grad(G,E,nu)
            avec=sgn*np.cross(J[:,:,1],J[:,:,2])*wa*wb;xyz=np.einsum('n,eni->ei',N,p);force=np.einsum('eij,ej->ei',T,avec)
            sums[:,:3]+=force;sums[:,3:]+=np.cross(xyz-origin,force);areas+=np.linalg.norm(avec,axis=1)
    return {'resultant_6':sums.sum(axis=0).tolist(),'area_m2':float(areas.sum()),'face_contributions':[{'element':e['id'],'area_m2':float(a),'resultant_6':s.tolist()} for e,a,s in zip(els,areas,sums)]}

def patch_check(raw,E,nu):
    G=np.array([[1e-5,2e-5,3e-5],[4e-6,-3e-6,7e-6],[8e-6,9e-6,2e-6]]);T=tensor_from_grad(G,E,nu);errors=[]
    for c in raw['summary']['cuts']:
        # Each section is a planar radial/straight rectangle, area=t*L, origin at its centroid.
        angle={'W-TOP':0,'C22.5':22.5,'C45':45,'C67.5':67.5,'R-START':90,'CROWN':90}[c['id']]*np.pi/180
        normal=np.array([np.sin(angle),0,np.cos(angle)]);expected=np.r_[T@normal*.175*1.5,[0,0,0]]
        for side,sgn in [('lower',1),('upper',-1)]:
            v=integrate(raw,c,side,6,E,nu,G);errors.append(float(max(abs(np.array(v['resultant_6'])-sgn*expected))))
            if abs(v['area_m2']-.175*1.5)>1e-10:raise RuntimeError('Section area patch')
    if max(errors)>1e-7:raise RuntimeError('Affine traction patch')
    return {'max_resultant_error':max(errors),'faces_checked':12,'expected_area_m2':.175*1.5,'scope':'Manufactured constant stress checks orientation, units, area and moment origin; not full-bay exact reference.'}

def audit(raw,b,E,nu):
    rows=[];qa=b['cut_audit']
    for c in raw['summary']['cuts']:
        ref=np.array(c['cut_on_lower_LH_6']);opposite=np.array(c['opposite_cut_6']);den=np.maximum(abs(ref),.1);traces={}
        for side in ['lower','upper']:
            v4=integrate(raw,c,side,4,E,nu);v6=integrate(raw,c,side,6,E,nu);expected=ref if side=='lower' else opposite;diff=np.array(v6['resultant_6'])-expected
            traces[side]={'order4':v4,'order6':v6,'difference_vs_nodal_6':diff.tolist(),'relative_vs_nodal_6':(abs(diff)/np.maximum(abs(expected),.1)).tolist(),'quadrature_change_6':(abs(np.array(v6['resultant_6'])-v4['resultant_6'])/den).tolist()}
        pair=np.array(traces['lower']['order6']['resultant_6'])+traces['upper']['order6']['resultant_6'];pairrel=abs(pair)/den
        met=all(max(traces[s]['relative_vs_nodal_6'])<=qa['all_six_trace_vs_nodal_relative'] and max(traces[s]['quadrature_change_6'])<=qa['quadrature_change_relative'] for s in traces) and max(pairrel)<=qa['all_six_trace_pair_relative']
        rows.append({'id':c['id'],'origin_m':c['origin_m'],'nodal_lower_6':ref.tolist(),'nodal_upper_6':opposite.tolist(),'traces':traces,'trace_pair_sum_6':pair.tolist(),'trace_pair_relative_6':pairrel.tolist(),'targets_met':bool(met)})
    return {'id':raw['summary']['id'],'mesh':raw['summary']['mesh'],'pattern':raw['summary']['pattern'],'cuts':rows,'all_cut_targets_met':all(c['targets_met'] for c in rows)}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--upstream-only',action='store_true');args=parser.parse_args();b=read(BP);up=read(b['upstream']);E=up['basis']['material']['E_MPa']*1000;nu=up['basis']['material']['nu'];OUT.mkdir(parents=True,exist_ok=True)
    paths=[f'output/tsc-step2h-r00/{r["id"]}.json' for r in up['runs']];deps={**up['dependency_hashes'],**up['raw_output_hashes']};sources=[BP,b['upstream'],'tools/tsc-study/traction_audit.py','tools/tsc-study/local_mesh_study.py']
    if not args.upstream_only:
        local=read('output/tsc-step2i-r00/local_mesh_results.json');paths.extend(local['raw_output_hashes']);deps.update(local['dependency_hashes']);deps.update(local['raw_output_hashes']);sources.append('output/tsc-step2i-r00/local_mesh_results.json')
    for p,h in deps.items():
        if sha(p)!=h:raise RuntimeError('Stale '+p)
    for p in sources:deps[p]=sha(p)
    patch=patch_check(read(paths[0]),E,nu);runs=[]
    for p in paths:
        raw=read(p);result=audit(raw,b,E,nu);name='TRACTION-'+result['id']+'.json';write(name,result);runs.append({**result,'source_path':p,'source_hash':sha(p),'audit_path':'output/tsc-step2i-r00/'+name})
        print(result['id'],'cuts met',sum(c['targets_met'] for c in result['cuts']),'max trace error',max(max(v['relative_vs_nodal_6']) for c in result['cuts'] for v in c['traces'].values()),flush=True)
    report={'id':'TRACTION-TS-C-S2I-R00','revision':'S2I-R00','status':'STRESS_TRACTION_DIAGNOSTIC_NOT_FOR_DESIGN','basis':b,'affine_traction_patch':patch,'runs':runs,'dependency_hashes':deps,'raw_output_hashes':{r['audit_path']:sha(r['audit_path']) for r in runs},'new_FEM_solves':0,'engineering_approval':False,'manufacturing_release':False}
    write('traction_upstream_results.json' if args.upstream_only else 'traction_results.json',report);print('FINISHED TRACTION',len(runs),'runs',flush=True)
if __name__=='__main__':main()
