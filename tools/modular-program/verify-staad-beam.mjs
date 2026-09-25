import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir=path.resolve(process.argv[2]??'output/staad-p7-p105/benchmark');
const anl=fs.readFileSync(path.join(dir,'BEAM_QA.ANL'),'utf8');
const log=fs.readFileSync(path.join(dir,'BEAM_QA.log'),'utf8');
assert.match(anl,/END OF THE STAAD.Pro RUN/);
assert.match(log,/Warning Count: 0, Error Count: 0/);
function rows(section,end){return anl.split(section)[1].split(end)[0].split(/\r?\n/).map(s=>s.trim().split(/\s+/)).filter(a=>a.length>=8&&a.every(x=>Number.isFinite(Number(x)))).map(a=>a.map(Number));}
const reactions=rows('SUPPORT REACTIONS -UNIT','END OF LATEST ANALYSIS RESULT');
assert.equal(reactions.length,2);
for(const r of reactions){assert([1,3].includes(r[0]));assert.equal(r[1],1);assert(Math.abs(r[3]-15)<0.005);for(const k of [2,4,5,6,7])assert(Math.abs(r[k])<0.005);}
const forceBlock=anl.split('MEMBER END FORCES')[1].split('END OF LATEST ANALYSIS RESULT')[0];
const midpointMoments=forceBlock.split(/\r?\n/).map(s=>s.trim().split(/\s+/)).filter(a=>(a.length===7&&a[0]==='2')||(a.length===9&&a[0]==='2'&&a[2]==='2')).map(a=>Number(a.at(-1)));
assert.equal(midpointMoments.length,2);midpointMoments.forEach(m=>assert(Math.abs(Math.abs(m)-11.25)<0.005));
assert.match(anl,/JOINT DISPLACEMENT \(CM\s+RADIANS\)/);
const displacements=rows('JOINT DISPLACEMENT (CM','END OF LATEST ANALYSIS RESULT');
const middle=displacements.find(r=>r[0]===2&&r[1]===1);assert(middle);
const w=10,L=3,E=30e6,b=.25,h=.4,A=b*h,I=b*h**3/12,nu=.2,G=E/(2*(1+nu));
const bending=5*w*L**4/(384*E*I)*1000;
const shear=w*L**2/(8*(5/6)*G*A)*1000;
const actualMm=-middle[3]*10, expectedMm=bending+shear;
assert(Math.abs(actualMm-expectedMm)<.001,'Deflection differs from bending + rectangular shear estimate');
const result={status:'PASS_BEAM_BENCHMARK_ONLY',engineVersion:'23.00.02.361',warnings:0,errors:0,reactionsKN:reactions.map(r=>r[3]),midpointMomentsKNm:midpointMoments,deflectionMm:actualMm,referenceBendingMm:bending,referenceShearMm:shear,referenceTotalMm:expectedMm,deflectionToleranceMm:.001,inputSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'BEAM_QA.STD'))).digest('hex'),analysisSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'BEAM_QA.ANL'))).digest('hex'),scope:'No plate, RC-code or product verification; no engineering approval'};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({directory:dir,...result},null,2));
