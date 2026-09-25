"""P83 elastic wall skin/ribs/walers/P67 gussets; prescribed rigid foot boundaries.

No seam benefit, no bed/foundation flexibility, gravity or capacity check.
P82 input and P67 solids are retained and hashed. Not a production release.
"""
from pathlib import Path
import sys,json,math,hashlib
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.local-engineering-runtime'))
import numpy as np
import openseespy.opensees as ops
from gusset_mesh_p83 import mesh_gusset,refine,area
from window_shell_p82 import sha

def solve():
    # Residual correction iterations on this linear model reduce round-off from
    # rigid offsets and slender intersecting meshes; this is NOT geometric nonlinearity.
    ops.constraints('Transformation');ops.numberer('RCM');ops.system('UmfPack')
    ops.test('NormDispIncr',1e-10,8);ops.algorithm('Newton')
    ops.integrator('LoadControl',1.);ops.analysis('Static')
    if ops.analyze(1)!=0:raise RuntimeError('P83 elastic residual correction failed')
    ops.reactions()

def run(key,owner,mesh=100):
    input_path=ROOT/f'output/window-shell-p82/{key}-{owner}-input.json'
    model=json.loads(input_path.read_text(encoding='utf8'))
    gp=ROOT/f'output/abd-wall-gusset-p67/{key}.json'
    gusset_source=json.loads(gp.read_text(encoding='utf8'))
    for item in model['inputs']+[gusset_source['inputSnapshot']]:
        if sha(ROOT/item['path'])!=item['sha256']:raise RuntimeError('Stale source')
    outer=owner=='M01';normal_sign=-1 if outer else 1
    def u(n):return normal_sign*n+(0 if outer else 150)
    def local(p):
        x,y,z=p;s=model['slope'];L=model['normalizer']
        if '-RH-' in key:x=1490-x
        return np.array([(x-s*y)/L,(s*x+y)/L,z])
    plates=[]
    for g in gusset_source['stock']:
        if g['owner']!=owner:continue
        assert g['thicknessMm']==10 and g['localProfileMm']==[[6,30],[356,30],[6,650]]
        assert g['walerNotchMm']=={'n':[106,206],'z':[100,200]}
        p=local(g['cgMm']);v=p[1];station=min(([400,2200] if outer else [400,1900]),key=lambda x:abs(x-v))
        assert abs(abs(v-station)-30)<1e-6
        plates.append(dict(tag=g['tag'],v=v,station=station))
    assert len(plates)==4
    quads=mesh_gusset(mesh)
    gusset_points={tuple(round(v,7) for v in p) for q in quads for p in q}
    attachment_z=[z for n,z in gusset_points if abs(n-6)<1e-6 or abs(n-106)<1e-6]
    patches=model['patches'];ribs=model['ribs'];walers=model['walers']
    vs=refine([v for p in patches for v in [p['v0'],p['v1']]]+[r['v'] for r in ribs],mesh)
    zs=refine([z for p in patches for z in [p['z0'],p['z1']]]+[z for r in ribs for z in [r['z0'],r['z1']]]+[w['z'] for w in walers]+attachment_z,mesh)
    ops.wipe();ops.model('basic','-ndm',3,'-ndf',6)
    E=200000.;nu=.3;G=E/2.6
    ops.section('ElasticMembranePlateSection',1,E,nu,6.,0.)
    ops.section('ElasticMembranePlateSection',2,E,nu,10.,0.)
    ops.geomTransf('Linear',1,1.,0.,0.);ops.geomTransf('Linear',2,1.,0.,0.)
    coords={};lookup={};cells=[];gusset_cells=[];beams=[];parent={};fixed_nodes=set();loads={};moments={}
    def node(u0,v,z):
        p=tuple(round(float(x),5) for x in [u0,v,z])
        if p not in lookup:
            tag=len(lookup)+1;lookup[p]=tag;coords[tag]=np.array(p);parent[tag]=tag;ops.node(tag,*p)
        return lookup[p]
    def root(tag):
        while parent[tag]!=tag:parent[tag]=parent[parent[tag]];tag=parent[tag]
        return tag
    def join(a,b):
        a=root(a);b=root(b)
        if a!=b:parent[max(a,b)]=min(a,b)
    def material(v,z):return any(p['v0']-1e-6<=v<=p['v1']+1e-6 and p['z0']-1e-6<=z<=p['z1']+1e-6 for p in patches)
    for a,b in zip(vs[:-1],vs[1:]):
        for c,d in zip(zs[:-1],zs[1:]):
            if not material((a+b)/2,(c+d)/2):continue
            ids=[node(model['shellMidU'],v,z) for v,z in [(a,c),(b,c),(b,d),(a,d)]]
            tag=len(cells)+1;ops.element('ShellMITC4',tag,*ids,1)
            cells.append(dict(tag=tag,ids=ids,v0=a,v1=b,z0=c,z1=d))
    A=1400.;Iy=(50*100**3-40*90**3)/12;Iz=(100*50**3-90*40**3)/12;J=4*(95*45)**2/(2*(95+45)/5)
    WA=1900.;WI=(100**4-90**4)/12;WJ=4*(95*95)**2/(4*95/5)
    def beam(a,b,owner,kind):
        tag=100000+len(beams)
        props=(A,E,G,J,Iy,Iz,1) if kind=='rib' else (WA,E,G,WJ,WI,WI,2)
        ops.element('elasticBeamColumn',tag,a,b,*props);beams.append(dict(tag=tag,owner=owner,kind=kind,ids=[a,b]))
    for r in ribs:
        zline=[z for z in zs if r['z0']-1e-6<=z<=r['z1']+1e-6]
        ids=[node(r['u'],r['v'],z) for z in zline]
        for a,b in zip(ids[:-1],ids[1:]):beam(a,b,r['tag'],'rib')
        for z,master in zip(zline,ids):
            slave=lookup.get(tuple(round(x,5) for x in [model['shellMidU'],r['v'],z]))
            if slave is not None:join(master,slave)
    waler_nodes={}
    for w in walers:
        vline=refine([w['v0'],w['v1']]+[v for v in [r['v'] for r in ribs]+[p['v'] for p in plates] if w['v0']<=v<=w['v1']],mesh)
        ids=[node(u(156),v,w['z']) for v in vline]
        for v,tag in zip(vline,ids):waler_nodes[(w['tag'],round(v,6))]=tag
        for a,b in zip(ids[:-1],ids[1:]):beam(a,b,w['tag'],'waler')
        for r in ribs:
            if w['v0']-1e-6<=r['v']<=w['v1']+1e-6 and r['z0']<=w['z']<=r['z1']:
                join(node(r['u'],r['v'],w['z']),waler_nodes[(w['tag'],round(r['v'],6))])
    gusset_area=0
    for plate in plates:
        for q in quads:
            ids=[node(u(n),plate['v'],z) for n,z in q]
            tag=200000+len(gusset_cells);ops.element('ShellMITC4',tag,*ids,2)
            gusset_cells.append(dict(tag=tag,owner=plate['tag'],ids=ids));gusset_area+=area(q)
        for n,z in gusset_points:
            tag=node(u(n),plate['v'],z)
            if abs(z-30)<1e-6:fixed_nodes.add(tag)
            # Ideal welded edge-to-rib cross-section coupling, not weld capacity.
            if abs(n-6)<1e-6 or abs(n-106)<1e-6:
                join(tag,node(u(56),plate['station'],z))
            # Hole perimeter fits around the lower SHS100 waler.
            on_hole=(106-1e-6<=n<=206+1e-6 and (abs(z-100)<1e-6 or abs(z-200)<1e-6)) or (100-1e-6<=z<=200+1e-6 and (abs(n-106)<1e-6 or abs(n-206)<1e-6))
            if on_hole:
                matches=[w for w in walers if abs(w['z']-150)<1e-6 and w['v0']<=plate['v']<=w['v1']]
                assert len(matches)==1
                join(tag,waler_nodes[(matches[0]['tag'],round(plate['v'],6))])
    # Resolve every rigid cluster to one retained node: no chained MPCs.
    slaves={tag:root(tag) for tag in coords if root(tag)!=tag}
    fixed={root(tag) for tag in fixed_nodes}
    for slave,master in slaves.items():ops.rigidLink('beam',master,slave)
    for tag in fixed:ops.fix(tag,1,1,1,1,1,1)
    ops.timeSeries('Linear',1);ops.pattern('Plain',1,1)
    domain=model['pressureDomain'];hole=domain['hole']
    def quadrature(cell,rect,factor):
        a=max(cell['v0'],rect['v0']);b=min(cell['v1'],rect['v1']);c=max(cell['z0'],rect['z0']);d=min(cell['z1'],rect['z1'])
        if b<=a or d<=c:return
        for xi in [-1/math.sqrt(3),1/math.sqrt(3)]:
            for eta in [-1/math.sqrt(3),1/math.sqrt(3)]:
                v=(a+b)/2+xi*(b-a)/2;z=(c+d)/2+eta*(d-c)/2
                sv=(v-cell['v0'])/(cell['v1']-cell['v0']);sz=(z-cell['z0'])/(cell['z1']-cell['z0'])
                N=[(1-sv)*(1-sz),sv*(1-sz),sv*sz,(1-sv)*sz]
                f=model['pressureSign']*.000025*(1485-z)*(b-a)*(d-c)/4*factor
                for tag,w in zip(cell['ids'],N):loads[tag]=loads.get(tag,0.)+f*w
    for c in cells:quadrature(c,domain,1);quadrature(c,hole,-1)
    before=sum(loads.values());edge_transfers=[]
    pv=sorted(set([domain['v0'],domain['v1'],hole['v0'],hole['v1']]+[v for p in patches for v in [p['v0'],p['v1']]]))
    pz=sorted(set([domain['z0'],domain['z1'],hole['z0'],hole['z1']]+[z for p in patches for z in [p['z0'],p['z1']]]))
    for a,b in zip(pv[:-1],pv[1:]):
        for c,d in zip(pz[:-1],pz[1:]):
            vm=(a+b)/2;zm=(c+d)/2
            if not(domain['v0']<=vm<=domain['v1'] and domain['z0']<=zm<=domain['z1']):continue
            if hole['v0']<vm<hole['v1'] and hole['z0']<zm<hole['z1']:continue
            if material(vm,zm):continue
            boundaries=[v for p in patches if p['z0']<=zm<=p['z1'] for v in [p['v0'],p['v1']]]
            target=min(boundaries,key=lambda v:abs(v-vm));edge_transfers.append(dict(v0=a,v1=b,z0=c,z1=d,targetVmm=target))
            for zlo,zhi in zip(zs[:-1],zs[1:]):
                lo=max(c,zlo);hi=min(d,zhi)
                if hi<=lo:continue
                ids=[node(model['shellMidU'],target,z) for z in [zlo,zhi]]
                for xi in [-1/math.sqrt(3),1/math.sqrt(3)]:
                    for eta in [-1/math.sqrt(3),1/math.sqrt(3)]:
                        v=(a+b)/2+xi*(b-a)/2;z=(lo+hi)/2+eta*(hi-lo)/2
                        f=model['pressureSign']*.000025*(1485-z)*(b-a)*(hi-lo)/4;w=(z-zlo)/(zhi-zlo)
                        for tag,weight in zip(ids,[1-w,w]):
                            loads[tag]=loads.get(tag,0.)+f*weight;moments[tag]=moments.get(tag,0.)+(target-v)*f*weight
    for tag,f in loads.items():ops.load(tag,f,0.,0.,0.,0.,moments.get(tag,0.))
    connected={root(t) for e in cells+gusset_cells+beams for t in e['ids']}
    orphan=[(t,coords[t].tolist()) for t in coords if root(t) not in connected]
    if orphan:raise RuntimeError(f'Orphan nodes {orphan[:20]}')
    solve()
    reduced={tag:np.zeros(6) for tag in coords if tag not in slaves}
    for tag,p in coords.items():
        master=slaves.get(tag,tag);r=np.array(ops.nodeReaction(tag));reduced[master][:3]+=r[:3];reduced[master][3:]+=r[3:]+np.cross(p-coords[master],r[:3])
    reactions=[dict(node=tag,xyzMm=coords[tag].tolist(),forceN=reduced[tag][:3].tolist(),momentNmm=reduced[tag][3:].tolist()) for tag in sorted(fixed)]
    free=[r for tag,r in reduced.items() if tag not in fixed]
    extF=np.array([sum(loads.values()),0.,0.]);extM=sum((np.cross(coords[tag],[f,0,0])+[0,0,moments.get(tag,0.)] for tag,f in loads.items()),np.zeros(3))
    reactF=sum((np.array(r['forceN']) for r in reactions),np.zeros(3));reactM=sum((np.array(r['momentNmm'])+np.cross(r['xyzMm'],r['forceN']) for r in reactions),np.zeros(3))
    nodes=[dict(tag=tag,xyzMm=p.tolist(),displacementMm=ops.nodeDisp(tag)[:3]) for tag,p in coords.items()]
    skin_nodes={tag for c in cells for tag in c['ids']}
    for c in cells+gusset_cells:c['gaussResultants']=np.array(ops.eleResponse(c['tag'],'stresses')).reshape(4,8).tolist()
    foot_groups=[]
    stations=sorted(set(p['station'] for p in plates))
    for station in stations:
        rr=[r for r in reactions if min(stations,key=lambda v:abs(v-r['xyzMm'][1]))==station]
        origin=np.array([u(6),station,30.]);F=sum((np.array(r['forceN']) for r in rr),np.zeros(3));M=sum((np.array(r['momentNmm'])+np.cross(np.array(r['xyzMm'])-origin,r['forceN']) for r in rr),np.zeros(3))
        foot_groups.append(dict(stationMm=station,referenceMm=origin.tolist(),forceN=F.tolist(),momentNmm=M.tolist()))
    return dict(revision='P83',key=key,owner=owner,meshTargetMm=mesh,solverVersion=ops.version(),inputs=[dict(path=str(p.relative_to(ROOT)),sha256=sha(p)) for p in [input_path,gp]],solverSha256=sha(__file__),mesherSha256=sha(ROOT/'tools/modular-program/gusset_mesh_p83.py'),basis=model,boundaryCase='FLEXIBLE_WALERS_AND_GUSSETS_RIGID_FOOT_BOUNDARY_NO_SEAMS',nodes=nodes,shellCells=cells,gussetCells=gusset_cells,gussetAreaMm2=gusset_area,gussetPlates=plates,beams=[dict(**b,localEndForces=ops.eleResponse(b['tag'],'localForce')) for b in beams],rigidLinks=[dict(master=m,slave=s) for s,m in slaves.items()],reactions=reactions,footGroups=foot_groups,edgePressureTransfer=dict(rectangles=edge_transfers,transferredForceN=sum(loads.values())-before),appliedForceN=extF.tolist(),appliedMomentNmm=extM.tolist(),forceResidualN=(extF+reactF).tolist(),momentResidualNmm=(extM+reactM).tolist(),maxFreeRetainedResidualForceN=max(np.linalg.norm(r[:3]) for r in free),maxFreeRetainedResidualMomentNmm=max(np.linalg.norm(r[3:]) for r in free),maxSkinNormalDisplacementMm=max(abs(ops.nodeDisp(tag,1)) for tag in skin_nodes),maxWalerNormalDisplacementMm=max(abs(ops.nodeDisp(tag,1)) for tag in waler_nodes.values()),beamProperties=dict(rib=dict(A=A,Iy=Iy,Iz=Iz,Japprox=J),waler=dict(A=WA,Iy=WI,Iz=WI,Japprox=WJ)),limitations=['Hydrostatic wall pressure only; isolated wall without helpful or adverse seam/adjacent-panel coupling.','Rigidly prescribed gusset bottom edges at z30 represent rigid feet, not flexible foot plates, bed, bolts or floor.','Welds and overlapping rib/waler joint cross sections idealized by flattened rigid clusters; weld strength and local joint flexibility not checked.','Linear elastic small-displacement model; large deflection requires review, not an automatic safety verdict.','No gravity, dynamic, buckling, code capacity, lifting or production release.'],engineeringApproved=False,productionReleased=False,stageComplete=False)

if __name__=='__main__':
    key=sys.argv[1] if len(sys.argv)>1 else 'A-LH-W01';owner=sys.argv[2] if len(sys.argv)>2 else 'M01';mesh=float(sys.argv[3]) if len(sys.argv)>3 else 100
    r=run(key,owner,mesh);out=ROOT/'output/wall-frame-p83';out.mkdir(parents=True,exist_ok=True)
    (out/f'{key}-{owner}-h{mesh:g}.json').write_text(json.dumps(r,indent=2),encoding='utf8')
    print(json.dumps({k:r[k] for k in ['key','owner','meshTargetMm','maxSkinNormalDisplacementMm','maxWalerNormalDisplacementMm','forceResidualN','momentResidualNmm','maxFreeRetainedResidualForceN','maxFreeRetainedResidualMomentNmm','footGroups']}))
