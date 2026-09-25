import json, math, sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'.local-engineering-runtime/mesh-p112'))
import triangle
import numpy as np
meshpath=root/(sys.argv[1] if len(sys.argv)>1 else 'output/staad-p7-p111/refined/pilot-mesh.json')
mesh=json.loads(meshpath.read_text(encoding='utf-8'))
source=json.loads((root/mesh.get('sourcePath','output/stage3-designs-p36/I-C1/model.json')).read_text(encoding='utf-8'))
nodes=[]; elements=[]; parts=[]; audit=[]
for part in mesh['parts']:
    pid=part['id']; piece=next(p for p in source['instances'] if p['id']==pid)
    start=len(elements); startn=len(nodes)
    if part['kind']!='END':
        ids={}
        for n in mesh['nodes']:
            if n['part']==pid:
                ids[n['id']]=len(nodes)+1; nodes.append(dict(n,id=len(nodes)+1))
        for e in mesh['elements']:
            if e['part']==pid: elements.append(dict(e,id=len(elements)+1,nodeIds=[ids[n] for n in e['nodeIds']]))
    else:
        y=piece['boundsMm']['min'][1]; caps=[f for f in piece['facesMm'] if all(abs(v[1]-y)<1e-6 for v in f)]
        coords={}
        for face in caps:
            for v in face: coords[(round(v[0],6),round(v[2],6))]=(v[0],v[2])
        vertices=list(coords.values()); keys=list(coords); edgecounts={}
        for face in caps:
            for va,vb in zip(face,face[1:]+face[:1]):
                a=np.array([va[0],va[2]]); b=np.array([vb[0],vb[2]]); d=b-a; dd=float(d@d)
                if dd<1e-12: continue
                seq=[]
                for i,v in enumerate(vertices):
                    w=np.array(v)-a; t=float(w@d/dd)
                    if -1e-8<=t<=1+1e-8 and np.linalg.norm(w-t*d)<1e-5: seq.append((t,i))
                seq.sort()
                for (_,i),(_,j) in zip(seq,seq[1:]):
                    k=tuple(sorted((i,j))); edgecounts[k]=edgecounts.get(k,0)+1
        boundary=[k for k,c in edgecounts.items() if c==1]
        assert all(c in (1,2) for c in edgecounts.values())
        used=sorted(set(i for e in boundary for i in e)); remap={old:i for i,old in enumerate(used)}
        tri=triangle.triangulate({'vertices':[vertices[i] for i in used],'segments':[[remap[i],remap[j]] for i,j in boundary]},'pq25a10000Q')
        mids=(piece['boundsMm']['min'][1]+piece['boundsMm']['max'][1])/2
        base=len(nodes)
        for x,z in tri['vertices']: nodes.append({'id':len(nodes)+1,'part':pid,'xyzMm':[float(x),mids,float(z)]})
        minangle=180; maxratio=0
        for ids in tri['triangles']:
            pts=tri['vertices'][ids]; a,b,c=pts; signed=float((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))
            assert signed>0
            lengths=[float(np.linalg.norm(pts[(i+1)%3]-pts[i])) for i in range(3)]
            maxratio=max(maxratio,max(lengths)/min(lengths))
            for i in range(3):
                aa=lengths[i]; bb=lengths[(i+1)%3]; cc=lengths[(i+2)%3]
                minangle=min(minangle,math.degrees(math.acos(max(-1,min(1,(aa*aa+bb*bb-cc*cc)/(2*aa*bb))))))
            elements.append({'id':len(elements)+1,'part':pid,'nodeIds':[base+int(i)+1 for i in ids],'areaMm2':signed/2,'thicknessMm':150})
        audit.append({'part':pid,'minimumAngleDeg':minangle,'maxEdgeRatio':maxratio,'boundarySegments':len(boundary),'mesher':triangle.__version__,'options':'pq25a10000Q'})
        assert minangle>=24.99; assert maxratio<10
    es=elements[start:]; volume=sum(e['areaMm2']*e['thicknessMm']/1e9 for e in es); srcvol=piece['concreteMassKg']/2400
    assert abs(volume/srcvol-1)<.002
    updated=dict(part,nodes=len(nodes)-startn,elements=len(es),midsurfaceVolumeM3=volume,relativeVolumeError=volume/srcvol-1)
    if updated.get('status')=='PENDING_CONSTRAINED_TRIANGULATION': updated['status']='END_GEOMETRY_TRIANGULATED_NOT_ANALYSED'
    parts.append(updated)
out=root/(sys.argv[2] if len(sys.argv)>2 else 'output/staad-p7-p112');out.mkdir(parents=True,exist_ok=True)
mesh.update(nodes=nodes,elements=elements,parts=parts,endRemeshAudit=audit)
if mesh.get('status')=='PREMESH_ENDS_PENDING_NOT_ANALYTICAL_MODEL':
    mesh['status']='ALL_PRECAST_PART_GEOMETRY_MESHED_NOT_CONNECTED_ANALYTICAL_MODEL'
    mesh['missing']=[item for item in mesh['missing'] if item!='End triangulation pending in this seed']
(out/'pilot-mesh.json').write_text(json.dumps(mesh,indent=2)+'\n')
lines=['STAAD SPACE','* GEOMETRY ONLY NO ANALYSIS OR DESIGN','UNIT METER KN','JOINT COORDINATES']
lines += [f"{n['id']} {n['xyzMm'][0]/1000:.9f} {n['xyzMm'][2]/1000:.9f} {n['xyzMm'][1]/1000:.9f}" for n in nodes]
lines += ['ELEMENT INCIDENCES SHELL']+[str(e['id'])+' '+' '.join(str(i) for i in reversed(e['nodeIds'])) for e in elements]
lines += ['ELEMENT PROPERTY']+[f"{e['id']} THICKNESS {e['thicknessMm']/1000}" for e in elements]+['FINISH']
(out/(source['id']+'-GEOMETRY-ONLY.STD')).write_text('\n'.join(lines)+'\n')
print(json.dumps({'nodes':len(nodes),'elements':len(elements),'audit':audit}))
