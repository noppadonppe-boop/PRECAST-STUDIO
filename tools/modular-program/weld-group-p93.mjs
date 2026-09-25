import assert from 'node:assert/strict';
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const scale=(a,k)=>a.map(x=>x*k);
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);
function solve(A,b){
 const m=A.map((r,i)=>[...r,b[i]]),norm=Math.max(...A.flat().map(Math.abs));
 for(let j=0;j<3;j++){
  let pivot=j;for(let k=j+1;k<3;k++)if(Math.abs(m[k][j])>Math.abs(m[pivot][j]))pivot=k;
  assert.ok(Math.abs(m[pivot][j])>norm*1e-12,'Singular weld line group');
  [m[j],m[pivot]]=[m[pivot],m[j]];const d=m[j][j];for(let k=j;k<4;k++)m[j][k]/=d;
  for(let i=0;i<3;i++)if(i!==j){const f=m[i][j];for(let k=j;k<4;k++)m[i][k]-=f*m[j][k];}
 }
 return m.map(r=>r[3]);
}
/** Elastic equal-throat line group. Exact line moments and Gauss-2 equilibrium.
 * No contact, plate stiffness or load-path capacity implied. All coordinates mm.
 */
export function lineGroup({segments,forceN,momentAtOriginNmm=[0,0,0],originMm=[0,0,0],throatMm=3}){
 assert.ok(throatMm>=3&&Number.isFinite(throatMm));
 assert.ok([forceN,momentAtOriginNmm,originMm].every(v=>v.length===3&&v.every(Number.isFinite)));
 assert.ok(segments.length>=2);
 let L=0,first=[0,0,0];
 const ss=segments.map(([a,b])=>{assert.ok([...a,...b].every(Number.isFinite));const l=length(sub(b,a));assert.ok(l>0);const c=scale(add(a,b),.5);L+=l;first=add(first,scale(c,l));return {a,b,l,c};});
 assert.ok(L>=Math.max(30,6*throatMm),'Insufficient continuous effective weld length');
 const centroidMm=scale(first,1/L),J=Array.from({length:3},()=>Array(3).fill(0));
 for(const s of ss){const c=sub(s.c,centroidMm),d=sub(s.b,s.a);for(let i=0;i<3;i++)for(let j=0;j<3;j++){
  const second=s.l*(c[i]*c[j]+d[i]*d[j]/12);
  J[i][j]-=second;if(i===j)J[i][j]+=s.l*(dot(c,c)+dot(d,d)/12);
 }}
 const M=sub(momentAtOriginNmm,cross(sub(centroidMm,originMm),forceN));
 const rotationCoefficient=solve(J,M),direct=scale(forceN,1/L);
 const value=p=>add(direct,cross(rotationCoefficient,sub(p,centroidMm)));
 const endpoints=ss.flatMap((s,i)=>[s.a,s.b].map(p=>({segment:i,pointMm:p,lineForceNmm:value(p),stressResultantMPa:length(value(p))/throatMm})));
 const worst=endpoints.reduce((a,b)=>a.stressResultantMPa>b.stressResultantMPa?a:b);
 let force=[0,0,0],moment=[0,0,0];
 for(const s of ss)for(const t of [.5-.5/Math.sqrt(3),.5+.5/Math.sqrt(3)]){
  const p=add(s.a,scale(sub(s.b,s.a),t)),f=scale(value(p),s.l/2);
  force=add(force,f);moment=add(moment,cross(sub(p,originMm),f));
 }
 return {effectiveLengthMm:L,throatMm,centroidMm,inertiaLineMm3:J,forceN,momentAtOriginNmm,originMm,worst,forceResidualN:sub(force,forceN),momentResidualNmm:sub(moment,momentAtOriginNmm),endpoints};
}
/** Conservative orientation-independent bound of JRC eq2.14, NOT a full code check.
 * sqrt(sigma_n^2+3tau^2)<=sqrt(3)*|traction|. Add stricter0.9fu/gamma normal bound.
 */
export function resistanceBound({fuMPa=360,betaW=.8,gammaM2=1.25}={}){
 assert.ok(fuMPa>0&&betaW>0&&gammaM2>0);
 return {fuMPa,betaW,gammaM2,equivalentBoundMPa:fuMPa/(Math.sqrt(3)*betaW*gammaM2),normalBoundMPa:.9*fuMPa/gammaM2,resultantBoundMPa:Math.min(fuMPa/(Math.sqrt(3)*betaW*gammaM2),.9*fuMPa/gammaM2),status:'CONDITIONAL_STATIC_WELD_METAL_ONLY'};
}
