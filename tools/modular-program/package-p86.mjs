import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {chromium} from '@playwright/test';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const dir='output/foot-flex-p86',browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const p=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve(dir,'index.html')).href);assert.equal(await p.locator('details').count(),24);
 for(const img of await p.locator('img').all())await img.evaluate(async e=>{await e.decode();if(e.naturalWidth!==1650||e.naturalHeight!==1180)throw Error('Unexpected image');});
 const links=await p.locator('a[download]').evaluateAll(as=>as.map(a=>a.getAttribute('href')));assert.equal(links.length,108);for(const l of links)assert.ok(fs.existsSync(path.join(dir,l)));
 await p.locator('details').first().evaluate(e=>e.open=true);await p.screenshot({path:dir+'/report-preview.png'});
 await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 fs.writeFileSync(dir+'/browser-audit.json',JSON.stringify({imagesDecoded:24,downloadsPresent:108,mobileOverflow:false,pageErrors:errors},null,2));
}finally{await browser.close();}
const out='output/stage5-update-p86';fs.mkdirSync(out,{recursive:true});fs.cpSync(dir,out+'/foot-flex-p86',{recursive:true});fs.mkdirSync(out+'/source-scripts',{recursive:true});
for(const s of ['foot_mesh_p86.py','foot_flex_p86.py','foot_flex_bench_p86.py','plate_bench_p86.py','run_foot_flex_p86.py','refine_foot_flex_p86.py','foot-flex-audit-p86.mjs','foot-flex-report-p86.mjs','foot-flex-p86.test.mjs','package-p86.mjs'])fs.copyFileSync('tools/modular-program/'+s,out+'/source-scripts/'+s);
fs.copyFileSync('knowledge/modular-program-r02/STAGE5_CONTINUATION_P86.md',out+'/KNOWLEDGE.md');
fs.writeFileSync(out+'/test-results.txt',execFileSync(process.execPath,['--test','tools/modular-program/foot-flex-p86.test.mjs'],{encoding:'utf8'}));
fs.writeFileSync(out+'/README.md','# P86 — Flexible-foot analysis supplement\n\nOpen foot-flex-p86/index.html. 24 W01 foot groups,56 mesh runs,24 boards. Physical plate geometry stays30mm; rigid-limit300mm probe is NOT a design change. Full result provenance, forces, displacement, equilibrium and refinement audit included.\n\nThis is an elastic one-way wall-to-foot analysis at one contact/bolt stiffness case. It does not establish steel/bolt/thread/weld/rigging/floor capacity or full coupled-mould stability. Stage5 remains incomplete. Original gallery unchanged; no Stage6. Scripts require the existing project source models, helper modules, runtime and dependencies. Concrete lifting development assumption P52 is unchanged.\n');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(out).filter(p=>path.basename(p)!=='manifest.json').map(p=>({path:path.relative(out,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
fs.writeFileSync(out+'/manifest.json',JSON.stringify({revision:'P86',stageComplete:false,engineeringApproved:false,productionReleased:false,files},null,2));console.log({files:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0)});
