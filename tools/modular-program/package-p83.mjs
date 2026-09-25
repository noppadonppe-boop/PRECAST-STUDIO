import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {chromium} from '@playwright/test';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const dir='output/wall-frame-p83',browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve(dir,'index.html')).href);
 assert.equal(await page.locator('details').count(),12);
 for(const img of await page.locator('img').all())await img.evaluate(async e=>{await e.decode();if(e.naturalWidth!==1800||e.naturalHeight!==1600)throw Error('Unexpected board dimensions');});
 const links=await page.locator('a[download]').evaluateAll(as=>as.map(a=>a.getAttribute('href')));assert.equal(links.length,62);for(const href of links)assert.ok(fs.existsSync(path.join(dir,href)));
 await page.locator('details').first().evaluate(e=>e.open=true);await page.screenshot({path:dir+'/report-preview.png'});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 fs.writeFileSync(dir+'/browser-audit.json',JSON.stringify({imagesDecoded:12,downloadFilesPresent:62,mobileViewportWidth:390,pageOverflow:false,pageErrors:errors,visualReview:['D-LH-W01-M01-board.png','A-LH-W01-M03-board.png']},null,2));
}finally{await browser.close();}
const out='output/stage5-update-p83';fs.mkdirSync(out,{recursive:true});fs.cpSync(dir,out+'/wall-frame-p83',{recursive:true});fs.mkdirSync(out+'/source-scripts',{recursive:true});
for(const s of ['gusset_mesh_p83.py','wall_frame_p83.py','run_wall_frame_p83.py','wall-frame-p83.test.mjs','wall-frame-report-p83.mjs','package-p83.mjs','window_shell_p82.py'])fs.copyFileSync('tools/modular-program/'+s,out+'/source-scripts/'+s);
fs.copyFileSync('knowledge/modular-program-r02/STAGE5_CONTINUATION_P83.md',out+'/KNOWLEDGE.md');
fs.writeFileSync(out+'/test-results.txt',execFileSync(process.execPath,['--test','tools/modular-program/wall-frame-p83.test.mjs'],{encoding:'utf8'}));
fs.writeFileSync(out+'/README.md','# P83 — Flexible wall frame and gussets\n\nOpen wall-frame-p83/index.html. 12 panels,36 mesh runs,12 PNG/SVG analysis boards and24 foot-reaction groups. Geometry from P66/P67/P80. Gusset bottoms are prescribed rigid: this is NOT an assembled mould/floor/bolt capacity check. All engineering/production flags remain false. Stage5 is still in progress. Concrete-lifting development assumption P52 is unchanged.\n\nScripts require the existing project source inputs and local OpenSees runtime; runtime binaries and private source standards are not redistributed. Included result JSONs retain input hashes and model basis. The catalogue default gallery is unchanged.\n');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]),files=walk(out).filter(p=>path.basename(p)!=='manifest.json').map(p=>({path:path.relative(out,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
fs.writeFileSync(out+'/manifest.json',JSON.stringify({revision:'P83',stageComplete:false,engineeringApproved:false,productionReleased:false,files},null,2));console.log({files:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0)});
