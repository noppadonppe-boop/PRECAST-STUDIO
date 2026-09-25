"""Source-preserving L/U part meshes, NOT a connected structural model."""
import json,sys,math,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'.local-engineering-runtime/mesh-p112'))
import numpy as np
import triangle
out=root/'output/staad-p7-p131';out.mkdir(exist_ok=True)
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def transform(points,t,inverse=False):
    a=math.radians(t.get('rotationZDeg',0));R=np.array([[math.cos(a),-math.sin(a),0],[math.sin(a),math.cos(a),0],[0,0,1]])
    p=np.array(points);v=np.array(t['translationMm'])
    return (p-v)@R if inverse else p@R.T+v
def canon(points): return sorted(set(tuple(round(float(v),5) for v in p) for p in points))
templates={}
paths=[root/'output/staad-p7-p115/pilot-mesh.json']+[root/f'output/staad-p7-p130-remesh/PM-I-{f}{u}/pilot-mesh.json' for f in 'ABD' for u in range(1,5)]
for path in paths:
    m=read(path);s=read(root/m.get('sourcePath','output/stage3-designs-p36/I-C1/model.json'))
    for p in s['instances']:
        if p['kind']!='SHELL' or p['typicalId'] in templates: continue
        ns=[n for n in m['nodes'] if n['part']==p['id']];ids={n['id']:i for i,n in enumerate(ns)}
        templates[p['typicalId']]={'piece':p,'points':transform([n['xyzMm'] for n in ns],p['transform'],True),'elements':[(e,[ids[n] for n in e['nodeIds']]) for e in m['elements'] if e['part']==p['id']],'path':str(path.relative_to(root)).replace('\\','/'),'sha256':sha(path),'localSolid':canon(transform([v for f in p['facesMm'] for v in f],p['transform'],True))}
def planar_cap(piece):
    """Find a true constant-normal-thickness extrusion in the supplied solid."""
    t=piece.get('normalThicknessMm',piece.get('thicknessMm'))
    if t is None: t=piece['boundsMm']['max'][2]-piece['boundsMm']['min'][2]
    faces=[np.array(f,dtype=float) for f in piece['facesMm']];allp=np.vstack(faces)
    if piece['kind']=='FASCIA':
        # The top edge is cut on a drainage slope THROUGH the thickness.
        # Intersect the actual solid at half thickness, not either outer face.
        dims=np.ptp(allp,axis=0);axes=[k for k in [0,1] if abs(dims[k]-t)<1e-6];assert len(axes)==1
        k=axes[0];level=(allp[:,k].min()+allp[:,k].max())/2;n=np.eye(3)[k];points={}
        for f in faces:
            for a,b in zip(f,np.roll(f,-1,axis=0)):
                if (a[k]-level)*(b[k]-level)<0:
                    p=a+(b-a)*(level-a[k])/(b[k]-a[k]);points[tuple(np.round(p,6))]=p
        assert len(points)==4,piece['id'];u=np.eye(3)[1-k];v=np.cross(n,u);center=np.mean(list(points.values()),axis=0)
        cap=np.array(sorted(points.values(),key=lambda p:math.atan2((p-center)@v,(p-center)@u)))
        area=np.linalg.norm(sum((np.cross(cap[i]-cap[0],cap[i+1]-cap[0]) for i in range(1,len(cap)-1)),np.zeros(3)))/2
        assert abs(area*t/1e9-piece['concreteMassKg']/2400)<1e-6
        return [cap],n,u,v,cap[0],t
    for face in sorted(faces,key=lambda f:-len(f)):
        n=sum((np.cross(face[i]-face[0],face[i+1]-face[0]) for i in range(1,len(face)-1)),np.zeros(3))
        if np.linalg.norm(n)<1e-8: continue
        n/=np.linalg.norm(n);major=int(np.argmax(abs(n)))
        if n[major]<0: n=-n
        ds=allp@n;lo=float(ds.min());hi=float(ds.max())
        if abs(hi-lo-t)>1e-5:continue
        caps=[f for f in faces if np.max(abs(f@n-lo))<1e-5]
        if not caps:continue
        area=sum(np.linalg.norm(sum((np.cross(f[i]-f[0],f[i+1]-f[0]) for i in range(1,len(f)-1)),np.zeros(3)))/2 for f in caps)
        # Curved END source mass uses an analytic profile; supplied solid faces
        # are faceted. Match the established 0.5 kg geometry-ledger tolerance.
        if abs(area*t/1e9-piece['concreteMassKg']/2400)>.5/2400:continue
        u=caps[0][1]-caps[0][0];u=u-n*(u@n);u/=np.linalg.norm(u);v=np.cross(n,u);origin=caps[0][0]+n*t/2
        return caps,n,u,v,origin,t
    raise AssertionError('No verified constant-thickness extrusion: '+piece['id'])
