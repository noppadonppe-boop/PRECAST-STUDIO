import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdtemp,mkdir,cp,writeFile} from 'node:fs/promises';
import {tmpdir,homedir} from 'node:os';
import {resolve,isAbsolute,join} from 'node:path';
import {loadCurrentCatalogue} from './current-data.mjs';
import {createCatalogueServer,allowed} from './server.mjs';
const root=resolve(import.meta.dirname,'../..'),origin='http://127.0.0.1:5198';
let current,server,cookie,member;
const active=()=>({name:'QA',anonymous:false,orgActive:true,projectActive:true,canRead:true,canReadEngineering:true,artifactIds:'*',expiresAt:Date.now()+3600000});
const req=(p,auth=true)=>fetch(origin+p,{headers:auth?{Cookie:cookie}:{}});
before(async()=>{
 current=await loadCurrentCatalogue(root);member=active();
 ({server}=await createCatalogueServer({root,origin,identityAdapter:{signIn:async()=> 'test',resolve:async()=>member}}));
 await new Promise(r=>server.listen(5198,'127.0.0.1',r));
 const r=await fetch(origin+'/api/catalogue/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"idToken":"test"}'});
 cookie=r.headers.get('set-cookie').split(';')[0];
});
after(async()=>{await new Promise(r=>server.close(r));});
test('current data preserves 48 designs and registers all P150 starter packages without analysis claims',async()=>{
 const d=await current.view(active(),allowed);assert.equal(d.products.length,48);assert.equal(d.typical.length,44);
 assert.equal([...current.artifacts.keys()].filter(id=>!id.includes('-P6-')&&!id.includes('-ARC-')&&!id.includes('-P150-')&&!id.startsWith('P150-')).length,474);
 assert.equal([...current.artifacts.keys()].filter(id=>id.includes('-P150-')).length,288);assert.equal([...current.artifacts.keys()].filter(id=>id.startsWith('P150-')).length,4);
 assert.equal(d.products.flatMap(p=>p.slots).length,96);assert.equal(d.nativeFileCount,d.products.filter(p=>p.revitDelivery?.files.some(f=>f.kind==='RVT')).length);assert.equal(d.status,'CURRENT_DEVELOPMENT');
 assert.equal(d.stage7Complete,true);assert.equal(d.starterFileCount,48);assert.equal(d.analysedProductCount,0);assert.equal(d.rcDesignedProductCount,0);
 for(const p of d.products){
  assert.equal(p.sheets.length,3);assert.equal(p.bom.reduce((s,b)=>s+b.quantity,0),p.pieceCount);assert.ok(Math.abs(p.bom.reduce((s,b)=>s+b.totalConcreteMassKg,0)-p.mass.knownConcreteKg)<.001);
  const std=p.slots.find(s=>s.kind==='STD');assert.equal(std.intakeStatus,'AVAILABLE');assert.equal(std.artifactStatus,'LIBRARY_READY_STARTER');assert.equal(std.nativeValidationStatus,'NOT_RUN_BY_CURRENT_SCOPE');assert.equal(std.analysisStatus,'NOT_RUN');assert.equal(std.designStatus,'NOT_RUN');assert.equal(std.engineerReviewStatus,'REQUIRED_BEFORE_RUN');assert.equal(std.engineeringApproved,false);assert.equal(std.productionReleased,false);
  assert.equal(p.staadDelivery.files.length,6);assert.deepEqual(new Set(p.staadDelivery.files.map(f=>f.kind)),new Set(['STD','JSON','MD','ZIP']));
  const r=p.slots.find(s=>s.kind==='RVT');if(p.revitDelivery?.files.some(f=>f.kind==='RVT')){assert.equal(r.intakeStatus,'AVAILABLE');assert.equal(r.nativeValidationStatus,'VALIDATED_REVIT_2026');}else{assert.equal(r.intakeStatus,'NOT_CREATED');}assert.equal(p.engineeringApproved,false);assert.equal(p.productionReleased,false);
 }
 for(const f of ['A','B','C','D'])assert.equal(d.products.filter(p=>p.family===f).length,12);
 for(const u of [1,2,3,4])assert.equal(d.products.filter(p=>p.use===u).length,12);
 for(const t of d.typical)assert.ok(t.usedBy.every(id=>d.products.some(p=>p.id===id&&p.bom.some(b=>b.typicalId===t.id))));
 assert.ok(!JSON.stringify(d).includes(root));assert.ok(!JSON.stringify(d).includes('output/'));
});
test('anonymous cannot retrieve current metadata, drawings, models or bundles',async()=>{
 for(const p of ['/api/catalogue/current','/api/catalogue/current/artifacts/PM-I-A1-P36-01-PLAN-3D-PNG','/api/catalogue/current/artifacts/PM-STAGE3-P36-ZIP'])assert.equal((await req(p,false)).status,401);
});

