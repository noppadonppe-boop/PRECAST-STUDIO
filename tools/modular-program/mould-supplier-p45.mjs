import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='output/mould-supplier-p45';fs.mkdirSync(dir,{recursive:true});
const source='output/mould-demand-p44/demand-register.json';
const input=JSON.parse(fs.readFileSync(source));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
// One millimetre wide elastic simply-supported strip. p in N/mm2.
export function skin(pKPa,L,t,E=200000){
 const p=pKPa/1000,I=t**3/12,M=p*L**2/8;
 return {stressMPa:M/(t*t/6),deflectionMm:5*p*L**4/(384*E*I)};
}
assert.ok(Math.abs(skin(37.125,240,6).stressMPa-44.55)<1e-10);
assert.ok(Math.abs(skin(37.125,240,6).deflectionMm-0.4455)<1e-10);
assert.equal(skin(0,240,6).deflectionMm,0);
assert.equal(skin(10,240,6).stressMPa/skin(10,120,6).stressMPa,4);
const rows=input.rows.map(r=>{
 assert.equal(hash(r.source),r.sourceSha256,'stale '+r.id);
 const alternatives=[4,6,8].flatMap(t=>[200,240,300].map(s=>({thicknessMm:t,clearSupportSpanMm:s,...skin(r.staticFullHead.basePressureKPa,s,t)})));
 return {id:r.id,typicalId:r.typicalId,source:r.source,sourceSha256:r.sourceSha256,pressureKPa:r.staticFullHead.basePressureKPa,concreteKg:r.concreteKg,alternatives,developmentCandidate:{thicknessMm:6,clearSupportSpanMm:240,...skin(r.staticFullHead.basePressureKPa,240,6),status:'ELASTIC_STRIP_STUDY_ONLY'},supplierReturn:{floorSupportReactionSet:null,minimumConcreteStrengthAtLiftMPa:null,strengthSpecimenBasis:null,anchorProduct:null,anchorLayoutRevision:null,additionalReinforcementDesign:null,riggingDesign:null,reviewer:null},productionReleased:false};
});
assert.equal(rows.length,44);assert.ok(rows.every(r=>r.alternatives.length===9));
const report={revision:'P45',stage:5,overallPercent:50,source,sourceSha256:hash(source),basis:{E_MPa:200000,material:'study only, grade not frozen',pressure:'P44 uniform base pressure over strip; no impact/vibration',formula:'M=pL²/8; Z=t²/6; I=t³/12; delta=5pL⁴/(384EI), unit-width strip',notChecked:['support flexibility','curved-surface shell action','connections','buckling','fatigue','total mould tolerance','floor','lifting'],approval:false},rows};
fs.writeFileSync(`${dir}/skin-study-and-supplier-return.json`,JSON.stringify(report,null,2));
fs.writeFileSync(`${dir}/SKIN-STUDY.md`, '# P45 — ผิวเหล็กแม่แบบ: elastic strip study\n\nไม่ใช่แบบผลิตหรือ code strength check ใช้แรงดันฐาน P44 กระจายเต็มช่วงรองรับ เป็นการตรวจส่วนย่อย ไม่ใช่การโก่งรวมแม่แบบ\n\nเปรียบเทียบผิว4/6/8 mm กับช่วงรองรับสุทธิ200/240/300 mm รวม396กรณี เสนอพัฒนา6mm/ช่วงสุทธิไม่เกิน240mmต่อจากP41 โดยยังไม่ freeze จำนวน/หน้าตัดซี่หรือโครงหลัก ค่า E=200000MPa เป็นสมมติฐาน\n\nสูตรต่อแถบกว้าง1mm: M=pL²/8, Z=t²/6, I=t³/12, delta=5pL⁴/(384EI); pแปลงkPaเป็นN/mm²ด้วย/1000 ไม่มีการใช้nominal fyเป็นallowable stress\n\n|Typical|p kPa|stress MPa: 6/240|deflection mm: 6/240|\n|---|---:|---:|---:|\n'+rows.map(r=>`|${r.typicalId}|${r.pressureKPa.toFixed(3)}|${r.developmentCandidate.stressMPa.toFixed(3)}|${r.developmentCandidate.deflectionMm.toFixed(4)}|`).join('\n')+'\n\nส่วนโค้ง ช่องเปิด และรอยต่อ ต้องตรวจทิศช่วงรองรับจริง/ผิวสองทิศ/บิด/ความแข็งโครงแยก ห้ามใช้ตารางนี้รับรองทั้งแม่แบบ\n');
console.log(JSON.stringify({setups:44,stripCases:396,benchmarks:4,maxCandidateStressMPa:Math.max(...rows.map(r=>r.developmentCandidate.stressMPa)),maxCandidateDeflectionMm:Math.max(...rows.map(r=>r.developmentCandidate.deflectionMm)),engineeringApproved:false}));
