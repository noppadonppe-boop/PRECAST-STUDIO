import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {root,hash,volumeCg} from './stage5-p38.mjs';
import {pointInPolygon,verticalMesh,fractions,inSolid,out} from './concrete-lift-p52.mjs';
test('polygon includes concavity correctly; positive three-point reactions are not equal by assumption',()=>{
 const poly=[[0,0],[10,0],[10,5],[5,5],[5,10],[0,10]];
 assert.equal(pointInPolygon([8,8],poly),false);assert.equal(pointInPolygon([2,8],poly),true);
 const f=fractions([[0,0],[10,0],[0,10]],[2,3]);f.forEach((v,i)=>assert.ok(Math.abs(v-[.5,.2,.3][i])<1e-10));
 assert.equal(fractions([[0,0],[1,1],[2,2]],[0,0]),null);
});
test('vertical ray handles inclined slab and an internal vertical void',()=>{
 const slab=[[[0,0,0],[10,0,0],[10,10,1],[0,10,1]],[[0,0,3],[10,0,3],[10,10,4],[0,10,4]]];
 assert.deepEqual(verticalMesh(slab)(5,5),[[.5,3.5]]);
 const faces=[0,2,4,6].map(z=>[[0,0,z],[10,0,z],[10,10,z],[0,10,z]]);
 assert.deepEqual(verticalMesh(faces)(5,5),[[0,2],[4,6]]);
 assert.equal(inSolid(verticalMesh(faces),[5,5,3]),false);
});
const reg=JSON.parse(fs.readFileSync(path.join(out,'register.json')));
test('complete unique 44 setup mapping, unchanged geometry and no false approval',()=>{
 const source=JSON.parse(fs.readFileSync(path.join(root,'output/stage5-moulds-p38/register.json')));
 assert.deepEqual(reg.records.map(r=>r.id),source.setups.map(r=>r.id));assert.equal(new Set(reg.records.map(r=>r.id)).size,44);
 assert.equal(reg.decisionSha256,hash(path.join(root,'knowledge/modular-program-r02/decision-lifting-p52.json')));
 assert.equal(reg.generatorSha256,hash(path.join(root,'tools/modular-program/concrete-lift-p52.mjs')));
});
for(const r of reg.records)test(r.id+' source / equilibrium / solid-route / statuses',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(out,r.id+'.json'))),s=JSON.parse(fs.readFileSync(path.join(root,r.source))),ray=verticalMesh(s.cavity.facesMm),mesh=volumeCg(s.cavity.facesMm);
 assert.equal(hash(path.join(root,r.source)),r.sourceSha256);for(const f of r.files)assert.equal(hash(path.join(root,f.path)),f.sha256);
 assert.equal(m.concreteOnlyMassKg,s.mass.concreteKg);assert.deepEqual(m.castingDimensionsMm,s.cavity.dimensionsMm);
 mesh.cgMm.forEach((v,i)=>assert.ok(Math.abs(v-m.concreteOnlyCgMm[i])<1e-7));
 assert.ok(m.reactionFractions.every(f=>f>=.12));
 for(const c of m.scenarios){assert.ok(Math.abs(c.verticalDemandKN.reduce((a,v)=>a+v,0)-c.totalKN)<1e-8);for(let axis=0;axis<2;axis++)assert.ok(Math.abs(m.candidateZoneCentresMm.reduce((a,p,i)=>a+p[axis]*c.verticalDemandKN[i],0)-m.concreteOnlyCgMm[axis]*c.totalKN)<1e-6);}
 for(const p of m.candidateZoneCentresMm)assert.ok(Math.abs(ray(p[0],p[1]).at(-1)[1]-p[2])<1e-6);
 assert.equal(m.reinforcementRoutes.length,6);for(const b of m.reinforcementRoutes){for(const k of ['diameterMm','spacingMm','coverMm','bendRadiusMm','developmentLengthMm'])assert.equal(b[k],null);for(let i=0;i<b.pointsMm.length-1;i++)for(let j=0;j<=100;j++){const p=b.pointsMm[i].map((v,k)=>v+(b.pointsMm[i+1][k]-v)*j/100);assert.ok(inSolid(ray,p));}}
 assert.equal(m.verifiedConcreteCapacityKN,null);assert.equal(m.anchorCapacityKN,null);assert.equal(m.anchorProduct,null);assert.equal(m.rigging.capacityVerified,false);assert.equal(m.productionReleased,false);assert.equal(m.engineeringApproved,false);
 assert.equal(m.notDrillingCoordinates,true);assert.ok(m.excluded.includes('rotation / tilting / erection'));
});
