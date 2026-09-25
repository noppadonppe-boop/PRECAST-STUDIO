import fs from 'node:fs';import {cellFaces} from './prism-tools-p54.mjs';import {swept} from './cap-geometry-p55.mjs';
const key=process.argv[2]??'A-LH-S00',m=JSON.parse(fs.readFileSync(`output/seam-hardware-p74/${key}.json`)),base=JSON.parse(fs.readFileSync(m.input.path)),overlay=JSON.parse(fs.readFileSync(m.overlayInput.path)),translate=(fs,d)=>fs.map(f=>f.map(p=>p.map((v,i)=>v+d[i]))),obs=[...base.parts.flatMap(p=>p.cells.map(cellFaces)),...base.concrete.cells.map(cellFaces),...overlay.stock.flatMap(p=>p.solids),...m.plates.flatMap(p=>p.cells.map(cellFaces))];
for(const suffix of ['N','WL','B','WU']){const p=m.hardware.find(p=>p.tag==='SJ-M03-M04-L1-'+suffix),d0=[0,0,['N','WL'].includes(suffix)?-100:100],f=p.cells.map(c=>translate(cellFaces(c),d0));let found=null;
 for(const radius of [50,75,100,125,150]){for(let deg=0;deg<360;deg+=10){const a=deg*Math.PI/180,d=[radius*Math.cos(a),radius*Math.sin(a),0],g=f.map(s=>translate(s,d));if(f.some(s=>obs.some(o=>swept(s,o,d))))continue;if(g.some(s=>obs.some(o=>swept(s,o,[0,0,1800]))))continue;found={d0,d1:d,d2:[0,0,1800]};break;}if(found)break;}
 console.log(key,suffix,found);
}