test('ARC is separate from structural delivery and retains private artifact controls',async()=>{try{
 const d=await current.view(active(),allowed);const pilot=d.products.find(p=>p.id==='PM-I-B3');
 assert.ok(pilot.arcDelivery.files.some(f=>f.kind==='RVT'));
 assert.ok(pilot.arcDelivery.files.some(f=>f.kind==='ZIP'));
 assert.ok(pilot.revitDelivery.files.some(f=>f.kind==='RVT'));
 const ids=new Set(pilot.revitDelivery.files.map(f=>f.id));assert.ok(pilot.arcDelivery.files.every(f=>!ids.has(f.id)));
 for(const a of pilot.arcDelivery.files)assert.equal((await req(a.href,false)).status,401);
 member={...active(),canReadEngineering:false};
 const hidden=await (await req('/api/catalogue/current')).json();assert.ok(hidden.products.every(p=>!p.arcDelivery?.files.length));
 for(const a of pilot.arcDelivery.files)assert.equal((await req(a.href)).status,403);
 member={...active(),artifactIds:[pilot.sheets[0].png.id]};
 for(const a of pilot.arcDelivery.files)assert.equal((await req(a.href)).status,403);
 }finally{member=active();}
});
test('all P150 artifacts and representative legacy artifacts download with matching bytes, hash and content type',async()=>{
 const selected=[...current.artifacts.values()].filter(a=>a.id.includes('-P150-')||a.id.startsWith('P150-')||['PM-I-A1-P36-01-PLAN-3D-PNG','PM-I-A1-P36-01-PLAN-3D-SVG','PM-I-A1-P36-MODEL-JSON','PM-STAGE3-P36-ZIP'].includes(a.id));
 assert.equal(selected.filter(a=>a.id.includes('-P150-')).length,288);assert.equal(selected.filter(a=>a.id.startsWith('P150-')).length,4);
 for(const a of selected){
  const r=await req(a.href+'?download=1');assert.equal(r.status,200,a.id);assert.equal(r.headers.get('content-type'),a.contentType);assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.match(r.headers.get('cache-control'),/no-store/);
  const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,a.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);
  if(a.contentType==='application/json'){const j=JSON.parse(b.toString());assert.ok(j.id||j.productId);}
  if(a.contentType==='image/png')assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  if(a.contentType==='image/svg+xml')assert.match(r.headers.get('content-security-policy'),/sandbox/);
 }
});
test('engineering capability protects JSON, schedules and ZIP in metadata and direct endpoints',async()=>{
 member={...active(),canReadEngineering:false};const d=await (await req('/api/catalogue/current')).json();
 assert.equal(d.products.length,48);assert.equal(d.bundles.length,0);assert.ok(d.products.every(p=>p.modelArtifact===null&&p.scheduleArtifact===null));
 assert.equal(d.nativeFileCount,0);assert.equal(d.starterFileCount,0);assert.equal(d.stage7Complete,false);assert.ok(d.products.every(p=>!p.revitDelivery?.files.length&&!p.staadDelivery?.files.length));
 for(const a of current.artifacts.values())if(a.id.includes('-P6-')||a.id.includes('-P150-')||a.id.startsWith('P150-'))assert.equal((await req(a.href)).status,403);
 for(const id of ['PM-I-A1-P36-MODEL-JSON','PM-I-A1-P36-SCHEDULE-MD','PM-STAGE3-P36-ZIP'])assert.equal((await req('/api/catalogue/current/artifacts/'+id)).status,403);
 member=active();
});
test('restricted artifact ACL cannot leak other designs or bulk ZIP',async()=>{
 const id='PM-I-A1-P36-01-PLAN-3D-PNG';member={...active(),artifactIds:[id,'PM-STAGE3-P36-ZIP']};
 const d=await (await req('/api/catalogue/current')).json();assert.equal(d.products.length,1);assert.equal(d.products[0].sheets.length,1);assert.equal(d.products[0].sheets[0].svg,null);assert.equal(d.typical.length,0);assert.equal(d.bundles.length,0);
 assert.equal((await req('/api/catalogue/current/artifacts/PM-STAGE3-P36-ZIP')).status,403);member=active();
});
test('revocation is enforced without waiting for browser refresh',async()=>{
 member={...active(),projectActive:false};assert.equal((await req('/api/catalogue/current')).status,401);assert.equal((await req('/api/catalogue/current/artifacts/PM-I-A1-P36-01-PLAN-3D-PNG')).status,401);member=active();
});
test('arbitrary file routes, unknown ID and mutation denied',async()=>{
 assert.equal((await req('/api/catalogue/current/artifacts/UNKNOWN')).status,404);
 for(const p of ['/output/stage3-designs-p36/I-A1/model.json','/@fs/E:/secret','/data/modular-program/r02/file-slots-a01.json'])assert.equal((await req(p)).status,404);
 assert.equal((await fetch(origin+'/api/catalogue/current',{method:'POST',headers:{Origin:origin,Cookie:cookie}})).status,405);
});
test('stale source and changed artifact are fail-closed in isolated temporary fixture',async()=>{
 const dir=await mkdtemp(resolve(tmpdir(),'pm-p37-test-'));
 const deps=JSON.parse(await readFile(resolve(root,'output/stage3-designs-p36/dependencies.json'),'utf8'));
 const originalStaadRoot=resolve(process.env.PM_STAAD_STARTER_ROOT||join(process.env.LOCALAPPDATA||join(homedir(),'AppData','Local'),'Precast-Module','private','staad-starter-p150'));
 const fixtureStaadRoot=resolve(dir,'private-staad');await cp(originalStaadRoot,fixtureStaadRoot,{recursive:true});
 const staadIndex=JSON.parse(await readFile(resolve(originalStaadRoot,'library-index.json'),'utf8'));
 const staadSources=[];for(const p of staadIndex.products){const m=JSON.parse(await readFile(resolve(originalStaadRoot,p.productId,'manifest.json'),'utf8'));staadSources.push(...m.sourceRevisions.map(s=>s.path));}
 const paths=new Set([...deps.sources.map(s=>s.path),...staadSources,'output/stage3-designs-p36','output/stage2-review-p35','data/modular-program/r02/file-slots-a01.json',...Array.from(current.artifacts.values(),a=>a.path).filter(p=>!isAbsolute(p))]);
 const index=JSON.parse(await readFile(resolve(root,'output/stage2-review-p35/typical-index.json'),'utf8'));for(const t of index.entries)paths.add(t.source);
 for(const path of paths){await mkdir(resolve(dir,path,'..'),{recursive:true});await cp(resolve(root,path),resolve(dir,path),{recursive:true});}
 const previous=process.env.PM_STAAD_STARTER_ROOT;process.env.PM_STAAD_STARTER_ROOT=fixtureStaadRoot;let c;try{c=await loadCurrentCatalogue(dir);}finally{if(previous===undefined)delete process.env.PM_STAAD_STARTER_ROOT;else process.env.PM_STAAD_STARTER_ROOT=previous;}
 const a=c.artifacts.get('PM-I-A1-P36-01-PLAN-3D-PNG');await writeFile(resolve(dir,a.path),'corrupt');assert.equal(await c.readArtifact(a.id),null);
 await writeFile(resolve(dir,deps.sources[0].path),'{}');assert.equal(await c.stale(true),true);assert.equal((await c.view(active(),allowed)).status,'STALE');assert.equal(await c.readArtifact('PM-I-A1-P36-MODEL-JSON'),null);
 // Retained uniquely named temp fixture for inspection; no destructive workspace cleanup.
});
