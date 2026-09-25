import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {keys,combine,g,densityKgM3} from './abd-mass-p70.mjs';
import {properties} from './prism-tools-p54.mjs';
import {properties as solidProperties,cross} from './cap-geometry-p55.mjs';
export {keys};
const sum=rows=>rows.reduce((s,r)=>s.map((v,i)=>v+r[i]),[0,0,0]);
const scale=(v,s)=>v.map(x=>x*s);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const gravity=p=>({forceKN:[0,0,-p.massKg*g/1000],momentKNm:scale(cross(p.cgMm,[0,0,-p.massKg*g/1000]),.001)});
const norm=v=>Math.hypot(...v);
export function build(key){
 const paths=[`output/abd-base-lock-p66/${key}.json`,`output/abd-roof-web-p71/${key}.json`,`output/seam-hardware-p74/${key}.json`,`output/abd-shell-skins-p60/${key}-pressure.json`];
 const raw=paths.map(p=>fs.readFileSync(p)),[base,web,seam,pressure]=raw.map(b=>JSON.parse(b));
 if(web.inputSnapshot.sha256!==hash(raw[0])||seam.input.sha256!==hash(raw[0])||seam.overlayInput.sha256!==hash(raw[1]))throw Error('Stale geometry input');
 if(seam.status!=='GEOMETRY_ONLY_NOT_CAPACITY_VERIFIED')throw Error('Unresolved seam geometry');
 const webMass=s=>combine(s.solids.map(f=>{const q=solidProperties(f);return {massKg:q.volumeMm3*densityKgM3/1e9,cgMm:q.cgMm};}));
 const parts=base.parts.map(p=>{
  const gussets=web.stock.filter(s=>s.owner===p.tag),plates=seam.plates.filter(s=>s.owner===p.tag),q=properties(p.cells,densityKgM3);
  const additions=[...gussets.map(s=>({tag:s.tag,...webMass(s)})),...plates.map(s=>({tag:s.tag,...properties(s.cells,densityKgM3)}))];
  const m=combine([q,...additions]);
  return {tag:p.tag,role:p.role,baseMassKg:q.massKg,attachedTags:additions.map(s=>s.tag),...m,gravity:gravity(m)};
 });
 for(const h of seam.hardware){const q=properties(h.cells,densityKgM3);parts.push({tag:h.tag,role:'LOOSE_SEAM_HARDWARE',baseMassKg:q.massKg,attachedTags:[],massKg:q.massKg,cgMm:q.cgMm,gravity:gravity(q)});}
 if(new Set(parts.map(p=>p.tag)).size!==parts.length||parts.flatMap(p=>p.attachedTags).length!==56)throw Error('Duplicate/unassigned material');
 const concrete=properties(base.concrete.cells,2400),emptyMould=combine(parts),stationaryPhysicalMass=combine([emptyMould,concrete]);
 // Pressure mapping is by contact surface owner, NOT by screw or reaction point.
 const pressureRows=parts.map(p=>{
  const surfaces=pressure.records.filter(r=>(['W01','W02'].includes(r.tag)?'WC':r.tag)===p.tag);
  const fluid={forceKN:sum(surfaces.map(r=>r.forceKN)),momentKNm:scale(sum(surfaces.map(r=>r.momentKNmm)),.001)};
  return {tag:p.tag,sourceContactTags:surfaces.map(s=>s.tag),fluid,steelGravity:p.gravity,applied:{forceKN:sum([fluid.forceKN,p.gravity.forceKN]),momentKNm:sum([fluid.momentKNm,p.gravity.momentKNm])},jointReactions:null};
 });
 const mapped=pressureRows.flatMap(r=>r.sourceContactTags);if(mapped.length!==pressure.records.length||new Set(mapped).size!==mapped.length)throw Error('Lost/duplicate pressure surface');
 const expectedFluidF=[0,0,-pressure.basis.hydrostaticGammaKNm3*concrete.volumeMm3/1e9],expectedFluidM=scale(cross(concrete.cgMm,expectedFluidF),.001);
 const fluidF=sum(pressureRows.map(r=>r.fluid.forceKN)),fluidM=sum(pressureRows.map(r=>r.fluid.momentKNm));
 const residual={forceKN:sum([fluidF,scale(expectedFluidF,-1)]),momentKNm:sum([fluidM,scale(expectedFluidM,-1)])};
 if(norm(residual.forceKN)>1e-6||norm(residual.momentKNm)>1e-6)throw Error('Pressure no longer matches concrete geometry');
 const active=new Map(parts.map(p=>[p.tag,p])),states=[];
 const state=tag=>{const steel=combine([...active.values()]);states.push({afterRemoval:tag,remainingParts:active.size,steel,stationarySteelAndConcrete:combine([steel,concrete]),supportReactions:null});};state(null);
 for(const [tag]of seam.sequence){if(!active.delete(tag))throw Error('Invalid release order '+tag);state(tag);}if(active.size!==1||!active.has('M00'))throw Error('Unremoved part');
 const totalApplied={forceKN:sum(pressureRows.map(r=>r.applied.forceKN)),momentKNm:sum(pressureRows.map(r=>r.applied.momentKNm))};
 return {revision:'P75',stage:5,key,id:base.id,inputs:paths.map((path,i)=>({path,sha256:hash(raw[i])})),basis:{geometry:'P66 + P71 + P74 exactly once',steelDensityKgM3:densityKgM3,concreteDensityKgM3:2400,gravityMPerS2:g,pressure:pressure.basis,coordinates:'Source casting XYZ mm; forces kN; moments about global origin kN.m',cases:['PHYSICAL_STATIC_MASS: steel + concrete mass at 2400 kg/m3','FORM_APPLIED_LOAD: hydrostatic pressure gamma25 plus STEEL gravity only; do not add concrete weight again'],dynamicOrVibrationFactor:null},parts,emptyMould,concrete,stationaryPhysicalMass,pressureRows,fluidResidual:residual,totalApplied,requiredGlobalBalancingResultant:{forceKN:scale(totalApplied.forceKN,-1),momentKNm:scale(totalApplied.momentKNm,-1),meaning:'Overall equilibrium demand only; not floor contact distribution or any single anchor'},removalStates:states,exclusions:['Rebar/embeds, weld metal, seals, coatings and unmodelled fittings','Rigging, handling frames and equipment','Fresh-concrete impact/vibration/adhesion; partial filling and accidental loads'],capacityChecked:false,engineeringApproved:false,productionReleased:false,stageComplete:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const out='output/abd-load-ledger-p75';fs.mkdirSync(out,{recursive:true});const rows=keys.map(build);
 for(const m of rows){fs.writeFileSync(`${out}/${m.key}.json`,JSON.stringify(m,null,2));console.log(m.key,{steel:m.emptyMould.massKg,concrete:m.concrete.massKg,stationary:m.stationaryPhysicalMass.massKg,parts:m.parts.length});}
 const n=x=>x.toFixed(3),vec=v=>v.map(n).join(' / ');
 const table=(heads,body)=>`<table><thead><tr>${heads.map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
 fs.writeFileSync(`${out}/index.html`,`<!doctype html><html lang="th"><meta charset="utf-8"><title>P75 — แรงและน้ำหนักแม่แบบ</title><style>body{font:16px Tahoma,Arial;max-width:1400px;margin:28px auto;padding:16px;color:#102c50}table{border-collapse:collapse;width:100%;margin:20px 0}td,th{border:1px solid #bdc7d0;padding:8px;text-align:right}td:first-child{text-align:left}.note{padding:18px;background:#fff0d7}details{margin:20px 0;overflow:auto}a{color:#174a87}</style><h1>ขั้น 5/8 · P75 — บัญชีแรงและน้ำหนักปัจจุบัน</h1><p class="note">ครบ 12/12 รุ่น A/B/D สำหรับงานย่อยนี้ ไม่ใช่ขั้น 5 ครบ 100% และไม่อนุมัติผลิตหรือยกจริง<br>รวม P66 + P71 + P74 โดยไม่ซ้ำค้ำ/ฮาร์ดแวร์เก่า แรงด้านล่างเป็นแรงกระทำ ไม่ใช่กำลังรับแรงหรือแรงแบ่งลงพุกรายตัว</p>`+table(['รุ่น','เหล็ก kg','คอนกรีต kg','รวมวางเท kg','CG รวม X/Y/Z mm'],rows.map(m=>`<tr><td><a href="${m.key}.json" download>${m.key}</a></td><td>${n(m.emptyMould.massKg)}</td><td>${n(m.concrete.massKg)}</td><td>${n(m.stationaryPhysicalMass.massKg)}</td><td>${vec(m.stationaryPhysicalMass.cgMm)}</td></tr>`).join(''))+'<p>แรงดันคอนกรีตสดใช้ gamma 25 kN/m³ สูง 1,485 มม. แรงดันฐาน 37.125 kPa แยกจากความหนาแน่นมวล 2,400 kg/m³ ไม่บวกน้ำหนักคอนกรีตซ้ำกับแรงดันที่ฐาน</p>'+rows.map(m=>`<details><summary>${m.key} — แรงรายชุดและ ${m.removalStates.length-1} รายการถอด</summary>`+table(['ชุด','มวลรวมชิ้นติด kg','Fx/Fy/Fz รวม kN','Mx/My/Mz รวม kN·m'],m.pressureRows.filter(p=>p.sourceContactTags.length).map(r=>`<tr><td>${r.tag}</td><td>${n(m.parts.find(p=>p.tag===r.tag).massKg)}</td><td>${vec(r.applied.forceKN)}</td><td>${vec(r.applied.momentKNm)}</td></tr>`).join(''))+'</details>').join('')+'<p>ยังไม่รวมแรงกระแทก/เครื่องจี้ แรงยึดติดแบบ เหล็กเสริม งานเชื่อม ซีล และอุปกรณ์ยก ต้องตรวจโครง จุดต่อ ฐานและแต่ละช่วงรองรับต่อไป</p></html>');
 fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision:'P75',stage:5,stageComplete:false,scopeCompleted:12,scopeTotal:12,records:rows.map(m=>({key:m.key,id:m.id,inputs:m.inputs,emptyMould:m.emptyMould,stationaryPhysicalMass:m.stationaryPhysicalMass}))},null,2));
}
