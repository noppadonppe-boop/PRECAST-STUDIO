import {chromium} from '@playwright/test';
import {createCatalogueServer} from './server.mjs';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/stage5-browser-p38r1'),origin='http://127.0.0.1:5196';await mkdir(out,{recursive:true});
const {server,entryToken}=await createCatalogueServer({root,origin,ownerPreview:true});await new Promise(r=>server.listen(5196,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/catalogue#access='+entryToken);await page.getByText('พบ 48 แบบ',{exact:true}).waitFor();
 await page.getByRole('button',{name:'แม่แบบ',exact:true}).click();await page.getByText('พบ 44 setup',{exact:true}).waitFor();
 await page.getByLabel('ค้นหาแม่แบบ').fill('TS-C-H15-LH-W01');await page.getByText('พบ 1 setup',{exact:true}).waitFor();await page.getByRole('button',{name:'เปิดแม่แบบ TS-C-H15-LH-W01-P05',exact:true}).click();
 await page.getByRole('heading',{name:'ภาพตรวจรูปทรงจากโมเดล — ยังไม่ใช่กลไกถอดแบบ',exact:true}).waitFor();
 const img=page.locator('.cat-full-board img').first();await img.evaluate(async i=>{if(!i.complete)await new Promise(r=>i.addEventListener('load',r,{once:true}));if(!i.naturalWidth)throw Error('Image failed');});
 await page.screenshot({path:resolve(out,'desktop-corrected.png')});
 const wait=page.waitForEvent('download');await page.getByRole('button',{name:'03-GEOMETRY-REVIEW.png',exact:true}).click();const download=await wait;assert.equal(await download.failure(),null);
 assert.equal(await page.getByRole('button',{name:'03-CONCEPT.png',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'02-TOOLING.png',exact:true}).count(),0);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(out,'mobile-corrected.png')});
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'audit.json'),JSON.stringify({status:'PASS',checks:['44 setups','new board shown','withdrawn images absent','PNG download hash verified by UI','mobile no page overflow'],pageErrors:errors,credentialsRecorded:false},null,2));console.log('PASS P38-R1 browser');
}finally{await browser.close();await new Promise(r=>server.close(r));}
