"""S2K controlled full-bay profile/thickness study; immutable S2I solve kernel."""
import json, math, types, argparse
import numpy as np
import local_mesh_study as kernel
from benchmark_study import ROOT, N20, ops, sha, patch
from traction_audit import audit, patch_check
from stress_study import compare

OUT=ROOT/'output/tsc-step2k-r00'
BP='knowledge/modular-tsc-step2k/basis.json'
read=kernel.read
def write(name,value):
    (OUT/name).write_text(json.dumps(value,separators=(',',':'),allow_nan=False),encoding='utf-8')

def build(g,t,m,ref):
    B,H,R,L=g['width_m'],g['overall_height_m'],g['outer_shoulder_radius_m'],g['bay_length_m']
    nw=math.ceil((H-R-t)/ref['target_m']);nf=math.ceil((B/2-R)/ref['target_m']);na=ref['arc_divisions'];nr=m['through_thickness'];ny=16
    refine=m['profile_refine']
    wall=kernel.split_knots(np.linspace(t,H-R,nw+1),{nw-2:2,nw-1:2} if refine else {})
    arc=kernel.split_knots(np.linspace(0,math.pi/2,na+1),{i:2 for i in [*range(4),*range(na-4,na)]} if refine else {})
    roof=kernel.split_knots(np.linspace(R,B/2,nf+1),{i:2 for i in range(nf)} if refine else {})
    yy=np.linspace(0,L,ny+1).tolist();cells=[]
    for region,knots in [('wall',wall),('shoulder',arc),('roof',roof)]:
        cells.extend({'region':region,'a':a,'b':b} for a,b in zip(knots,knots[1:]))
    nh=len(cells);nodes={};grid={};logical={};els=[]
    def xz(h,f):
        ci=min(int(h),nh-1);c=cells[ci];v=c['a']+(c['b']-c['a'])*(h-ci)
        if c['region']=='wall':return t*(1-f),v
        if c['region']=='roof':return v,H-t+t*f
        rad=R-t+t*f;return R-rad*math.cos(v),H-R+rad*math.sin(v)
    def coord(key):
        i,j,k=key;h=i/2;right=h>nh
        if right:h=2*nh-h
        x,z=xz(h,k/(2*nr));return np.array([B-x if right else x,L*j/(2*ny),z])
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
    # Clone function globals: no monkey-patching or writes to old scripts/output.
    # Kernel arithmetic is unchanged; only mesh builder and output sink differ.
    def sink(name,raw):
        s=raw['summary'];s['id']=f'PT-T175-FR-FULL-{m["id"]}'
        s['mesh_knots']['arc_divisions']=32 if m['profile_refine'] else 24
        s['mesh_knots']['profile_rule']=b['profile_rule']
        write(s['id']+'.json',raw)
    scope={**kernel.run.__globals__,'build':build,'write':sink}
    return types.FunctionType(kernel.run.__code__,scope)(b,g,m,parent,lb,cb)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--reuse',action='store_true');args=ap.parse_args()
    b=read(BP);up=read(b['upstream']);parent=up['basis'];g=read(parent['geometry_source'])['geometry'];lb=read(b['sampling_source']);cb=read(parent['section_cuts_source']);ab=read(b['traction_criteria_source'])
    OUT.mkdir(parents=True,exist_ok=True)
    deps={**up['dependency_hashes'],**up['raw_output_hashes']}
    for p,h in deps.items():
        if sha(p)!=h:raise RuntimeError('Stale upstream '+p)
    for p in [BP,b['upstream'],b['reference'],b['sampling_source'],b['traction_criteria_source'],'tools/tsc-study/profile_thickness_study.py','tools/tsc-study/local_mesh_study.py','tools/tsc-study/traction_audit.py','output/tsc-step2j-r00/gravity_coupon_results.json']:
        deps[p]=sha(p)
    if ops.version()!=up['solver']['version'] or sha('.local-engineering-runtime/openseespywin/opensees.pyd')!=up['solver']['dll_sha256']:raise RuntimeError('Runtime mismatch')
    E=parent['material']['E_MPa']*1000;nu=parent['material']['nu'];pc=patch('20NodeBrick',E,nu)
    fp=json.dumps(deps,sort_keys=True);summaries=[];samples={};tractions=[];rawhashes={}
    reference=read(b['reference']);samples['H4']={'mesh':'H4','pattern':'FULL','samples':reference['samples']};affine=patch_check(reference,E,nu);tractions.append(audit(reference,ab,E,nu));del reference
    for m in b['meshes']:
        ident=f'PT-T175-FR-FULL-{m["id"]}';path=f'output/tsc-step2k-r00/{ident}.json';cache=OUT/f'cache-{ident}.json'
        saved=json.loads(cache.read_text()) if args.reuse and cache.exists() else None
        if saved and saved['fingerprint']==fp and sha(path)==saved['sha256']:
            print('REUSE',ident,flush=True)
        else:
            run(b,g,m,parent,lb,cb);write(cache.name,{'fingerprint':fp,'sha256':sha(path)})
        raw=read(path);summaries.append(raw['summary']);samples[m['id']]={'mesh':m['id'],'pattern':'FULL','samples':raw['samples']};tractions.append(audit(raw,ab,E,nu));rawhashes[path]=sha(path);del raw
    comparisons=[compare(samples[a],samples[c],lb) for a,c in b['comparison_pairs']]
    for tr in tractions:
        name='TRACTION-'+tr['id']+'.json';write(name,tr);rawhashes['output/tsc-step2k-r00/'+name]=sha('output/tsc-step2k-r00/'+name)
    report={'id':b['id'],'revision':b['revision'],'status':b['status'],'basis':b,'inherited_basis':parent,'solver':up['solver'],'patch_check':pc,'affine_traction_patch':affine,'reference_run':read(b['reference'])['summary'],'runs':summaries,'local_comparisons':comparisons,'traction_runs':tractions,'dependency_hashes':deps,'raw_output_hashes':rawhashes,'whole_model_local_stress_convergence':'NOT_ESTABLISHED','engineering_approval':False,'manufacturing_release':False}
    write('profile_thickness_results.json',report)
    print('FINISHED',json.dumps([{'mesh':t['mesh'],'cuts_met':sum(c['targets_met'] for c in t['cuts'])} for t in tractions]),flush=True)
if __name__=='__main__':main()
