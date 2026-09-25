import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {createCatalogueServer} from './server.mjs';
test('P99 registers352 files; HTTP covers all44 setups, every file role and isolated grants',async()=>{
 const root=resolve(import.meta.dirname,'../..'),origin='http://127.0.0.1:5219';
 const active=()=>({name:'P99 fixture',anonymous:false,orgActive:true,projectActive:true,canRead:true,canReadEngineering:true,artifactIds:'*',expiresAt:Date.now()+3600000});let member=active();
 const {server}=await createCatalogueServer({root,origin,identityAdapter:{signIn:async()=>'fixture',resolve:async()=>member}});await new Promise(r=>server.listen(5219,'127.0.0.1',r));
 try{
  assert.equal((await fetch(origin+'/api/catalogue/moulds')).status,401);
  const login=await fetch(origin+'/api/catalogue/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"idToken":"fixture"}'}),cookie=login.headers.get('set-cookie').split(';')[0],req=p=>fetch(origin+p,{headers:{Cookie:cookie}});
  const d=await(await req('/api/catalogue/moulds')).json();assert.equal(d.coordinatedRevision,'P99');assert.equal(d.presentationRevision,'P43');assert.equal(d.setups.length,44);assert.equal(d.productionReleased,false);assert.equal(d.engineeringApproved,false);
  const files=d.setups.flatMap(s=>s.coordinatedFiles);assert.equal(files.length,352);assert.ok(d.setups.every(s=>s.presentation&&s.coordinatedFiles.length===8));
  // All352 asset bytes/hashes are exhaustively checked by the loader and coordination test.
  // HTTP samples each setup and all8 roles, avoiding352 redundant full-dependency scans.
  const samples=[...new Map([...d.setups.map((s,i)=>s.coordinatedFiles[i%8]),...d.setups[0].coordinatedFiles].map(a=>[a.id,a])).values()];assert.equal(samples.length,51);
  for(const a of samples){const r=await req(a.href+'?download=1');assert.equal(r.status,200,a.id);assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('content-type'),a.contentType);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,a.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);}
  const one=files[0];member={...active(),artifactIds:[one.id]};const only=await(await req('/api/catalogue/moulds')).json();assert.equal(only.setups.length,1);const s=only.setups[0];assert.deepEqual(s.coordinatedFiles.map(a=>a.id),[one.id]);assert.equal(s.presentation,null);assert.equal(s.closureReview,null);assert.equal(s.supplementGroups.length,0);assert.equal(s.files.length,0);assert.equal(s.developmentFiles.length,0);assert.equal(s.tableBaseFiles.length,0);assert.equal(s.liftingFiles.length,0);
  assert.equal((await req(files[1].href)).status,403);member={...active(),canReadEngineering:false};assert.equal((await req(one.href)).status,403);member=active();
  assert.equal((await req('/output/mould-coordinated-p99/index.html')).status,404);assert.equal((await req('/output/mould-coordinated-p99/'+one.filename)).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
