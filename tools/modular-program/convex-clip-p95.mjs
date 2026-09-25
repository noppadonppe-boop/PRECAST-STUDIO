import {add,sub,mul,dot,cross,unit,planes,oriented,properties,unique} from './cap-geometry-p55.mjs';
const EPS=1e-8;
function clean(poly){
 let p=poly.filter((v,i)=>i===0||Math.hypot(...sub(v,poly[i-1]))>EPS);
 if(p.length>1&&Math.hypot(...sub(p[0],p.at(-1)))<EPS)p.pop();
 let changed=true;while(changed&&p.length>=3){changed=false;for(let i=0;i<p.length;i++)if(Math.hypot(...cross(sub(p[i],p[(i+p.length-1)%p.length]),sub(p[(i+1)%p.length],p[i])))<EPS){p.splice(i,1);changed=true;break;}}
 return p;
}
/** Retain n.p<=d in a convex closed solid. No triangulated open surfaces accepted. */
export function clip(faces,n,d){
 const points=unique(faces),dist=points.map(p=>dot(n,p)-d);
 if(dist.every(x=>x<=EPS))return faces;if(dist.every(x=>x>=-EPS))return [];
 const result=[],cuts=[];
 for(const f of faces){const out=[];for(let i=0;i<f.length;i++){
  const a=f[i],b=f[(i+1)%f.length],da=dot(n,a)-d,db=dot(n,b)-d,ia=da<=EPS,ib=db<=EPS;
  if(ia)out.push(a);if(ia!==ib){const p=add(a,mul(sub(b,a),da/(da-db)));out.push(p);cuts.push(p);}
 }const p=clean(out);if(p.length>=3)result.push(p);}
 const cap=[...new Map(cuts.map(p=>[p.map(x=>x.toFixed(7)).join(','),p])).values()];
 if(cap.length>=3){const center=mul(cap.reduce(add,[0,0,0]),1/cap.length),axis=unit(cross(n,Math.abs(n[0])<.8?[1,0,0]:[0,1,0])),axis2=cross(n,axis);cap.sort((a,b)=>Math.atan2(dot(sub(a,center),axis2),dot(sub(a,center),axis))-Math.atan2(dot(sub(b,center),axis2),dot(sub(b,center),axis)));const p=clean(cap);if(p.length>=3)result.push(p);}
 return result.length>=4?oriented(result):[];
}
const volume=f=>f.length?properties(f).volumeMm3:0;
export function subtractConvex(solid,cutter){
 const a=unique(solid),b=unique(cutter);if([0,1,2].some(i=>Math.max(...a.map(p=>p[i]))<=Math.min(...b.map(p=>p[i]))+EPS||Math.min(...a.map(p=>p[i]))>=Math.max(...b.map(p=>p[i]))-EPS))return [solid];
 let remaining=solid;const result=[];
 for(const p of planes(cutter)){
  if(!remaining.length)break;const outside=clip(remaining,mul(p.n,-1),-p.d);if(volume(outside)>1e-7)result.push(outside);remaining=clip(remaining,p.n,p.d);
 }
 return result;
}
export function subtractMany(solids,cutters){let result=solids;for(const c of cutters)result=result.flatMap(s=>subtractConvex(s,c));return result;}