def planar_mesh(piece):
    caps,n,u,v,origin,t=planar_cap(piece)
    face2=[np.column_stack(((f-origin)@u,(f-origin)@v)) for f in caps]
    coords={tuple(round(float(x),6) for x in p):p for f in face2 for p in f};vertices=list(coords.values());counts={}
    for f in face2:
        for a,b in zip(f,np.roll(f,-1,axis=0)):
            d=b-a;dd=float(d@d)
            if dd<1e-12:continue
            seq=[]
            for i,p in enumerate(vertices):
                w=p-a;q=float(w@d/dd)
                if -1e-8<=q<=1+1e-8 and np.linalg.norm(w-q*d)<1e-5:seq.append((q,i))
            seq.sort()
            for (_,i),(_,j) in zip(seq,seq[1:]):
                key=tuple(sorted((i,j)));counts[key]=counts.get(key,0)+1
    assert all(c in [1,2] for c in counts.values()),piece['id']
    boundary=[edge for edge,c in counts.items() if c==1];used=sorted(set(i for edge in boundary for i in edge));remap={x:i for i,x in enumerate(used)}
    # Source END doors are boundary notches, not closed interior holes.
    # Reject multiple boundary loops rather than silently filling an interior hole.
    adj={i:[] for i in used}
    for i,j in boundary:adj[i].append(j);adj[j].append(i)
    assert all(len(v)==2 for v in adj.values()),piece['id']
    seen=set();todo=[used[0]]
    while todo:
        i=todo.pop()
        if i in seen:continue
        seen.add(i);todo.extend(adj[i])
    assert len(seen)==len(used),'Interior hole requires explicit hole seed '+piece['id']
    tri=triangle.triangulate({'vertices':[vertices[i] for i in used],'segments':[[remap[i],remap[j]] for i,j in boundary]},'pq25a10000Q')
    pts=[origin+x*u+y*v for x,y in tri['vertices']];els=[]
    for ids in tri['triangles']:
        a,b,c=tri['vertices'][ids];area=float((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2
        assert area>0;els.append(({'areaMm2':area,'thicknessMm':t},list(map(int,ids))))
    return pts,els,{'method':'ACTUAL_MID_THICKNESS_SECTION_WITH_SLOPED_EDGE' if piece['kind']=='FASCIA' else 'VERIFIED_PRISM_MIDSURFACE','normal':n.tolist(),'thicknessMm':t,'triangleOptions':'pq25a10000Q'}
results=[]
for plan in 'LU':
 for family in 'ABCD':
  for use in range(1,5):
    code=f'{plan}-{family}{use}';source=root/f'output/stage3-designs-p36/{code}/model.json';s=read(source);nodes=[];elements=[];parts=[]
    for p in s['instances']:
        start=len(nodes);startE=len(elements)
        if p['kind']=='SHELL':
            tm=templates[p['typicalId']]
            assert p['sourceSha256']==tm['piece']['sourceSha256']
            actual=canon(transform([v for f in p['facesMm'] for v in f],p['transform'],True))
            assert actual==tm['localSolid'],'Template solid differs '+p['id']
            pts=transform(tm['points'],p['transform']);els=tm['elements'];method={'method':'RIGID_TRANSFORM_OF_VERIFIED_TYPE_I_PART_MESH','templatePath':tm['path'],'templateSha256':tm['sha256'],'templatePart':tm['piece']['id']}
        else:pts,els,method=planar_mesh(p)
        nodes.extend({'id':start+i+1,'part':p['id'],'xyzMm':[float(v) for v in point]} for i,point in enumerate(pts))
        elements.extend({'id':startE+i+1,'part':p['id'],'nodeIds':[start+n+1 for n in ids],'areaMm2':float(e['areaMm2']),'thicknessMm':float(e['thicknessMm'])} for i,(e,ids) in enumerate(els))
        volume=sum(e['areaMm2']*e['thicknessMm']/1e9 for e in elements[startE:]);sourceVolume=p['concreteMassKg']/2400
        assert abs(volume/sourceVolume-1)<.002,p['id']
        parts.append({'id':p['id'],'kind':p['kind'],'typicalId':p['typicalId'],'nodes':len(nodes)-start,'elements':len(elements)-startE,'midsurfaceVolumeM3':volume,'sourceVolumeM3':sourceVolume,'relativeVolumeError':volume/sourceVolume-1,**method})
    folder=out/s['id'];folder.mkdir(exist_ok=True)
    data={'id':s['id'],'sourcePath':str(source.relative_to(root)).replace('\\','/'),'sourceSha256':sha(source),'status':'INDIVIDUAL_PART_MESHES_NOT_CONNECTED_OR_RUNNABLE','nodes':nodes,'elements':elements,'parts':parts,'missing':['Compatible joint boundaries and DOF','Beam seats and foundation coupling','Loads materials analysis RC and convergence'],'engineeringApproved':False}
    (folder/'part-mesh.json').write_text(json.dumps(data,indent=2)+'\n')
    lines=['STAAD SPACE','* INDIVIDUAL PART GEOMETRY ONLY - NO CONNECTIONS SUPPORTS OR ANALYSIS','UNIT METER KN','JOINT COORDINATES']+[f"{n['id']} {n['xyzMm'][0]/1000:.9f} {n['xyzMm'][2]/1000:.9f} {n['xyzMm'][1]/1000:.9f}" for n in nodes]+['ELEMENT INCIDENCES SHELL']+[str(e['id'])+' '+' '.join(map(str,reversed(e['nodeIds']))) for e in elements]+['ELEMENT PROPERTY']+[f"{e['id']} THICKNESS {e['thicknessMm']/1000}" for e in elements]+['FINISH']
    (folder/(s['id']+'-PARTS-GEOMETRY.STD')).write_text('\n'.join(lines)+'\n')
    row={'productId':s['id'],'folder':str(folder.relative_to(root)).replace('\\','/'),'parts':len(parts),'nodes':len(nodes),'elements':len(elements),'maxVolumeError':max(abs(p['relativeVolumeError']) for p in parts)};results.append(row);print(json.dumps(row),flush=True)
(out/'index.json').write_text(json.dumps({'revision':'P131','status':'32_LU_PART_MESHES_AWAITING_QUALITY_AND_INTERFACE_CHECKS','results':results,'engineeringApproved':False},indent=2)+'\n')
