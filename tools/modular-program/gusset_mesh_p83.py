"""Conforming quadrilateral mesh of the actual P67 triangular plate and waler hole.

Cartesian cells are clipped to the triangle; each convex polygon is triangulated
from its centre and each triangle is split into three non-degenerate quads.
Shared polygon edges therefore receive identical midpoint nodes on both sides.
"""
import math

def refine(values, size):
    values=sorted(set(round(float(v),7) for v in values)); result=[]
    for a,b in zip(values[:-1],values[1:]):
        n=max(1,math.ceil((b-a)/size))
        result.extend(a+(b-a)*i/n for i in range(n))
    return result+[values[-1]]

def clip(poly, normal, limit):
    out=[]
    for a,b in zip(poly,poly[1:]+poly[:1]):
        da=sum(x*y for x,y in zip(a,normal))-limit
        db=sum(x*y for x,y in zip(b,normal))-limit
        if da<=1e-9: out.append(a)
        if da*db < -1e-14:
            f=da/(da-db);out.append(tuple(x+f*(y-x) for x,y in zip(a,b)))
    clean=[]
    for p in out:
        if not clean or math.dist(p,clean[-1])>1e-7:clean.append(p)
    if len(clean)>1 and math.dist(clean[0],clean[-1])<1e-7:clean.pop()
    return clean

def area(poly):
    return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1]))/2

def mesh_gusset(size):
    ns=refine([6,106,206,356],size);zs=refine([30,100,200,650],size)
    quads=[]
    midpoint=lambda a,b:tuple((x+y)/2 for x,y in zip(a,b))
    for a,b in zip(ns[:-1],ns[1:]):
        for c,d in zip(zs[:-1],zs[1:]):
            if 106<(a+b)/2<206 and 100<(c+d)/2<200:continue
            # The hypotenuse is 620*(n-6)+350*(z-30)=350*620.
            p=clip([(a,c),(b,c),(b,d),(a,d)],(620,350),350*620+620*6+350*30)
            if len(p)<3 or area(p)<1e-7:continue
            centre=tuple(sum(q[i] for q in p)/len(p) for i in range(2))
            for x,y in zip(p,p[1:]+p[:1]):
                tri=[centre,x,y]
                tc=tuple(sum(q[i] for q in tri)/3 for i in range(2))
                for i,q in enumerate(tri):
                    quad=[q,midpoint(q,tri[(i+1)%3]),tc,midpoint(tri[(i-1)%3],q)]
                    if area(quad)<=1e-10:raise ValueError('Degenerate gusset quad')
                    quads.append(quad)
    return quads

if __name__=='__main__':
    for h in [100,50,25]:
        quads=mesh_gusset(h);actual=sum(area(q) for q in quads)
        assert abs(actual-(350*620/2-10000))<1e-6
        edges={}
        for q in quads:
            for a,b in zip(q,q[1:]+q[:1]):
                key=tuple(sorted(tuple(round(x,6) for x in p) for p in [a,b]))
                edges[key]=edges.get(key,0)+1
        assert max(edges.values())==2
        for (a,b),count in edges.items():
            if count==1:
                n,z=tuple((x+y)/2 for x,y in zip(a,b))
                assert (abs(n-6)<1e-5 or abs(z-30)<1e-5 or
                        abs(620*(n-6)+350*(z-30)-350*620)<1e-3 or
                        (106-1e-5<=n<=206+1e-5 and (abs(z-100)<1e-5 or abs(z-200)<1e-5)) or
                        (100-1e-5<=z<=200+1e-5 and (abs(n-106)<1e-5 or abs(n-206)<1e-5))), (a,b)
        print(dict(mesh=h,quads=len(quads),areaMm2=actual,conforming=True))
