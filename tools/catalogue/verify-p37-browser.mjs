import {chromium} from '@playwright/test';
import {createCatalogueServer} from './server.mjs';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/stage4-web-p37');
await mkdir(out,{recursive:true});
const origin='http://127.0.0.1:5199';
const {server,entryToken}=await createCatalogueServer({root,origin,ownerPreview:true});
await new Promise(r=>server.listen(5199,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage();const errors=[];const checks=[];
page.on('pageerror',e=>errors.push(e.message));
async function shot(name){await page.screenshot({path:resolve(out,name+'.png'),fullPage:false});checks.push(name);}
try {
 await page.goto(origin+'/catalogue#access='+entryToken);await page.getByText('พบ 48 แบบ',{exact:true}).waitFor();assert.equal(new URL(page.url()).hash,'');
 await page.locator('.cat-card img').first().evaluate(async img=>{if(!img.complete)await new Promise(r=>img.addEventListener('load',r,{once:true}));});
 await shot('01-desktop-gallery');
 await page.getByRole('button',{name:/ร้านกาแฟ 12 แบบ/}).click();await page.getByText('พบ 12 แบบ',{exact:true}).waitFor();
 await page.getByRole('button',{name:'C · มุมหลังคา–ผนังโค้ง',exact:true}).click();await page.getByText('พบ 3 แบบ',{exact:true}).waitFor();
 await page.getByLabel('ค้นหาแบบหรือ Tag').fill('U-C3');await page.getByText('พบ 1 แบบ',{exact:true}).waitFor();await page.getByRole('button',{name:'เปิด U-C3',exact:true}).click();
 await page.getByRole('heading',{name:'01 · แปลน + ภาพ 3D',exact:true}).waitFor();await shot('02-product-drawings');
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'ดาวน์โหลด PNG',exact:true}).first().click();const download=await downloaded;assert.equal(await download.failure(),null);assert.equal(download.suggestedFilename(),'01-PLAN-3D.png');checks.push('verified-png-download');
 await page.getByRole('button',{name:'ชิ้นงาน / น้ำหนัก',exact:true}).click();await shot('03-product-bom');
 await page.getByRole('button',{name:'BIM / Engineering / แม่แบบ',exact:true}).click();assert.equal(await page.getByText('ยังไม่สร้าง · NOT_CREATED',{exact:true}).count(),2);checks.push('native-slots-not-created');
 await page.getByRole('button',{name:'Typical Segment',exact:true}).click();await page.getByLabel('ค้นหาแบบหรือ Tag').fill('TS-C-H15-LH-W01');await page.getByText('พบ 1 รายการ',{exact:true}).waitFor();await shot('04-typical');
 await page.getByRole('button',{name:'เปรียบเทียบ I/L/U',exact:true}).click();assert.equal(await page.locator('.cat-compare-grid article').count(),3);await shot('05-comparison');
 await page.getByRole('button',{name:'ดาวน์โหลด',exact:true}).click();assert.equal(await page.getByRole('button',{name:/PM-STAGE[23]-P3[56]-REVIEW.zip/}).count(),2);checks.push('both-verified-packages-listed');
 await page.getByRole('button',{name:'ประวัติ',exact:true}).click();await page.getByText('ประวัติ R00/R01 — ไม่ใช่แบบล่าสุด P36',{exact:true}).waitFor();await page.getByRole('button',{name:'กลับคลังปัจจุบัน P36',exact:true}).click();await page.getByText('พบ 48 แบบ',{exact:true}).waitFor();checks.push('history-and-return');
 await page.setViewportSize({width:390,height:844});await shot('06-mobile-gallery');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'เปิด I-C1',exact:true}).click();await page.getByRole('button',{name:'ชิ้นงาน / น้ำหนัก',exact:true}).click();await page.locator('.cat-table-scroll').scrollIntoViewIfNeeded();await shot('07-mobile-bom');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'ออกจากระบบ',exact:true}).click();await page.getByRole('heading',{name:'เข้าสู่คลังแบบ',exact:true}).waitFor();assert.equal((await context.request.get(origin+'/api/catalogue/current')).status(),401);checks.push('logout-revokes-access');
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'browser-audit.json'),JSON.stringify({revision:'P37',status:'PASS',checks,pageErrors:errors,desktop:[1440,1000],mobile:[390,844],credentialsRecorded:false},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',checks}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
