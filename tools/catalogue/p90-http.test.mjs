import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {createCatalogueServer} from './server.mjs';
const root=resolve(import.meta.dirname,'../..');
test('P90 protected delivery:132 registered artifacts;36 representative downloads and per-artifact ACL',async()=>{
 const origin='http://127.0.0.1:5210',active=()=>({name:'P90 fixture',anonymous:false,orgActive:true,projectActive:true,canRead:true,canReadEngineering:true,artifactIds:'*',expiresAt:Date.now()+3600000});let member=active();
 const {server}=await createCatalogueServer({root,origin,identityAdapter:{signIn:async()=>'fixture',resolve:async()=>member}});await new Promise(r=>server.listen(5210,'127.0.0.1',r));
 try{
  assert.equal((await fetch(origin+'/api/catalogue/moulds')).status,401);
  const login=await fetch(origin+'/api/catalogue/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"idToken":"fixture"}'}),cookie=login.headers.get('set-cookie').split(';')[0],req=p=>fetch(origin+p,{headers:{Cookie:cookie}});
  const data=await(await req('/api/catalogue/moulds')).json();assert.equal(data.supplementRevision,'P92');
  const studies=data.setups.flatMap(s=>s.supplementGroups.filter(g=>g.revision==='P90').flatMap(g=>g.files)),closure=data.setups.map(s=>s.closureFile);assert.equal(studies.length,88);assert.equal(closure.length,44);
  // Startup validates the hash of every registered file. Exercise every new format
  // on all6 study setups, plus one closure download for each workstream.
  const samples=data.setups.filter(s=>s.supplementGroups.some(g=>g.revision==='P90')).flatMap(s=>{const files=s.supplementGroups.find(g=>g.revision==='P90').files;return [files.find(a=>a.filename.endsWith('-board.png')),files.find(a=>a.filename.endsWith('-board.svg')),files.find(a=>a.filename.endsWith('-summary.csv')),files.find(a=>a.filename.endsWith('-summary.json')),files.find(a=>/-h[\d.]+-r18\.5-L50\.json$/.test(a.filename))];});
  for(const token of ['MF-A-H15-LH-W01','MF-C-H15-LH-W01','MF-C-F15-F01','MF-N90-NF01-N01','MF-A-EPX-D01','MF-N90-CS1'])samples.push(data.setups.find(s=>s.id.startsWith(token)).closureFile);
  assert.equal(samples.length,36);assert.equal(new Set(samples.map(a=>a.id)).size,36);
  for(const a of samples){const r=await req(a.href+'?download=1');assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('content-type'),a.contentType);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,a.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);}
  member={...active(),artifactIds:[closure[0].id]};const restricted=await(await req('/api/catalogue/moulds')).json();assert.equal(restricted.setups.length,1);assert.ok(restricted.setups[0].closureReview);assert.equal(restricted.setups[0].presentation,null);assert.equal(restricted.setups[0].supplementGroups.length,0);assert.equal((await req(studies[0].href)).status,403);
  member={...active(),artifactIds:[studies[0].id]};const studyOnly=await(await req('/api/catalogue/moulds')).json();assert.equal(studyOnly.setups.length,1);assert.equal(studyOnly.setups[0].closureReview,null);assert.equal(studyOnly.setups[0].closureFile,null);
  member={...active(),canReadEngineering:false};assert.equal((await req(closure[0].href)).status,403);member=active();
  for(const p of ['/knowledge/modular-program-r02/references/NASA-RP-1228-1990.pdf','/output/foot-flex-p90/audit.json','/output/stage5-closure-p90/register.json'])assert.equal((await req(p)).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
