import assert from 'node:assert/strict';
function solve(A,b){const scale=A.map((r,i)=>1/Math.sqrt(Math.abs(r[i]))),m=A.map((r,i)=>[...r.map((v,j)=>v*scale[i]*scale[j]),b[i]*scale[i]]),n=b.length;for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;[m[k],m[p]]=[m[p],m[k]];assert.ok(Math.abs(m[k][k])>1e-13,'singular beam');const d=m[k][k];for(let j=k;j<=n;j++)m[k][j]/=d;for(let i=0;i<n;i++)if(i!==k){const d=m[i][k];for(let j=k;j<=n;j++)m[i][j]-=d*m[k][j];}}return m.map((r,i)=>r[n]*scale[i]);}
// Constant-EI beam, positive distributed force/displacement along pressure.
// Springs restrain translation only. supportK=null denotes ideal rigid translation.
export function continuousBeam({length,supports,I,q,E=200000,supportK=null,subdivisions=1}){
 assert.ok(length>0&&I>0&&supports.length>=2&&supports.every(x=>x>=0&&x<=length));
 assert.ok(supportK===null||supportK>0);
 const breaks=[...new Set([0,...supports,length])].sort((a,b)=>a-b),x=[];
 for(let i=0;i<breaks.length-1;i++)for(let j=0;j<subdivisions;j++)x.push(breaks[i]+(breaks[i+1]-breaks[i])*j/subdivisions);x.push(length);
 const n=x.length*2,K=Array.from({length:n},()=>Array(n).fill(0)),F=Array(n).fill(0),elements=[];
 for(let i=0;i<x.length-1;i++){
  const L=x[i+1]-x[i],c=E*I/L**3,k=[[12,6*L,-12,6*L],[6*L,4*L*L,-6*L,2*L*L],[-12,-6*L,12,-6*L],[6*L,2*L*L,-6*L,4*L*L]].map(r=>r.map(v=>v*c)),f=[q*L/2,q*L*L/12,q*L/2,-q*L*L/12],ids=[2*i,2*i+1,2*i+2,2*i+3];
  ids.forEach((a,j)=>{F[a]+=f[j];ids.forEach((b,l)=>K[a][b]+=k[j][l]);});elements.push({x:x[i],L,k,f,ids});
 }
 const sd=supports.map(p=>2*x.findIndex(v=>Math.abs(v-p)<1e-7)),originalK=K.map(r=>[...r]);
 if(supportK!==null)sd.forEach(i=>K[i][i]+=supportK);
 const fixed=supportK===null?sd:[],free=Array.from({length:n},(_,i)=>i).filter(i=>!fixed.includes(i)),u=Array(n).fill(0),sol=solve(free.map(a=>free.map(b=>K[a][b])),free.map(a=>F[a]));free.forEach((a,i)=>u[a]=sol[i]);
 const residual=originalK.map((r,i)=>r.reduce((s,v,j)=>s+v*u[j],0)-F[i]);
 const reactions=supports.map((p,i)=>({xMm:p,forceN:supportK===null?-residual[sd[i]]:supportK*u[sd[i]],displacementMm:u[sd[i]]}));
 const values=[];
 for(const e of elements){const d=e.ids.map(i=>u[i]),end=e.k.map((r,i)=>r.reduce((s,v,j)=>s+v*d[j],0)-e.f[i]);for(let j=0;j<=100;j++){const a=j/100,t=a*e.L,N=[1-3*a*a+2*a**3,e.L*(a-2*a*a+a**3),3*a*a-2*a**3,e.L*(-a*a+a**3)];values.push({xMm:e.x+t,momentNmm:-end[1]+end[0]*t+q*t*t/2,deflectionMm:N.reduce((s,v,i)=>s+v*d[i],0)+q*t*t*(e.L-t)**2/(24*E*I)});}}
 return {lengthMm:length,supportsMm:supports,supportKNmm:supportK,lineLoadNmm:q,reactions,maxMomentNmm:Math.max(...values.map(v=>Math.abs(v.momentNmm))),maxDeflectionMm:Math.max(...values.map(v=>Math.abs(v.deflectionMm))),forceResidualN:reactions.reduce((s,r)=>s+r.forceN,0)-q*length,momentResidualNmm:reactions.reduce((s,r)=>s+r.forceN*r.xMm,0)-q*length**2/2,values};
}
