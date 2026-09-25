import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {createCatalogueServer} from './server.mjs';
const root=resolve(import.meta.dirname,'../..');
test('P93 all45 references preserve existing files, individual ACL and protected downloads',async()=>{
 const origin='http://127.0.0.1:5213',active=()=>({name:'P93 fixture',anonymous:false,orgActive:true,projectActive:true,canRead:true,canReadEngineering:true,artifactIds:'*',expiresAt:Date.now()+3600000});let member=active();
 const {server}=await createCatalogueServer({root,origin,identityAdapter:{signIn:async()=>'fixture',resolve:async()=>member}});await new Promise(r=>server.listen(5213,'127.0.0.1',r));
 try{
  assert.equal((await fetch(origin+'/api/catalogue/moulds')).status,401);
  const login=await fetch(origin+'/api/catalogue/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"idToken":"fixture"}'}),cookie=login.headers.get('set-cookie').split(';')[0],req=p=>fetch(origin+p,{headers:{Cookie:cookie}});
  const d=await(await req('/api/catalogue/moulds')).json();assert.equal(d.tableWeldRevision,'P93');assert.equal(d.supplementRevision,'P92');assert.equal(d.setups.length,44);
  const selected=d.setups.filter(s=>s.tableWeldFiles.length),files=selected.flatMap(s=>s.tableWeldFiles);assert.equal(selected.length,9);assert.equal(files.length,45);assert.ok(selected.every(s=>s.presentation&&s.developmentFiles.length));
  for(const a of files){const r=await req(a.href+'?download=1');assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('content-type'),a.contentType);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,a.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);if(a.filename.endsWith('.csv')){const lines=b.toString('utf8').trim().split('\n');assert.equal(lines.length,145);assert.match(lines[0],/x_mm,y_mm/);}}
  const single=files.find(f=>f.filename==='F2660.json');member={...active(),artifactIds:[single.id]};const only=await(await req('/api/catalogue/moulds')).json();assert.equal(only.setups.length,1);const s=only.setups[0];assert.deepEqual(s.tableWeldFiles.map(a=>a.id),[single.id]);assert.equal(s.presentation,null);assert.equal(s.files.length,0);assert.equal(s.developmentFiles.length,0);assert.equal(s.liftingFiles.length,0);assert.equal(s.supplementGroups.length,0);assert.equal(s.closureReview,null);
  // Same underlying F2660 object mapped to another setup does not widen a per-artifact grant.
  const sameObject=files.find(f=>f.filename==='F2660.json'&&f.id!==single.id);assert.equal((await req(sameObject.href)).status,403);
  member={...active(),canReadEngineering:false};assert.equal((await req(single.href)).status,403);member=active();
  for(const path of ['/output/table-weld-p93/F2660.json','/output/table-weld-p93/DETAIL_TH.md','/output/table-weld-p93/source-review/jrc-115.png'])assert.equal((await req(path)).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
