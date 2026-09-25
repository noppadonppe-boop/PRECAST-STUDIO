import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {families,build as sealed,removalAudit} from './table-seal-p95.mjs';
import {sources,read,sha} from './table-weld-p93.mjs';
import {box} from './table-channel-p94.mjs';
import {properties,swept,loft} from './cap-geometry-p55.mjs';
export {families};export const out='output/table-seal-backer-p96';
export function stripUDL({spanMm,tMm,widthMm=1,pMPa,E=200000}){
 assert.ok(spanMm>0&&tMm>0&&widthMm>0&&pMPa>=0&&E>0);
 const I=widthMm*tMm**3/12,Z=widthMm*tMm**2/6,q=pMPa*widthMm,M=q*spanMm**2/8;
 return {spanMm,tMm,widthMm,pMPa,I_mm4:I,Z_mm3:Z,lineNmm:q,momentNmm:M,stressMPa:M/Z,deflectionMm:5*q*spanMm**4/(384*E*I),reactionPerEndN:q*spanMm/2};
}
export function weldsFor(b){
 const [[x0,y0],[x1,y1]]=b.boundsMm,leg=3*Math.sqrt(2),w=[];
 for(const [suffix,y,dy]of [['S',y0,-1],['N',y1,1]]){
  const tri=x=>[[x,y,-6],[x,y+dy*leg,-6],[x,y,-6-leg]];
  w.push({tag:`${b.tag}-WT-${suffix}`,bar:b.tag,parent:'M00',role:'BED_ATTACHMENT',root:[[x0+10,y,-6],[x1-10,y,-6]],faces:loft(tri(x0+10),tri(x1-10)),physicalLengthMm:x1-x0-20,throatMm:3});
  for(const [end,x,dx]of [['L',x0,1],['R',x1,-1]]){const tri=z=>[[x,y,z],[x+dx*leg,y,z],[x,y+dy*leg,z]];w.push({tag:`${b.tag}-WE-${end}-${suffix}`,bar:b.tag,parent:'M00',role:'RIB_SIDE_ATTACHMENT',root:[[x,y,-60],[x,y,-20]],faces:loft(tri(-60),tri(-20)),physicalLengthMm:40,throatMm:3});}
 }
 return w;
}
export function build(family){
 const c=sealed(family),src=read(sources(family).original),[L,W,H]=c.cavityMm,n=Math.round(L/src.ribPitchMm),pitch=L/n;
 assert.ok(Math.abs(pitch-src.ribPitchMm)<1e-7);assert.ok(Math.abs(pitch-50-src.maxSkinClearSpanMm)<1e-7);
 const ribs=src.parts.find(p=>p.id==='M00').cells;
 for(let i=0;i<=n;i++)assert.ok(ribs.some(r=>Math.abs(r.min[0]-(i*pitch-25))<1e-6&&r.min[2]===-106&&r.max[2]===-6),'Source rib envelope changed');
 const bars=[];
 for(const [side,y0] of [['S',-6],['N',W]])for(let i=0;i<n;i++){
  const x0=i*pitch+25,x1=(i+1)*pitch-25,faces=box(x0,x1,y0,y0+6,-66,-6),tag=`SBK-${side}-${String(i+1).padStart(2,'0')}`;
  const hits=c.parts.filter(p=>p.solids.some(f=>swept(f,faces))).map(p=>p.id);assert.deepEqual(hits,[]);
  bars.push({tag,parent:'M00',quantity:1,faces,finishedDimensionsMm:[x1-x0,60,6],boundsMm:[[x0,y0,-66],[x1,y0+6,-6]],properties:properties(faces),initialCollisions:hits});
 }
 const welds=bars.flatMap(weldsFor),steel=[...c.parts.flatMap(p=>p.solids.map(f=>({tag:p.id,faces:f}))),...bars.map(b=>({tag:b.tag,faces:b.faces}))];
 const weldClashes=[];for(const w of welds)for(const p of steel)if(swept(w.faces,p.faces))weldClashes.push(`${w.tag}:${p.tag}`);assert.deepEqual(weldClashes,[]);
 for(let i=0;i<welds.length;i++)for(let j=0;j<i;j++)assert.equal(swept(welds[i].faces,welds[j].faces),false,'Weld envelope overlap');
 const initialBed=ribs.map(r=>box(r.min[0],r.max[0],r.min[1],r.max[1],r.min[2],r.max[2]));
 const insertions=bars.map(b=>{const d=[0,b.tag.startsWith('SBK-S')?-200:200,0],allHits=c.parts.filter(p=>p.solids.some(f=>swept(b.faces,f,d))).map(p=>p.id);return {tag:b.tag,reverseWithdrawalMm:d,hits:initialBed.some(f=>swept(b.faces,f,d))?['ORIGINAL_BED']:[],installedToolObstructions:allHits,scope:'Fabrication insertion before P47/P51 bolt backing plates, shutters and removable locks. Weld/inspect before longitudinal rails restrict underside access. Audit includes source bed ribs/rails but does not certify welding-tool access.'};});assert.ok(insertions.every(s=>!s.hits.length),JSON.stringify(insertions.filter(s=>s.hits.length)));
 c.parts.find(p=>p.id==='M00').solids.push(...bars.map(b=>b.faces),...welds.map(w=>w.faces));const motion=removalAudit(c);assert.ok(motion.steps.every(s=>!s.hits.length));
 const density=7850,g=9.80665,sealingPressureMPa=.1,sealWidthMm=3;
 const bearingPressureNmm=sealingPressureMPa*sealWidthMm;
 const selfWeightNmm=6*60*density*g/1e9;
 const tributaryBedWeightNmm=6*6*density*g/1e9;
 const nominalWeldMetalKg=welds.reduce((s,w)=>s+properties(w.faces).volumeMm3*density/1e9,0);
 const weldWeightNmm=nominalWeldMetalKg*g/(bars.length*(pitch-50));
 const lineLoadNmm=bearingPressureNmm+selfWeightNmm+tributaryBedWeightNmm+weldWeightNmm;
 const b=stripUDL({spanMm:pitch-50,tMm:60,widthMm:6,pMPa:lineLoadNmm/6});
 const noBacker=stripUDL({spanMm:pitch,tMm:4.9,pMPa:sealingPressureMPa});
 const concreteSkin=stripUDL({spanMm:pitch,tMm:6,pMPa:25*H/1e6+6*density*g/1e9+.0024});
 const longSealForceN=sealingPressureMPa*sealWidthMm*2*L;
 const endSealForceN=sealingPressureMPa*sealWidthMm*2*W;
 const cornerSealForceN=sealingPressureMPa*Math.PI*(4.5**2-1.5**2);
 const endWelds={throatMm:3,physicalLengthMm:40,effectiveLengthEachMm:34,seamsPerEnd:2,rootZMm:[-60,-20],demandShearN:b.reactionPerEndN,demandAverageThroatMPa:b.reactionPerEndN/(2*34*3),scope:'End shear demand only, no code capacity or RHS wall/distortion/upper attachment verification.'};
 return {revision:'P96',family,cavityMm:c.cavityMm,pitchMm:pitch,ribCount:n+1,bars,barCount:bars.length,addedSteelKg:bars.reduce((s,p)=>s+p.properties.volumeMm3*density/1e9,0),nominalWeldMetalKg,welds,weldClashes,insertions,motion,stripChecks:{supportedBacker:b,unsupportedGrooveStrip:noBacker,concreteSkin},operatingCandidate:{sealingPressureMPa,sealWidthMm,longSealForceN,endSealForceN,cornerSealForceN,baseSealForceN:longSealForceN+endSealForceN+cornerSealForceN,compoundQualified:false,barSelfWeightNmm:selfWeightNmm,tributaryBedWeightNmm,weldWeightNmm,lineLoadNmm},endWelds,sources:[`output/table-seal-p95/${family}.json`,sources(family).original].map(path=>({path,sha256:sha(path)})),status:'BACKER_LAYOUT_CANDIDATE',scope:'Two longitudinal seal rows. End groove rests over existing end rib. Local simple-beam strip, not whole mould capacity. Nominal rib envelope only; actual corner profile/wall properties required.',stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 fs.mkdirSync(out,{recursive:true});const records=[];
 for(const family of families){const r=build(family);fs.writeFileSync(`${out}/${family}.json`,JSON.stringify(r,null,2));records.push({family,barCount:r.barCount,addedSteelKg:r.addedSteelKg,deflectionMm:r.stripChecks.supportedBacker.deflectionMm,file:`${family}.json`,sha256:sha(`${out}/${family}.json`)});}
 fs.writeFileSync(`${out}/register.json`,JSON.stringify({revision:'P96',records,stageComplete:false,engineeringApproved:false,productionReleased:false},null,2));console.log(JSON.stringify(records));
}
