import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const folder=process.argv[2];assert(folder);const name=process.argv[3]??'PM-I-C1-RIGID-REFERENCE';
const specBytes=fs.readFileSync(path.join(folder,'study-spec.json')),s=JSON.parse(specBytes),bytes=fs.readFileSync(path.join(folder,name+'.ANL')),txt=bytes.toString('utf8');
assert(txt.includes('END OF THE STAAD.Pro RUN'));assert(/Warning Count: 0, Error Count: 0/.test(fs.readFileSync(path.join(folder,name+'.log'),'utf8')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),nodes=new Map(s.nodes.map(n=>[n.id,n]));
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const xyz=id=>{const p=nodes.get(id).xyzMm;return [p[0],p[2],p[1]].map(v=>v/1000);};
const entries=[];const elStart=txt.indexOf('ELEMENT FORCES    FORCE,LENGTH UNITS= NEWT METE');assert(elStart>=0);
let current=null;const plates=new Map(s.elements.map(e=>[e.id,e])),seen=new Map();
for(const line of txt.slice(elStart).split(/\r?\n/)){
 const h=line.match(/ELE\.NO\.\s+(\d+) FOR LOAD CASE\s+(\d+)/);if(h){current=+h[1];assert.equal(+h[2],1);assert(plates.has(current));assert(!seen.has(current));seen.set(current,[]);continue;}
 const a=line.trim().split(/\s+/);if(current===null||a.length!==7||!a.every(v=>Number.isFinite(Number(v))))continue;
 const [node,...v]=a.map(Number);assert(plates.get(current).nodeIds.includes(node));const r={type:'plate',id:current,node,F:v.slice(0,3),M:v.slice(3)};entries.push(r);seen.get(current).push(r);
}
assert.equal(seen.size,plates.size);for(const [id,rows]of seen){assert.equal(rows.length,plates.get(id).nodeIds.length);assert.equal(new Set(rows.map(r=>r.node)).size,rows.length);}
const bStart=txt.indexOf('PRINT MEMBER FORCES GLOBAL ALL');assert(bStart>=0&&bStart<elStart);let member=null;const beams=new Map(s.beamMembers.map(b=>[b.id,b])),bSeen=new Map();
const nextStress=txt.indexOf('PRINT ELEMENT STRESSES',bStart),beamEnd=nextStress>=0?Math.min(nextStress,elStart):elStart;
for(const line of txt.slice(bStart,beamEnd).split(/\r?\n/)){
 if(!/^\s+[\d+\-.\s]+$/.test(line))continue;const a=line.match(/[+-]?\d+(?:\.\d+)?/g)??[];let node,v;
 if(a.length===9){const nums=a.map(Number);member=nums[0];assert(beams.has(member));assert.equal(nums[1],1);assert(!bSeen.has(member));bSeen.set(member,[]);node=nums[2];v=nums.slice(3);}
 else if(a.length===7&&member!==null){node=+a[0];v=a.slice(1).map(Number);}else continue;
 assert(beams.get(member).nodes.includes(node),`member ${member} row ${line}`);const r={type:'beam',id:member,node,F:v.slice(0,3),M:v.slice(3)};entries.push(r);bSeen.get(member).push(r);
}
assert.equal(bSeen.size,beams.size);for(const rows of bSeen.values()){assert.equal(rows.length,2);assert.equal(new Set(rows.map(r=>r.node)).size,2);}
function resultant(rows,origin){let F=[0,0,0],M=[0,0,0];for(const r of rows){F=add(F,r.F);M=add(M,add(r.M,cross(sub(xyz(r.node),origin),r.F)));}return {F,M};}
let maxElementForceN=0,maxElementMomentNm=0;
for(const e of [...s.elements,...s.beamMembers]){const ids=e.nodeIds??e.nodes,origin=[0,1,2].map(k=>ids.reduce((t,id)=>t+xyz(id)[k],0)/ids.length),volume=e.nodeIds?e.areaMm2*e.thicknessMm/1e9:e.lengthMm*e.widthMm*e.depthMm/1e9;const r=resultant((e.nodeIds?seen:bSeen).get(e.id),origin);if(!s.unitFinishStudy)r.F[1]-=volume*s.trial.unitWeightKNm3*1000;maxElementForceN=Math.max(maxElementForceN,...r.F.map(Math.abs));maxElementMomentNm=Math.max(maxElementMomentNm,...r.M.map(Math.abs));}
assert(maxElementForceN<1&&maxElementMomentNm<1,'Element self-weight convention/equilibrium failed');
const reactions=s.supports.map(p=>{const c=s.constraints.find(c=>c.control===p.node||c.dependents.includes(p.node));const group=c?[c.control,...c.dependents]:[p.node];const ids=new Set(group),rr=resultant(entries.filter(r=>ids.has(r.node)),xyz(p.node));return {...p,group,forceN:rr.F,momentNm:rr.M};});
if(s.unitFinishStudy){
 for(const r of reactions){
  const ids=new Set(r.group),local=s.unitFinishStudy.appliedCommands.filter(n=>ids.has(n.nodeId)).map(n=>({node:n.nodeId,F:[0,n.FyKN*1000,0],M:[n.MxKNm*1000,0,n.MzKNm*1000]}));
  const load=resultant(local,xyz(r.node));r.forceN=sub(r.forceN,load.F);r.momentNm=sub(r.momentNm,load.M);
 }
}
let F=[0,0,0],M=[0,0,0];for(const r of reactions){F=add(F,r.forceN);M=add(M,add(r.momentNm,cross(xyz(r.node),r.forceN)));}
const gravity=s.unitFinishStudy?[0,s.unitFinishStudy.expectedAppliedResultant.FyKN*1000,0]:[0,-s.weightKN*1000,0],cg=[s.cgSourceMm[0],s.cgSourceMm[2],s.cgSourceMm[1]].map(v=>v/1000),appliedMoment=s.unitFinishStudy?[s.unitFinishStudy.expectedAppliedResultant.MxKNm*1000,0,s.unitFinishStudy.expectedAppliedResultant.MzKNm*1000]:cross(cg,gravity),forceResidual=add(F,gravity),momentResidual=add(M,appliedMoment);
const maxSupportMoment=Math.max(...reactions.flatMap(r=>r.momentNm.map(Math.abs)));
const passed=forceResidual.every(v=>Math.abs(v)<s.criteria.forceResidualN)&&momentResidual.every(v=>Math.abs(v)<s.criteria.momentResidualNm)&&maxSupportMoment<s.criteria.momentResidualNm;
const report={status:passed?'PASS_RECOVERED_GROUP_EQUILIBRIUM_TRIAL_ONLY':'FAIL_RECOVERED_GROUP_EQUILIBRIUM',criteria:s.criteria,plateCount:seen.size,beamCount:bSeen.size,reactions,totalForceN:F,totalMomentNm:M,forceResidualN:forceResidual,momentResidualNm:momentResidual,maxPinnedSupportMomentNm:maxSupportMoment,inputSha256:hash(fs.readFileSync(path.join(folder,name+'.STD'))),analysisSha256:hash(bytes),specSha256:hash(specBytes),method:'Sum native global element corner and beam end forces for every node in each support rigid group, transporting moments to its supported node. Do not add raw support reactions again.',rawSupportReactionTableAccepted:false,engineeringApproved:false,limitations:s.excluded};
report.elementEquilibrium={forceToleranceN:1,momentToleranceNm:1,maxElementForceN,maxElementMomentNm};
fs.writeFileSync(path.join(folder,'group-reaction-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
assert(passed,'Recovered support-group equilibrium or pinned moment exceeds acceptance limits');
