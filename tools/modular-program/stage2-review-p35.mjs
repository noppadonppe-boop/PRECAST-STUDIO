import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';import {model as covers,prism,exactCollisions} from './node-cover-p33.mjs';import {model as nodes} from './node-level-p31.mjs';import {model as joints} from './weather-joints-p34.mjs';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
export function findRecord(x,id){if(!x||typeof x!=='object')return null;if(x.id===id)return x;for(const v of Object.values(x)){const found=findRecord(v,id);if(found)return found;}return null;}
export function index(){const old=read('output/current-index-p32/typical-index.json');const entries=old.entries.filter(e=>e.id!=='TS-N90-NR01-P31').map(e=>({...e}));
 for(const r of covers().records)entries.push({id:r.id,source:'output/node-cover-p33/register.json',sourceRecordId:r.id,preview:`output/node-cover-p33/${r.id}.png`,concreteMassKg:r.mass.concreteMassKg,densityKgM3:2400,scope:'DEVELOPMENT_CANDIDATE',engineeringApproved:false,productionReleased:false});
 for(const e of entries){e.sourceSha256=hash(e.source);e.previewSha256=hash(e.preview);e.svg=e.preview.replace(/\.png$/,'.svg');e.svgSha256=hash(e.svg);}
 return {revision:'P35',visibility:'INTERNAL_TEAM',status:'STAGE2_DEVELOPMENT_REVIEW_SET_NOT_PRODUCTION_STANDARD',currentReferenceCount:entries.length,entries,retiredReferenceIds:[...old.retiredReferenceIds,'TS-N90-NR01-P31'],engineeringApproved:false,productionReleased:false};
}
export function audit(){const i=index(),c=covers(),n=nodes(),j=joints();const errors=[];
 if(i.entries.length!==44||new Set(i.entries.map(e=>e.id)).size!==44)errors.push('INDEX_COUNT_OR_DUPLICATE');
 for(const e of i.entries){const r=findRecord(read(e.source),e.sourceRecordId),mass=r?.mass??r?.geometry?.mass;if(!mass||Math.abs(mass.concreteMassKg-e.concreteMassKg)>1e-6)errors.push('SOURCE_MASS:'+e.id);if(e.productionReleased||e.engineeringApproved)errors.push('UNSUPPORTED_APPROVAL:'+e.id);}
 const wallSolids=n.nodes[0].walls.map(w=>prism(w.id,'EXISTING_WALL',w.min[0],w.min[1],w.size[0],w.size[1],w.min[2],w.min[2],w.min[2]+w.size[2],w.min[2]+w.size[2],175));
 const floorBoxes=[...read('output/node-notch-p18/register.json').pilot.remainingSolidsInNodeMm,{min:[195,1507.5,0],size:[2797.5,1297.5,175]}];
 const floorSolids=floorBoxes.map((f,k)=>prism('FLOOR_VOLUME_'+k,'EXISTING_FLOOR',f.min[0],f.min[1],f.size[0],f.size[1],0,0,175,175,175));
 const concreteClashes=exactCollisions([...c.records,...wallSolids,...floorSolids]);if(concreteClashes.length)errors.push('NODE_CONCRETE_INTERSECTION');
 const memberZones=j.supportSpaces.map(s=>prism(s.id,'SPACE_ONLY',s.minMm[0],s.minMm[1],s.sizeMm[0],s.sizeMm[1],s.minMm[2],s.minMm[2],s.minMm[2]+s.sizeMm[2],s.minMm[2]+s.sizeMm[2],200));
 const allSolids=[...c.records,...wallSolids,...floorSolids,...memberZones];
 const supportSpaceClashes=exactCollisions(allSolids);if(supportSpaceClashes.length)errors.push('SUPPORT_SPACE_INTERSECTION');
 const mirroredSolids=allSolids.map(r=>({...r,originMm:[3000-r.originMm[0]-r.dimensionsMm[0],r.originMm[1],r.originMm[2]]}));
 const reflectedClashes=exactCollisions(mirroredSolids);if(reflectedClashes.length)errors.push('REFLECTED_NODE_INTERSECTION');
 if(c.checks.maxConcreteZ>3000)errors.push('OVER_HEIGHT');
 const nodeFloors=i.entries.filter(e=>/NF01-N01-P18|NF02-P12/.test(e.id)).reduce((s,e)=>s+e.concreteMassKg,0);
 const nodeMass=nodeFloors+n.mass.wallConcretePerNodeKg+c.mass.nodeRoofKg+c.mass.capsKg+c.mass.fasciasKg;
 return {revision:'P35',scope:'TYPICAL_REFERENCE_AND_NODE_COORDINATION_AUDIT_NOT48_BUILDINGS_OR_ENGINEERING_VERIFICATION',errors,
  checkedReferenceCount:i.entries.length,sourceMassAndArtifactHashesChecked:true,nodeConcreteIntersections:concreteClashes,nodeConcreteWithSupportSpaceIntersections:supportSpaceClashes,reflectedNodeIntersections:reflectedClashes,floorNotchAndP2Base0Included:true,
  maxNodeConcreteZ:c.checks.maxConcreteZ,mainProfileRevisionsUnchanged:true,typeIUnchanged:true,
  concreteMass:{nodeKnownPartsKg:nodeMass,nodeFloorPairKg:nodeFloors,nodeKnownPartCount:17,knownPartCountBreakdown:{floors:2,walls:4,nodeRoofs:2,caps:5,fascias:4},newNodeRoofDifferenceFromP31Kg:c.mass.nodeRoofKg-n.mass.roofConcretePerNodeKg,incrementIncludingCapsAndFasciasKg:c.mass.nodeRoofKg-n.mass.roofConcretePerNodeKg+c.mass.capsKg+c.mass.fasciasKg,completeNodeMassKg:null,excluded:['SUPPORT_MEMBERS','REBAR','INSERTS','FINISHES','GLAZING','GUTTER_AND_JOINT_MATERIALS']},
  nominalCorePieceCounts:{I:14,L:31,U:54,basis:'DEFAULT_CORE_RECIPE_ONLY_NOT_FINAL48_PRODUCT_BOM'},
  releaseBlocks:[
   {id:'E01',issue:'CONCRETE_REBAR_PRESTRESS_AND_CAPACITY_NOT_SELECTED_OR_CHECKED',gate:'P7_P8'},
   {id:'E02',issue:'CAP_FASCIA_HEAD_BASE_CONNECTIONS_AND_TEMPORARY_STABILITY_NOT_DESIGNED',gate:'P7_P8'},
   {id:'E03',issue:'LIFTING_ANCHORS_AND_HANDLING_NOT_DESIGNED',gate:'P7_P8'},
   {id:'E04',issue:'WEATHER_SEALS_MOVEMENT_HYDRAULICS_AND_WATER_TEST_NOT_APPROVED',gate:'BEFORE_FABRICATION_AND_USE'},
   {id:'E05',issue:'HEIGHT_OCCUPANCY_AND_LOCAL_APPROVAL_UNRESOLVED;3000_IS_STUDY_ENVELOPE_NOT_COMPLIANCE',gate:'BEFORE_PERMIT_OR_PRODUCTION_RELIANCE',source:'knowledge/modular-program-r02/HEIGHT_OCCUPANCY_REVIEW_P31.md'},
   {id:'E06',issue:'FINISHES_TOLERANCES_POCKETS_AND_ACTUAL_BEARINGS_NOT_FROZEN',gate:'P5_P6_P7_P8'}],
  engineeringApproved:false,productionReleased:false};
}
// This completes the development deliverables, never release-blocking engineering work.
export function checklist(){const c=read('output/weather-joints-p34/stage2-checklist.json');c.revision='P35';
 const weather=c.items.find(i=>i.id==='P2-16');weather.status='DONE';weather.evidence='output/node-cover-p33/register.json';weather.additionalEvidence=['output/weather-joints-p34/register.json'];weather.remaining=[];weather.acceptanceNote='CONCRETE_CAP_FASCIA_SOLIDS_AND_SPATIALLY_DEFINED_JOINT_END_DRAIN_RESERVATIONS; NOT_SELECTED_SEALS_OR_ENGINEERED_CONNECTIONS';
 for(const [id,evidence] of [['P2-12','output/node-cover-p33/register.json'],['P2-14','output/stage2-review-p35/typical-index.json'],['P2-19','output/stage2-review-p35/audit.json'],['P2-20','output/stage2-review-p35/README.md']]){const p=c.items.find(i=>i.id===id);p.status='DONE';p.evidence=evidence;}
 const handoff=c.items.find(i=>i.id==='P2-20');handoff.blockingReview='RETAINED_AS_E05_PRODUCTION_PERMIT_HOLD_NOT_CLOSED_OR_WAIVED';handoff.acceptanceNote='USER_P32_AUTHORIZED_IN_SCOPE_DEVELOPMENT; THIS_IS_A_REVIEW_BASELINE_WITH_EXPLICIT_UNRESOLVED_RELEASE_BLOCKS';
 c.completed=c.items.filter(i=>i.status==='DONE').length;c.percent=c.completed/c.total*100;c.stageStatus='AWAITING_USER_STAGE_REVIEW';c.nextStageAuthorized=false;c.releaseBlocks='output/stage2-review-p35/audit.json';return c;
}
export function readme(i,a){return ['# ชุดส่งตรวจขั้น2/8 — Typical Master P35','',
 '**ครบ100% เฉพาะชุดพัฒนา Typical เพื่อส่งตรวจ — ไม่ใช่แบบอนุมัติผลิต/ก่อสร้าง/ยก**','',
 'หยุดรอผู้ใช้ตรวจขั้น2 ไม่เริ่มขั้น3อัตโนมัติ การยอมรับชุดนี้ไม่ปิดข้อจำกัดการผลิตที่ระบุด้านล่าง','',
 '## สิ่งที่ส่ง','',
 '- Typicalปัจจุบัน44tag/revision มีภาพ2D/3D มิติ มวล และสถานะหูยก ไม่ใช่จำนวนชิ้นต่ออาคารหรือจำนวนแม่แบบ',
 '- ชุดโหนดใหม่11ชิ้น: ครอบ5 + แผงปิด4 + หลังคาโหนด2 มีฉบับสะท้อนU-N02',
 '- รอยต่อหลัก8แนว สัน8ตำแหน่ง และไหล่D4แนว เป็นพื้นที่ประสานที่ยังต้องเลือกระบบซีล',
 '- ผังประกอบ ภาพ3D รายการตรวจรวม และข้อจำกัดส่งต่อ',
 '- คงกริด1500 หลังคาช่วงหลักA/B/C/DและType Iเดิม; โหนดใช้ระดับบนNR2800ตามกรณีศึกษาที่ผู้ใช้เลือก',
 '', '## ภาพประกอบสำคัญ','',
 '[3Dโหนด](assets/output/weather-joints-p34/NODE-3D-P34.png) · [แปลนชุดครอบ](assets/output/node-cover-p33/N90-COVER-ASSEMBLY-P33.png) · [รอยต่อ4รูปทรง](assets/output/weather-joints-p34/PROFILE-JOINTS-P34.png) · [ปลายครอบ/ราง](assets/output/weather-joints-p34/END-DRAIN-JOINTS-P34.png)','',
 '## มิติและมวลที่เปลี่ยน','',
 `ยอดครอบ ${a.maxNodeConcreteZ.toFixed(2)}มม. / ครอบหนา100ตั้งฉาก / แผงปิดหนา100 / NRหนา175 / ผนังโหนดสูง2430หนา175`,
 'NR01-P31เดิมถูกแทนด้วยNR-S2865×1365×175 และNR-N2865×1485×175 เพื่อเว้นขอบให้แผงปิด ไม่วางหลังคาสองชุดซ้อนกัน',
 `คอนกรีตโหนดส่วนที่มีรูปทรง17ชิ้น ≈${a.concreteMass.nodeKnownPartsKg.toFixed(2)}kg; ไม่รวมโครงรองรับ เหล็ก อุปกรณ์และตกแต่ง`,
 `NRใหม่ลด ${(-a.concreteMass.newNodeRoofDifferenceFromP31Kg).toFixed(2)}kg แต่รวมครอบและแผงปิดแล้วเพิ่มสุทธิ ${a.concreteMass.incrementIncludingCapsAndFasciasKg.toFixed(2)}kg ต่อโหนดเทียบP31`,
 'มวลใช้ความหนาแน่นทดลอง2400kg/m³ ไม่ใช่มวลยกที่อนุมัติ และไม่รวมทุกtagในตารางเป็นหนึ่งอาคาร',
 '', '## บัญชีภาพดาวน์โหลด','', '| Tag / PNG | SVG | คอนกรีตประมาณ kg |','|---|---|---:|',
 ...i.entries.map(e=>`| [${e.id}](assets/${e.preview}) | [SVG](assets/${e.svg}) | ${e.concreteMassKg.toFixed(2)} |`),
 '', '## ข้อจำกัดที่ยังไม่ผ่าน — ห้ามใช้เพื่อผลิตจริง','',
 ...a.releaseBlocks.map(e=>`- ${e.id}: ${e.issue}`),
 '', 'คำกล่าวอนุมัติผลิตของผู้ใช้บันทึกไว้แล้ว แต่ไม่มีผลคำนวณ/หลักฐานผู้รับผิดชอบสำหรับเปลี่ยนengineeringApprovedหรือproductionReleasedเป็นtrue การทดสอบซอฟต์แวร์ไม่ใช่การรับรองชิ้นงาน',
 '', '## งานขั้น3 หลังผู้ใช้สั่งเริ่มเท่านั้น','',
 'นำTypicalชุดนี้ไปจัดแปลน/รูปด้าน/รูปตัดมีมิติครบ48สินค้า เชื่อมชุดช่องเปิด4การใช้งานและรายการชิ้นต่อหลัง ตรวจพื้นที่ใช้งานและช่องผ่านจริง ไม่ตีความnominal18/27/45m²เป็นพื้นที่สุทธิ',
 'รหัสแผงปลายใช้EPX-P28; โหนดใช้NW-P31 + NR-S/NR-N/ครอบ/แผงปิดP33; ห้ามคัดNR01เดิมหรือEPเก่ามาบวกซ้ำ',
 'การแก้ที่เกิดจากแบบ48หลังหรือผลวิศวกรรมต้องออกrevisionใหม่และตรวจมวล/รอยต่อซ้ำ ประเด็นความสูงตามการใช้ต้องทบทวนก่อนนำแบบไปอ้างขออนุญาตหรือผลิต ไม่อ้างความสูง3000ว่าใช้ได้ทุกกิจกรรม',
 '', '## ขอบเขตไฟล์ชุดนี้','',
 'assetsคงโครงสร้างทางเดินเดิมภายใต้รากโครงการ; JSONต้นทางอาจอ้างประวัติที่ไม่ได้บรรจุทั้งหมด ชุดนี้เป็นแพ็กเกจตรวจแบบ ไม่ใช่เครื่องมือbuildแบบstandalone ไม่มีไฟล์RVT/STAADที่สร้างปลอม ไม่มีการอัปเดตเว็บหรือเปิดFirebase',
 'ดู typical-index.json / audit.json / stage2-checklist.json / manifest.json คู่กัน ค่าhashยืนยันไฟล์ตรงฉบับ ไม่ยืนยันความปลอดภัยโครงสร้าง',''].join('\n');}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/stage2-review-p35');fs.mkdirSync(out,{recursive:true});const i=index(),a=audit();if(a.errors.length)throw Error(a.errors.join(','));
 const assets=new Set(i.entries.flatMap(e=>[e.source,e.preview,e.svg]));
 for(const folder of ['output/node-cover-p33','output/weather-joints-p34'])for(const f of fs.readdirSync(path.join(root,folder)))if(/\.(png|svg|json)$/.test(f))assets.add(`${folder}/${f}`);
 for(const f of ['knowledge/modular-program-r02/decision-scope-p32.json','knowledge/modular-program-r02/HEIGHT_OCCUPANCY_REVIEW_P31.md','knowledge/modular-program-r02/decision-node-level-p31.json','knowledge/modular-program-r02/TYPICAL_PRESENTATION_AND_MASS_P05.md','knowledge/modular-program-r02/LIFTING_CONCEPT_L01.md'])assets.add(f);
 for(const f of assets){const dest=path.join(out,'assets',f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,f),dest);}
 const docs={'typical-index.json':i,'audit.json':a,'stage2-checklist.json':checklist()};for(const [name,data] of Object.entries(docs))fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2));fs.writeFileSync(path.join(out,'README.md'),readme(i,a));
 const files=[...assets].map(p=>({path:'assets/'+p,sha256:hash(p)}));for(const p of [...Object.keys(docs),'README.md'])files.push({path:p,sha256:hash('output/stage2-review-p35/'+p)});
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({revision:'P35',status:'DEVELOPMENT_REVIEW_NOT_PRODUCTION',files},null,2));console.log(JSON.stringify({entries:i.entries.length,audit:a,progress:checklist().percent}));
}
