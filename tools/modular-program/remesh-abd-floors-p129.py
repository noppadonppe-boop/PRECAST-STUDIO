import json,sys,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'.local-engineering-runtime/mesh-p112'))
import triangle
import numpy as np
base=root/(sys.argv[1] if len(sys.argv)>1 else 'output/staad-p7-p129');base.mkdir(exist_ok=True)
refine_boundary='--refine-boundary' in sys.argv
index=json.loads((root/'output/staad-p7-p127/index.json').read_text())
results=[]
for row in index['results']:
    meshbytes=(root/row['path']).read_bytes(); mesh=json.loads(meshbytes)
    src=json.loads((root/mesh['sourcePath']).read_text(encoding='utf-8'))
    targets=json.loads((root/f"output/staad-p7-p128/{row['productId']}-audit.json").read_text())['endBaseCandidates']
    nodes=[];elements=[];parts=[]
    for part in mesh['parts']:
        pid=part['id'];oldnodes=[n for n in mesh['nodes'] if n['part']==pid];oldels=[e for e in mesh['elements'] if e['part']==pid];sn=len(nodes);se=len(elements)
        if part['kind']!='FLOOR':
            ids={n['id']:len(nodes)+i+1 for i,n in enumerate(oldnodes)}
            nodes.extend(dict(n,id=ids[n['id']]) for n in oldnodes)
            elements.extend(dict(e,id=se+i+1,nodeIds=[ids[n] for n in e['nodeIds']]) for i,e in enumerate(oldels))
        else:
            p=next(p for p in src['instances'] if p['id']==pid);lo=p['boundsMm']['min'];hi=p['boundsMm']['max'];z=(lo[2]+hi[2])/2
            boundary=[n['xyzMm'][:2] for n in oldnodes if any(abs(n['xyzMm'][k]-b)<1e-6 for k in [0,1] for b in [lo[k],hi[k]])]
            points=boundary+[t['targetPointMm'][:2] for t in targets if t['targetFloor']==pid]
            if refine_boundary:
                # Resolve near-exterior-edge constrained vertices without moving
                # END targets or changing the shared transverse floor boundaries.
                for t in targets:
                    if t['targetFloor']!=pid: continue
                    x,y=t['targetPointMm'][:2]
                    for edge_x in [lo[0],hi[0]]:
                        d=abs(x-edge_x)
                        if 1e-6<d<25:
                            points.extend([[edge_x,y+v*d] for v in [-2,-1,0,1,2] if lo[1]<y+v*d<hi[1]])
            unique={tuple(round(v,6) for v in p):p for p in points};vertices=list(unique.values());edges=[]
            for k,b in [(0,lo[0]),(1,hi[1]),(0,hi[0]),(1,lo[1])]:
                ids=sorted([i for i,p in enumerate(vertices) if abs(p[k]-b)<1e-6],key=lambda i:vertices[i][1-k])
                edges.extend(zip(ids,ids[1:]))
            tri=triangle.triangulate({'vertices':vertices,'segments':edges},'pq25a10000YQ')
            start=len(nodes)
            for x,y in tri['vertices']: nodes.append({'id':len(nodes)+1,'part':pid,'xyzMm':[float(x),float(y),z]})
            for ids in tri['triangles']:
                a,b,c=tri['vertices'][ids];area=float((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;assert area>0
                elements.append({'id':len(elements)+1,'part':pid,'nodeIds':[start+int(i)+1 for i in ids],'areaMm2':area,'thicknessMm':hi[2]-lo[2]})
        es=elements[se:];vol=sum(e['areaMm2']*e['thicknessMm']/1e9 for e in es)
        assert abs(vol/part['sourceVolumeM3']-1)<.002
        parts.append(dict(part,nodes=len(nodes)-sn,elements=len(es),midsurfaceVolumeM3=vol,relativeVolumeError=vol/part['sourceVolumeM3']-1))
    assert len({n['id'] for n in nodes})==len(nodes)
    assert len({e['id'] for e in elements})==len(elements)
    for t in targets:
        assert any(n['part']==t['targetFloor'] and np.linalg.norm(np.array(n['xyzMm'])-t['targetPointMm'])<1e-6 for n in nodes)
    mesh.update(nodes=nodes,elements=elements,parts=parts,status='PRECAST_GEOMETRY_WITH_END_FLOOR_TARGET_NODES_NOT_COUPLED',floorMesher={'name':'triangle','version':triangle.__version__,'options':'pq25a10000YQ'},predecessor={'path':row['path'],'sha256':hashlib.sha256(meshbytes).hexdigest()})
    folder=base/row['productId'];folder.mkdir(exist_ok=True)
    (folder/'pilot-mesh.json').write_text(json.dumps(mesh,indent=2)+'\n')
    lines=['STAAD SPACE','* GEOMETRY ONLY NO LOADS SUPPORTS OR ANALYSIS','UNIT METER KN','JOINT COORDINATES']
    lines += [f"{n['id']} {n['xyzMm'][0]/1000:.9f} {n['xyzMm'][2]/1000:.9f} {n['xyzMm'][1]/1000:.9f}" for n in nodes]
    lines += ['ELEMENT INCIDENCES SHELL']+[str(e['id'])+' '+' '.join(str(i) for i in reversed(e['nodeIds'])) for e in elements]
    lines += ['ELEMENT PROPERTY']+[f"{e['id']} THICKNESS {e['thicknessMm']/1000}" for e in elements]+['FINISH']
    (folder/(row['productId']+'-GEOMETRY-ONLY.STD')).write_text('\n'.join(lines)+'\n')
    results.append({'productId':row['productId'],'folder':str(folder.relative_to(root)).replace('\\','/'),'targetNodes':len(targets),'nodes':len(nodes),'elements':len(elements)})
(base/'index.json').write_text(json.dumps({'status':'MESH_GENERATED_AWAITING_QUALITY_AND_JOINT_AUDIT','results':results},indent=2)+'\n')
print(json.dumps(results))
