import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const meshPath=process.argv[2]??'output/staad-p7-p115/pilot-mesh.json',mesh=JSON.parse(fs.readFileSync(meshPath));
const joint=JSON.parse(fs.readFileSync('output/staad-p7-p115/joint-pairs.json')).joints.find(j=>j.id==='JO-CR-1');
const selected=[joint.partA,joint.partB],nodes=mesh.nodes.filter(n=>selected.includes(n.part)),elements=mesh.elements.filter(e=>selected.includes(e.part));
if(process.argv[2]){
 const left=nodes.filter(n=>n.part===joint.partA&&Math.abs(n.xyzMm[0]-1490)<1e-6),right=nodes.filter(n=>n.part===joint.partB&&Math.abs(n.xyzMm[0]-1510)<1e-6);
 assert.equal(left.length,right.length);const lookup=new Map(right.map(n=>[n.xyzMm.slice(1).map(x=>x.toFixed(6)).join(','),n]));
 joint.pairs=left.map(n=>{const b=lookup.get(n.xyzMm.slice(1).map(x=>x.toFixed(6)).join(','));assert(b);return {nodeA:n.id,nodeB:b.id};});
}
const supports=nodes.filter(n=>Math.abs(n.xyzMm[2]-175)<1e-6).map(n=>n.id);
const byId=new Map(nodes.map(n=>[n.id,n]));
const density=2400*9.80665/1000;
let volume=0,weightKN=0,cg=[0,0,0];
for(const e of elements){
 const v=e.areaMm2*e.thicknessMm/1e9,w=v*density;volume+=v;weightKN+=w;
 const xyz=[0,1,2].map(k=>e.nodeIds.reduce((s,id)=>s+byId.get(id).xyzMm[k],0)/e.nodeIds.length);
 cg=cg.map((x,k)=>x+w*xyz[k]);
}
cg=cg.map(x=>x/weightKN);
const used=new Set();for(const p of joint.pairs)for(const id of [p.nodeA,p.nodeB]){assert(byId.has(id));assert(!used.has(id));assert(!supports.includes(id));used.add(id);}
assert.equal(selected.length,2);assert(supports.length>=4);if(!process.argv[2])assert.equal(supports.length,30);
const out=process.argv[3]??'output/staad-p7-p118';fs.mkdirSync(out,{recursive:true});
for(const [name,dofs] of [['CROWN_TRANSLATIONS','FX FY FZ'],['CROWN_RIGID','RIGID']]){
 const lines=['STAAD SPACE','START JOB INFORMATION','JOB NAME TS C TWO HALF SHELL TRIAL NOT WHOLE BUILDING','END JOB INFORMATION','UNIT METER KN','JOINT COORDINATES',
 ...nodes.map(n=>`${n.id} ${n.xyzMm[0]/1000} ${n.xyzMm[2]/1000} ${n.xyzMm[1]/1000}`),
 'ELEMENT INCIDENCES SHELL',...elements.map(e=>`${e.id} ${[...e.nodeIds].reverse().join(' ')}`),
 'ELEMENT PROPERTY',...elements.map(e=>`${e.id} THICKNESS ${e.thicknessMm/1000}`),
 'CONSTANTS','E 30000000 ALL','POISSON 0.2 ALL',`DENSITY ${density} ALL`,'SUPPORTS',...supports.map(id=>`${id} PINNED`),
 ...joint.pairs.map(p=>`DEPENDENT ${dofs} CONTROL ${p.nodeA} JOINT ${p.nodeB}`),
 'LOAD 1 LOADTYPE Dead TITLE TRIAL SELF WEIGHT ONLY','SELFWEIGHT Y -1','PERFORM ANALYSIS PRINT STATICS CHECK',
 'UNIT METER NEWTON','PRINT SUPPORT REACTION','PRINT JOINT DISPLACEMENTS ALL','PRINT ELEMENT STRESSES ALL',...(process.argv.includes('--corner-forces')?['PRINT ELEMENT FORCES ALL']:[]),'FINISH'];
 fs.writeFileSync(`${out}/${name}.STD`,lines.join('\n')+'\n');
}
const spec={status:'TWO_HALF_SHELL_SELFWEIGHT_SENSITIVITY_NOT_PRODUCT_DESIGN',meshPath,meshSha256:crypto.createHash('sha256').update(fs.readFileSync(meshPath)).digest('hex'),selectedParts:selected,
 nodes:nodes.length,elements:elements.length,supports,gravityDirectionSTAAD:[0,-1,0],volumeM3:volume,trialDensityKgM3:2400,trialUnitWeightKNM3:density,weightKN,cgSourceMm:cg,
 sourceCoordinates:'X/Y plan, Z up, mm',staadCoordinates:'X/Y up/Z plan, m',trialE_KNm2:30000000,trialNu:.2,
 supportAssumption:`All ${supports.length} wall-base mesh nodes translation-fixed, rotation-free; ideal rigid line bearing. NOT the approved six foundation supports or perimeter beams.`,
 crownAssumption:'Left controls right across actual20mm gap; compare dependent translations including offset versus fully rigid. Trial only, no assigned connector capacity.',
 criteria:{forceResidualN:1,momentResidualNm:5,maximumWarnings:0,maximumErrors:0},
 excluded:['Floor, END panels, remaining three bays, longitudinal joints and perimeter beams','Wind/seismic/roof live/floor live/finishes/handling/load combinations','Concrete material approval, prestress decision, cracking, creep, contact/gap opening, nonlinear behaviour','RC design, joint design, whole-building stability or production approval'],
 cases:['CROWN_TRANSLATIONS','CROWN_RIGID'],printCornerForces:process.argv.includes('--corner-forces'),engineeringApproved:false};
fs.writeFileSync(`${out}/study-spec.json`,JSON.stringify(spec,null,2)+'\n');
console.log(JSON.stringify({nodes:nodes.length,elements:elements.length,supportNodes:supports.length,volumeM3:volume,weightKN,cgSourceMm:cg},null,2));
