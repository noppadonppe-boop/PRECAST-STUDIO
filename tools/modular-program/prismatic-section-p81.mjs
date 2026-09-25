// Exact polygon integrals for non-overlapping solid cross-section polygons.
// J = integral([x;y][x y] dA) about centroid. Beam axis is global Z.
export function section(polygons,normal){
 const vertices=polygons.flat(),ref=vertices[0],rows=polygons.map(poly=>{const p=poly.map(v=>v.map((x,i)=>x-ref[i]));let A=0,Sx=0,Sy=0,X=0,Y=0,XY=0;for(let i=0;i<p.length;i++){const [x,y]=p[i],[u,v]=p[(i+1)%p.length],c=x*v-u*y;A+=c/2;Sx+=(x+u)*c/6;Sy+=(y+v)*c/6;X+=(x*x+x*u+u*u)*c/12;Y+=(y*y+y*v+v*v)*c/12;XY+=(2*x*y+x*v+u*y+2*u*v)*c/24;}const s=Math.sign(A);return [A,Sx,Sy,X,Y,XY].map(v=>v*s);});
 const [A,Sx,Sy,X,Y,XY]=rows.reduce((a,r)=>a.map((v,i)=>v+r[i]),[0,0,0,0,0,0]),cx=Sx/A,cy=Sy/A,Jxx=X-A*cx*cx,Jyy=Y-A*cy*cy,Jxy=XY-A*cx*cy,det=Jxx*Jyy-Jxy**2;
 if(!(A>0&&det>0&&Math.abs(Math.hypot(...normal)-1)<1e-6))throw Error('Invalid section');
 const d=[(Jyy*normal[0]-Jxy*normal[1])/det,(-Jxy*normal[0]+Jxx*normal[1])/det],cg=[cx+ref[0],cy+ref[1]],Ieff=1/(normal[0]*d[0]+normal[1]*d[1]);
 return {areaMm2:A,cgXYmm:cg,JxxMm4:Jxx,JyyMm4:Jyy,JxyMm4:Jxy,normal,IeffectiveMm4:Ieff,stressPerMomentPerMm3:Math.max(...vertices.map(([x,y])=>Math.abs(d[0]*(x-cg[0])+d[1]*(y-cg[1]))))};
}
