"""S2M targeted interior-arc and crown refinement; old evidence immutable."""
import argparse,json,math,types
import numpy as np
import local_mesh_study as kernel
from benchmark_study import ROOT,N20,ops,sha,patch
from combined_mesh_study import physical_cuts
from traction_audit import audit,patch_check
from stress_study import compare
OUT=ROOT/'output/tsc-step2m-r00';BP='knowledge/modular-tsc-step2m/basis.json';read=kernel.read
def write(name,value):(OUT/name).write_text(json.dumps(value,separators=(',',':'),allow_nan=False),encoding='utf-8')

def build(g,t,m,ref):
    B,H,R,L=g['width_m'],g['overall_height_m'],g['outer_shoulder_radius_m'],g['bay_length_m'];nr=8;ny=16
    wall=kernel.split_knots(np.linspace(t,H-R,26),{23:2,24:2});arc=np.linspace(0,math.pi/2,49).tolist();roof=kernel.split_knots(np.linspace(R,B/2,23),{20:2,21:2});yy=np.linspace(0,L,17).tolist();cells=[]
    for region,knots in [('wall',wall),('shoulder',arc),('roof',roof)]:cells.extend({'region':region,'a':float(a),'b':float(b)} for a,b in zip(knots,knots[1:]))
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

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--reuse',action='store_true');args=ap.parse_args();b=read(BP);up=read(b['upstream']);parent=up['inherited_basis'];g=read(parent['geometry_source'])['geometry'];lb=read(parent['local_points_source']);cb=read(parent['section_cuts_source']);ab=read('knowledge/modular-tsc-step2i/basis.json');OUT.mkdir(parents=True,exist_ok=True)
    deps={**up['dependency_hashes'],**up['raw_output_hashes']}
    for p,h in deps.items():
        if sha(p)!=h:raise RuntimeError('Stale '+p)
    for p in [BP,b['upstream'],'tools/tsc-study/arc_crown_study.py']:deps[p]=sha(p)
    if ops.version()!=up['solver']['version'] or sha('.local-engineering-runtime/openseespywin/opensees.pyd')!=up['solver']['dll_sha256']:raise RuntimeError('Runtime mismatch')
    if (g['width_m'],g['overall_height_m'],g['outer_shoulder_radius_m'],g['bay_length_m'],parent['thickness_m'])!=(3,3,.4,1.5,.175):raise RuntimeError('Geometry outside declared scope')
    E=parent['material']['E_MPa']*1000;nu=parent['material']['nu'];pc=patch('20NodeBrick',E,nu);ident='ARC-T175-FR-FULL-M1';path='output/tsc-step2m-r00/'+ident+'.json';cache=OUT/'cache.json';fp=json.dumps(deps,sort_keys=True);saved=json.loads(cache.read_text()) if args.reuse and cache.exists() else None
    if not(saved and saved['fingerprint']==fp and sha(path)==saved['sha256']):
        def sink(name,raw):
            s=raw['summary'];s['id']=ident;s['mesh_knots']['arc_divisions']=48;s['mesh_knots']['roof_x_m']=kernel.split_knots(np.linspace(.4,1.5,23),{20:2,21:2});s['cut_selection']='PHYSICAL_EXACT_ANGLE'
            if s['elements']!=b['expected_elements']:raise RuntimeError('Mesh size')
            write(ident+'.json',raw)
        scope={**kernel.run.__globals__,'build':build,'cuts':physical_cuts,'write':sink}
        types.FunctionType(kernel.run.__code__,scope)({'reference_mesh':{}},g,{'id':'M1'},parent,lb,cb);write('cache.json',{'fingerprint':fp,'sha256':sha(path)})
    raw=read(path);s=raw['summary'];affine=patch_check(raw,E,nu);tr=audit(raw,ab,E,nu);name='TRACTION-'+ident+'.json';write(name,tr);samples={'mesh':'M1','pattern':'FULL','samples':raw['samples']};del raw
    prev=read('output/tsc-step2l-r00/COMBINED-T175-FR-FULL-KPT.json');comp=compare({'mesh':'KPT','pattern':'FULL','samples':prev['samples']},samples,lb);del prev
    write('arc_crown_results.json',{'id':b['id'],'revision':b['revision'],'status':b['status'],'basis':b,'inherited_basis':parent,'solver':up['solver'],'patch_check':pc,'affine_traction_patch':affine,'reference_runs':up['runs'],'runs':[s],'local_comparisons':[comp],'traction_runs':[up['traction_runs'][-1],tr],'dependency_hashes':deps,'raw_output_hashes':{path:sha(path),'output/tsc-step2m-r00/'+name:sha('output/tsc-step2m-r00/'+name)},'whole_model_local_stress_convergence':'NOT_ESTABLISHED','engineering_approval':False,'manufacturing_release':False})
    print('FINISHED M1 cuts',sum(c['targets_met'] for c in tr['cuts']),'/6',flush=True)
if __name__=='__main__':main()
