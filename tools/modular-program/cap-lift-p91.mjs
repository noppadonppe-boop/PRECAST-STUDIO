import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
import {root,keys,planes,swept,sub,dot} from './cap-geometry-p55.mjs';
import {build as layout,board,verticalMesh} from './concrete-lift-p52.mjs';
import {hash,volumeCg} from './stage5-p38.mjs';
export const out=path.join(root,'output/cap-lift-p91');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
export function build(key){
 const mouldPath=`output/cap-hardware-p56/${key}.json`,mould=read(mouldPath),s=read(mould.source.path),oldPath=`output/concrete-lift-p52/${s.id}.json`,old=read(oldPath);
 assert.equal(hash(path.join(root,mould.source.path)),mould.source.sha256);assert.equal(old.source.sha256,mould.source.sha256);
 const p=mould.concrete,faces=p.faces,dims=p.boundsMm.map(([a,b])=>{assert.ok(Math.abs(a)<1e-7);return b-a;});
 const concrete=structuredClone(s);concrete.cavity.facesMm=faces;concrete.cavity.dimensionsMm=dims;concrete.cavity.normalThicknessMm=p.normalThicknessMm;
 concrete.mass.concreteGeometricCgCastingMm=p.properties.cgMm;assert.equal(p.massKg,s.mass.concreteKg);
 const m=layout(concrete,mouldPath),mesh=volumeCg(faces);
 assert.ok(Math.abs(mesh.volumeM3-p.sourceVolumeM3)<1e-9);
 mesh.cgMm.forEach((v,i)=>assert.ok(Math.abs(v-p.properties.cgMm[i])<1e-7));
 m.revision='P91';m.key=key;m.geometryRevision='P56';m.originalTypicalSource=mould.source;
 m.previousLiftingSource={path:oldPath,sha256:hash(path.join(root,oldPath))};m.algorithmSource={path:'tools/modular-program/concrete-lift-p52.mjs',sha256:hash(path.join(root,'tools/modular-program/concrete-lift-p52.mjs'))};
 m.mouldTransform=mould.transform;m.currentCastingFacesMm=faces;
 const transformPoint=q=>mould.transform.basisRows.map((row,i)=>dot(sub(q,mould.transform.originSourceMm),row)-mould.transform.localShiftMm[i]);
 const ray=verticalMesh(faces),pp=planes(faces),oldGravity=mould.transform.basisRows.map(row=>dot(row,[0,0,-1]));
 assert.ok(faces.flat().every(q=>pp.every(p=>p.d-dot(p.n,q)>=-1e-5)),'Casting is not the expected convex solid');
 m.coordinateReview={method:'Recompute candidate zones, symbolic routes and vertical equilibrium on the P56 casting surface; transformed P52 zones are reference only.',oldGravityTransformed:oldGravity,newGravityUnit:[0,0,-1],poseTiltDeg:Math.acos(Math.max(-1,Math.min(1,-oldGravity[2])))*180/Math.PI,oldZonesTransformedForReferenceOnly:old.candidateZoneCentresMm.map(q=>{const xyzMm=transformPoint(q),z=ray(xyzMm[0],xyzMm[1]).at(-1)?.[1];return {xyzMm,onCurrentTop:z!==undefined&&Math.abs(z-xyzMm[2])<1e-6};})};
 // Every P56 cap/fascia is convex. Endpoint half-space inclusion proves each
 // straight symbolic route segment stays inside, not physical bar cover/bends.
 const margins=m.reinforcementRoutes.flatMap(b=>b.pointsMm.flatMap(q=>pp.map(p=>p.d-dot(p.n,q))));
 assert.ok(Math.min(...margins)>1e-5,'Symbolic route outside convex casting');
 const circleMargins=m.candidateZoneCentresMm.flatMap(q=>pp.map(p=>p.d-dot(p.n,[q[0],q[1],q[2]-25])-m.zoneSampleRadiusMm*Math.hypot(p.n[0],p.n[1])));
 const bed=mould.parts.find(p=>p.tag==='M00');assert.ok(bed);
 const bedHits=bed.cells.map((cell,i)=>swept(faces,cell,[0,0,300])?i:null).filter(i=>i!==null);assert.deepEqual(bedHits,[]);
 m.geometricQa={method:'Convex half-space checks for entire straight route segments; analytical horizontal candidate disk at z-25; continuous vertical casting/bed SAT for first300mm after all removable parts are clear.',minimumRouteCentrelineFaceMarginMm:Math.min(...margins),minimumCandidateDiskFaceMarginMm:Math.min(...circleMargins),candidateDiskInside:Math.min(...circleMargins)>=-1e-6,verticalBedWithdrawalMm:300,bedCollisionCells:bedHits,barCoverOrDiameterVerified:false,anchorEdgeDistanceVerified:false,riggingHardwareCollisionChecked:false};
 assert.ok(m.geometricQa.candidateDiskInside,'Candidate disk outside convex casting');
 m.notDrillingCoordinates=true;m.stageComplete=false;
 m.excluded=[...m.excluded,'actual lifting inserts/cages and mould retention/support before unlocking','lifting frame section design and crane reach','clearance beyond the audited300mm bed-release translation'];
 return {model:m,drawingSource:concrete};
}
export async function generate(){
 fs.mkdirSync(out,{recursive:true});const sharp=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'),records=[];
 for(const key of keys){const {model:m,drawingSource:s}=build(key);const svg=board(s,m).replace('P52 | CONCRETE LIFTING &amp; REBAR ROUTES','P91 | CAP LIFTING IN P56 CASTING POSE').replace('ท่าหล่อเดิม','ท่าหล่อ P56');assert.ok(svg.includes('P91 | CAP LIFTING'));
  fs.writeFileSync(path.join(out,key+'.json'),JSON.stringify(m,null,2));fs.writeFileSync(path.join(out,key+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,key+'.png'));
  records.push({id:m.id,key,typicalId:m.typicalId,source:m.source,previousLiftingSource:m.previousLiftingSource,files:['json','svg','png'].map(ext=>({path:`output/cap-lift-p91/${key}.${ext}`,sha256:hash(path.join(out,key+'.'+ext))}))});console.log(key,{mass:m.concreteOnlyMassKg,tilt:m.coordinateReview.poseTiltDeg,minimumDiskMargin:m.geometricQa.minimumCandidateDiskFaceMarginMm});
 }
 fs.writeFileSync(path.join(out,'register.json'),JSON.stringify({revision:'P91',stage:5,scope:'Nine updated free-suspension concrete layouts in P56 casting coordinates; NOT complete handling/rotation or Stage5 design',records,decisionSha256:hash(path.join(root,'knowledge/modular-program-r02/decision-lifting-p52.json')),generatorSha256:hash(path.join(root,'tools/modular-program/cap-lift-p91.mjs')),stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P91 พิกัดยกครอบในท่าหล่อปัจจุบัน</title><style>body{font:17px Tahoma,Arial;line-height:1.8;max-width:1450px;margin:auto;padding:24px;color:#132f53}img{width:100%}summary{cursor:pointer}details{margin:24px 0}.note{padding:18px;background:#fff0d7}a{color:#174e83}</style><h1>ขั้น5/8 · P91 แผนยกครอบและแผงปิดขอบในท่าหล่อP56</h1><p class="note">พัฒนาใหม่9/9รูปทรงในพิกัดแม่แบบปัจจุบัน ไม่ใช่ขั้น5ครบ100% และไม่ใช่อนุมัติยกจริง<br>สมมติกำลังคอนกรีตเพียงพอเพื่อพัฒนาตามP52 · แนวเหล็กไม่ระบุขนาด</p><p>ใช้geometryคอนกรีตP56โดยไม่เปลี่ยนมิติ น้ำหนักหรือรูปทรง ตำแหน่งโซนยกและแนวเหล็กเลือกใหม่บนผิวบนในท่าหล่อปัจจุบัน คำนวณแรงแนวดิ่งให้ผ่านCG ไม่เพียงหมุนพิกัดเดิมแล้วคงแรงเดิม.</p><p>คานสีน้ำเงินเป็นผังระบบ3ขาแนวดิ่ง ยังไม่ใช่ขนาดเหล็กคานยกหรือhardwareจริง โซนสีทองไม่ใช่ตำแหน่งเจาะติดตั้งพุก และรัศมีตรวจเนื้อคอนกรีตไม่ใช่ระยะขอบที่ผู้ผลิตกำหนด</p><p>ตรวจเส้นทางตรงเชิงสัญลักษณ์ในเนื้อคอนกรีตด้วยhalf-spaceและตรวจวงตรวจพื้นที่ต่อเนื่อง ไม่ใช้แทนการตรวจขนาดเหล็ก ระยะดัด cover หรือการพัฒนาแรงในเหล็ก. ตรวจทางยกขึ้น300มม.พ้นฐานหลังแบบข้าง/การยึดติดถูกปลดหมดแล้ว ไม่ครอบคลุมแรงดูดติด การพลิกหรือยกแม่แบบเหล็ก</p><p><a href="register.json" download>ทะเบียนและhash</a></p>${records.map(r=>`<details><summary>${r.typicalId}</summary><img src="${r.key}.png" alt="${r.typicalId} แผนยกเชิงพัฒนาในท่าหล่อP56"><p><a href="${r.key}.png" download>PNG</a> · <a href="${r.key}.svg" download>SVG</a> · <a href="${r.key}.json" download>พิกัด / มวล / CG / แรง / แนวเหล็ก JSON</a></p></details>`).join('')}<p>ยังต้องปิดอุปกรณ์ยก คานยก สลิง/ห่วง ระยะทำงานเครน และการพยุงก่อนปลดตามP40. P52เดิมเก็บเป็นประวัติ ไม่ถูกเขียนทับ</p></html>`);
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await generate();
