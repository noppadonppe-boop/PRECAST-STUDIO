import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {createCatalogueServer} from './server.mjs';
const root=resolve(import.meta.dirname,'../..');
test('P91: all27 protected downloads, per-artifact authorization and unchanged historical lifting files',async()=>{
 const origin='http://127.0.0.1:5211',active=()=>({name:'P91 fixture',anonymous:false,orgActive:true,projectActive:true,canRead:true,canReadEngineering:true,artifactIds:'*',expiresAt:Date.now()+3600000});let member=active();
 const {server}=await createCatalogueServer({root,origin,identityAdapter:{signIn:async()=>'fixture',resolve:async()=>member}});await new Promise(r=>server.listen(5211,'127.0.0.1',r));
 try{
  assert.equal((await fetch(origin+'/api/catalogue/moulds')).status,401);
  const login=await fetch(origin+'/api/catalogue/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"idToken":"fixture"}'}),cookie=login.headers.get('set-cookie').split(';')[0],req=p=>fetch(origin+p,{headers:{Cookie:cookie}});
  const d=await(await req('/api/catalogue/moulds')).json();assert.equal(d.castingLiftingRevision,'P91');
  const files=d.setups.flatMap(s=>s.currentLiftingFiles);assert.equal(files.length,27);assert.equal(d.setups.filter(s=>s.currentLiftingFiles.length).length,9);assert.equal(d.setups.flatMap(s=>s.liftingFiles).length,132);
  for(const a of files){const r=await req(a.href+'?download=1');assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('content-type'),a.contentType);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,a.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);}
  const single=files.find(f=>f.filename.endsWith('.json'));member={...active(),artifactIds:[single.id]};
  const limited=await(await req('/api/catalogue/moulds')).json();assert.equal(limited.setups.length,1);const s=limited.setups[0];assert.deepEqual(s.currentLiftingFiles.map(f=>f.id),[single.id]);assert.equal(s.liftingFiles.length,0);assert.equal(s.presentation,null);assert.equal(s.developmentFiles.length,0);assert.equal(s.closureReview,null);assert.equal(s.closureFile,null);assert.equal(s.supplementGroups.length,0);
  assert.equal((await req(files.find(f=>f.id!==single.id).href)).status,403);
  member={...active(),canReadEngineering:false};assert.equal((await req(single.href)).status,403);member=active();
  for(const p of ['/output/cap-lift-p91/CS1.json','/output/cap-lift-p91/CS1.png','/output/cap-lift-p91/register.json'])assert.equal((await req(p)).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
