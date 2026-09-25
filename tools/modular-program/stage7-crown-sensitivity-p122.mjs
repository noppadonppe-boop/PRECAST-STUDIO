import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const base='output/staad-p7-p121',out='output/staad-p7-p122';
const specBytes=fs.readFileSync(base+'/study-spec.json'),s=JSON.parse(specBytes),inputBytes=fs.readFileSync(base+'/PM-I-C1-RIGID-REFERENCE.STD');
const crown=new Set(s.links.filter(l=>l.group==='JO-CR').flatMap(l=>l.nodes));assert(crown.size>0);
const changed=s.constraints.filter(c=>[c.control,...c.dependents].some(n=>crown.has(n)));assert(changed.length>0);
let text=inputBytes.toString('utf8');for(const c of changed){const old=`DEPENDENT RIGID CONTROL ${c.control} JOINT`;assert(text.includes(old));text=text.replace(old,`DEPENDENT FX FY FZ CONTROL ${c.control} JOINT`);c.specification='TRANSLATIONS_ONLY_CROWN_TOUCHING_GROUP_SENSITIVITY';}
// Rewrap commands after changing their length. STAAD continuation stays explicit.
const commands=text.replace(/ -\r?\n/g,' ').split(/\r?\n/);text=commands.flatMap(line=>{if(!line.startsWith('DEPENDENT'))return [line];const lines=[];let row='';for(const t of line.split(/\s+/)){if(row.length+t.length+1>76){lines.push(row+' -');row=t;}else row+=(row?' ':'')+t;}lines.push(row);return lines;}).join('\n');
text=text.replace('JOB NAME FULL I C1 RIGID REFERENCE NOT DESIGN','JOB NAME I C1 CROWN GROUP SENSITIVITY NOT DESIGN').replace('TITLE TRIAL SELFWEIGHT ALL RIGID','TITLE TRIAL SELFWEIGHT CROWN GROUP TRANSLATIONS');
s.status='CROWN_GROUP_TRANSLATION_SENSITIVITY_SELFWEIGHT_NOT_DESIGN';s.sensitivity={changedControls:changed.map(c=>c.control),baseSpecSha256:crypto.createHash('sha256').update(specBytes).digest('hex'),baseInputSha256:crypto.createHash('sha256').update(inputBytes).digest('hex'),meaning:'Release relative rotations for entire disjoint rigid groups touching crown. At longitudinal intersections this also releases relative rotations among members of that group. Not a pure isolated crown hinge and not actual joint design.'};
s.excluded.push('Crown/BY intersection release is a grouped idealization, not selected connector behavior');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/study-spec.json',JSON.stringify(s,null,2)+'\n');fs.writeFileSync(out+'/PM-I-C1-RIGID-REFERENCE.STD',text);console.log(JSON.stringify({out,changedGroups:changed.length,totalGroups:s.constraints.length}));
