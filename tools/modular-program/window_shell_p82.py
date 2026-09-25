"""P82 shell+rib interface study. Not an approved mould or a whole-frame model."""
from pathlib import Path
import sys, json, math, hashlib
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '.local-engineering-runtime'))
import numpy as np
import openseespy.opensees as ops

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def solve():
    ops.constraints('Transformation'); ops.numberer('RCM'); ops.system('UmfPack')
    ops.test('NormDispIncr', 1e-9, 10); ops.algorithm('Linear')
    ops.integrator('LoadControl', 1.0); ops.analysis('Static')
    code = ops.analyze(1)
    if code != 0: raise RuntimeError(f'OpenSees failure {code}')
    ops.reactions()

def run(key, owner, mesh=100):
    path=ROOT/f'output/window-shell-p82/{key}-{owner}-input.json'
    model=json.loads(path.read_text(encoding='utf8'))
    for item in model['inputs']:
        if sha(ROOT/item['path']) != item['sha256']: raise RuntimeError('Stale source')
    patches=model['patches']; ribs=model['ribs']; interfaces=model['idealWalerInterfaces']
    def refine(values):
        vals=sorted(set(round(v,7) for v in values)); out=[]
        for a,b in zip(vals[:-1],vals[1:]):
            count=max(1,math.ceil((b-a)/mesh))
            out.extend(a+(b-a)*j/count for j in range(count))
        return out+[vals[-1]]
    vs=refine([v for p in patches for v in [p['v0'],p['v1']]]+[r['v'] for r in ribs])
    zs=refine([z for p in patches for z in [p['z0'],p['z1']]]+[z for r in ribs for z in [r['z0'],r['z1']]]+[s['z'] for s in interfaces])
    ops.wipe(); ops.model('basic','-ndm',3,'-ndf',6)
    E=200000.; nu=.3; G=E/(2*(1+nu)); t=model['skinThicknessMm']
    ops.section('ElasticMembranePlateSection',1,E,nu,t,0.)
    ops.geomTransf('Linear',1,1.,0.,0.)
    coords={}; lookup={}; cells=[]; beams=[]; slaves={}; fixed=set(); loads={}; load_moments={}
    def node(u,v,z):
        p=(round(u,6),round(v,6),round(z,6))
        if p not in lookup:
            tag=len(lookup)+1; lookup[p]=tag; coords[tag]=np.array(p); ops.node(tag,*p)
        return lookup[p]
    def material(v,z):
        return any(p['v0']-1e-6 <= v <= p['v1']+1e-6 and p['z0']-1e-6 <= z <= p['z1']+1e-6 for p in patches)
    for a,b in zip(vs[:-1],vs[1:]):
        for c,d in zip(zs[:-1],zs[1:]):
            if not material((a+b)/2,(c+d)/2): continue
            ids=[node(model['shellMidU'],v,z) for v,z in [(a,c),(b,c),(b,d),(a,d)]]
            tag=len(cells)+1; ops.element('ShellMITC4',tag,*ids,1)
            cells.append(dict(tag=tag,ids=ids,v0=a,v1=b,z0=c,z1=d))
    A=1400.; Iy=(50*100**3-40*90**3)/12; Iz=(100*50**3-90*40**3)/12
    J=4*(95*45)**2/(2*(95+45)/5) # closed thin-wall approximation, disclosed
    for r in ribs:
        zline=[z for z in zs if r['z0']-1e-6<=z<=r['z1']+1e-6]
        ids=[node(r['u'],r['v'],z) for z in zline]
        for a,b in zip(ids[:-1],ids[1:]):
            tag=100000+len(beams); ops.element('elasticBeamColumn',tag,a,b,A,E,G,J,Iy,Iz,1)
            beams.append(dict(tag=tag,owner=r['tag'],ids=[a,b]))
        for z,master in zip(zline,ids):
            slave=lookup.get((round(model['shellMidU'],6),round(r['v'],6),round(z,6)))
            if slave is not None:
                if slave in slaves: raise RuntimeError('Duplicate/chained shell constraint')
                ops.rigidLink('beam',master,slave); slaves[slave]=master
    for s in interfaces:
        tag=node(s['u'],s['v'],s['z']); ops.fix(tag,1,1,1,1,1,1); fixed.add(tag)
    if any(m in slaves for m in slaves.values()): raise RuntimeError('Chained MPC')
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
                F=model['pressureSign']*.000025*(1485-z)*(b-a)*(d-c)/4*factor
                for tag,w in zip(cell['ids'],N):loads[tag]=loads.get(tag,0.)+F*w
    for c in cells:
        quadrature(c,domain,1);quadrature(c,hole,-1)
    # Transfer the small pressure strips outside the trimmed midsurface to its nearest edge,
    # retaining the original force and moment with a nodal force + offset couple.
    before_edge_force=sum(loads.values()); edge_transfers=[]
    pv=sorted(set([domain['v0'],domain['v1'],hole['v0'],hole['v1']]+[v for p in patches for v in [p['v0'],p['v1']]]))
    pz=sorted(set([domain['z0'],domain['z1'],hole['z0'],hole['z1']]+[z for p in patches for z in [p['z0'],p['z1']]]))
    for a,b in zip(pv[:-1],pv[1:]):
        for c,d in zip(pz[:-1],pz[1:]):
            vm=(a+b)/2;zm=(c+d)/2
            if not(domain['v0']<=vm<=domain['v1'] and domain['z0']<=zm<=domain['z1']):continue
            if hole['v0']<vm<hole['v1'] and hole['z0']<zm<hole['z1']:continue
            if material(vm,zm):continue
            boundaries=[v for p in patches if p['z0']<=zm<=p['z1'] for v in [p['v0'],p['v1']]]
            target=min(boundaries,key=lambda v:abs(v-vm)); edge_transfers.append(dict(v0=a,v1=b,z0=c,z1=d,targetVmm=target))
            for zlo,zhi in zip(zs[:-1],zs[1:]):
                lo=max(c,zlo);hi=min(d,zhi)
                if hi<=lo:continue
                ids=[lookup[(round(model['shellMidU'],6),round(target,6),round(z,6))] for z in [zlo,zhi]]
                for xi in [-1/math.sqrt(3),1/math.sqrt(3)]:
                    for eta in [-1/math.sqrt(3),1/math.sqrt(3)]:
                        v=(a+b)/2+xi*(b-a)/2;z=(lo+hi)/2+eta*(hi-lo)/2
                        f=model['pressureSign']*.000025*(1485-z)*(b-a)*(hi-lo)/4
                        w=(z-zlo)/(zhi-zlo)
                        for tag,weight in zip(ids,[1-w,w]):
                            loads[tag]=loads.get(tag,0.)+f*weight
                            load_moments[tag]=load_moments.get(tag,0.)+(target-v)*f*weight
    for tag,f in loads.items():ops.load(tag,f,0.,0.,0.,0.,load_moments.get(tag,0.))
    solve()
    # Recover reduced residual at each retained node (T^T r), not raw slave reactions.
    reduced={tag:np.zeros(6) for tag in coords if tag not in slaves}
    for tag,p in coords.items():
        root=slaves.get(tag,tag); r=np.array(ops.nodeReaction(tag)); reduced[root][:3]+=r[:3]
        reduced[root][3:]+=r[3:]+np.cross(p-coords[root],r[:3])
    reactions=[dict(node=tag,xyzMm=coords[tag].tolist(),forceN=reduced[tag][:3].tolist(),momentNmm=reduced[tag][3:].tolist()) for tag in sorted(fixed)]
    free=[r for tag,r in reduced.items() if tag not in fixed]
    extF=np.array([sum(loads.values()),0.,0.]);extM=sum((np.cross(coords[tag],[f,0,0])+[0,0,load_moments.get(tag,0.)] for tag,f in loads.items()),np.zeros(3))
    reactF=sum((np.array(r['forceN']) for r in reactions),np.zeros(3));reactM=sum((np.array(r['momentNmm'])+np.cross(r['xyzMm'],r['forceN']) for r in reactions),np.zeros(3))
    nodes=[dict(tag=tag,xyzMm=p.tolist(),displacementMm=ops.nodeDisp(tag)[:3]) for tag,p in coords.items()]
    skin_nodes={tag for c in cells for tag in c['ids']}
    beamResults=[dict(**b,localEndForces=ops.eleResponse(b['tag'],'localForce')) for b in beams]
    for c in cells:
        c['gaussResultants']=np.array(ops.eleResponse(c['tag'],'stresses')).reshape(4,8).tolist()
    return dict(revision='P82',key=key,owner=owner,meshTargetMm=mesh,solverVersion=ops.version(),input=dict(path=str(path.relative_to(ROOT)),sha256=sha(path)),solverSha256=sha(__file__),basis=model,boundaryCase='IDEAL_RIGID_WALER_INTERFACES_NOT_FACTORY_SUPPORT',beamProperties=dict(areaMm2=A,IyMm4=Iy,IzMm4=Iz,JapproxMm4=J,Jbasis='Closed thin-wall approximation, not a torsion capacity check'),nodes=nodes,shellCells=cells,beams=beamResults,rigidLinks=[dict(master=m,slave=s) for s,m in slaves.items()],reactions=reactions,edgePressureTransfer=dict(rectangles=edge_transfers,forceBeforeN=before_edge_force,transferredForceN=sum(loads.values())-before_edge_force,method='Nearest midsurface edge with force-and-moment-preserving nodal couples'),appliedForceN=extF.tolist(),appliedMomentNmm=extM.tolist(),forceResidualN=(extF+reactF).tolist(),momentResidualNmm=(extM+reactM).tolist(),maxFreeRetainedResidualForceN=max(np.linalg.norm(r[:3]) for r in free),maxFreeRetainedResidualMomentNmm=max(np.linalg.norm(r[3:]) for r in free),maxSkinNormalDisplacementMm=max(abs(ops.nodeDisp(tag,1)) for tag in skin_nodes),limitations=['All6 DOFs at actual rib/waler intersections prescribed fixed; finite waler and frame flexibility not modelled.','Rigid offset links idealize weld kinematics, not weld strength.','End-mitre pressure outside the midsurface is transferred as equivalent edge force/couple; local mitre solid stresses not resolved.','M03 has a continuous back skin; window is a pressure-free region, not automatically a material cutout.','Shell membrane/bending/shear resultants and mesh convergence require review before any design use.','No code capacity, lifting, base, seam, dynamic or fabrication release.'],engineeringApproved=False,productionReleased=False,stageComplete=False)

if __name__=='__main__':
    key=sys.argv[1] if len(sys.argv)>1 else 'A-LH-W01';owner=sys.argv[2] if len(sys.argv)>2 else 'M01';mesh=float(sys.argv[3]) if len(sys.argv)>3 else 100
    result=run(key,owner,mesh);out=ROOT/f'output/window-shell-p82/{key}-{owner}-h{mesh:g}.json';out.write_text(json.dumps(result,indent=2),encoding='utf8')
    print(json.dumps({k:result[k] for k in ['key','owner','meshTargetMm','maxSkinNormalDisplacementMm','forceResidualN','momentResidualNmm','maxFreeRetainedResidualForceN','maxFreeRetainedResidualMomentNmm']}))
