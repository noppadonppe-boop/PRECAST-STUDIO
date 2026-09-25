// N, mm, MPa. Linear Euler-Bernoulli beam; two simple supports at 0 and L.
// Point loads are positive down. Signed sagging moment and displacement.
export function simpleBeam({L,min=0,max=L,I,E=200000,points=[],patches=[],samples=2000}) {
  const total=points.reduce((s,p)=>s+p.P,0)+patches.reduce((s,p)=>s+p.q*(p.b-p.a),0);
  const first=points.reduce((s,p)=>s+p.P*p.x,0)+patches.reduce((s,p)=>s+p.q*(p.b*p.b-p.a*p.a)/2,0);
  const R1=first/L,R0=total-R1,pos=(x,n)=>Math.max(x,0)**n;
  const raw=(x,n)=>R0*pos(x,n)+R1*pos(x-L,n)-points.reduce((s,p)=>s+p.P*pos(x-p.x,n),0)-patches.reduce((s,p)=>s+p.q*(pos(x-p.a,n+1)-pos(x-p.b,n+1))/(n+1),0);
  const C0=-raw(0,3)/6,C1=-(raw(L,3)/6+C0)/L;
  const at=x=>({x,momentNmm:raw(x,1),deflectionMm:(raw(x,3)/6+C1*x+C0)/(E*I)});
  const stations=[...new Set([min,max,0,L,...points.map(p=>p.x),...patches.flatMap(p=>[p.a,p.b]),...Array.from({length:samples+1},(_,i)=>min+(max-min)*i/samples)])].sort((a,b)=>a-b);
  const values=stations.map(at),moment=values.reduce((a,b)=>Math.abs(b.momentNmm)>Math.abs(a.momentNmm)?b:a),deflection=values.reduce((a,b)=>Math.abs(b.deflectionMm)>Math.abs(a.deflectionMm)?b:a);
  return {reactionsN:[R0,R1],loadN:total,loadFirstMomentNmm:first,maxAbsMomentNmm:Math.abs(moment.momentNmm),momentAtMm:moment.x,maxAbsDeflectionMm:Math.abs(deflection.deflectionMm),deflectionAtMm:deflection.x,equilibrium:{forceN:R0+R1-total,momentNmm:R1*L-first},supportDisplacementsMm:[at(0).deflectionMm,at(L).deflectionMm],plot:values.filter((_,i)=>i%Math.max(1,Math.floor(values.length/100))===0)};
}
export const rhs=(h,b,t)=>({I:(b*h**3-(b-2*t)*(h-2*t)**3)/12,Z:(b*h**3-(b-2*t)*(h-2*t)**3)/(6*h),area:b*h-(b-2*t)*(h-2*t)});
