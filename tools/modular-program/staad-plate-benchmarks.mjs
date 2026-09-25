import fs from 'node:fs';
import path from 'node:path';
const root='output/staad-p7-p107';fs.mkdirSync(root,{recursive:true});
const cases=[];
for(const n of [4,8,16]){
 const id=`PLATE_SS_${n}`, lines=['STAAD SPACE','UNIT METER KN','JOINT COORDINATES'];
 const node=(i,j)=>j*(n+1)+i+1;
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++)lines.push(`${node(i,j)} ${3*i/n} 0 ${3*j/n}`);
 lines.push('ELEMENT INCIDENCES SHELL');let e=0;
 for(let j=0;j<n;j++)for(let i=0;i<n;i++)lines.push(`${++e} ${node(i,j)} ${node(i+1,j)} ${node(i+1,j+1)} ${node(i,j+1)}`);
 lines.push('ELEMENT PROPERTY',`1 TO ${e} THICKNESS 0.03`,'CONSTANTS','E 30000000 ALL','POISSON 0.2 ALL','SUPPORTS');
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++)lines.push(`${node(i,j)} FIXED BUT ${i===0||j===0||i===n||j===n?'MX MZ':'FY MX MZ'}`);
 lines.push('LOAD 1 LOADTYPE None TITLE UNIT PRESSURE BENCHMARK ONLY','ELEMENT LOAD',`1 TO ${e} PR GY -1`,'PERFORM ANALYSIS','UNIT METER NEWTON','PRINT SUPPORT REACTION','PRINT JOINT DISPLACEMENTS ALL','PRINT ELEMENT STRESSES ALL','FINISH');
 fs.writeFileSync(path.join(root,id+'.STD'),lines.join('\n')+'\n');
 cases.push({id,n,centerNode:node(n/2,n/2),loadKN:9});
}
// Navier solution of a simply supported thin square plate under uniform load.
let sum=0;for(let m=1;m<200;m+=2)for(let n=1;n<200;n+=2)sum+=Math.sin(m*Math.PI/2)*Math.sin(n*Math.PI/2)/(m*n*(m*m+n*n)**2);
const D=30e6*.03**3/(12*(1-.2**2));
const referenceMm=16*3**4/(Math.PI**6*D)*sum*1000;
fs.writeFileSync(path.join(root,'spec.json'),JSON.stringify({purpose:'PLATE_BENDING_BENCHMARK_NOT_PRODUCT',reference:'Navier double sine series, odd terms through199, simply supported square, small displacement elastic',E_KNm2:30e6,nu:.2,thicknessM:.03,sideM:3,pressureKNm2:1,referenceMm,criteria:{reactionToleranceKN:.03,finestDeflectionRelativeTolerance:.02,lastMeshRelativeChange:.02},cases},null,2)+'\n');
console.log({cases:cases.length,referenceMm});
