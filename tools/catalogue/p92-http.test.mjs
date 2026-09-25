import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {createCatalogueServer} from './server.mjs';
const root=resolve(import.meta.dirname,'../..');
test('P92 all30 artifact references: correct bytes/MIME, individual ACL, no private mount',async()=>{
 const origin='http://127.0.0.1:5212',active=()=>({name:'P92 fixture',anonymous:false,orgActive:true,projectActive:true,canRead:true,canReadEngineering:true,artifactIds:'*',expiresAt:Date.now()+3600000});let member=active();
 const {server}=await createCatalogueServer({root,origin,identityAdapter:{signIn:async()=>'fixture',resolve:async()=>member}});await new Promise(r=>server.listen(5212,'127.0.0.1',r));
 try{
  assert.equal((await fetch(origin+'/api/catalogue/moulds')).status,401);
  const login=await fetch(origin+'/api/catalogue/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"idToken":"fixture"}'}),cookie=login.headers.get('set-cookie').split(';')[0],req=p=>fetch(origin+p,{headers:{Cookie:cookie}});
  const d=await(await req('/api/catalogue/moulds')).json();assert.equal(d.supplementRevision,'P92');assert.equal(d.castingLiftingRevision,'P91');assert.equal(d.setups.length,44);
  const gs=d.setups.flatMap(s=>s.supplementGroups.filter(g=>g.revision==='P92')),files=gs.flatMap(g=>g.files);assert.equal(gs.length,6);assert.equal(files.length,30);
  for(const a of files){
   const r=await req(a.href+'?download=1');assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('content-type'),a.contentType);
   const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,a.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);
   if(a.filename.endsWith('.csv')){const key=a.filename.replace('-checks.csv',''),lines=b.toString('utf8').trim().split('\n');assert.equal(lines.length,key==='D-RH-W01'?73:49);assert.ok(lines.slice(1).every(l=>l.startsWith(key+'-')));}
   if(a.filename.endsWith('.md'))assert.match(a.contentType,/text\/markdown/);
  }
  const single=files.find(a=>a.filename.endsWith('.json'));member={...active(),artifactIds:[single.id]};
  const d1=await(await req('/api/catalogue/moulds')).json();assert.equal(d1.setups.length,1);const s=d1.setups[0];assert.deepEqual(s.supplementGroups.flatMap(g=>g.files.map(f=>f.id)),[single.id]);assert.equal(s.presentation,null);assert.equal(s.closureFile,null);assert.equal(s.closureReview,null);assert.equal(s.developmentFiles.length,0);assert.equal(s.liftingFiles.length,0);assert.equal(s.currentLiftingFiles.length,0);
  assert.equal((await req(files.find(a=>a.id!==single.id).href)).status,403);
  member={...active(),canReadEngineering:false};assert.equal((await req(single.href)).status,403);member=active();
  for(const p of ['/output/connection-disposition-p92/register.json','/output/connection-disposition-p92/INSPECTION_TH.md','/output/connection-disposition-p92/D-RH-W01-board.png','/knowledge/modular-program-r02/references/JRC96658-2015.pdf'])assert.equal((await req(p)).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
