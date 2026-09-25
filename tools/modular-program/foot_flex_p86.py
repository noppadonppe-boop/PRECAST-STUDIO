"""Elastic P85 foot plate with unilateral bed/bolt springs; P83 one-way loads.
Local plate bending only, ideal rigid washer patches, no capacity approval.
"""
import sys,json,math,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.local-engineering-runtime'))
import numpy as np
import openseespy.opensees as ops
from foot_mesh_p86 import mesh_plate,audit_mesh
from gusset_mesh_p83 import area
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def run(key='A-LH-W01',owner='M01',foot_index=1,size=40,kc=1000.,length=50.,thickness=30.):
    base_path=ROOT/f'output/abd-base-pattern-p85/{key}.json';wall_path=ROOT/f'output/wall-frame-p83/{key}-{owner}-h25.json'
    base=json.loads(base_path.read_text(encoding='utf8'));wall=json.loads(wall_path.read_text(encoding='utf8'))
    foot_tag=f'{owner}-F{foot_index}';foot=next(f for f in base['baseFeet'] if f['tag']==foot_tag)
    station=([400,2200] if owner=='M01' else [400,1900])[foot_index-1]
    origin=np.array([-181. if owner=='M01' else 331.,float(station),0.]);s=200/2825 if key[0]=='D' else 0.;L=math.hypot(1,s)
    def local(p):
        x,y=p[:2]
        if '-RH-' in key:x=1490-x
        return [(x-s*y)/L-origin[0],(s*x+y)/L-origin[1]]
    polygons=[[local(p) for p in c['poly']] for c in foot['cells']]
    bolts=[dict(tag=b['tag'],xy=local(b['axisMm'])) for b in base['baseLocks'] if b['foot']==foot_tag]
    quads=mesh_plate(polygons,size);mesh_audit=audit_mesh(quads,polygons)
    if abs(mesh_audit['areaMm2']-mesh_audit['sourceAreaMm2'])>.02:raise RuntimeError('Plate area mismatch')
    # Check every free edge is at the rectangle or a physical 32-sided bore, not a mesh tear.
    unexpected=[]
    for e in mesh_audit['freeEdges']:
        x,y=np.mean(e,axis=0)
        if min(abs(abs(x)-175),abs(abs(y)-100))>2e-4 and not any(10.94<math.hypot(x-b['xy'][0],y-b['xy'][1])<11.001 for b in bolts):unexpected.append(e)
    if unexpected:raise RuntimeError(f'Mesh tears {unexpected[:3]}')
    ops.wipe();ops.model('basic','-ndm',3,'-ndf',6);E=200000.;nu=.3;t=thickness;kb=E*245/length
    ops.section('ElasticMembranePlateSection',1,E,nu,t,0.)
    coords={};lookup={};cells=[];tributary={}
    def node(x,y,z=15.):
        p=tuple(round(float(v),4) for v in [x,y,z])
        if p not in lookup:
            tag=len(lookup)+1;lookup[p]=tag;coords[tag]=np.array(p);ops.node(tag,*p)
        return lookup[p]
    for q in quads:
        ids=[node(*p) for p in q];tag=len(cells)+1;ops.element('ShellMITC4',tag,*ids,1)
        cells.append(dict(tag=tag,ids=ids));A=area(q)
        # Integrate bilinear shape functions for the spring's tributary area.
        for xi in [-1/math.sqrt(3),1/math.sqrt(3)]:
            for eta in [-1/math.sqrt(3),1/math.sqrt(3)]:
                N=np.array([(1-xi)*(1-eta),(1+xi)*(1-eta),(1+xi)*(1+eta),(1-xi)*(1+eta)])/4
                d=np.array([[-(1-eta),1-eta,1+eta,-(1+eta)],[-(1-xi),-(1+xi),1+xi,1-xi]])/4
                det=np.linalg.det(d@np.array(q))
                if det<=0:raise RuntimeError('Inverted plate quad')
                for id,w in zip(ids,N):tributary[id]=tributary.get(id,0.)+w*det
    plate_ids=list(coords);slaves={};root_bolts=[]
    for b in bolts:
        root=node(*b['xy']);patch=[tag for tag in plate_ids if math.dist(coords[tag][:2],b['xy'])<=20+1e-5]
        if len(patch)<8:raise RuntimeError('Washer patch too coarse')
        for tag in patch:
            if tag in slaves:raise RuntimeError('Overlapping washer patches')
            ops.rigidLink('beam',root,tag);slaves[tag]=root
        ops.fix(root,1,1,0,0,0,1);root_bolts.append(dict(**b,node=root,washerNodes=patch))
    for tag in plate_ids:
        if tag not in slaves:ops.fix(tag,1,1,0,0,0,1)
    anchors=[];spring_elements=[]
    for tag in plate_ids:
        anchor=50000+tag;ops.node(anchor,*coords[tag]);ops.fix(anchor,1,1,1,1,1,1)
        mat=10+tag;ops.uniaxialMaterial('ENT',mat,kc*tributary[tag]);element=100000+tag
        ops.element('zeroLength',element,anchor,tag,'-mat',mat,'-dir',3)
        anchors.append(dict(node=anchor,xyzMm=coords[tag].tolist(),kind='bed',plateNode=tag));spring_elements.append(element)
    ops.uniaxialMaterial('ENT',1,kb)
    for i,b in enumerate(root_bolts):
        anchor=90000+i;ops.node(anchor,*coords[b['node']]);ops.fix(anchor,1,1,1,1,1,1)
        ops.element('zeroLength',200000+i,b['node'],anchor,'-mat',1,'-dir',3)
        anchors.append(dict(node=anchor,xyzMm=coords[b['node']].tolist(),kind='bolt',boltTag=b['tag']));spring_elements.append(200000+i)
    loads={};mappings=[];stations=[400,2200] if owner=='M01' else [400,1900]
    all_xy=np.array([coords[tag][:2] for tag in plate_ids])
    for r in wall['reactions']:
        if min(stations,key=lambda v:abs(v-r['xyzMm'][1]))!=station:continue
        source=np.array(r['xyzMm'])-origin;F=-np.array(r['forceN']);M=-np.array(r['momentNmm'])
        # Force/couple conserving nodal mapping. No unverified interpolation across holes.
        tag=plate_ids[int(np.argmin(np.linalg.norm(all_xy-source[:2],axis=1)))];target=np.array([*coords[tag][:2],0.])
        mapped=M+np.cross(source-target,F);load=np.array([0.,0.,F[2],mapped[0],mapped[1],0.])
        loads[tag]=loads.get(tag,np.zeros(6))+load
        mappings.append(dict(sourceNode=r['node'],plateNode=tag,offsetMm=(source-target).tolist(),forceN=F.tolist(),sourceMomentNmm=M.tolist(),mappedBendingMomentNmm=mapped[:2].tolist()))
    ops.timeSeries('Linear',1);ops.pattern('Plain',1,1)
    for tag,load in loads.items():ops.load(tag,*load)
    ops.constraints('Transformation');ops.numberer('RCM');ops.system('UmfPack')
    ops.test('NormDispIncr',1e-10,50);ops.algorithm('Newton');ops.integrator('LoadControl',1.);ops.analysis('Static')
    code=ops.analyze(1)
    if code!=0:raise RuntimeError(f'Foot contact failed {code}')
    ops.reactions()
    reactions=[dict(**a,forceN=ops.nodeReaction(a['node'])[:3]) for a in anchors]
    extF=sum((v[:3] for v in loads.values()),np.zeros(3));extM=sum((v[3:]+np.cross(coords[tag],v[:3]) for tag,v in loads.items()),np.zeros(3))
    reactF=sum((np.array(r['forceN']) for r in reactions),np.zeros(3));reactM=sum((np.cross(r['xyzMm'],r['forceN']) for r in reactions),np.zeros(3))
    bolt_forces=[dict(tag=r['boltTag'],tensionN=-ops.nodeReaction(r['node'],3)) for r in reactions if r['kind']=='bolt']
    for b in root_bolts:b['displacement']=ops.nodeDisp(b['node'])
    mpc_error=0.
    for slave,master in slaves.items():
        a=np.array(ops.nodeDisp(master));b=np.array(ops.nodeDisp(slave));expected=a[:3]+np.cross(a[3:],coords[slave]-coords[master]);mpc_error=max(mpc_error,float(np.max(np.abs(b[:3]-expected))))
    mesh_audit['maxWasherConstraintErrorMm']=mpc_error
    if mpc_error>1e-8:raise RuntimeError(f'Washer MPC compatibility failed: {mpc_error} mm')
    # Fixed-anchor reaction acts downward for a tensioned bolt and upward for bed contact.
    nodes=[dict(tag=tag,xyzMm=coords[tag].tolist(),displacementMm=ops.nodeDisp(tag)[:3]) for tag in plate_ids]
    reduced={tag:np.zeros(6) for tag in coords if tag not in slaves}
    for tag,p in coords.items():
        master=slaves.get(tag,tag);rr=np.array(ops.nodeReaction(tag));reduced[master][:3]+=rr[:3];reduced[master][3:]+=rr[3:]+np.cross(p-coords[master],rr[:3])
    free_z=max(abs(r[2]) for r in reduced.values());free_m=max(np.linalg.norm(r[3:5]) for r in reduced.values())
    for c in cells:c['gaussResultants']=np.array(ops.eleResponse(c['tag'],'stresses')).reshape(4,8).tolist()
    return dict(revision='P86',key=key,owner=owner,foot=foot_tag,meshTargetMm=size,inputs=[dict(path=str(p.relative_to(ROOT)),sha256=sha(p)) for p in [base_path,wall_path]],solverSha256=sha(__file__),mesherSha256=sha(ROOT/'tools/modular-program/foot_mesh_p86.py'),solverVersion=ops.version(),originFabricationMm=origin.tolist(),basis=dict(E_MPa=E,nu=nu,thicknessMm=t,kContactNPerMm3=kc,kBoltNPerMm=kb,effectiveBoltLengthMm=length,stressAreaMm2=245,washerPatchRadiusMm=20),meshAudit=mesh_audit,nodes=nodes,cells=cells,bolts=root_bolts,boltForces=bolt_forces,reactions=reactions,loadMappings=mappings,appliedForceN=extF.tolist(),appliedMomentNmm=extM.tolist(),forceResidualN=(extF+reactF).tolist(),momentResidualNmm=(extM+reactM).tolist(),maxFreeVerticalResidualN=free_z,maxFreeBendingResidualNmm=free_m,maxUpwardDisplacementMm=max(n['displacementMm'][2] for n in nodes),minDisplacementMm=min(n['displacementMm'][2] for n in nodes),limitations=['One-way P83 support-load handoff, not coupled wall/foot redistribution.','In-plane DOFs restrained; shear carried separately, no membrane/shear-group response claim.','Rigid 40mm washer patch kinematics; washer bending, bolt-head contact and thread capacity excluded.','Nearest material node mapping conserves vertical force and bending wrench; point/couple peaks are not capacity stresses.','Linear elastic plate with unilateral springs; no yielding, weld detail, manufacturing imperfections or approval.'],engineeringApproved=False,productionReleased=False,stageComplete=False)

if __name__=='__main__':
    key=sys.argv[1] if len(sys.argv)>1 else 'A-LH-W01';owner=sys.argv[2] if len(sys.argv)>2 else 'M01';idx=int(sys.argv[3]) if len(sys.argv)>3 else 1;size=float(sys.argv[4]) if len(sys.argv)>4 else 40
    r=run(key,owner,idx,size);out=ROOT/'output/foot-flex-p86';out.mkdir(exist_ok=True,parents=True);(out/f'{key}-{owner}-F{idx}-h{size:g}.json').write_text(json.dumps(r,indent=2),encoding='utf8')
    print(json.dumps({k:r[k] for k in ['key','foot','meshTargetMm','boltForces','maxUpwardDisplacementMm','minDisplacementMm','forceResidualN','momentResidualNmm']}))
