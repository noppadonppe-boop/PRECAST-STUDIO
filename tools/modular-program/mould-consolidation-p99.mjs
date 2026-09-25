import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {read,sha} from './table-weld-p93.mjs';
import {build as table} from './table-lock-base-p97.mjs';
import {cellFaces} from './prism-tools-p54.mjs';
import {properties} from './cap-geometry-p55.mjs';
import {bounds} from './casting-equivalence-p98.mjs';
export const out='output/mould-coordinated-p99';
const faces=c=>Array.isArray(c)?c:cellFaces(c);
const bcache=new Map();
export function compose(a){
 const r=read(a.modelPath),extra=[],notes=[],inputs=[...a.inputs];let parts=[],concrete=r.concrete?.faces??r.concreteFacesMm,motions=[];
 const pin=p=>{const m=read(p);inputs.push({path:p,sha256:sha(p)});return m;};
 const part=(p)=>({tag:p.tag??p.id,role:p.role??p.name??p.group??'MODELLED_COMPONENT',material:'STEEL_NOMINAL',solids:(p.cells??[]).map(faces)});
 if(a.kind==='TABLE'){
  if(!bcache.has(a.modelFamily))bcache.set(a.modelFamily,table(a.modelFamily,{audit:false}));const b=bcache.get(a.modelFamily),c=b.c;
  concrete=c.sourceCandidate.concrete;
  parts=c.parts.map(p=>({tag:p.id,role:p.id==='M00'?'CASTING_BED':p.id.startsWith('M')?'SIDE_SHUTTER':'REMOVABLE_FASTENER',material:'STEEL_NOMINAL',solids:[...p.solids,...c.sourceCandidate.welds.filter(w=>w.parent===p.id).flatMap(w=>w.nominalSolids)]}));
  extra.push(...c.seals.map(s=>({tag:s.tag,owner:s.owner,role:'SEAL_COMPRESSED_STATE',material:'SEAL_COMPOUND_NOT_SELECTED',solids:s.solids})));
  motions=r.geometry.motion.steps.map((s,i)=>({order:i+1,tags:[s.id],deltaMm:s.translationMm,removeAfterStep:s.removeAfterStep,phase:s.phase,nominalHits:s.hits}));
  notes.push(...r.loadpathLimits,...r.massLimits);
 }else if(a.kind==='ABD_SHELL'){
  parts=r.parts.map(part);
  const w=pin(r.overlayReferences.web),s=pin(r.overlayReferences.seam),e=pin(r.overlayReferences.edge);
  for(const p of parts){p.solids.push(...w.stock.filter(x=>x.owner===p.tag).flatMap(x=>x.solids),...s.plates.filter(x=>x.owner===p.tag).flatMap(x=>x.cells.map(faces)),...e.stock.filter(x=>x.owner===p.tag).flatMap(x=>x.cells.map(faces)));}
  parts.push(...s.hardware.map(p=>({...part(p),role:'SEAM_FASTENER'})));
  for(const [tag,...legs]of r.sequence)for(let i=0;i<legs.length;i++)motions.push({order:motions.length+1,tags:[tag],deltaMm:legs[i],removeAfterStep:i===legs.length-1,phase:'SOURCE_P85_TRANSLATION',nominalHits:null});
  notes.push('P85 parts + P71 web + P74 plates/hardware + P80 stock, each once. P89 remains separate alternative; P90/P92 are not strength approval of this P85 geometry.');
 }else{
  parts=(r.items??r.parts).map(part);
  const ms=r.removal?.steps??r.audit.moves??r.audit.continuousMoves??r.audit.steps;
  assert.ok(Array.isArray(ms),a.id);
  motions=ms.map((s,i)=>({order:i+1,tags:s.ids??[s.tag??s.id],deltaMm:s.deltaMm??s.translationMm,removeAfterStep:null,phase:'SOURCE_SEQUENCE',nominalHits:s.hits??s.collisions??null}));
 }
 notes.push(...r.limits??[],...r.limitations??[],...r.unresolved??[]);
 assert.ok(parts.length&&concrete.length);assert.equal(new Set(parts.map(p=>p.tag)).size,parts.length,a.id);
 assert.ok(motions.every(m=>m.tags.length&&m.tags.every(t=>parts.some(p=>p.tag===t))&&m.deltaMm?.length===3&&m.deltaMm.every(Number.isFinite)),a.id+' motion mapping');
 for(const p of [...parts,...extra]){assert.ok(p.solids.length,p.tag);p.envelopeMm=bounds(p.solids.flat());p.dimensionsXYZmm=p.envelopeMm.map(([a,b])=>b-a);const ps=p.solids.map(properties),vol=ps.reduce((s,p)=>s+p.volumeMm3,0);assert.ok(vol>0&&Number.isFinite(vol));p.nominalStockVolumeMm3=vol;p.nominalStockMassKg=p.material==='STEEL_NOMINAL'?vol*7850/1e9:null;p.nominalStockCgMm=[0,1,2].map(i=>ps.reduce((s,p)=>s+p.volumeMm3*p.cgMm[i],0)/vol);}
 const concreteGeometryStatus=a.matches?'CHECKED_AGAINST_TYPICAL_LINKED_SOURCE':'MISMATCH';assert.equal(concreteGeometryStatus,'CHECKED_AGAINST_TYPICAL_LINKED_SOURCE');
 const basis=parts.reduce((s,p)=>s+p.nominalStockMassKg,0);
 const setup=read(a.inputs.find(p=>p.path.endsWith('/setup.json')).path);
 const checks=[
  {id:'QA-DATUM',stage:'BEFORE_FABRICATION',instruction:'Establish casting XYZ origin and compare all cavity coordinates to frozen source; do not scale from raster.',criterion:'Exact nominal model reference; shop tolerance requires design disposition',accepted:false},
  {id:'QA-CUT',stage:'BEFORE_WELDING',instruction:'Cross-check each real cut piece, hole, thread seat and weld schedule with component source; subassembly or envelope dimensions are not cutting dimensions.',criterion:'No missing hardware, overlaps or unexplained source mismatch',accepted:false},
  {id:'QA-TRIAL',stage:'DRY_ASSEMBLY',instruction:'Trial fit all locks, braces, box-outs and seals in the ordered assembly. Gauge casting faces before and after tightening.',criterion:'Per-detail fit/tolerance; no forced fit, unreachable tool or obstructed pour opening',accepted:false},
  {id:'QA-SUPPORT',stage:'BEFORE_UNLOCK',instruction:'Attach designed handling/support equipment before releasing load-bearing locks; identify parked position and retain all remaining panels.',criterion:'Support capacity and continuous tool/rigging route documented for the actual configuration',accepted:false},
  {id:'QA-RELEASE',stage:'BEFORE_FIRST_CAST',instruction:'Review pressure/frame/connection checks, weld inspections, weighing/CG, rigging and factory floor/anchor acceptance; approve trial pour and inspection plan.',criterion:'Responsible engineering release separate from this coordinated model issue',accepted:false}
 ];
 return {revision:'P99',id:a.id,typicalId:a.typicalId,kind:a.kind,status:'COORDINATED_DEVELOPMENT_MODEL',units:'mm',sourceGeometryRevision:a.modelRevision,inputs:[...new Map([...inputs,{path:`output/casting-equivalence-p98/${a.id}.json`,sha256:sha(`output/casting-equivalence-p98/${a.id}.json`)}].map(p=>[p.path,p])).values()],
  concrete:{faces:concrete,dimensionsXYZmm:bounds(concrete).map(([a,b])=>b-a),normalThicknessMm:a.normalThicknessMm,nominalKg:a.metrics.authoritativeConcreteKg,facetedMeshKg:a.metrics.facetedMeshKg,cgMm:a.metrics.cgMm,geometryStatus:concreteGeometryStatus,currentPose:a.currentPose,sourceTransform:a.sourceTransform,openings:a.openings},
  parts,seals:extra,motions,subassemblyAndHardwareObjects:parts.length,stockMassKg:basis,massBasis:'Sum of existing nominal solid cells, not Boolean-unioned finished mass. Some historical stock intersects; source limitations retained. Welds/seals/hardware modelling differs by family. Not WLL or certified lifting mass.',
  usedBy:setup.usedBy,qaPlan:checks,remainingDesign:[...new Set(notes)],scope:'One coordinated frozen model per setup for drawing/navigation; not fabricated parts count or closed P40 engineering design. Existing original images preserved.',stage:5,stageComplete:false,engineeringApproved:false,productionReleased:false};
}
export function generate(){
 fs.mkdirSync(out,{recursive:true});const refs=read('output/casting-equivalence-p98/register.json');assert.equal(refs.checked,44);const records=[];
 for(const a of refs.records){const m=compose(a),file=`${out}/${a.id}.json`;fs.writeFileSync(file,JSON.stringify(m));
 const csv='tag,role,material,envelope_x_mm,envelope_y_mm,envelope_z_mm,nominal_stock_mass_kg,cell_count\n'+[...m.parts,...m.seals].map(p=>[p.tag,JSON.stringify(p.role),p.material,...p.dimensionsXYZmm,p.nominalStockMassKg??'',p.solids.length].join(',')).join('\n')+'\n';fs.writeFileSync(`${out}/${a.id}-components.csv`,csv);
 fs.writeFileSync(`${out}/${a.id}-sequence.csv`,'order,tags,dx_mm,dy_mm,dz_mm,remove_after_step,phase\n'+m.motions.map(s=>[s.order,s.tags.join('|'),...s.deltaMm,s.removeAfterStep??'',s.phase].join(',')).join('\n')+'\n');
 records.push({id:m.id,typicalId:m.typicalId,kind:m.kind,model:file,sha256:sha(file),components:m.parts.length,seals:m.seals.length,motions:m.motions.length,stockMassKg:m.stockMassKg});console.log(m.id,m.parts.length,m.motions.length);
 }
 const r={revision:'P99',stage:5,records,sourceRegister:{path:'output/casting-equivalence-p98/register.json',sha256:sha('output/casting-equivalence-p98/register.json')},stageComplete:false,engineeringApproved:false,productionReleased:false};fs.writeFileSync(`${out}/register.json`,JSON.stringify(r,null,2));return r;
}
if(process.argv[1]===fileURLToPath(import.meta.url))generate();
