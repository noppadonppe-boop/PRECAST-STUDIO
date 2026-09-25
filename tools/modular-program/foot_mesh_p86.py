"""Conforming quads from the actual P85 convex bore-subtracted plate cells."""
import math
import numpy as np
from gusset_mesh_p83 import clip,area

def mesh_plate(polygons,size):
    pieces=[]
    for p in polygons:
        if area(p)<0:p=list(reversed(p))
        xmin=min(q[0] for q in p);xmax=max(q[0] for q in p)
        ymin=min(q[1] for q in p);ymax=max(q[1] for q in p)
        for i in range(math.floor(xmin/size),math.ceil(xmax/size)):
            for j in range(math.floor(ymin/size),math.ceil(ymax/size)):
                q=p
                for n,d in [((1,0),(i+1)*size),((-1,0),-i*size),((0,1),(j+1)*size),((0,-1),-j*size)]:
                    q=clip(q,n,d)
                    if len(q)<3:break
                if len(q)>=3 and area(q)>1e-7:pieces.append(q)
    vertices=np.array(sorted({tuple(round(v,5) for v in p) for q in pieces for p in q}))
    quads=[]
    for poly in pieces:
        edgepoints=[]
        for a,b in zip(poly,poly[1:]+poly[:1]):
            a=np.array(a);b=np.array(b);delta=b-a;ll=delta@delta
            if ll<1e-12:continue
            t=(vertices-a)@delta/ll;distance=np.abs((vertices[:,0]-a[0])*delta[1]-(vertices[:,1]-a[1])*delta[0])/math.sqrt(ll)
            indexes=np.where((distance<2e-5)&(t>1e-5)&(t<1-1e-5))[0]
            edgepoints.append(tuple(round(float(v),5) for v in a))
            edgepoints.extend(tuple(vertices[k]) for k in sorted(indexes,key=lambda k:t[k]))
        clean=[]
        for p in edgepoints:
            if not clean or math.dist(p,clean[-1])>1e-6:clean.append(p)
        if len(clean)>1 and math.dist(clean[0],clean[-1])<1e-6:clean.pop()
        if len(clean)<3:continue
        centre=tuple(sum(p[i] for p in clean)/len(clean) for i in range(2))
        mid=lambda a,b:tuple((x+y)/2 for x,y in zip(a,b))
        for a,b in zip(clean,clean[1:]+clean[:1]):
            tri=[centre,a,b];tc=tuple(sum(p[i] for p in tri)/3 for i in range(2))
            for i,p in enumerate(tri):
                q=[p,mid(p,tri[(i+1)%3]),tc,mid(tri[(i-1)%3],p)]
                if area(q)<1e-10:raise RuntimeError('Degenerate plate quad')
                quads.append([tuple(round(float(v),4) for v in p) for p in q])
    return quads

def audit_mesh(quads,polygons):
    edges={}
    for q in quads:
        for a,b in zip(q,q[1:]+q[:1]):
            e=tuple(sorted(tuple(round(x,5) for x in p) for p in [a,b]));edges[e]=edges.get(e,0)+1
    if max(edges.values())!=2:raise RuntimeError('Non-manifold mesh')
    # Free boundaries must be a physical input-cell edge that is not shared on both sides.
    outer=[]
    for e,count in edges.items():
        if count==1:outer.append(e)
    return dict(areaMm2=sum(area(q) for q in quads),sourceAreaMm2=sum(abs(area(p)) for p in polygons),quadCount=len(quads),freeEdges=outer,maxEdgeMultiplicity=max(edges.values()))
