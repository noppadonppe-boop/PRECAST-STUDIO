import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'output/stage5-update-p61'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
fs.mkdirSync(out,{recursive:true});
const reg=read('output/stage5-library-p61/register.json');
const paths=new Set(['output/stage5-library-p61/register.json','knowledge/modular-program-r02/STAGE5_CONTINUATION_P61.md','tools/modular-program/stage5-library-p61.mjs','tools/catalogue/mould-data.mjs','tools/catalogue/mould-review.test.mjs','tools/catalogue/verify-p61-browser.mjs','apps/web/src/catalogue/MouldLibrary.tsx']);
for(const r of reg.records)for(const f of r.files)paths.add(f.path);
for(const n of fs.readdirSync(path.join(root,'output/stage5-library-p61/qa')))paths.add('output/stage5-library-p61/qa/'+n);
for(const p of paths){const target=path.join(out,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,p),target);}
fs.writeFileSync(path.join(out,'test-results.txt'),execFileSync(process.execPath,['--test','tools/catalogue/mould-review.test.mjs'],{cwd:root,encoding:'utf8'}));
fs.writeFileSync(path.join(out,'README.md'),'# P61 — Stage5 development web integration\n\n44 setups indexed; 32 partial hardware / 12 contact-and-load inputs only. Stage5 is not complete. This archive contains current development files, integration sources and QA, not a standalone server or a released fabrication package. Original gallery and historical P53 records remain in the project. Private session logs and credentials are excluded.\n');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(out).filter(p=>path.relative(out,p)!=='manifest.json').map(p=>({path:path.relative(out,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
if(files.some(f=>/server-private|server-error|\.log$/.test(f.path)))throw Error('Private logs prohibited');
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({revision:'P61',stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false,files},null,2));console.log({files:files.length});
