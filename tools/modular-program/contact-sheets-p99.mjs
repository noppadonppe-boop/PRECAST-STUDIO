import fs from 'node:fs';
import {createRequire} from 'node:module';
import {read} from './table-weld-p93.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root='output/mould-coordinated-p99',out='output/stage5-library-p99/qa';fs.mkdirSync(out,{recursive:true});
const reg=read(root+'/register.json');
for(const kind of ['board','parts'])for(let start=0;start<44;start+=6){
 const cells=[];
 for(const [i,r]of reg.records.slice(start,start+6).entries()){
  const image=await sharp(`${root}/${r.id}-${kind}.png`).resize({width:1050,height:850,fit:'inside'}).png().toBuffer();
  const label=Buffer.from(`<svg width="1100" height="40"><rect width="1100" height="40" fill="white"/><text x="12" y="28" font-family="Arial" font-size="23" fill="#102d50">${start+i+1} | ${r.typicalId} | ${kind}</text></svg>`);
  const x=(i%2)*1100,y=Math.floor(i/2)*910;cells.push({input:label,left:x,top:y},{input:image,left:x,top:y+45});
 }
 await sharp({create:{width:2200,height:2730,channels:3,background:'#d9e1e9'}}).composite(cells).png().toFile(`${out}/${kind}-${String(start+1).padStart(2,'0')}.png`);
}
console.log('16 contact sheets / 44 assembly boards + 44 part atlases');
