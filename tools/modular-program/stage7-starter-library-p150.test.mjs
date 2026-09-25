import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root=path.resolve(import.meta.dirname,'../..');
const generator=path.join(root,'tools/modular-program/stage7-starter-library-p150.mjs');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function inventory(dir){const out={};function walk(folder){for(const e of fs.readdirSync(folder,{withFileTypes:true})){const full=path.join(folder,e.name),rel=path.relative(dir,full).replaceAll('\\','/');if(e.isDirectory())walk(full);else out[rel]={sha256:hash(full),bytes:fs.statSync(full).size};}}walk(dir);return out;}
function run(out,...extra){const r=spawnSync(process.execPath,[generator,'--out',out,...extra],{cwd:root,encoding:'utf8',maxBuffer:10*1024*1024});assert.equal(r.status,0,r.stderr||r.stdout);return JSON.parse(r.stdout);}

test('P150 generator is deterministic and static-only for all 48 products',()=>{
  const a=fs.mkdtempSync(path.join(os.tmpdir(),'pm-p150-a-')),b=fs.mkdtempSync(path.join(os.tmpdir(),'pm-p150-b-'));
  try{
    const first=run(a),second=run(b);assert.equal(first.products,48);assert.equal(first.std,48);assert.equal(first.preflight,true);assert.equal(second.preflight,true);
    assert.deepEqual(inventory(a),inventory(b));
    const checked=run(a,'--preflight-only');assert.equal(checked.validation.pass,true);assert.equal(checked.validation.productReports.length,48);
    const index=JSON.parse(fs.readFileSync(path.join(a,'library-index.json')));assert.deepEqual(index.summary.waves,{I:16,L:16,U:16});assert.equal(index.analysedProducts,0);assert.equal(index.rcDesignedProducts,0);assert.equal(index.statuses.engineeringApproved,false);assert.equal(index.statuses.productionReleased,false);
    const files=Object.keys(inventory(a));assert.equal(files.filter(x=>/STARTER-R01\.STD$/.test(x)).length,48);assert.equal(files.some(x=>/\.(ANL|REA|BMD|DSP|EQL)$/i.test(x)),false);
  } finally {fs.rmSync(a,{recursive:true,force:true});fs.rmSync(b,{recursive:true,force:true});}
});
