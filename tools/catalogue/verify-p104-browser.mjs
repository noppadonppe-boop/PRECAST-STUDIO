import {chromium} from '@playwright/test';
import {createCatalogueServer} from './server.mjs';
import {resolve} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const live=process.argv.includes('--live');
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/revit-p61-batch/'+(live?'web-live-review':'web-review'));
await mkdir(out,{recursive:true});
const origin=live?'http://127.0.0.1:5186':'http://127.0.0.1:5199';
let server,entryToken;
if(live){const log=await readFile(resolve(root,'output/revit-p61-batch/catalogue-live.log'),'utf8');entryToken=log.match(/#access=([^\s]+)/)?.[1];assert.ok(entryToken);}
else{({server,entryToken}=await createCatalogueServer({root,origin,ownerPreview:true}));await new Promise(r=>server.listen(5199,'127.0.0.1',r));}
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(60000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/catalogue#access='+entryToken);
 await page.getByRole('button',{name:'แบบและข้อมูลชุดใหม่',exact:true}).click();
 await page.getByText('พบ 48 แบบ',{exact:true}).waitFor();
 const res=await context.request.get(origin+'/api/catalogue/current');assert.equal(res.status(),200);
 const data=await res.json();assert.equal(data.products.length,48);
 for(const p of data.products){assert.ok(p.arcDelivery.files.some(f=>f.kind==='RVT'));assert.ok(p.arcDelivery.files.some(f=>f.kind==='ZIP'));assert.ok(p.revitDelivery.files.some(f=>f.kind==='RVT'));}
 checks.push('all48 separate ARC and STR deliveries');
 for(const code of ['I-B3','L-C2','U-D3']){
  await page.getByLabel('ค้นหาแบบหรือ Tag').fill(code);
  await page.getByRole('button',{name:'เปิด '+code,exact:true}).click();
  await page.getByRole('button',{name:'สถาปัตย์ ARC · 6.1',exact:true}).click();
  await page.getByRole('heading',{name:/ARC ขั้น 6.1/}).waitFor();
  await page.getByAltText('ภาพส่งออกจากโมเดล Revit').evaluate(async img=>{if(!img.complete)await new Promise((r,j)=>{img.onload=r;img.onerror=j;});if(!img.naturalWidth)throw Error('Image failed');});
  await page.screenshot({path:resolve(out,code+'-arc.png'),fullPage:true});
  const wait=page.waitForEvent('download');await page.getByRole('button',{name:/^ZIP ·/}).click();
  const download=await wait;assert.equal(await download.failure(),null);assert.ok(download.suggestedFilename().includes('ARC'));checks.push(code+' ARC visual and ZIP download');
  await page.getByRole('button',{name:'BIM / Engineering / แม่แบบ',exact:true}).click();
  await page.getByRole('heading',{name:/STR ขั้น 6/}).waitFor();checks.push(code+' original STR retained');
  await page.getByRole('button',{name:'← กลับรายการแบบ',exact:true}).click();
 }
 await page.getByRole('button',{name:'ภาพชุดเดิม',exact:true}).click();
 await page.screenshot({path:resolve(out,'legacy-gallery.png'),fullPage:false});checks.push('legacy gallery retained');
 await page.getByRole('button',{name:'แบบและข้อมูลชุดใหม่',exact:true}).click();
 await page.getByLabel('ค้นหาแบบหรือ Tag').fill('U-D3');await page.getByRole('button',{name:'เปิด U-D3',exact:true}).click();
 await page.getByRole('button',{name:'สถาปัตย์ ARC · 6.1',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'mobile-arc.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('mobile no page overflow');
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'browser-audit.json'),JSON.stringify({revision:'P104',status:'PASS',checks,pageErrors:errors,credentialsRecorded:false},null,2));
 console.log(JSON.stringify({status:'PASS',checks}));
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
