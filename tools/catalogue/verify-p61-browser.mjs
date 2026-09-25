import {chromium} from '@playwright/test';
import {createCatalogueServer} from './server.mjs';
import {resolve} from 'node:path';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),origin='http://127.0.0.1:5199',out=resolve(root,'output/stage5-library-p61/qa');
await mkdir(out,{recursive:true});
const {server,entryToken}=await createCatalogueServer({root,origin,ownerPreview:true});await new Promise(r=>server.listen(5199,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const denied=await ctx.request.get(origin+'/api/catalogue/moulds/artifacts/MF-C-H15-LH-W01-P05-P38-P61-DEV-04');assert.equal(denied.status(),401);
 await page.goto(origin+'/catalogue#access='+entryToken);
 await page.getByRole('button',{name:'แบบและข้อมูลชุดใหม่',exact:true}).click();await page.getByRole('button',{name:'แม่แบบ',exact:true}).click();
 await page.getByText('พบ 44 setup',{exact:true}).waitFor();assert.equal(await page.locator('.cat-card img').count(),44);
 assert.ok(await page.getByText(/มีอุปกรณ์ระดับพัฒนา 32 ชุด/).count());
 const data=await (await ctx.request.get(origin+'/api/catalogue/moulds')).json();assert.equal(data.developmentRevision,'P61');
 async function select(id){const back=page.getByRole('button',{name:'← กลับชุดแม่แบบ',exact:true});if(await back.count())await back.click();await page.getByLabel('ค้นหาแม่แบบ').fill(id);await page.locator('.cat-card .cat-board').click();}
 for(const id of ['MF-C-H15-LH-W01-P05-P38','MF-N90-CS1-P33-P38','MF-A-H15-LH-W01-P08-P38','MF-A-EPX-D01-P28-P38','MF-N90-NF01-N01-P18-P38']){
  await select(id);const s=data.setups.find(s=>s.id===id);const h=page.getByRole('heading',{name:'P61 — รวมแบบแม่แบบเหล็กและผลตรวจที่จัดทำแล้ว',exact:true});await h.scrollIntoViewIfNeeded();
  for(const a of s.developmentFiles.filter(a=>a.filename.endsWith('.png'))){const img=page.getByRole('img',{name:s.typicalId+' '+a.filename,exact:true});await img.scrollIntoViewIfNeeded();await img.evaluate(async e=>{if(!e.complete)await new Promise((r,j)=>{e.onload=r;e.onerror=j;});if(!e.naturalWidth)throw Error('Image not loaded');});}
  if(s.sourceRevision==='P56')assert.ok(await page.getByText(/ต้องแปลงและตรวจตำแหน่งยกใหม่/).count());
  if(s.sourceRevision==='P60')assert.ok(await page.getByText(/ผิวแบบและแรงดันเท่านั้น/).count());
  if(s.sourceRevision==='P59'){assert.ok(await page.getByText('ประวัติข้อมูลพัฒนาเดิม — ไม่ใช่ผลตรวจรุ่นปัจจุบัน',{exact:true}).count());const a=s.developmentFiles.find(a=>a.filename.endsWith('.csv'));const dp=page.waitForEvent('download');await page.getByRole('button',{name:a.filename+' · '+a.id.split('-').at(-1),exact:true}).click();assert.equal(await (await dp).failure(),null);}
  await h.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,s.sourceRevision+'-desktop.png')});
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('heading',{name:'P61 — รวมแบบแม่แบบเหล็กและผลตรวจที่จัดทำแล้ว',exact:true}).scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(out,'mobile.png')});
 const old=await ctx.request.get(origin+'/api/catalogue/moulds/artifacts/MF-C-H15-LH-W01-P05-P38-P53-DEV-01');assert.equal(old.status(),200);
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'browser-audit.json'),JSON.stringify({status:'PASS',setups:44,hardwareDevelopmentSetups:32,contactOnly:12,checkedRevisions:['P54','P56','P58','P59','P60'],csvDownload:true,anonymousDenied:true,historicalDownload:true,mobileOverflow:false,pageErrors:errors},null,2));console.log('PASS P61 browser: five revisions / current and historical downloads / private ACL / mobile');
}finally{await browser.close();await new Promise(r=>server.close(r));}
