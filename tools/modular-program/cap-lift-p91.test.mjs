import fs from 'node:fs';import path from 'node:path';import test from 'node:test';import assert from 'node:assert/strict';import {root,keys} from './cap-geometry-p55.mjs';import {verticalMesh,inSolid} from './concrete-lift-p52.mjs';import {hash,volumeCg} from './stage5-p38.mjs';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),reg=read('output/cap-lift-p91/register.json');
function validate(m){
 const mould=read(m.source.path),ray=verticalMesh(mould.concrete.faces);assert.deepEqual(m.currentCastingFacesMm,mould.concrete.faces);assert.equal(hash(path.join(root,m.source.path)),m.source.sha256);
 assert.equal(hash(path.join(root,m.previousLiftingSource.path)),m.previousLiftingSource.sha256);assert.equal(m.concreteOnlyMassKg,mould.concrete.massKg);
 const prop=volumeCg(m.currentCastingFacesMm);prop.cgMm.forEach((v,i)=>assert.ok(Math.abs(v-m.concreteOnlyCgMm[i])<1e-7));
 assert.equal(m.candidateZoneCentresMm.length,3);assert.equal(m.reinforcementRoutes.length,6);
 for(const p of m.candidateZoneCentresMm)assert.ok(Math.abs(ray(p[0],p[1]).at(-1)[1]-p[2])<1e-6);
 for(const s of m.scenarios){assert.ok(Math.abs(s.verticalDemandKN.reduce((a,v)=>a+v,0)-s.totalKN)<1e-9);assert.ok(s.verticalDemandKN.every(v=>v>0));for(let k=0;k<2;k++)assert.ok(Math.abs(m.candidateZoneCentresMm.reduce((a,p,i)=>a+p[k]*s.verticalDemandKN[i],0)-m.concreteOnlyCgMm[k]*s.totalKN)<1e-6);}
 for(const b of m.reinforcementRoutes){for(const k of ['diameterMm','spacingMm','coverMm','bendRadiusMm','developmentLengthMm'])assert.equal(b[k],null);for(let i=0;i<3;i++)for(let j=0;j<=100;j++)assert.ok(inSolid(ray,b.pointsMm[i].map((v,k)=>v+(b.pointsMm[i+1][k]-v)*j/100)));}
 assert.ok(m.geometricQa.minimumRouteCentrelineFaceMarginMm>0);assert.ok(m.geometricQa.candidateDiskInside);assert.deepEqual(m.geometricQa.bedCollisionCells,[]);
 assert.equal(m.verifiedConcreteCapacityKN,null);assert.equal(m.anchorCapacityKN,null);assert.equal(m.rigging.capacityVerified,false);assert.equal(m.productionReleased,false);assert.equal(m.engineeringApproved,false);assert.equal(m.stageComplete,false);assert.equal(m.notDrillingCoordinates,true);
}
test('complete9-key map, unchanged P52 decision and source algorithm',()=>{assert.deepEqual(reg.records.map(r=>r.key),keys);assert.equal(reg.generatorSha256,hash(path.join(root,'tools/modular-program/cap-lift-p91.mjs')));assert.equal(reg.decisionSha256,hash(path.join(root,'knowledge/modular-program-r02/decision-lifting-p52.json')));});
for(const r of reg.records)test(r.key+' current shape / mass / equilibrium / routes / no release',()=>{const m=read(`output/cap-lift-p91/${r.key}.json`);validate(m);for(const f of r.files)assert.equal(hash(path.join(root,f.path)),f.sha256);assert.equal(m.algorithmSource.sha256,hash(path.join(root,m.algorithmSource.path)));});
test('reject a rebar route outside the casting',()=>{const m=read('output/cap-lift-p91/CC.json');m.reinforcementRoutes[0].pointsMm[0][0]+=10000;assert.throws(()=>validate(m));});
test('reject inconsistent lifting reactions and claimed release',()=>{const m=read('output/cap-lift-p91/CC.json');m.scenarios[0].verticalDemandKN[0]+=1;assert.throws(()=>validate(m));const other=read('output/cap-lift-p91/CC.json');other.productionReleased=true;assert.throws(()=>validate(other));});
