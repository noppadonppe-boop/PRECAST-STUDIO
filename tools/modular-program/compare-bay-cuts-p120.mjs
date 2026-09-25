import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const runs=process.argv.slice(2);assert.equal(runs.length,3);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const reports=runs.map(p=>JSON.parse(fs.readFileSync(p+'/section-cuts.json'))),specs=runs.map(p=>JSON.parse(fs.readFileSync(p+'/study-spec.json')));
for(let i=0;i<runs.length;i++){
 assert.equal(reports[i].status,'PASS_CORNER_FORCE_SECTION_EQUILIBRIUM_ONLY');assert.equal(reports[i].specSha256,hash(runs[i]+'/study-spec.json'));assert.equal(specs[i].meshSha256,hash(specs[i].meshPath));
 if(i)assert.equal(specs[i].elements,4*specs[i-1].elements);
 for(const r of reports[i].results){assert.equal(r.analysisSha256,hash(`${runs[i]}/${r.case}.ANL`));assert.equal(r.inputSha256,hash(`${runs[i]}/${r.case}.STD`));}
}
const comparisons=[];
for(const name of specs[0].cases)for(const cutMm of [1075,2275])for(const part of specs[0].selectedParts){
 const values=reports.map(r=>r.results.find(v=>v.case===name).cuts.find(c=>c.sourceCutHeightMm===cutMm).byPart[part]);
 const lastChanges={};for(const key of ['forceKN','momentAboutOwnSectionKNm'])lastChanges[key]=[0,1,2].map(k=>{const a=values[1][key][k],b=values[2][key][k],delta=Math.abs(b-a);return {absoluteChange:delta,relativeChange:Math.max(Math.abs(a),Math.abs(b))>.01?delta/Math.max(Math.abs(a),Math.abs(b)):null};});
 comparisons.push({case:name,cutHeightMm:cutMm,part,values,lastChanges});
}
const out={status:'THREE_MESH_SECTION_RESULTANTS_RECORDED_NOT_RC_DESIGN',runs,elements:specs.map(s=>s.elements),comparisons,localStressPeakConvergenceVerified:false,allCodesChecked:false,engineeringApproved:false,limits:['Actions are concurrent vectors per case and per section, never mixed envelopes.','Own-section moment reference differs from common building-centre reference; both retained.','Stable section integrals do not resolve local window-corner stress or prove reinforcement/connection capacity.','Same trial self-weight/rigid-base assumptions as P118; not real building or foundation reactions.']};
fs.writeFileSync('output/staad-p7-p120/comparison.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,cuts:comparisons.map(c=>({case:c.case,height:c.cutHeightMm,part:c.part,forceKN:c.values[2].forceKN,momentOwnKNm:c.values[2].momentAboutOwnSectionKNm,lastChanges:c.lastChanges}))},null,2));
