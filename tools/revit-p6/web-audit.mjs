import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createCatalogueServer} from '../catalogue/server.mjs';
const root=resolve(import.meta.dirname,'../..'),origin='http://127.0.0.1:5199';
const manifest=JSON.parse(await readFile(resolve(root,'output/revit-p6/delivery-manifest.json'),'utf8'));
assert.equal(manifest.products.length,48);
let member={name:'Stage 6 local QA',anonymous:false,orgActive:true,projectActive:true,canRead:true,canReadEngineering:true,artifactIds:'*',expiresAt:Date.now()+3600000};
const {server}=await createCatalogueServer({root,origin,identityAdapter:{signIn:async()=>'local-qa',resolve:async()=>member}});
await new Promise(r=>server.listen(5199,'127.0.0.1',r));
try {
 const login=await fetch(origin+'/api/catalogue/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"idToken":"local-qa"}'});
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const req=path=>fetch(origin+path,{headers:{Cookie:cookie}});
 const meta=await (await req('/api/catalogue/current')).json();
 assert.equal(meta.nativeFileCount,48);
 assert.equal(meta.products.filter(p=>p.revitDelivery?.files.length===10).length,48);
 const files=[...manifest.products.flatMap(p=>p.files),manifest.sharedLibrary];
 const verified=[];
 for(const f of files){const r=await req('/api/catalogue/current/artifacts/'+f.id);assert.equal(r.status,200,f.id);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);verified.push(f.id);}
 assert.equal((await fetch(origin+'/api/catalogue/current')).status,401);
 member={...member,canReadEngineering:false};
 const denied=await (await req('/api/catalogue/current')).json();assert.equal(denied.nativeFileCount,0);
 for(const f of [files[0],manifest.sharedLibrary])assert.equal((await req('/api/catalogue/current/artifacts/'+f.id)).status,403);
 const report={revision:'P102',status:'PASS',nativePackages:48,artifactDownloads:verified.length,anonymousDenied:true,engineeringCapabilityEnforced:true,manifestSha256:createHash('sha256').update(await readFile(resolve(root,'output/revit-p6/delivery-manifest.json'))).digest('hex'),verified};
 await writeFile(resolve(root,'output/revit-p6/web-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',nativePackages:48,artifactDownloads:verified.length}));
}finally{await new Promise(r=>server.close(r));}
