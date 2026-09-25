import sys,json,hashlib,math
from pathlib import Path
root=Path(__file__).resolve().parents[2];sys.path.insert(0,str(root/'.local-engineering-runtime/mesh-p112'))
import numpy as np
import triangle
out=root/'output/staad-p7-p132-compatible';out.mkdir(exist_ok=True)
def read(p):return json.loads(p.read_text())
def key(p):return tuple(round(float(v),6) for v in p)
results=[]
for row in read(root/'output/staad-p7-p132/index.json')['results']:
    file=root/row['sourceMeshPath'];m=read(file);s=read(root/m['sourcePath']);j=read(root/row['folder']/'joint-map.json');floors={p['id']:p for p in s['instances'] if p['kind']=='FLOOR'};points={}
    for pid,p in floors.items():
        edgecounts={}
        for e in [e for e in m['elements'] if e['part']==pid]:
            for a,b in zip(e['nodeIds'],e['nodeIds'][1:]+e['nodeIds'][:1]):
                k=tuple(sorted([a,b]));edgecounts[k]=edgecounts.get(k,0)+1
        boundary=set(n for edge,c in edgecounts.items() if c==1 for n in edge)
        points[pid]={key(m['nodes'][i-1]['xyzMm'][:2]) for i in boundary}|{key(t['xyzMm'][:2]) for t in j['remeshTargets'] if t['part']==pid}
        poly=p['planFootprintMm']
        # Refine only where constrained interior vertices approach an edge.
        for t in [t for t in j['remeshTargets'] if t['part']==pid and 'JO-END-BASE' in t['reasons']]:
            q=np.array(t['xyzMm'][:2])
            for av,bv in zip(poly,poly[1:]+poly[:1]):
                a=np.array(av);b=np.array(bv);v=b-a;length=np.linalg.norm(v);u=v/length;d=float((q-a)@u);projection=a+d*u;distance=np.linalg.norm(q-projection)
                if 1e-5<distance<25 and 0<d<length:
                    for scale in [-2,-1,0,1,2]:
                        at=d+scale*distance
                        if 0<at<length:points[pid].add(key(a+at*u))
    # Transfer every constrained seam station, including partial seam endpoints,
    # across both physical edges; do not merge nodes across the actual gap.
    for iteration in range(6):
        added=0
        for seam in [x for x in j['joints'] if x['group']=='JO-FF']:
            axis=seam['axis'];lo,hi=seam['rangeMm'];pa,pb=seam['partA'],seam['partB'];va,vb=seam['boundaryCoordinatesMm']
            for a,b,ca,cb in [(pa,pb,va,vb),(pb,pa,vb,va)]:
                for q in list(points[a]):
                    if abs(q[axis]-ca)<1e-5 and lo-1e-5<=q[1-axis]<=hi+1e-5:
                        pt=list(q);pt[axis]=cb;pt=key(pt)
                        if pt not in points[b]:points[b].add(pt);added+=1
        if added==0:break
    assert added==0
    def meshfloor(pid):
        poly=floors[pid]['planFootprintMm'];vertices=sorted(points[pid]|{key(p) for p in poly});segments=[]
        for av,bv in zip(poly,poly[1:]+poly[:1]):
            a=np.array(av);b=np.array(bv);v=b-a;dd=float(v@v);seq=[]
            for i,pv in enumerate(vertices):
                w=np.array(pv)-a;t=float(w@v/dd)
                if -1e-8<=t<=1+1e-8 and np.linalg.norm(w-t*v)<1e-5:seq.append((t,i))
            seq.sort();segments.extend((i,j) for (_,i),(_,j) in zip(seq,seq[1:]))
        return triangle.triangulate({'vertices':vertices,'segments':segments},'pq25a10000Q')
    # Permit boundary refinement for quality, then propagate the actual new
    # boundary stations to the neighbour and remesh until seams agree.
    for mesh_iteration in range(16):
        meshes={pid:meshfloor(pid) for pid in floors};boundarysets={}
        for pid,tri in meshes.items():
            boundarysets[pid]={key(tri['vertices'][i]) for seg in tri['segments'] for i in seg}
        requested={pid:set() for pid in floors}
        for seam in [x for x in j['joints'] if x['group']=='JO-FF']:
            axis=seam['axis'];lo,hi=seam['rangeMm'];pa,pb=seam['partA'],seam['partB'];va,vb=seam['boundaryCoordinatesMm']
            for a,b,ca,cb in [(pa,pb,va,vb),(pb,pa,vb,va)]:
                for q in boundarysets[a]:
                    if abs(q[axis]-ca)<1e-5 and lo-1e-5<=q[1-axis]<=hi+1e-5:
                        pt=list(q);pt[axis]=cb;pt=key(pt)
                        if pt not in boundarysets[b]:requested[b].add(pt)
        missing=sum(len(v) for v in requested.values())
        if missing==0:break
        for pid in floors:points[pid]|=boundarysets[pid]|requested[pid]
    assert missing==0,(row['productId'],'seam refinement did not converge',missing)
    nodes=[];elements=[];parts=[];minangle=180
    for p in m['parts']:
        pid=p['id'];ns=[n for n in m['nodes'] if n['part']==pid];es=[e for e in m['elements'] if e['part']==pid];start=len(nodes);startE=len(elements)
        if p['kind']!='FLOOR':
            ids={n['id']:start+i+1 for i,n in enumerate(ns)};nodes.extend(dict(n,id=ids[n['id']]) for n in ns);elements.extend(dict(e,id=startE+i+1,nodeIds=[ids[n] for n in e['nodeIds']]) for i,e in enumerate(es))
        else:
            tri=meshes[pid]
            nodes.extend({'id':start+i+1,'part':pid,'xyzMm':[float(x),float(y),87.5]} for i,(x,y) in enumerate(tri['vertices']))
            for ids in tri['triangles']:
                a,b,c=tri['vertices'][ids];ar=float((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;assert ar>0
                for i in range(3):
                    ps=tri['vertices'][ids];u=ps[(i+1)%3]-ps[i];v=ps[(i+2)%3]-ps[i];angle=math.degrees(math.acos(max(-1,min(1,float(u@v/np.linalg.norm(u)/np.linalg.norm(v))))));minangle=min(minangle,angle)
                elements.append({'id':len(elements)+1,'part':pid,'nodeIds':[start+int(i)+1 for i in ids],'areaMm2':ar,'thicknessMm':175})
        vol=sum(e['areaMm2']*e['thicknessMm']/1e9 for e in elements[startE:]);assert abs(vol-p['midsurfaceVolumeM3'])<1e-8
        parts.append(dict(p,nodes=len(nodes)-start,elements=len(elements)-startE,midsurfaceVolumeM3=vol))
    assert minangle>=5,(row['productId'],minangle)
    m.update(nodes=nodes,elements=elements,parts=parts,status='LISTED_FLOOR_SEAMS_AND_END_TARGETS_COMPATIBLE_NOT_STRUCTURALLY_CONNECTED',predecessor={'path':row['sourceMeshPath'],'sha256':hashlib.sha256(file.read_bytes()).hexdigest()},floorMesher={'name':'triangle','options':'pq25a10000Q','boundaryStationUnion':True,'seamIterations':mesh_iteration+1,'minimumFloorTriangleAngleDeg':minangle})
    folder=out/row['productId'];folder.mkdir(exist_ok=True);(folder/'part-mesh.json').write_text(json.dumps(m,indent=2)+'\n')
    lines=['STAAD SPACE','* GEOMETRY ONLY NO CONNECTIONS SUPPORTS LOADS OR ANALYSIS','UNIT METER KN','JOINT COORDINATES']+[f"{n['id']} {n['xyzMm'][0]/1000:.9f} {n['xyzMm'][2]/1000:.9f} {n['xyzMm'][1]/1000:.9f}" for n in nodes]+['ELEMENT INCIDENCES SHELL']+[str(e['id'])+' '+' '.join(map(str,reversed(e['nodeIds']))) for e in elements]+['ELEMENT PROPERTY']+[f"{e['id']} THICKNESS {e['thicknessMm']/1000}" for e in elements]+['FINISH']
    (folder/(row['productId']+'-PARTS-GEOMETRY.STD')).write_text('\n'.join(lines)+'\n');r={'productId':row['productId'],'folder':str(folder.relative_to(root)).replace('\\','/'),'parts':len(parts),'nodes':len(nodes),'elements':len(elements),'minFloorAngleDeg':minangle};results.append(r);print(json.dumps(r),flush=True)
(out/'index.json').write_text(json.dumps({'results':results,'status':'REMESH_AWAITING_INDEPENDENT_QA'},indent=2)+'\n')
