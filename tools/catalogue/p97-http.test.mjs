import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {createCatalogueServer} from './server.mjs';
const root=resolve(import.meta.dirname,'../..');
test('P97 all45 references retain historical views and isolated grants',async()=>{
 const origin='http://127.0.0.1:5217',active=()=>({name:'P97 fixture',anonymous:false,orgActive:true,projectActive:true,canRead:true,canReadEngineering:true,artifactIds:'*',expiresAt:Date.now()+3600000});let member=active();
 const {server}=await createCatalogueServer({root,origin,identityAdapter:{signIn:async()=>'fixture',resolve:async()=>member}});await new Promise(r=>server.listen(5217,'127.0.0.1',r));
 try{
  assert.equal((await fetch(origin+'/api/catalogue/moulds')).status,401);
  const login=await fetch(origin+'/api/catalogue/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"idToken":"fixture"}'}),cookie=login.headers.get('set-cookie').split(';')[0],req=p=>fetch(origin+p,{headers:{Cookie:cookie}});
  const d=await(await req('/api/catalogue/moulds')).json();assert.equal(d.tableBaseRevision,'P97');assert.equal(d.tableWeldRevision,'P93');assert.equal(d.setups.length,44);assert.equal(d.productionReleased,false);
  const selected=d.setups.filter(s=>s.tableBaseFiles.length),files=selected.flatMap(s=>s.tableBaseFiles);assert.equal(selected.length,9);assert.equal(files.length,45);assert.ok(selected.every(s=>s.presentation&&s.tableWeldFiles.length===5));
  for(const a of files){const r=await req(a.href+'?download=1');assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('content-type'),a.contentType);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,a.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);if(a.filename.endsWith('.csv'))assert.equal(b.toString('utf8').trim().split('\n').length,53);}
  const one=files.find(f=>f.filename==='F2660.json');member={...active(),artifactIds:[one.id]};const only=await(await req('/api/catalogue/moulds')).json();assert.equal(only.setups.length,1);const s=only.setups[0];assert.deepEqual(s.tableBaseFiles.map(a=>a.id),[one.id]);assert.equal(s.tableWeldFiles.length,0);assert.equal(s.presentation,null);assert.equal(s.closureReview,null);assert.equal(s.files.length,0);assert.equal(s.developmentFiles.length,0);
  const other=files.find(f=>f.filename==='F2660.json'&&f.id!==one.id);assert.equal((await req(other.href)).status,403);member={...active(),canReadEngineering:false};assert.equal((await req(one.href)).status,403);member=active();
  for(const p of ['/output/table-lock-base-p97/F2660.json','/output/table-lock-base-p97/DETAIL_TH.md'])assert.equal((await req(p)).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
