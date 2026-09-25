import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const folder=process.argv[2];assert(folder,'Pass actual run directory');
const spec=JSON.parse(fs.readFileSync('output/staad-p7-p107/spec.json'));const results=[];
for(const c of spec.cases){
 const file=path.join(folder,c.id+'.ANL'),raw=fs.readFileSync(file),s=raw.toString();
 const log=fs.readFileSync(path.join(folder,c.id+'.log'),'utf8');assert.match(log,/Warning Count: 0, Error Count: 0/);assert.match(s,/END OF THE STAAD.Pro RUN/);
 function rows(h){assert(s.includes(h));return s.slice(s.indexOf(h)).split('END OF LATEST ANALYSIS RESULT')[0].split(/\r?\n/).map(l=>l.trim().split(/\s+/)).filter(a=>a.length===8&&a.every(x=>Number.isFinite(Number(x)))).map(a=>a.map(Number));}
 assert.match(s,/SUPPORT REACTIONS -UNIT NEWT/);assert.match(s,/JOINT DISPLACEMENT \(CM/);
 const reactions=rows('SUPPORT REACTIONS -UNIT'),disp=rows('JOINT DISPLACEMENT (CM');
 assert.equal(reactions.length,(c.n+1)**2);assert.equal(disp.length,(c.n+1)**2);
 assert.equal(new Set(reactions.map(r=>r[0])).size,reactions.length);
 const totalKN=reactions.reduce((a,r)=>a+r[3],0)/1000;
 assert(Math.abs(totalKN-c.loadKN)<spec.criteria.reactionToleranceKN);
 const center=disp.find(r=>r[0]===c.centerNode);assert(center);const deflectionMm=-center[3]*10;
 for(const r of reactions)for(const k of [2,4])assert(Math.abs(r[k])<.02);
 results.push({id:c.id,elements:c.n**2,nodes:disp.length,totalReactionKN:totalKN,deflectionMm,relativeTheoryError:Math.abs(deflectionMm/spec.referenceMm-1),anlSha256:crypto.createHash('sha256').update(raw).digest('hex')});
}
const last=results.at(-1),prev=results.at(-2),change=Math.abs(last.deflectionMm/prev.deflectionMm-1);
assert(last.relativeTheoryError<spec.criteria.finestDeflectionRelativeTolerance);assert(change<spec.criteria.lastMeshRelativeChange);
const report={status:'PASS_BENDING_BENCHMARK_ONLY',referenceMm:spec.referenceMm,lastMeshRelativeChange:change,criteria:spec.criteria,results,limitations:'Not membrane/joint/openings/nonlinear/material-code/product validation'};
fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
