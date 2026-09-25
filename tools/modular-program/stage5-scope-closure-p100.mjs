import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const sourcePath='output/mould-coordinated-p99/register.json';
const geometryPath='output/casting-equivalence-p98/register.json';
const outDir=resolve(root,'output/stage5-closure-p100');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>readFile(resolve(root,p));
const sourceBytes=await read(sourcePath);
const geometryBytes=await read(geometryPath);
const closureKnowledgePath='knowledge/modular-program-r02/STAGE5_CLOSURE_P100.md';
const closureKnowledgeBytes=await read(closureKnowledgePath);
const currentIndexPath='knowledge/modular-program-current.json';
const currentIndexBytes=await read(currentIndexPath);
const knowledgeIndexPath='knowledge/modular-program-r02/README.md';
const knowledgeIndexBytes=await read(knowledgeIndexPath);
const source=JSON.parse(sourceBytes);
const geometry=JSON.parse(geometryBytes);

if(source.revision!=='P99'||source.records?.length!==44)throw Error('P99 register must contain 44 setups');
if(geometry.revision!=='P98'||geometry.records?.length!==44)throw Error('P98 register must contain 44 setup checks');
const geometryById=new Map(geometry.records.map(r=>[r.id,r]));
for(const r of source.records)if(!geometryById.has(r.id))throw Error(`Missing P98 geometry record: ${r.id}`);

const deferred=[
 {id:'PE-01',title:'รายละเอียดผลิตระดับชิ้นตัด รู เกลียว รอยเชื่อม ซีล และ BOM',ownerStage:'PRODUCTION_ENGINEERING'},
 {id:'PE-02',title:'การตรวจกำลังจุดต่อ ค้ำ ฐาน พุก และเสถียรภาพทุกช่วง',ownerStage:'PRODUCTION_ENGINEERING'},
 {id:'PE-03',title:'ระบบยกแม่แบบ ชิ้นถอด ระบบพลิก rigging และแรงลงพื้นส่วนที่ยังไม่ปิด',ownerStage:'PRODUCTION_ENGINEERING'}
];
const register={
 schemaVersion:1,
 revision:'P100',
 stage:5,
 date:'2026-09-18',
 decision:'USER_APPROVED_STAGE5_SCOPE_CLOSURE_AND_TRANSFERRED_PRODUCTION_DETAILS',
 scope:'Planning mould package through coordinated P99 models, nominal casting correspondence, presentation, tags and assembly/demoulding concepts for all 44 registered setups.',
 completionBasis:'10/10 revised Stage-5 planning checkpoints complete. Production engineering is a separate future scope and is not counted as incomplete Stage-5 work.',
 setupCount:44,
 stageCompletionPercent:100,
 stageComplete:true,
 stageAcceptedByUser:true,
 engineeringApproved:false,
 productionReleased:false,
 productionEngineeringComplete:false,
 deferredWorkstreams:deferred,
 records:source.records.map(r=>({
   id:r.id,
   typicalId:r.typicalId,
   kind:r.kind,
   coordinatedModel:{path:r.model,sha256:r.sha256},
   geometryCorrespondence:{path:geometryById.get(r.id).path??`output/casting-equivalence-p98/${r.id}.json`,sha256:geometryById.get(r.id).sha256},
   stage5PlanningScopeComplete:true,
   deferredWorkstreamIds:deferred.map(x=>x.id),
   engineeringApproved:false,
   productionReleased:false
 })),
 sources:[
   {path:sourcePath,sha256:sha(sourceBytes)},
   {path:geometryPath,sha256:sha(geometryBytes)},
   {path:closureKnowledgePath,sha256:sha(closureKnowledgeBytes)},
   {path:currentIndexPath,sha256:sha(currentIndexBytes)},
   {path:knowledgeIndexPath,sha256:sha(knowledgeIndexBytes)}
 ]
};

await mkdir(outDir,{recursive:true});
await writeFile(resolve(outDir,'register.json'),JSON.stringify(register,null,2)+'\n');
console.log(`Wrote P100 closure register: ${register.records.length} setups`);
