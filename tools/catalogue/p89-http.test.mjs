import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {createCatalogueServer} from './server.mjs';
const root=resolve(import.meta.dirname,'../..');
test('P89 protected HTTP: all48 candidate files, per-file ACL and private-source denial',async()=>{
 const origin='http://127.0.0.1:5209',active=()=>({name:'P89 API fixture',anonymous:false,orgActive:true,projectActive:true,canRead:true,canReadEngineering:true,artifactIds:'*',expiresAt:Date.now()+3600000});let member=active();
 const {server}=await createCatalogueServer({root,origin,identityAdapter:{signIn:async()=>'fixture',resolve:async()=>member}});await new Promise(r=>server.listen(5209,'127.0.0.1',r));
 try{
  assert.equal((await fetch(origin+'/api/catalogue/moulds')).status,401);
  const login=await fetch(origin+'/api/catalogue/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"idToken":"fixture"}'}),cookie=login.headers.get('set-cookie').split(';')[0],req=p=>fetch(origin+p,{headers:{Cookie:cookie}});
  const data=await(await req('/api/catalogue/moulds')).json();assert.equal(data.supplementRevision,'P89');const files=data.setups.flatMap(s=>s.supplementGroups.filter(g=>g.revision==='P89').flatMap(g=>g.files));assert.equal(files.length,48);
  for(const a of files){const r=await req(a.href+'?download=1');assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('content-type'),a.contentType);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,a.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);}
  member={...active(),artifactIds:[files[0].id]};const restricted=await(await req('/api/catalogue/moulds')).json();assert.equal(restricted.setups.length,1);assert.equal(restricted.setups[0].supplementGroups.flatMap(g=>g.files).length,1);assert.equal((await req(files[1].href)).status,403);
  member={...active(),canReadEngineering:false};assert.equal((await req(files[0].href)).status,403);member=active();
  for(const p of ['/knowledge/modular-program-r02/references/NASA-RP-1228-1990.pdf','/output/base-thread-candidate-p89/A-LH-S00.json'])assert.equal((await req(p)).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
