import {ring,bound} from './prism-tools-p54.mjs';
export const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0)/2;
export function half(poly,n,d){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],A=n[0]*a[0]+n[1]*a[1]-d,B=n[0]*b[0]+n[1]*b[1]-d;if(A<=1e-9)out.push(a);if((A<-1e-9&&B>1e-9)||(A>1e-9&&B<-1e-9)){const t=A/(A-B);out.push(a.map((v,k)=>v+t*(b[k]-v)));}}return out.filter((p,i)=>!i||Math.hypot(p[0]-out[i-1][0],p[1]-out[i-1][1])>1e-8);}
function intersection(poly,clip){let p=poly;const c=area(clip)<0?[...clip].reverse():clip;for(let i=0;i<c.length;i++){const a=c[i],b=c[(i+1)%c.length],n=[b[1]-a[1],a[0]-b[0]];p=half(p,n,n[0]*a[0]+n[1]*a[1]);if(p.length<3)return [];}return p;}
// Subtract a 32-sided nominal cylindrical bore from arbitrary convex vertical-prism cells.
// Supports a bounded Z depth, preserving the material below a blind seat.
export function bore(cells,h){return cells.flatMap(c=>{
 const B=bound(c),z0=Math.max(c.z0,h.z0),z1=Math.min(c.z1,h.z1),r=h.r,R=r+3;
 if(z1-z0<1e-8||B.hi[0]<h.x-R||B.lo[0]>h.x+R||B.hi[1]<h.y-R||B.lo[1]>h.y+R)return [c];
 const result=[];if(c.z0<z0)result.push({...c,z1:z0});if(c.z1>z1)result.push({...c,z0:z1});
 const left=half(c.poly,[1,0],h.x-R),right=half(c.poly,[-1,0],-h.x-R),mid=half(half(c.poly,[-1,0],-h.x+R),[1,0],h.x+R);
 const polys=[left,right,half(mid,[0,1],h.y-R),half(mid,[0,-1],-h.y-R),...ring(h.x,h.y,r,R,z0,z1,true).map(a=>intersection(a.poly,c.poly))];
 for(const poly of polys)if(poly.length>=3&&Math.abs(area(poly))>1e-7)result.push({poly,z0,z1});return result;
});}
export const bores=(cells,holes)=>holes.reduce((c,h)=>bore(c,h),cells);
