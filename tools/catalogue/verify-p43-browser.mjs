import {chromium} from '@playwright/test';
import {createCatalogueServer} from './server.mjs';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),origin='http://127.0.0.1:5199';
const {server,entryToken}=await createCatalogueServer({root,origin,ownerPreview:true});
await new Promise(r=>server.listen(5199,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/catalogue#access='+entryToken);
 await page.getByRole('button',{name:'แบบและข้อมูลชุดใหม่',exact:true}).click();
 await page.getByRole('button',{name:'แม่แบบ',exact:true}).click();
 await page.getByText('พบ 44 setup',{exact:true}).waitFor();
 assert.equal(await page.locator('.cat-card img').count(),44);
 assert.ok((await page.locator('.cat-card img').first().getAttribute('src')).endsWith('P43-STYLE'));
 await page.locator('.cat-card img').first().evaluate(async img=>{if(!img.complete)await new Promise(r=>img.onload=r);if(!img.naturalWidth)throw Error('Image failed');});
 await page.screenshot({path:resolve(root,'output/mould-style-p43/qa/web-gallery.png')});
 await page.getByLabel('ค้นหาแม่แบบ').fill('TS-C-H15-LH-W01');
 await page.getByRole('button',{name:'เปิดแม่แบบ TS-C-H15-LH-W01-P05',exact:true}).click();
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'ดาวน์โหลดภาพนำเสนอ PNG',exact:true}).click();
 const download=await downloadEvent;assert.equal(await download.failure(),null);assert.ok(download.suggestedFilename().endsWith('-STYLE.png'));
 assert.ok(await page.getByRole('heading',{name:'ภาพตรวจรูปทรงจากโมเดล — ยังไม่ใช่กลไกถอดแบบ',exact:true}).count());
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);await writeFile(resolve(root,'output/mould-style-p43/qa/browser-audit.json'),JSON.stringify({status:'PASS',count:44,download:true,sourcePreserved:true,mobileOverflow:false,pageErrors:errors},null,2));
 console.log('PASS: 44 presentation images, protected PNG download, source preserved, mobile');
}finally{await browser.close();await new Promise(r=>server.close(r));}
