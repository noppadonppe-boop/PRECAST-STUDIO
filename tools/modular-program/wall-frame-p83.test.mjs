import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const dir='output/wall-frame-p83',audit=JSON.parse(fs.readFileSync(`${dir}/audit.json`)),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),near=(a,b,t=1e-4)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function resultant(rect,sign){const {v0,v1,z0:a,z1:b}=rect,I=.000025*(1485*(b-a)-(b*b-a*a)/2),J=.000025*(1485*(b*b-a*a)/2-(b**3-a**3)/3);return [sign*(v1-v0)*I,sign*(v1-v0)*J,-sign*(v1*v1-v0*v0)/2*I];}
test('runtime, source fingerprints and perforated gusset benchmark',()=>{assert.equal(audit.records.length,12);assert.ok(audit.benchmark.maxDisplacementErrorMm<1e-7);assert.ok(audit.benchmark.relativeWorkError<1e-6);for(const [p,h]of Object.entries(audit.sourceHashes))assert.equal(hash(p),h);assert.equal(hash('.local-engineering-runtime/openseespywin/opensees.pyd'),audit.binarySha256);});
for(const row of audit.records)test(`${row.key} ${row.owner}: 3 meshes, actual gussets, complete pressure, foot equilibrium`,()=>{
 assert.equal(row.equilibriumVerified,true);assert.equal(row.globalConvergenceVerified,true);assert.equal(row.stressConvergenceVerified,false);
 for(const mesh of row.meshes){
  const m=JSON.parse(fs.readFileSync(`${dir}/${row.key}-${row.owner}-h${mesh}.json`));for(const x of m.inputs)assert.equal(hash(x.path),x.sha256);for(const x of m.basis.inputs)assert.equal(hash(x.path),x.sha256);assert.equal(hash('tools/modular-program/wall_frame_p83.py'),m.solverSha256);assert.equal(hash('tools/modular-program/gusset_mesh_p83.py'),m.mesherSha256);
  near(m.gussetAreaMm2,4*98500,.001);assert.equal(m.gussetPlates.length,4);assert.equal(m.footGroups.length,2);
  const full=resultant(m.basis.pressureDomain,m.basis.pressureSign),hole=resultant(m.basis.pressureDomain.hole,m.basis.pressureSign),expected=full.map((x,i)=>x-hole[i]);near(m.appliedForceN[0],expected[0],.001);near(m.appliedMomentNmm[1],expected[1],1);near(m.appliedMomentNmm[2],expected[2],1);
  assert.ok(m.forceResidualN.every(v=>Math.abs(v)<.01));assert.ok(m.momentResidualNmm.every(v=>Math.abs(v)<1));assert.ok(m.maxFreeRetainedResidualForceN<.01);assert.ok(m.maxFreeRetainedResidualMomentNmm<1);
  const slaves=new Set(m.rigidLinks.map(r=>r.slave));assert.equal(slaves.size,m.rigidLinks.length);assert.ok(m.rigidLinks.every(r=>!slaves.has(r.master)));assert.ok(m.reactions.every(r=>Math.abs(r.xyzMm[2]-30)<1e-5));
  assert.ok([...m.shellCells,...m.gussetCells].every(c=>c.gaussResultants.length===4&&c.gaussResultants.every(a=>a.length===8&&a.every(Number.isFinite))));assert.ok(m.beams.some(b=>b.kind==='waler'));assert.ok(m.maxWalerNormalDisplacementMm>0);
  assert.equal(m.engineeringApproved,false);assert.equal(m.productionReleased,false);assert.equal(m.stageComplete,false);
 }
});
for(const f of ['A','B','D'])for(const o of ['M01','M03'])test(`${f} ${o}: mirrored fabrication response`,()=>{const a=audit.records.find(r=>r.key===`${f}-LH-W01`&&r.owner===o),b=audit.records.find(r=>r.key===`${f}-RH-W01`&&r.owner===o);a.displacementsMm.forEach((v,i)=>near(v,b.displacementsMm[i],1e-5));a.footGroups.forEach((p,i)=>p.forceN.forEach((v,j)=>near(v,b.footGroups[i].forceN[j],.01)));});
