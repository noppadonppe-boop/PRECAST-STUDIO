import {chromium} from '@playwright/test';import {createCatalogueServer} from './server.mjs';import {resolve} from 'node:path';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),origin='http://127.0.0.1:5199',out=resolve(root,'output/stage5-library-p88/qa');await mkdir(out,{recursive:true});
const {server,entryToken}=await createCatalogueServer({root,origin,ownerPreview:true});await new Promise(r=>server.listen(5199,'127.0.0.1',r));const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 assert.equal((await ctx.request.get(origin+'/api/catalogue/moulds')).status(),401);
 await page.goto(origin+'/catalogue#access='+entryToken);
 assert.equal(await page.getByRole('button',{name:'ภาพชุดเดิม',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'แบบและข้อมูลชุดใหม่',exact:true}).click();await page.getByRole('button',{name:'แม่แบบ',exact:true}).click();await page.getByText('พบ 44 setup',{exact:true}).waitFor();
 const data=await(await ctx.request.get(origin+'/api/catalogue/moulds')).json();assert.equal(data.supplementRevision,'P88');assert.equal(data.engineeringApproved,false);assert.equal(data.productionReleased,false);
 let images=0,downloads=0;const setups=[];
 for(const family of ['A','B','D'])for(const side of ['LH','RH']){
  const back=page.getByRole('button',{name:'← กลับชุดแม่แบบ',exact:true});if(await back.count())await back.click();
  const id=`MF-${family}-H15-${side}-W01-P08-P38`;await page.getByLabel('ค้นหาแม่แบบ').fill(id);await page.locator('.cat-card .cat-board').click();const s=data.setups.find(s=>s.id===id);
  const g=s.supplementGroups.find(g=>g.revision==='P88'),detail=page.locator('details').filter({has:page.locator('summary').filter({hasText:'P88 — '+g.label})});
  await detail.evaluate(e=>e.open=true);await detail.scrollIntoViewIfNeeded();
  for(const img of await detail.getByRole('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(async e=>{await e.decode();if(!e.naturalWidth)throw Error('Empty image');});images++;}
  const csv=g.files.find(f=>f.filename.endsWith('.csv')),download=page.waitForEvent('download');await page.getByRole('button',{name:'P88 · '+csv.filename,exact:true}).click();assert.equal(await(await download).failure(),null);downloads++;
  await detail.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${family}-${side}-desktop.png`)});setups.push(id);
 }
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(out,'mobile.png')});assert.deepEqual(errors,[]);
 // Newly read public reference is never a raw/private-file endpoint.
 assert.equal((await ctx.request.get(origin+'/knowledge/modular-program-r02/references/JRC96658-2015.pdf')).status(),404);
 await writeFile(resolve(out,'audit.json'),JSON.stringify({revision:'P88',setups,decodedNewImages:images,csvDownloads:downloads,anonymousStatus:401,originalGalleryDefault:true,mobileOverflow:false,pageErrors:errors,sourcePdfRouteStatus:404},null,2));console.log({images,downloads,setups:setups.length});
}finally{await browser.close();await new Promise(r=>server.close(r));}
