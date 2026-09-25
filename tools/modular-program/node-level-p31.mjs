import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';import {model as oldWalls,board as wallBoard} from './node-wall-p13.mjs';import {model as oldRoofs,roofBoard} from './node-roof-p14.mjs';import {budget} from './local-transition-p30.mjs';
export function model(){
  const w=oldWalls(),r=oldRoofs();
  const walls=w.records.map(old=>{const p=structuredClone(old);p.id=p.id.replace('P13','P31');p.sourceRevision=old.id;p.dimensions.heightMm-=50;const v=p.dimensions.widthMm*p.dimensions.heightMm*175/1e9;p.mass.netVolumeM3=v;p.mass.concreteMassKg=v*2400;p.concreteOnlyCentroidMm[2]=p.dimensions.heightMm/2;p.massChangeKg=p.mass.concreteMassKg-old.mass.concreteMassKg;return p;});
  const roof=structuredClone(r.records[0]);roof.id='TS-N90-NR01-P31';roof.sourceRevision=r.records[0].id;roof.geometryUnchanged=true;roof.installationChanged=true;
  return {revision:'P31',visibility:'INTERNAL_TEAM',records:[...walls,roof],
    levelStudy:{roofTopZ:2800,roofUndersideZ:2625,wallTopZ:2605,wallBottomZ:175,wallHeightMm:2430,roofWallSpaceMm:20,status:'USER_AUTHORIZED_STUDY_NOT_BEARING_DESIGN'},
    nodes:w.nodes.map(n=>({nodeId:n.nodeId,originMm:n.originMm,openFace:n.openFace,
      walls:n.walls.map(p=>({...p,id:p.id.replace('P13','P31'),typicalId:p.typicalId.replace('P13','P31'),size:[p.size[0],p.size[1],2430]})),
      roofs:r.nodes.find(p=>p.nodeId===n.nodeId).roofs.map(p=>({...p,id:p.id.replace('P14','P31'),typicalId:roof.id,minMm:[p.minMm[0],p.minMm[1],2625]}))})),
    headSpaceStudies:[100,200].map(depth=>({headDepthMm:depth,headTopZ:2605,headUndersideZ:2605-depth,heightBeforeFinishesMm:2605-depth-175,finishedClearHeightMm:null,selected:false})),
    weatherBudget:budget({nodeLoweringMm:50}),
    mass:{wallConcretePerNodeKg:3*walls[0].mass.concreteMassKg+walls[1].mass.concreteMassKg,roofConcretePerNodeKg:2*roof.mass.concreteMassKg,wallMassChangePerNodeKg:3*walls[0].massChangeKg+walls[1].massChangeKg,wholeNodeMassKg:null},
    unchanged:['MAIN_A_B_C_D_PROFILES','EXTERNAL_END_EPX_P28','FLOOR_GEOMETRY','TYPE_I'],
    supersedesForDevelopment:['P13_WALL_HEIGHT_AND_MASS','P14_NODE_ROOF_ELEVATION','P20_NODE_HEAD_DATUM','P21_WEATHER_ELEVATION'],
    pending:['CONCRETE_TRANSITION_AND_CAP_SOLIDS','CORNER_SHOULDER_END_CLOSURES','GUTTER_HEIGHT_COORDINATION','SUPPORT_AND_MOVEMENT_DESIGN'],engineeringApproved:false,productionReleased:false};
}
export function board(p){return p.dimensions?wallBoard(p).replaceAll('P13','P31').replace('Z2655','Z2605'):roofBoard(p).replaceAll('P14','P31').replace('Z2675','Z2625').replace('Z2850','Z2800').replace('ระดับยังไม่เลือก','ระดับกรณีศึกษาที่ผู้ใช้ให้พัฒนาต่อ');}
export function checklist(){const c=JSON.parse(fs.readFileSync(path.join(root,'output/local-transition-p30/stage2-checklist.json')));c.revision='P31';for(const id of ['P2-11','P2-12','P2-15']){const i=c.items.find(x=>x.id===id);i.previousEvidence=i.evidence;i.evidence='output/node-level-p31/register.json';}c.items.find(x=>x.id==='P2-16').partialEvidence.push('output/node-level-p31/register.json');c.items.find(x=>x.id==='P2-20').blockingReview='HEIGHT_DATUM_OCCUPANCY_AND_LOCAL_AUTHORITY_CONFIRMATION';return c;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=path.join(root,'output/node-level-p31');fs.mkdirSync(out,{recursive:true});const m=model(),req=createRequire(import.meta.url);let sharp;try{sharp=req('sharp');}catch{sharp=req('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 const files=[];for(const p of m.records){const svg=board(p);fs.writeFileSync(path.join(out,p.id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,p.id+'.png'));files.push(p.id+'.svg',p.id+'.png');}
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify(m,null,2));files.push('register.json');
 fs.writeFileSync(path.join(out,'stage2-checklist.json'),JSON.stringify(checklist(),null,2));files.push('stage2-checklist.json');
 fs.writeFileSync(path.join(out,'README.md'),'# P31 — ลดระดับเฉพาะโหนด50มม.\n\nขั้น2/8 ยัง85% ไม่มีการอนุมัติผลิตหรือยก\n\n'+m.records.map(p=>`- [${p.id}](${p.id}.png): ${p.mass.concreteMassKg.toFixed(3)} kg คอนกรีตทดลอง2400kg/m³`).join('\n')+'\n\nผนังสูง2430 / ยอด2605 / ช่องบน20 / ใต้NR2625 / บนNR2800มม.\n\nมวลNRไม่เปลี่ยน การลดระดับไม่ใช่การลดความหนา175มม. มวลยกและระบบรองรับยังไม่ออกแบบ\n');files.push('README.md');
 const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({dependencies:['tools/modular-program/node-level-p31.mjs','tools/modular-program/node-wall-p13.mjs','tools/modular-program/node-roof-p14.mjs','tools/modular-program/local-transition-p30.mjs','knowledge/modular-program-r02/decision-node-level-p31.json'].map(p=>({path:p,sha256:hash(p)})),files:files.map(f=>({file:f,sha256:hash('output/node-level-p31/'+f)}))},null,2));console.log(JSON.stringify(m.mass));
}
