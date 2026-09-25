"""S2L controlled KP+KT combination, physical cut selection before raw write."""
import argparse,copy,json,math,types
import numpy as np
import local_mesh_study as kernel
from profile_thickness_study import build
from benchmark_study import ROOT,ops,sha,patch
from bay_study import cuts as legacy_cuts
from traction_audit import audit,patch_check
from stress_study import compare

OUT=ROOT/'output/tsc-step2l-r00';BP='knowledge/modular-tsc-step2l/basis.json';read=kernel.read
def write(name,value):(OUT/name).write_text(json.dumps(value,separators=(',',':'),allow_nan=False),encoding='utf-8')

def physical_cuts(basis,profile,regions,nodes,elements,base_reactions,refF):
    fixed=copy.deepcopy(basis);start=regions.index('shoulder');count=regions.count('shoulder')
    for c in fixed['cuts']:
        if c['kind']=='crown':continue
        angle=c['degrees']*math.pi/180
        target=np.array([.4-.3125*math.cos(angle),2.6+.3125*math.sin(angle)])
        index=min(range(len(profile)),key=lambda i:np.linalg.norm(np.array(profile[i])-target))
        if np.linalg.norm(np.array(profile[index])-target)>1e-10:raise RuntimeError('Missing physical cut '+c['id'])
        c['degrees']=(index-start)*90/count
    return legacy_cuts(fixed,profile,regions,nodes,elements,base_reactions,refF)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--reuse',action='store_true');args=ap.parse_args();b=read(BP);up=read(b['upstream']);parent=up['inherited_basis'];g=read(parent['geometry_source'])['geometry'];lb=read(parent['local_points_source']);cb=read(parent['section_cuts_source']);ab=read(up['basis']['traction_criteria_source']);OUT.mkdir(parents=True,exist_ok=True)
    deps={**up['dependency_hashes'],**up['raw_output_hashes']}
    for p,h in deps.items():
        if sha(p)!=h:raise RuntimeError('Stale upstream '+p)
    for p in [BP,b['upstream'],'tools/tsc-study/combined_mesh_study.py']:deps[p]=sha(p)
    if ops.version()!=up['solver']['version'] or sha('.local-engineering-runtime/openseespywin/opensees.pyd')!=up['solver']['dll_sha256']:raise RuntimeError('Runtime mismatch')
    E=parent['material']['E_MPa']*1000;nu=parent['material']['nu'];pc=patch('20NodeBrick',E,nu);ident='COMBINED-T175-FR-FULL-KPT';path='output/tsc-step2l-r00/'+ident+'.json';cache=OUT/'cache.json';fp=json.dumps(deps,sort_keys=True)
    saved=json.loads(cache.read_text()) if args.reuse and cache.exists() else None
    if not(saved and saved['fingerprint']==fp and sha(path)==saved['sha256']):
        def sink(name,raw):
            s=raw['summary'];s['id']=ident;s['mesh_knots']['arc_divisions']=32;s['cut_selection']='PHYSICAL_EXACT_ANGLE'
            if s['elements']!=b['expected_elements']:raise RuntimeError('Mesh size mismatch')
            write(ident+'.json',raw)
        scope={**kernel.run.__globals__,'build':build,'cuts':physical_cuts,'write':sink}
        types.FunctionType(kernel.run.__code__,scope)(up['basis'],g,b['mesh'],parent,lb,cb)
        write('cache.json',{'fingerprint':fp,'sha256':sha(path)})
    raw=read(path);s=raw['summary'];affine=patch_check(raw,E,nu);tr=audit(raw,ab,E,nu);name='TRACTION-'+ident+'.json';write(name,tr)
    samples={'KPT':{'mesh':'KPT','pattern':'FULL','samples':raw['samples']}};del raw
    for m in ['KP','KT']:
        p=f'output/tsc-step2k-r00/PT-T175-FR-FULL-{m}.json';v=read(p);samples[m]={'mesh':m,'pattern':'FULL','samples':v['samples']};del v
    comparisons=[compare(samples[a],samples[c],lb) for a,c in b['comparison_pairs']]
    write('combined_mesh_results.json',{'id':b['id'],'revision':b['revision'],'status':b['status'],'basis':b,'inherited_basis':parent,'solver':up['solver'],'patch_check':pc,'affine_traction_patch':affine,'reference_runs':[up['reference_run'],*up['runs']],'runs':[s],'local_comparisons':comparisons,'traction_runs':[*up['traction_runs'],tr],'dependency_hashes':deps,'raw_output_hashes':{path:sha(path),'output/tsc-step2l-r00/'+name:sha('output/tsc-step2l-r00/'+name)},'whole_model_local_stress_convergence':'NOT_ESTABLISHED','engineering_approval':False,'manufacturing_release':False})
    print('FINISHED KPT cuts',sum(c['targets_met'] for c in tr['cuts']),'/6',flush=True)
if __name__=='__main__':main()
