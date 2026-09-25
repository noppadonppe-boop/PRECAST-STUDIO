import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {root} from './build-r02.mjs';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
export function model(){
 const prior=read('output/node-mirror-p19/typical-index.json').entries;
 const retired=prior.filter(e=>e.scope.startsWith('HISTORICAL')||/-EP-/.test(e.id)||/-N[WR]0[12]-/.test(e.id));
 const entries=prior.filter(e=>!retired.includes(e));
 for(const [source,folder] of [['output/epx-normal-p28/register.json','output/epx-normal-p28'],['output/node-level-p31/register.json','output/node-level-p31']])for(const p of read(source).records){
   entries.push({id:p.id,source,sourceRecordId:p.id,preview:p.family?`${folder}/EPX-${p.family}-P28.png`:`${folder}/${p.id}.png`,concreteMassKg:p.mass.concreteMassKg,densityKgM3:p.mass.densityKgM3,scope:'DEVELOPMENT_CANDIDATE',engineeringApproved:false,productionReleased:false});
 }
 for(const e of entries){e.sourceSha256=hash(e.source);e.previewSha256=hash(e.preview);}
 return {revision:'P32',visibility:'INTERNAL_TEAM',scope:'CURRENT_DEVELOPMENT_REFERENCE_INDEX_NOT_COMPLETE_PRODUCTION_BOM',entries,retiredReferenceIds:retired.map(e=>e.id),currentReferenceCount:entries.length,
   countMeaning:'TYPICAL_TAG_REVISIONS_NOT_PHYSICAL_INSTANCES_OR_UNIQUE_MOULDS_OR_TEST_COUNT',
   missingDevelopment:['CONCRETE_LOCAL_TRANSITION_AND_COVER_TYPICALS','CLOSURE_CORNER_AND_D_SHOULDER_GEOMETRY','CONSOLIDATED_ASSEMBLY_QA','STAGE_2_HANDOFF_PACKAGE'],
   engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/current-index-p32');fs.mkdirSync(out,{recursive:true});const m=model();fs.writeFileSync(path.join(out,'typical-index.json'),JSON.stringify(m,null,2));
 const link=e=>'../../'+e.preview;
 fs.writeFileSync(path.join(out,'README.md'),['# Typical ปัจจุบัน P32 — ขั้น2/8: 85%','','ทะเบียน34tag/revisionเพื่อพัฒนา ไม่ใช่154ชิ้นงานหรือจำนวนแม่แบบผลิต ภาพแต่ละรายการดาวน์โหลดเป็นPNGได้จากลิงก์ และมีต้นทาง/ค่าSHA-256ในJSON','','| Typical | คอนกรีตประมาณ kg |','|---|---:|',...m.entries.map(e=>`| [${e.id}](${link(e)}) | ${e.concreteMassKg.toFixed(1)} |`),'','ความหนาแน่นทดลอง2400kg/m³ ไม่รวมเหล็กและอุปกรณ์ ห้ามรวมทุกtagเป็นน้ำหนักหนึ่งอาคาร ไม่ใช่มวลยกที่อนุมัติ','','นำEPX-P28แทนแผงปลายเดิม และNW/NR-P31แทนฉบับก่อนลดระดับโหนด เก็บประวัติเดิมทั้งหมด ชุดTR/ครอบคอนกรีตยังพัฒนาไม่เสร็จ','','ไม่มีการรับรองความหนา เหล็ก จุดต่อ การยก หรืออนุมัติผลิตจากผลทดสอบข้อมูล',''].join('\n'));
 console.log(JSON.stringify({current:m.entries.length,retired:m.retiredReferenceIds.length}));
}
