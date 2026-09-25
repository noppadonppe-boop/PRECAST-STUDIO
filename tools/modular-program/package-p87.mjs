import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
const out='output/stage5-update-p87';fs.mkdirSync(out,{recursive:true});
const files=['output/stage5-library-p87/register.json','knowledge/modular-program-r02/STAGE5_CONTINUATION_P87.md','tools/modular-program/catalogue-supplement-p87.mjs','tools/modular-program/package-p87.mjs','tools/catalogue/mould-data.mjs','tools/catalogue/mould-review.test.mjs','tools/catalogue/verify-p87-browser.mjs','apps/web/src/catalogue/MouldLibrary.tsx','apps/web/src/catalogue/CurrentCatalogue.tsx','apps/web/src/catalogue/mould.test.tsx'];
for(const p of files){const dst=path.join(out,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(p,dst);}
fs.cpSync('output/stage5-library-p87/qa',out+'/browser-qa',{recursive:true});
for(const [label,args] of [
 ['backend',['--test','tools/catalogue/mould-review.test.mjs','tools/catalogue/server.test.mjs','tools/catalogue/current.test.mjs']],
 ['frontend',['node_modules/vitest/vitest.mjs','run','--config','apps/web/vite.config.ts','apps/web/src/catalogue']],
 ['typecheck',['node_modules/typescript/bin/tsc','--noEmit','-p','apps/web/tsconfig.json']]
]){const r=spawnSync(process.execPath,args,{encoding:'utf8'});fs.writeFileSync(out+'/'+label+'-tests.txt',r.stdout+'\n'+r.stderr);if(r.status!==0)throw Error(label+' failed');}
fs.writeFileSync(out+'/README.md','# P87 — Private catalogue update\n\n12 A/B/D setups receive current P85 + P71 + P74 + P80 geometry references;6 W01 setups receive P86 analysis results.494 supplemental artifact references including preserved history. Default original gallery is retained.\n\nThis is a source/metadata/QA supplement for the existing project, not a standalone deployment. Large source files remain in the project and P86 archive. No credentials or server-private logs are included. Never copy the whole live stage5-library-p87 directory into a public folder. No Firebase/public deployment or Stage6. Stage5 engineering/fabrication work remains incomplete.\n');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const manifest=walk(out).filter(p=>path.basename(p)!=='manifest.json').map(p=>({path:path.relative(out,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
if(manifest.some(f=>/server-private/.test(f.path)))throw Error('Private runtime log in package');
fs.writeFileSync(out+'/manifest.json',JSON.stringify({revision:'P87',stageComplete:false,engineeringApproved:false,productionReleased:false,files:manifest},null,2));console.log({files:manifest.length,bytes:manifest.reduce((s,f)=>s+f.bytes,0)});
