import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {keys} from './abd-base-pattern-p85.mjs';
import {bores} from './prism-bore-p66.mjs';
import {disk,ring,properties,cellFaces} from './prism-tools-p54.mjs';
import {swept} from './cap-geometry-p55.mjs';
export {keys};
export const dir='output/base-thread-candidate-p89';
export const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
export function fitStack({underheadLength:[l0,l1],footThickness:[f0,f1],washerThickness:[w0,w1],bedThickness:[b0,b1]}){
 const insertionMinMm=l0-f1-w1,insertionMaxMm=l1-f0-w0;
 return {insertionMinMm,insertionMaxMm,tipRecessMinMm:b0-insertionMaxMm,tipRecessMaxMm:b1-insertionMinMm,
  nominalInsertionMm:27,nominalTipRecessMm:3,minimumManufacturerTotalEngagementMm:25.22,
  meetsStudyInsertionCriterion:insertionMinMm>=25.22,noUndersideProtrusion:b0-insertionMaxMm>0,
  fullThreadLengthVerified:false,threadStrippingCapacityVerified:false};
}
export function wallPitch(m){
 const s=m.key[0]==='D'?200/2825:0,L=Math.hypot(1,s),right=m.key.includes('-RH-');
 const uv=([x,y])=>{if(right)x=1490-x;return [(x-s*y)/L,(s*x+y)/L];};
 return m.baseFeet.filter(f=>['M01','M03'].includes(f.owner)).map(f=>{
  const p=m.baseLocks.filter(b=>b.foot===f.tag).map(b=>uv(b.axisMm));
  return {foot:f.tag,owner:f.owner,normalPitchMm:Math.max(...p.map(p=>p[0]))-Math.min(...p.map(p=>p[0])),tangentPitchMm:Math.max(...p.map(p=>p[1]))-Math.min(...p.map(p=>p[1]))};
 });
}
export function build(key){
 const paths=[`output/abd-base-pattern-p85/${key}.json`,`output/abd-roof-frame-p65/${key}.json`,'knowledge/modular-program-r02/thread-study-p89.json'];
 const [m,bedSource,evidence]=paths.map(read),previousMass=m.currentSteelMassAndCg.massKg;
 const overlayPaths=Object.values(m.overlayReferences),[web,seam,edge]=overlayPaths.map(read),changed=new Set(['M00']);
 const hex=(x,y)=>({poly:Array.from({length:6},(_,i)=>[x+30/Math.sqrt(3)*Math.cos(i*Math.PI/3),y+30/Math.sqrt(3)*Math.sin(i*Math.PI/3)]),z0:33,z1:45.5});
 const boltTags=new Set(m.baseLocks.map(b=>b.tag));
 for(const lock of m.baseLocks){
  const [x,y]=lock.axisMm,bolt=m.parts.find(p=>p.tag===lock.tag),washer=m.parts.find(p=>p.tag===lock.tag+'-W');
  bolt.cells=[disk(x,y,10,-27,33),hex(x,y)];
  washer.cells=ring(x,y,10.5,18.5,30,33);
  bolt.role='M20X2_5X60_CLASS8_8_BASE_SCREW_CANDIDATE';
  washer.role='ISO7089_200HV_WASHER21_ID37_OD3_CANDIDATE';
  bolt.proposedSpecification='ISO4017 M20x2.5x60 class8.8 fully threaded; nominal unchamfered major-diameter envelope';
  washer.proposedSpecification='ISO7089 M20 steel200HV nominal21x37x3; exact supply not selected';
  Object.assign(lock,{nominalScrew:'M20x2.5x60',nominalEngagementMm:27,nominalTipRecessMm:3,threadSeatDepthMm:30,
   bedThread:'M20x2.5 THROUGH; nominal major-diameter envelope only',tapDrillDiameterMm:null,threadToleranceClass:null,
   verifiedThreadCapacityN:null,verifiedWasherCapacityN:null});
  changed.add(bolt.tag);changed.add(washer.tag);
 }
 const bed=m.parts.find(p=>p.tag==='M00');
 bed.cells=bores(bedSource.parts.find(p=>p.tag==='M00').cells,m.baseLocks.map(b=>({x:b.axisMm[0],y:b.axisMm[1],r:10,z0:-30,z1:0})));
 m.bedBoreRemovedVolumeMm3=properties(bedSource.parts.find(p=>p.tag==='M00').cells).volumeMm3-properties(bed.cells).volumeMm3;
 for(const p of m.parts)p.properties=properties(p.cells);
 // Heads use an outer 32-gon circumscribing the full rotational circle for collision checks.
 // Nominal hex solids are used only for drawings/mass. All bolt clock angles are enclosed.
 const envelopes=p=>{if(!boltTags.has(p.tag))return p.cells;const b=m.baseLocks.find(b=>b.tag===p.tag),[x,y]=b.axisMm;
  return [disk(x,y,10,-27,33),disk(x,y,(30/Math.sqrt(3))/Math.cos(Math.PI/32),33,45.5)];};
 const actors=new Map(m.parts.map(p=>[p.tag,[...envelopes(p).map(cellFaces),...web.stock.filter(g=>g.owner===p.tag).flatMap(g=>g.solids),...seam.plates.filter(g=>g.owner===p.tag).flatMap(g=>g.cells.map(cellFaces)),...edge.stock.filter(g=>g.owner===p.tag).flatMap(g=>g.cells.map(cellFaces))]]));
 for(const h of seam.hardware)actors.set(h.tag,h.cells.map(cellFaces));
 const cache=new WeakMap(),bounds=ff=>{if(!cache.has(ff)){const ps=ff.flat(2);cache.set(ff,{lo:[0,1,2].map(i=>Math.min(...ps.map(p=>p[i]))),hi:[0,1,2].map(i=>Math.max(...ps.map(p=>p[i])))});}return cache.get(ff);};
 const collide=(a,b,d=[0,0,0])=>{const A=bounds(a),B=bounds(b);if([0,1,2].some(i=>Math.max(A.hi[i],A.hi[i]+d[i])<=B.lo[i]+.001||Math.min(A.lo[i],A.lo[i]+d[i])>=B.hi[i]-.001))return false;return a.some(x=>b.some(y=>swept(x,y,d)));};
 const concrete=m.concrete.cells.map(cellFaces),staticHits=[],entries=[...actors];
 for(let i=0;i<entries.length;i++){const [tag,ff]=entries[i];if(changed.has(tag)&&collide(ff,concrete))staticHits.push([tag,'CONCRETE']);for(let j=0;j<i;j++){const [other,obs]=entries[j];if((changed.has(tag)||changed.has(other))&&collide(ff,obs))staticHits.push([tag,other]);}}
 const tools=m.baseLocks.map(l=>({tag:l.tag,exclude:[l.tag,l.tag+'-W'],cells:[disk(l.axisMm[0],l.axisMm[1],24,33,97)]}));
 for(const l of seam.locks){const [x,y,z]=l.axisMm,exclude=seam.hardware.filter(h=>h.tag.startsWith(l.tag+'-')).map(h=>h.tag);tools.push({tag:l.tag+'-TOP',exclude,cells:[disk(x,y,24,z+33,z+93)]},{tag:l.tag+'-BOTTOM',exclude,cells:[disk(x,y,24,z-79,z-3)]});}
 const toolChecks=tools.map(t=>({tag:t.tag,hits:entries.filter(([tag,obs])=>!t.exclude.includes(tag)&&collide(t.cells.map(cellFaces),obs)).map(([tag])=>tag)}));
 const active=new Map(actors),moves=[],translate=(ff,d)=>ff.map(f=>f.map(poly=>poly.map(p=>p.map((v,i)=>v+d[i]))));
 for(const [tag,...legs]of m.sequence){let ff=active.get(tag);if(!ff)throw Error('Missing actor '+tag);for(const d of legs){const hits=[];if(changed.has(tag)&&collide(ff,concrete,d))hits.push('CONCRETE');for(const [other,obs]of active)if(other!==tag&&(changed.has(tag)||changed.has(other))&&collide(ff,obs,d))hits.push(other);moves.push({tag,deltaMm:d,hits});ff=translate(ff,d);}active.delete(tag);}
 const prismMass=properties([...m.parts,...seam.plates,...seam.hardware,...edge.stock].flatMap(p=>p.cells)),massParts=[prismMass,...web.stock],massKg=massParts.reduce((a,p)=>a+p.massKg,0);
 m.currentSteelMassAndCg={massKg,cgMm:[0,1,2].map(i=>massParts.reduce((a,p)=>a+p.massKg*p.cgMm[i],0)/massKg),densityKgM3:7850,deltaFromP85Kg:massKg-previousMass,basis:'P89 candidate + P71 web + P74 seam + P80 edge once. Nominal unthreaded envelopes, no chamfers, welds, seals, rebar or rigging; not measured shipping mass.'};
 return {...m,revision:'P89',geometryRole:'UNADOPTED_CANDIDATE',predecessorGeometryRevision:'P85',inputSnapshots:[...paths,...overlayPaths].map(path=>({path,sha256:sha(path)})),generatorSha256:sha('tools/modular-program/base-thread-candidate-p89.mjs'),
  fitStack:fitStack(evidence.incomingInspectionEnvelopeMm),wallFootHolePitches:wallPitch(m),
  forceReuse:{status:'P86_P88_NOT_VALIDATED_FOR_P89',reasons:['Washer radius changes20 to18.5 mm; P86 ideal rigid bearing patch no longer matches.','Bolt length and bed engagement change; effective stiffness and tapped-bed flexibility require review.'],verifiedConnectionCapacityN:null},
  audit:{staticHits,toolChecks,changedGeometryContinuousMoves:moves,remainingTags:[...active.keys()],headRotationCoverage:'Outer polygon enclosing full head rotation circle; no actual helical thread-contact solve',basis:'Changed actors versus all combined actors; unchanged pairs inherit P85/P71/P74/P80. Nominal geometry only, not a full positional tolerance or supported lifting audit.'},
  status:staticHits.length||toolChecks.some(t=>t.hits.length)||moves.some(t=>t.hits.length)?'INTERFERENCE_REQUIRES_REVISION':'CANDIDATE_NOMINAL_GEOMETRY_CLEAR',
  limits:['Use the exact P85 sequence: relocated near-wall base screws/washer initial lift250 mm, other base screws100 mm. Do not inherit the blanket100 mm P66 instruction.','Independently support/capture each form before unscrewing its unloaded base fasteners; a swept-path test is not a stability or lift-plan check.','Nominal major-diameter envelopes do not model tap drill, helical thread, tolerances, wear, capacity or tightening.','P71/P74/P80 overlays are included once. Their geometry checks do not establish complete frame, joint, handling or fabrication approval.'],
  limitations:['40 proposed screws and40 washers per setup; no change to source concrete or P85 foot hole axes.','M00 rebuilt from P65 at P85 axes; not a drilling instruction for the already issued P85 bed.','Physical through-tap with recessed tip is assessed using the manufacturer BLIND calculation case, not a 2p-protruding screw.','Schematic nominal major thread diameter is NOT tap drill geometry; actual helical engagement, thread class, runout and inspection remain to be detailed.','Unloaded screws must be unscrewed after the form is independently supported. Translational swept clearance does not establish a safe support/handling sequence.','P88 generalized normal pitch250 is corrected to M01=250 and M03=240; tangent140 in both. Existing P88 issued files are retained as history.','Not adopted as current analysed geometry; no automatic inheritance of P86/P88 resistance or lifting approval.'],engineeringApproved:false,productionReleased:false,stageComplete:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 fs.mkdirSync(dir,{recursive:true});for(const key of process.argv[2]?[process.argv[2]]:keys){const m=build(key);fs.writeFileSync(`${dir}/${key}.json`,JSON.stringify(m,null,2));console.log(JSON.stringify({key,status:m.status,static:m.audit.staticHits,tools:m.audit.toolChecks.filter(t=>t.hits.length),moves:m.audit.changedGeometryContinuousMoves.filter(t=>t.hits.length),massKg:m.currentSteelMassAndCg.massKg}));}
}
