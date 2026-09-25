import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const out='output/staad-p7-p147';fs.mkdirSync(out,{recursive:true});
const sourcePath='output/stage3-designs-p36/I-C1/model.json',source=JSON.parse(fs.readFileSync(sourcePath));
const floor=source.instances.find(p=>p.id==='PM-I-C1-I-S01-F');
const a=(floor.boundsMm.max[0]-floor.boundsMm.min[0])/1000,b=(floor.boundsMm.max[1]-floor.boundsMm.min[1])/1000,t=floor.thicknessMm/1000;
assert.equal(a,2.66);assert.equal(b,1.485);assert.equal(t,.175);
const amplitude=1000,cases=[];
for(const n of [8,16,32]){
 const id=`LOAD-METHOD-${n}`,node=(i,j)=>j*(n+1)+i+1,nodes=[],elements=[],w=new Map();
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++)nodes.push({id:node(i,j),xyz:[a*i/n,0,b*j/n],edge:i===0||j===0||i===n||j===n});
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const ids=[node(i,j),node(i+1,j),node(i+1,j+1),node(i,j+1)];
  elements.push({id:elements.length+1,nodeIds:ids});
  for(const k of ids)w.set(k,(w.get(k)??0)+amplitude*a*b/(4*n*n));
 }
 const total=[...w.values()].reduce((a,b)=>a+b,0);assert.ok(Math.abs(total-amplitude*a*b)<1e-7);
 const lines=['STAAD SPACE','UNIT METER KN','JOINT COORDINATES',...nodes.map(p=>`${p.id} ${p.xyz.join(' ')}`),'ELEMENT INCIDENCES SHELL',...elements.map(e=>`${e.id} ${e.nodeIds.join(' ')}`),'ELEMENT PROPERTY',`1 TO ${elements.length} THICKNESS ${t}`,'CONSTANTS','E 30000000 ALL','POISSON 0.2 ALL','SUPPORTS',...nodes.map(p=>`${p.id} FIXED BUT ${p.edge?'MX MZ':'FY MX MZ'}`),
 'LOAD 1 LOADTYPE None TITLE NATIVE UNIFORM PRESSURE SCALED TEST','ELEMENT LOAD',`1 TO ${elements.length} PR GY -${amplitude}`,
 'LOAD 2 LOADTYPE None TITLE NODAL QUARTER AREA SCALED TEST','JOINT LOAD',...[...w].map(([id,q])=>`${id} FY ${(-q).toFixed(10)}`),
 'PERFORM ANALYSIS','UNIT METER NEWTON','PRINT SUPPORT REACTION','PRINT JOINT DISPLACEMENTS ALL','PRINT ELEMENT STRESSES ALL','FINISH'];
 fs.writeFileSync(`${out}/${id}.STD`,lines.join('\n')+'\n');
 cases.push({id,n,nodes,elements,centerNode:node(n/2,n/2),loadKN:amplitude*a*b});
}
const spec={revision:'P147',purpose:'ISOLATED_FLOOR_LOAD_INTERPOLATION_SENSITIVITY_NOT_PRODUCT_DESIGN',sourcePath,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'),floorId:floor.id,aM:a,bM:b,tM:t,E_KNm2:30e6,nu:.2,
 amplitudeKNm2:amplitude,normalization:'Divide all linear force/stress/displacement results by1000 for unit1kN/m2; amplification only for printed precision, not physically admissible load or nonlinear check.',
 support:'All four edges vertically simply supported, all nodes restrained in plane and drilling rotation; bending rotations free. Isolated test only, not actual slab supports.',
 criteria:{reactionResidualN:1,momentResidualNm:2,methodRelativeDifference:.02,lastMeshRelativeChange:.02},cases,engineeringApproved:false};
fs.writeFileSync(out+'/spec.json',JSON.stringify(spec,null,2)+'\n');console.log({cases:cases.length,a,b,t});
