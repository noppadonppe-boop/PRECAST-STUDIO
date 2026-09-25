import {chromium} from '@playwright/test';
import {createCatalogueServer} from './server.mjs';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/web-tabs-p38r2'),origin='http://127.0.0.1:5196';await mkdir(out,{recursive:true});
const {server,entryToken}=await createCatalogueServer({root,origin,ownerPreview:true});await new Promise(r=>server.listen(5196,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/catalogue#access='+entryToken);
 await page.getByRole('button',{name:'ภาพชุดเดิม',exact:true}).waitFor();await page.locator('.cat-card img').first().waitFor();
 assert.match(await page.locator('.cat-card img').first().getAttribute('src'),/^\/api\/catalogue\/artifacts\//);
 await page.screenshot({path:resolve(out,'original-default.png')});
 await page.getByRole('button',{name:'แบบและข้อมูลชุดใหม่',exact:true}).click();await page.getByText('พบ 48 แบบ',{exact:true}).waitFor();assert.equal(await page.locator('.cat-card').count(),48);
 assert.match(await page.locator('.cat-card img').first().getAttribute('src'),/^\/api\/catalogue\/current\/artifacts\//);
 await page.getByRole('button',{name:'แม่แบบ',exact:true}).click();await page.getByText('พบ 44 setup',{exact:true}).waitFor();
 await page.getByRole('button',{name:'ภาพชุดเดิม',exact:true}).click();await page.locator('.cat-card img').first().waitFor();
 await page.reload();await page.getByRole('button',{name:'ภาพชุดเดิม',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'ภาพชุดเดิม',exact:true}).getAttribute('aria-pressed'),'true');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(out,'mobile-original.png')});assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'audit.json'),JSON.stringify({status:'PASS',checks:['original images default','new 48 designs separate','44 mould records preserved','return and reload default original','mobile no horizontal overflow'],pageErrors:errors},null,2));console.log('PASS collection tabs');
}finally{await browser.close();await new Promise(r=>server.close(r));}
