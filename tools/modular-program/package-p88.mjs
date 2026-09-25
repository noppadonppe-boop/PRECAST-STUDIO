import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {sha} from './bolt-screen-p88.mjs';
const out='output/stage5-update-p88';fs.mkdirSync(out,{recursive:true});
const files=['knowledge/modular-program-current.json','knowledge/modular-program-r02/STAGE5_CONTINUATION_P88.md','output/stage5-library-p88/register.json',
 'tools/modular-program/bolt-screen-p88.mjs','tools/modular-program/bolt-screen-p88.test.mjs','tools/modular-program/bolt-screen-report-p88.mjs','tools/modular-program/catalogue-supplement-p88.mjs','tools/modular-program/package-p88.mjs',
 'tools/catalogue/verify-p88-browser.mjs','tools/catalogue/mould-data.mjs','tools/catalogue/mould-review.test.mjs','apps/web/src/catalogue/MouldLibrary.tsx','apps/web/src/catalogue/mould.test.tsx'];
for(const p of files){const dest=path.join(out,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(p,dest);}
fs.cpSync('output/bolt-screen-p88',out+'/output/bolt-screen-p88',{recursive:true});
fs.cpSync('output/stage5-library-p88/qa',out+'/browser-qa',{recursive:true});
for(const [name,args] of [
 ['calculation-backend',['--test','tools/modular-program/bolt-screen-p88.test.mjs','tools/catalogue/mould-review.test.mjs','tools/catalogue/server.test.mjs','tools/catalogue/current.test.mjs']],
 ['frontend',['node_modules/vitest/vitest.mjs','run','--config','apps/web/vite.config.ts','apps/web/src/catalogue']],
 ['typecheck',['node_modules/typescript/bin/tsc','--noEmit','-p','apps/web/tsconfig.json']]
]){const p=spawnSync(process.execPath,args,{encoding:'utf8'});fs.writeFileSync(`${out}/${name}-tests.txt`,p.stdout+'\n'+p.stderr);if(p.status!==0)throw Error(name+' failed');}
fs.writeFileSync(out+'/README.md','# P88 - Conditional base fastener study\n\nOpen output/bolt-screen-p88/index.html for24boards and576arithmetic cases at96positions in24feet /6W01setups. This is NOT a complete connection, mould or production release. P85 geometry is unchanged.\n\nSource-controlled calculation/website supplement for the existing project. Earlier P85/P86 large native input files remain in the project and their issued archives; source hashes are retained. The public JRC reference PDF is not redistributed here; its official URL, DOI, page evidence and local checksum are in register.json. Catalogue files retain original-gallery defaults and server-side artifact permissions. No credentials or server-private logs. Stage5 remains incomplete under P40; no Stage6/7 work.\n');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const entries=walk(out).filter(p=>path.basename(p)!=='manifest.json').map(p=>({path:path.relative(out,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:sha(p)}));
if(entries.some(p=>/server-private|\.pdf$/.test(p.path)))throw Error('Unintended source/private runtime file');
fs.writeFileSync(out+'/manifest.json',JSON.stringify({revision:'P88',stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false,files:entries},null,2));console.log({files:entries.length,bytes:entries.reduce((s,f)=>s+f.bytes,0)});
