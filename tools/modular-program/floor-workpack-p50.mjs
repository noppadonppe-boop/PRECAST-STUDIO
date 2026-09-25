import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const extended=process.argv.includes('--p51'),revision=extended?'P51':'P50';
const out=extended?'output/table-workpack-p51':'output/floor-workpack-p50';fs.mkdirSync(out,{recursive:true});const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');const records=[];
for(const family of (extended?['NW01','NW02','NR-S','NR-N']:['F2660','NF02'])){
 const source=`output/${extended?'table-lock-p51':'floor-lock-p47'}/${family}/model.json`,p46=`output/${extended?'table-mould-p51':'floor-mould-p46'}/${family}/model.json`,m=JSON.parse(fs.readFileSync(source)),old=JSON.parse(fs.readFileSync(p46)),[L,W,H]=m.cavityMm;
 const rows=[
  ['BED-SKIN','M00','PLATE',1,[L+240,W+240,6],'12 holes dia18 per drilling schedule'],
  ['BED-RIB','M00','RHS',Math.round(L/old.ribPitchMm)+1,[100,50,4,W+200],'RHS section h/b/t/length; no drilling in model'],
  ['BED-RAIL','M00','RHS',2,[200,100,6,L+200],'RHS section h/b/t/length'],
  ['SIDE-SKIN','M01/M02','PLATE',2,[L,H,6],'One per long side'],
  ['SIDE-RHS','M01/M02','RHS',2,[50,50,4,L],'RHS behind side skin'],
  ['END-SKIN','M03/M04','PLATE',2,[W+12,H,6],'Includes 6 mm overlap each end'],
  ['END-RHS','M03/M04','RHS',2,[50,50,4,W+12],'RHS behind end skin'],
  ['LOCK-FOOT','M01/M02/M03/M04','PLATE',12,[80,104,12],'Hole dia18 at tangent40 / outward74 from inner plate edge'],
  ['LOCK-WEB','M01/M02/M03/M04','PLATE',12,[50,48,6],'Not triangular; rectangular web as P47 model'],
  ['BED-DOUBLER','M00','PLATE',12,[70,70,14],'Hole dia18 at plate centre; underside bed'],
 ].map(([tag,parent,stock,quantity,dimensionsMm,note])=>({tag:`${family}-${tag}`,parent,stock,quantity,dimensionsMm,note,materialGrade:null,weldId:null,cutAllowanceMm:null,orderReleased:false}));
 const hardware=[{tag:`${family}-BOLT`,description:'M16 nominal; P47 cylindrical placeholder, not procurement specification',quantity:12,lengthMm:null,grade:null,standard:null},{tag:`${family}-WASHER`,description:'model envelope OD30 / ID18 / t3 mm',quantity:12,standard:null},{tag:`${family}-NUT`,description:'model envelope OD30 / ID16 / height14 mm; not ISO hex profile',quantity:12,grade:null,standard:null}];
 const holes=m.lockSchedule.map(l=>({id:l.id,parent:l.parent,cavityOriginXYmm:[l.x,l.y],bedPlateCornerXYmm:[l.x+120,l.y+120],diameterMm:18,axis:'+Z',cutRelease:false}));
 const sourceCount=rows.reduce((s,r)=>s+r.quantity,0);assert.equal(sourceCount,48+Math.round(L/old.ribPitchMm));assert.equal(holes.length,12);
 const result={revision,family,cavityMm:m.cavityMm,geometrySource:source,geometrySha256:sha(source),stockSource:p46,stockSourceSha256:sha(p46),sourceSetups:old.sources.map(s=>s.id),stockPieceCount:sourceCount,hardwarePieceCount:36,rows,hardware,holes,weldsDesigned:false,tolerancesAssigned:false,engineeringApproved:false,productionReleased:false};records.push(result);
 fs.writeFileSync(`${out}/${family}-parts.json`,JSON.stringify(result,null,2));
 const T=(x,y,s,n=22)=>`<text x="${x}" y="${y}" font-size="${n}">${s}</text>`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1300"><rect width="1800" height="1300" fill="white"/><g fill="#10274c" font-family="Arial">`+T(35,55,`${revision} | ${family} — STOCK &amp; DRILLING REVIEW`,34)+T(35,95,`${sourceCount} steel blanks + 36 hardware placeholders | source ${m.revision} | not cutting authorization`,23);
 svg+=T(35,150,'A | BED DRILLING PLAN — ORIGIN AT LOWER-LEFT OF STEEL PLATE',25);
 const scale=Math.min(1150/(L+240),520/(W+240)),ox=180,by=735,X=v=>ox+v*scale,Y=v=>by-v*scale;
 svg+=`<rect x="${ox}" y="${Y(W+240)}" width="${(L+240)*scale}" height="${(W+240)*scale}" fill="#e8eef2" stroke="#173e60" stroke-width="3"/><rect x="${X(120)}" y="${Y(W+120)}" width="${L*scale}" height="${W*scale}" fill="none" stroke="#648298" stroke-width="2" stroke-dasharray="9 6"/>`;
 holes.forEach(h=>{const [x,y]=h.bedPlateCornerXYmm,dy=['LK05','LK06'].includes(h.id)?34:9;svg+=`<circle cx="${X(x)}" cy="${Y(y)}" r="6" fill="#ba862d"/>`+T(X(x)+9,Y(y)-dy,h.id,18);});
 svg+=T(ox,by+35,'(0,0) plate corner; +X right / +Y up; hole coordinates in parts.json',20)+T(1370,245,`Plate L ${L+240}`,23)+T(1370,290,`Plate W ${W+240}`,23)+T(1370,335,'Skin t6 mm',23)+T(1370,380,'12 x dia18 holes',23)+T(1370,425,'Doubler70x70x14',23)+T(1370,470,'Cavity dashed',23);
 svg+=T(35,835,'B | STEEL BLANK SCHEDULE — NOMINAL STOCK, NO WELD / CUT ALLOWANCE',25);
 rows.forEach((r,i)=>{const col=i<5?35:910,y=890+(i%5)*55;svg+=T(col,y,`${r.tag.replace(family+'-','')} | ${r.quantity} pcs | ${r.dimensionsMm.join(' x ')} mm`,22);});
 svg+=T(35,1225,'HARDWARE LENGTH / GRADE, WELDS, TOLERANCES &amp; LIFTING REMAIN OPEN — NOT FOR FABRICATION',23)+'</g></svg>';
 fs.writeFileSync(`${out}/${family}-DRILLING.svg`,svg);await sharp(Buffer.from(svg)).png().toFile(`${out}/${family}-DRILLING.png`);
}
let md='# P50 — บัญชีชิ้นเหล็กและผังเจาะจาก P47\n\nขั้น5/8: ชุดประสานรายละเอียด ไม่ใช่ใบตัด/สั่งซื้อ/อนุมัติผลิต\n\n';
for(const r of records){md+=`## ${r.family}\n\n- เหล็กตัด/ท่อน${r.stockPieceCount}ชิ้น + hardware nominal36ชิ้น รวม${r.stockPieceCount+36}ชิ้นต่อชุด; ประกอบเป็น5ชุดแม่แบบหลัก\n- [ผังเจาะและบัญชี](./${r.family}-DRILLING.png) · [JSON รายชิ้น/พิกัด](./${r.family}-parts.json)\n- ใช้ร่วมเชิงรูปทรงกับ ${r.sourceSetups.join(', ')}; ยังไม่อนุมัติการสลับinsert/จุดยกระหว่างสินค้า\n\n|Tag|จำนวน|ขนาด mm|หมายเหตุ|\n|---|---:|---|---|\n`;for(const x of r.rows)md+=`|${x.tag}|${x.quantity}|${x.dimensionsMm.join(' × ')}|${x.note}|\n`;}
md+='\n## การอ่านแบบและข้อจำกัด\n\nผังใช้มุมแผ่นเหล็กเป็น origin; JSON เก็บทั้ง originช่องหล่อและoriginมุมแผ่น เพื่อป้องกันเลื่อนรู120mmผิดด้าน. ขนาดเหล็กอ้างsolid P46/P47 ไม่รวมค่าเผื่อตัด ลบคม รอยเชื่อม/บิดตัว หรือ tolerance. รูเป็นdia18nominal. หัวโบลต์/น็อตในP47เป็นทรงกระบอกแทนรูปร่างจริง จึงตั้งความยาว เกรด และstandard เป็นnullจนกำหนดอุปกรณ์จริง.\n\nตรวจด้วยสคริปต์: จำนวนชิ้น60, hardware36, รู12ต่อชุด และ source hashes. ไม่ใช่ตรวจงานเชื่อม/กำลัง/พิกัดยก. ขอบเท้าและผลแรงล่าสุดอ่าน P49. ยังไม่ออก DXF/PDF-A หรืออ้างผ่าน Revit เพราะยังไม่ได้ตรวจ native target.\n';
if(extended)md=md.replaceAll('P50','P51').replaceAll('P47','P51').replace('จำนวนชิ้น60','จำนวนชิ้นตามแต่ละขนาด');
fs.writeFileSync(`${out}/README.md`,md);fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision,records:records.map(r=>({family:r.family,sourceSetups:r.sourceSetups,stockPieceCount:r.stockPieceCount,hardwarePieceCount:r.hardwarePieceCount,file:`${r.family}-parts.json`})),engineeringApproved:false,productionReleased:false},null,2));console.log(JSON.stringify(records.map(r=>({family:r.family,stock:r.stockPieceCount,hardware:r.hardwarePieceCount}))));
