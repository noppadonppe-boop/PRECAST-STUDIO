import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const jobs=JSON.parse(fs.readFileSync('output/mould-style-p43/jobs.json'));
fs.mkdirSync('output/mould-style-p43/qa',{recursive:true});
for(let start=0;start<jobs.length;start+=4){
 const batch=jobs.slice(start,start+4);if(batch.some(j=>!fs.existsSync(j.output)))continue;
 const layers=[];
 for(let row=0;row<batch.length;row++){
  const j=batch[row];
  for(const [col,p] of [j.source,j.output].entries())layers.push({input:await sharp(p).resize(900,620,{fit:'contain',background:'white'}).png().toBuffer(),left:col*900,top:row*650+30});
  layers.push({input:Buffer.from(`<svg width="1800" height="30"><rect width="1800" height="30" fill="#dbe6f2"/><text x="12" y="22" font-size="19">${j.index}: ${j.typicalId} | LEFT SOURCE / RIGHT GENERATED</text></svg>`),left:0,top:row*650});
 }
 await sharp({create:{width:1800,height:batch.length*650,channels:3,background:'white'}}).composite(layers).png().toFile(`output/mould-style-p43/qa/batch-${start}.png`);
}
