import fs from 'node:fs';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {keys} from './abd-load-ledger-p75.mjs';
export {keys};
// Elementary elastic beam equations; not a plate/shell solver or a code check.
export function strip(L,t,pKPa,kind='SIMPLE',E=200000){
 if(!(L>0&&t>0&&pKPa>=0&&E>0)||!['SIMPLE','CANTILEVER'].includes(kind))throw Error('Invalid strip input');
 const q=pKPa/1000,I=t**3/12,Z=t*t/6,c=kind==='CANTILEVER';
 const M=q*L*L/(c?2:8),V=q*L/(c?1:2),delta=q*L**4/(E*I)*(c?1/8:5/384);
 return {spanMm:L,thicknessMm:t,pressureKPa:pKPa,boundary:kind,bendingMomentNmmPerMm:M,shearNPerMm:V,elasticStressMPa:M/Z,elasticDeflectionMm:delta,nominalYieldMPa:235,elasticStressToNominalYield:M/Z/235,smallDeflectionWarning:delta>t,codePass:null};
}
export function build(key){
 const path=`output/abd-base-lock-p66/${key}.json`,raw=fs.readFileSync(path),m=JSON.parse(raw),family=key[0];
 const wallSlope=family==='D'?200/2825:0,normalizer=Math.hypot(1,wallSlope);
 const skins=[];
 for(const owner of ['M01','M02','M03','M04']){
  const part=m.parts.find(p=>p.tag===owner),wall=['M01','M03'].includes(owner),edges=part.contactEdgesMm;
  // Wall station values are the LH local fabrication coordinates, also used by mirrored stock.
  const unmirror=([x,y])=>[key.includes('-RH-')?1490-x:x,y];
  const limits=wall?edges.flat().map(unmirror).map(([x,y])=>(wallSlope*x+y)/normalizer):null;
  const start=wall?Math.min(...limits):0,end=wall?Math.max(...limits):edges.reduce((s,[a,b])=>s+Math.hypot(b[0]-a[0],b[1]-a[1]),0);
  const ribs=(wall?m.wallFrameStock:m.roofFrameStock).filter(p=>p.owner===owner&&p.role.includes(wall?'RHS100':'PROFILE_BOX'));
  const centres=[...new Set(ribs.map(r=>wall?(r.localMinMm[1]+r.localMaxMm[1])/2:r.dimensions.profileStationMm))].sort((a,b)=>a-b);
  const gaps=centres.slice(1).map((v,i)=>({id:`BAY-${i+1}`,kind:'SIMPLE',spanMm:v-centres[i],note:'Centre-to-centre idealized supports; ignores rotation continuity and support compliance'}));
  // Screening only: omit seam/adjacent panel support and test the end strip from last rib face.
  for(const [id,L]of [['START',centres[0]-25-start],['END',end-centres.at(-1)-25]])if(L>0)gaps.push({id,kind:'CANTILEVER',spanMm:L,note:'No credit for seam/end restraint; fixed tangent at rib face is an idealization, not a verified weld/support'});
  const rows=gaps.map(gap=>({...gap,cases:[6,8,10].map(t=>strip(gap.spanMm,t,37.125,gap.kind))}));
  skins.push({owner,sourceContactLengthMm:end-start,uniqueRibStationsMm:centres,idealizedFullHeightBandOnly:true,curvedFlatStripSubstitution:family==='B'&&!wall,rows,excludedZones:wall&&key.endsWith('W01')?['Window-height strip and interrupted outer ribs/walers; local opening frame requires a separate model']:[],supportCapacityChecked:false});
 }
 return {revision:'P76',key,id:m.id,input:{path,sha256:crypto.createHash('sha256').update(raw).digest('hex')},basis:{pressureKPa:37.125,elasticModulusMPa:200000,nominalYieldMPa:235,stripWidthMm:1,currentNominalSkinMm:6,trialThicknessesMm:[6,8,10],formulas:{simple:'M=qL²/8; delta=5qL⁴/(384EI)',cantilever:'M=qL²/2; delta=qL⁴/(8EI)',section:'I=t³/12; Z=t²/6; q=p[kPa]/1000 for width1mm'},nominalYieldIsNotAllowableStress:true,stressAboveYield:'Elastic extrapolation identifies an unsuitable linear assumption; not a physical post-yield deformation prediction',flatStripCurvature:'B roof ignores shell curvature. Results are comparison values, not proven upper bounds.',scope:'Screening of hypothetical local strips only. NOT a full check of skin, welds, seams, frame or whole mould.'},skins,selectedThicknessMm:null,codeChecked:false,engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const out='output/abd-skin-screen-p76';fs.mkdirSync(out,{recursive:true});const all=keys.map(build),n=v=>v.toFixed(2);
 for(const m of all)fs.writeFileSync(`${out}/${m.key}.json`,JSON.stringify(m,null,2));
 fs.writeFileSync(`${out}/index.html`,`<!doctype html><html lang="th"><meta charset="utf-8"><title>P76 — ผิวเหล็กและระยะซี่โครง</title><style>body{font:16px Tahoma,Arial;color:#102c50;max-width:1450px;margin:30px auto;padding:16px}.note{padding:18px;background:#fff0d7}table{border-collapse:collapse;width:100%;margin:20px 0}td,th{border:1px solid #c3cbd4;padding:8px;text-align:right}td:first-child{text-align:left}details{overflow:auto;margin:18px 0}.high{background:#fbe3df}</style><h1>ขั้น 5/8 · P76 — ตรวจผิวเหล็กแบบแถบเบื้องต้น</h1><p class="note">ไม่ได้เลือกความหนาใหม่ และไม่ใช่การรับรองแม่แบบ<br>กรณีช่วงยื่นไม่ให้เครดิตจุดล็อกรอยต่อ: ต้องตรวจระบบรองรับร่วมก่อนตัดสินใจเพิ่มเหล็ก สำหรับหลังคาโค้ง B ใช้แถบราบเปรียบเทียบเท่านั้น ไม่รับรองว่าเป็นค่าขอบเขตบน<br>235 MPa เป็น nominal yield สมมติ ไม่ใช่หน่วยแรงยอมให้ตามโค้ด ค่าที่เกินครากไม่ใช่การทำนายการโก่งจริง</p><p>แรงดันเปรียบเทียบ 37.125 kPa / E 200,000 MPa / ผิวปัจจุบัน 6 มม. เทียบ 8 และ 10 มม. มิติชิ้นคอนกรีตไม่เปลี่ยน</p>`+all.map(m=>`<details><summary>${m.key} — <a href="${m.key}.json" download>JSON</a></summary><table><tr><th>ผิว / ช่วง / แบบรองรับ</th><th>ช่วง mm</th><th>6mm stress MPa / δ mm</th><th>8mm stress MPa / δ mm</th><th>10mm stress MPa / δ mm</th></tr>`+m.skins.flatMap(s=>s.rows.map(r=>`<tr><td>${s.owner} / ${r.id} / ${r.kind}${s.curvedFlatStripSubstitution?' / B: flat substitution':''}</td><td>${n(r.spanMm)}</td>${r.cases.map(c=>`<td class="${c.elasticStressToNominalYield>1?'high':''}">${n(c.elasticStressMPa)} / ${n(c.elasticDeflectionMm)}</td>`).join('')}</tr>`)).join('')+'</table></details>').join('')+'<p>ยังไม่ตรวจแถบบริเวณช่องเปิด ความยืดหยุ่นซี่โครง การทำงานร่วมรอยต่อ แรงกระแทก/เครื่องจี้ งานเชื่อม หรือแรงหลังคราก ต้องใช้เป็นข้อมูลเลือกจุดที่จะพัฒนา ไม่ใช่แบบสั่งผลิต</p></html>');
 fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision:'P76',stageComplete:false,scope:'ELASTIC_STRIP_SCREEN_ONLY',records:all.map(m=>({key:m.key,id:m.id,input:m.input}))},null,2));
 console.log(all.map(m=>({key:m.key,skinCount:m.skins.length,flagged6mm:m.skins.flatMap(s=>s.rows).filter(r=>r.cases[0].elasticStressToNominalYield>1).length})));
}
