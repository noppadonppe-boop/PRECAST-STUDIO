import {chromium} from '@playwright/test';
import {createCatalogueServer} from './server.mjs';
import {resolve} from 'node:path';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),origin='http://127.0.0.1:5199',out=resolve(root,'output/stage5-library-p53/qa');
await mkdir(out,{recursive:true});
const {server,entryToken}=await createCatalogueServer({root,origin,ownerPreview:true});await new Promise(r=>server.listen(5199,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const anonymous=await ctx.request.get(origin+'/api/catalogue/moulds/artifacts/MF-C-H15-LH-W01-P05-P38-P52-LIFT-PNG');assert.equal(anonymous.status(),401);
 await page.goto(origin+'/catalogue#access='+entryToken);
 await page.getByRole('button',{name:'แบบและข้อมูลชุดใหม่',exact:true}).click();await page.getByRole('button',{name:'แม่แบบ',exact:true}).click();
 await page.getByText('พบ 44 setup',{exact:true}).waitFor();assert.equal(await page.locator('.cat-card img').count(),44);
 await page.getByLabel('ค้นหาแม่แบบ').fill('TS-C-H15-LH-W01');await page.getByRole('button',{name:'เปิดแม่แบบ TS-C-H15-LH-W01-P05',exact:true}).click();
 const heading=page.getByRole('heading',{name:'P52 — โซนยกและแนวเหล็กคอนกรีต',exact:true});await heading.scrollIntoViewIfNeeded();
 const img=page.locator('img[alt="TS-C-H15-LH-W01-P05 โซนยกและแนวเหล็ก P52"]');await img.evaluate(async a=>{if(!a.complete)await new Promise((res,rej)=>{a.onload=res;a.onerror=rej;});if(!a.naturalWidth)throw Error('P52 not loaded');});
 await page.screenshot({path:resolve(out,'lifting-desktop.png')});
 for(const ext of ['PNG','SVG','JSON']){const promise=page.waitForEvent('download');await page.getByRole('button',{name:'ดาวน์โหลด P52 '+ext,exact:true}).click();const download=await promise;assert.equal(await download.failure(),null);assert.ok(download.suggestedFilename().endsWith('.'+ext.toLowerCase()));}
 await page.getByRole('heading',{name:'P53 — รวมแบบแม่แบบเหล็กและผลตรวจที่จัดทำแล้ว',exact:true}).scrollIntoViewIfNeeded();assert.ok(await page.getByRole('heading',{name:'01-ASSEMBLY.png',exact:true}).count());
 await page.setViewportSize({width:390,height:844});await heading.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(out,'lifting-mobile.png')});
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'browser-audit.json'),JSON.stringify({status:'PASS',gallerySetups:44,liftingDownloads:['PNG','SVG','JSON'],anonymousDenied:true,hardwarePilotVisible:true,legacyGalleryPreserved:true,mobileOverflow:false,pageErrors:errors},null,2));console.log('PASS P53: protected lifting downloads + P41 hardware + mobile + legacy gallery retained');
}finally{await browser.close();await new Promise(r=>server.close(r));}
