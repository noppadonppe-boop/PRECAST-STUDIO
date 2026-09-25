import {chromium} from '@playwright/test';import {pathToFileURL} from 'node:url';import path from 'node:path';import fs from 'node:fs';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const folder of ['abd-load-ledger-p75','abd-skin-screen-p76']){await page.goto(pathToFileURL(path.resolve('output',folder,'index.html')).href);assert.equal(await page.locator('details').count(),12);await page.locator('details').first().evaluate(e=>e.open=true);await page.screenshot({path:`output/${folder}/report-preview.png`,fullPage:false});assert.ok(await page.locator('h1').innerText());}
 assert.deepEqual(errors,[]);fs.writeFileSync('output/abd-skin-screen-p76/browser-audit.json',JSON.stringify({reportPages:2,detailGroupsPerPage:12,pageErrors:errors},null,2));
}finally{await browser.close();}
