import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const VERSION = 'P150-GEN-1.0.0';
const REVISION = 'R01';
const ROOT = path.resolve(import.meta.dirname, '../..');
const DEFAULT_LIBRARY = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Precast-Module', 'private', 'staad-starter-p150');
const args = process.argv.slice(2);
const arg = name => { const i=args.indexOf(name); return i>=0 ? args[i+1] : undefined; };
const libraryRoot = path.resolve(arg('--out') || DEFAULT_LIBRARY);
const only = arg('--product');
const preflightOnly = args.includes('--preflight-only');

const STATUS = Object.freeze({
  intakeStatus:'AVAILABLE', artifactStatus:'LIBRARY_READY_STARTER',
  nativeValidationStatus:'NOT_RUN_BY_CURRENT_SCOPE', analysisStatus:'NOT_RUN', designStatus:'NOT_RUN',
  engineerReviewStatus:'REQUIRED_BEFORE_RUN', engineeringApproved:false, productionReleased:false,
});
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readBytes = rel => fs.readFileSync(path.resolve(ROOT, rel));
const readJson = rel => JSON.parse(readBytes(rel));
const fileRecord = full => { const b=fs.readFileSync(full); return {sha256:sha(b),bytes:b.length}; };
const stableJson = value => JSON.stringify(value,null,2)+'\n';
const write = (full, bytes) => { fs.mkdirSync(path.dirname(full),{recursive:true}); fs.writeFileSync(full,bytes); };
const posix = p => p.split(path.sep).join('/');
const source = (rel,revision,status) => { const b=readBytes(rel); return {path:posix(rel),sha256:sha(b),bytes:b.length,revision,status}; };

function ranges(values){
  const v=[...new Set(values)].sort((a,b)=>a-b), out=[];
  for(let i=0;i<v.length;){let j=i;while(j+1<v.length&&v[j+1]===v[j]+1)j++;out.push(i===j?String(v[i]):`${v[i]} TO ${v[j]}`);i=j+1;}
  return out;
}
function wrapped(prefix,tokens,max=76){
  const lines=[];let line=prefix;
  for(const token of tokens){ if(line.length+token.length+1>max){lines.push(line+' -');line=token;} else line+=(line?' ':'')+token; }
  if(line)lines.push(line);return lines;
}
function crc32(bytes){
  let c=0xffffffff;
  for(const byte of bytes){c^=byte;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}
  return (c^0xffffffff)>>>0;
}
function dosDateTime(){
  const year=2026,month=9,day=21,hour=0,minute=0,second=0;
  return {date:((year-1980)<<9)|(month<<5)|day,time:(hour<<11)|(minute<<5)|(second>>1)};
}
function deterministicZip(entries){
  const local=[],central=[];let offset=0;const dt=dosDateTime();
  for(const entry of [...entries].sort((a,b)=>a.name.localeCompare(b.name))){
    const name=Buffer.from(entry.name.replaceAll('\\','/'),'utf8'),data=Buffer.isBuffer(entry.bytes)?entry.bytes:Buffer.from(entry.bytes),compressed=zlib.deflateRawSync(data,{level:9}),crc=crc32(data);
    const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0x800,6);lh.writeUInt16LE(8,8);lh.writeUInt16LE(dt.time,10);lh.writeUInt16LE(dt.date,12);lh.writeUInt32LE(crc,14);lh.writeUInt32LE(compressed.length,18);lh.writeUInt32LE(data.length,22);lh.writeUInt16LE(name.length,26);
    local.push(lh,name,compressed);
    const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(0x800,8);ch.writeUInt16LE(8,10);ch.writeUInt16LE(dt.time,12);ch.writeUInt16LE(dt.date,14);ch.writeUInt32LE(crc,16);ch.writeUInt32LE(compressed.length,20);ch.writeUInt32LE(data.length,24);ch.writeUInt16LE(name.length,28);ch.writeUInt32LE(offset,42);central.push(ch,name);offset+=lh.length+name.length+compressed.length;
  }
  const centralBytes=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(centralBytes.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,centralBytes,end]);
}

function area(face){
  const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  let v=[0,0,0];for(let i=1;i<face.length-1;i++){const c=cross(sub(face[i],face[0]),sub(face[i+1],face[0]));v=v.map((x,k)=>x+c[k]/2);}return Math.hypot(...v);
}
function split(values,max=250){
  const v=[...new Set(values.map(Number))].sort((a,b)=>a-b),out=[v[0]];
  for(let i=1;i<v.length;i++){const n=Math.ceil((v[i]-v[i-1])/max);for(let j=1;j<=n;j++)out.push(v[i-1]+(v[i]-v[i-1])*j/n);}return out;
}
function clip(poly,k,t,ge){
  const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],u=ge?a[k]>=t:a[k]<=t,v=ge?b[k]>=t:b[k]<=t;if(u)out.push(a);if(u!==v){const f=(t-a[k])/(b[k]-a[k]);out.push(a.map((x,j)=>x+f*(b[j]-x)));}}return out;
}
function generateICMesh(productId){
  const rel=`output/stage3-designs-p36/${productId.replace('PM-','')}/model.json`,raw=readBytes(rel),m=JSON.parse(raw),nodes=[],elements=[],parts=[];
  const sub=(a,b)=>a.map((x,k)=>x-b[k]);
  for(const piece of m.instances){
    const startNode=nodes.length,startEl=elements.length,map=new Map();
    const node=p=>{const key=p.map(x=>x.toFixed(6)).join(',');if(!map.has(key)){map.set(key,nodes.length+1);nodes.push({id:nodes.length+1,part:piece.id,xyzMm:p});}return map.get(key);};
    const add=f=>{const clean=f.filter((p,i)=>i===0||Math.hypot(...sub(p,f[i-1]))>1e-6);if(clean.length>2&&Math.hypot(...sub(clean[0],clean.at(-1)))<1e-6)clean.pop();if(clean.length<3||area(clean)<1e-5)return;if(clean.length>4){for(let j=1;j<clean.length-1;j++)add([clean[0],clean[j],clean[j+1]]);return;}elements.push({id:elements.length+1,part:piece.id,nodeIds:clean.map(node),areaMm2:area(clean),thicknessMm:piece.kind==='FLOOR'?175:150});};
    const [lo,hi]=[piece.boundsMm.min,piece.boundsMm.max],sharedOpeningY=m.openings.filter(o=>m.instances.find(p=>p.id===o.instanceId)?.kind==='SHELL').flatMap(o=>o.cornersMm.map(p=>p[1])).filter(y=>y>lo[1]&&y<hi[1]);
    if(piece.kind==='SHELL'){
      const rh=piece.side==='RH',op=m.openings.find(o=>o.instanceId===piece.id),wall=split([175,1075,2275,2600]).map(z=>[75,z]),arc=Array.from({length:32},(_,k)=>{const a=Math.PI-(k+1)*Math.PI/64;return [400+325*Math.cos(a),2600+325*Math.sin(a)];}),roof=split([400,1490]).slice(1).map(x=>[x,2925]),profile=[...wall,...arc,...roof],ys=split([lo[1],...sharedOpeningY,hi[1]],250);
      for(let s=0;s<profile.length-1;s++)for(let j=0;j<ys.length-1;j++){const a=profile[s],b=profile[s+1],z=(a[1]+b[1])/2,y=(ys[j]+ys[j+1])/2;if(op&&z>1075&&z<2275&&y>Math.min(...op.cornersMm.map(p=>p[1]))&&y<Math.max(...op.cornersMm.map(p=>p[1]))&&a[0]===75&&b[0]===75)continue;let f=[[a[0],ys[j],a[1]],[a[0],ys[j+1],a[1]],[b[0],ys[j+1],b[1]],[b[0],ys[j],b[1]]];if(rh)f=f.map(p=>[3000-p[0],p[1],p[2]]).reverse();add(f);}
    } else if(piece.kind==='FLOOR'){
      const xs=split([lo[0],hi[0]]),ys=split([lo[1],...sharedOpeningY,hi[1]],250);for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++)add([[xs[i],ys[j],87.5],[xs[i+1],ys[j],87.5],[xs[i+1],ys[j+1],87.5],[xs[i],ys[j+1],87.5]]);
    } else if(piece.kind==='END'){
      const caps=piece.facesMm.filter(f=>f.every(p=>Math.abs(p[1]-lo[1])<1e-6)),xs=split([lo[0],1000,2000,hi[0]]),zs=split([lo[2],2285,hi[2]]);
      if(!caps.length)throw new Error(`${piece.id}: no end cap`);for(const face of caps)for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){let p=face.map(v=>[v[0],v[2]]);for(const[k,t,g]of[[0,xs[i],true],[0,xs[i+1],false],[1,zs[j],true],[1,zs[j+1],false]]){if(!p.length)break;p=clip(p,k,t,g);}if(p.length)add(p.map(v=>[v[0],(lo[1]+hi[1])/2,v[1]]));}
    } else throw new Error(`${piece.id}: unsupported ${piece.kind}`);
    const es=elements.slice(startEl),volume=es.reduce((s,e)=>s+e.areaMm2*e.thicknessMm/1e9,0),sourceVolume=piece.concreteMassKg/2400,error=volume/sourceVolume-1;if(!es.length||Math.abs(error)>=.002)throw new Error(`${piece.id}: mesh volume mismatch ${error}`);
    parts.push({id:piece.id,kind:piece.kind,typicalId:piece.typicalId,nodes:nodes.length-startNode,elements:es.length,midsurfaceVolumeM3:volume,sourceVolumeM3:sourceVolume,relativeVolumeError:error,method:'P110_COMPATIBLE_INTERFACE_DETERMINISTIC'});
  }
  if(parts.length!==14)throw new Error(`${productId}: expected 14 parts`);
  return {id:productId,sourcePath:rel,sourceSha256:sha(raw),status:'STARTER_SOURCE_MESH_NOT_ANALYSED',nodes,elements,parts};
}

function productInventory(){
  const idx=readJson('output/staad-p7-p123/index.json'),ids=idx.products.map(p=>p.productId),unique=new Set(ids);
  if(ids.length!==48||unique.size!==48)throw new Error('P123 inventory must contain 48 unique products');
  for(const plan of ['I','L','U'])if(ids.filter(id=>id.startsWith(`PM-${plan}-`)).length!==16)throw new Error(`Inventory ${plan} must contain 16 products`);
  return idx.products;
}
function meshFor(productId){
  const [,plan,family]=/^PM-([ILU])-([ABCD])[1-4]$/.exec(productId)||[];
  if(!plan)throw new Error('Invalid product ID '+productId);
  if(plan==='I'&&family==='C')return {mesh:generateICMesh(productId),meshSource:null,revision:'P150_FROM_P110_P36'};
  const rel=plan==='I'?`output/staad-p7-p129/${productId}/pilot-mesh.json`:`output/staad-p7-p132-compatible/${productId}/part-mesh.json`;
  return {mesh:readJson(rel),meshSource:source(rel,plan==='I'?'P129':'P132-COMPATIBLE','VERIFIED_GEOMETRY_SOURCE_NOT_STARTER_RESULT'),revision:plan==='I'?'P129':'P132-COMPATIBLE'};
}
function jointSource(productId){
  const [,plan,family,use]=/^PM-([ILU])-([ABCD])([1-4])$/.exec(productId)||[];let rel=null,revision=null;
  if(plan==='I'&&family!=='C'){rel=`output/staad-p7-p129/${productId}/joint-pairs.json`;revision='P129';}
  else if(plan==='I'&&family==='C'&&use==='1'){rel='output/staad-p7-p115/joint-pairs.json';revision='P115';}
  else if(plan!=='I'){rel=`output/staad-p7-p132-compatible-joints/${productId}/joint-map.json`;revision='P132-COMPATIBLE-JOINTS';}
  return rel&&fs.existsSync(path.resolve(ROOT,rel))?source(rel,revision,'CANDIDATE_INTERFACE_MAP_NOT_ACTIVE_CAPACITY'):null;
}
function beamModel(axis,meshNodeMax){
  const key=p=>p.map(v=>Number(v).toFixed(6)).join(','),nodeByKey=new Map(),nodes=[],members=[];let next=800001;
  const node=p=>{const k=key(p);if(!nodeByKey.has(k)){nodeByKey.set(k,next);nodes.push({id:next++,xyzMm:p});}return nodeByKey.get(k);};
  const onSegment=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],cross=(p[0]-a[0])*dy-(p[1]-a[1])*dx,dot=(p[0]-a[0])*dx+(p[1]-a[1])*dy,len2=dx*dx+dy*dy;return Math.abs(cross)<1e-4&&dot>=-1e-4&&dot<=len2+1e-4;};
  let mid=1;
  for(let e=0;e<axis.axisMm.length;e++){
    const a=axis.axisMm[e],b=axis.axisMm[(e+1)%axis.axisMm.length],dx=b[0]-a[0],dy=b[1]-a[1],len2=dx*dx+dy*dy;
    const pts=[a,b,...axis.supports.map(s=>s.xyMm).filter(p=>onSegment(p,a,b))].map(p=>({p,t:((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len2})).sort((x,y)=>x.t-y.t).filter((x,i,v)=>i===0||key(x.p)!==key(v[i-1].p));
    for(let i=0;i<pts.length-1;i++){const n1=node([...pts[i].p,-200]),n2=node([...pts[i+1].p,-200]),lengthMm=Math.hypot(pts[i+1].p[0]-pts[i].p[0],pts[i+1].p[1]-pts[i].p[1]);if(lengthMm<=0||lengthMm>3000.001)throw new Error(`Invalid beam span ${lengthMm}`);members.push({id:mid++,nodes:[n1,n2],edge:e+1,lengthMm,widthMm:250,depthMm:400});}
  }
  if(meshNodeMax>=800001)throw new Error('Mesh node numbering overlaps beam range');
  const supports=axis.supports.map(s=>({...s,node:nodeByKey.get(key([...s.xyMm,-200]))}));if(supports.some(s=>!s.node))throw new Error('Support not on beam axis');
  return {nodes,members,supports,developmentElevationMm:-200};
}

const contract = {
  schemaVersion:1,id:'STAAD-STARTER-MODEL-CONTRACT-P150-R01',generatorVersion:VERSION,programmeRevision:'R02',artifactRevision:REVISION,
  scope:'LIBRARY_READY_STARTER_STATIC_QA_ONLY',units:{length:'METER',force:'KN',sourceGeometry:'MM'},axes:{staadX:'project/source X',staadY:'vertical/source Z',staadZ:'project/source Y'},
  numbering:{meshNodes:'1..N deterministic source order',beamNodes:'800001 upward',members:'1 upward perimeter beam order',plates:'100001 upward deterministic source order'},
  physicalMapping:{memberGroup:'_BPERIM',plateGroups:'_P0001 upward; STD comments map group to physical instance ID',externalRegister:'manifest.json physicalPartMap'},
  materials:{concrete:'Normalweight fc-prime 350 ksc cylinder confirmed; stiffness and density are development inputs from P121/P123',reinforcement:'SD50 minimum yield 490 MPa source P141; not an automatic ASTM/AU equivalence',prestress:'NONE confirmed P138'},
  sections:{perimeterBeamMm:[250,400],beamAxis:'125 mm inset, development basis P108',plateThickness:'from verified source mesh per physical part'},
  supports:{basis:'P108 proposed axes/supports accepted for development; pinned translations fixed rotations free',foundation:'locations and reactions handoff only; soil/foundation capacity excluded'},
  interfaces:{policy:'no unverified rigid/spring/contact constraints are activated; candidate maps are traceable and ENGINEER_INPUT_REQUIRED before run'},
  loads:{active:{1:'D_SELFWEIGHT_DEVELOPMENT'},disabled:[2,3,4,5,6,7],unknownPolicy:'Never substitute zero; disabled/commented ENGINEER_INPUT_REQUIRED blocks'},
  combinations:{thAciActive:[101,201],thAciDisabled:'102-116 until action mapping/applicability complete',au:'disabled pending applicable AS/NZS sources/site inputs'},
  envelopes:{1:'TH_ACI_SERVICE_DEVELOPMENT_D_ONLY',2:'TH_ACI_STRENGTH_DEVELOPMENT_D_ONLY',au:'disabled'},
  analysis:{commands:['PERFORM ANALYSIS PRINT STATICS CHECK','PRINT SUPPORT REACTION','PRINT JOINT DISPLACEMENTS ALL','PRINT MEMBER FORCES GLOBAL ALL','PRINT ELEMENT STRESSES ALL','PRINT ELEMENT FORCES ALL'],meaning:'prepared commands only; never evidence of a run'},
  rcDesign:{memberRoute:'RCDC/engineer handoff only in R01; no automatic design command activated',shellRoute:'force/result output then engineer calculation',unsupported:['curved shells','plate openings','node regions','joints','seats','connections']},
  placeholders:{token:'ENGINEER_INPUT_REQUIRED',developmentToken:'DEVELOPMENT_INPUT_NOT_ENGINEER_APPROVED',zeroPolicy:'unknown is null/disabled, never numeric zero'},
  artifactPolicy:{immutableRevision:true,manualStdEdits:'create a new revision; generated R01 hashes must reconcile',statuses:STATUS},
};

function buildRegisters(product,meshInfo,axis,joint,ledger,live,combo,contractHash){
  const dependencies=[
    source(`output/stage3-designs-p36/${product.productId.replace('PM-','')}/model.json`,'P36','CURRENT_DIMENSIONED_GEOMETRY'),
    source(`output/staad-p7-p108/${product.productId}.json`,'P108','DEVELOPMENT_BEAM_AXIS_SUPPORT_LAYOUT'),
    source(`output/staad-p7-p123/${product.productId}.json`,'P123','GRAVITY_LEDGER_NOT_COMPLETE_DEAD_LOAD'),
    source('output/staad-p7-p124/live-load-register.json','P124','VERIFIED_ROWS_PROVISIONAL_ROUTING'),
    source('output/staad-p7-p143/gravity-combinations.json','P143','ACI_GRAVITY_FACTOR_REGISTER_NOT_FINAL_CASES'),
    source('output/staad-p7-p141/sd50-source.json','P141','SD50_SOURCE_REVIEW_NOT_CODE_QUALIFICATION'),
  ];
  if(meshInfo.meshSource)dependencies.push(meshInfo.meshSource);if(joint)dependencies.push(joint);
  const unresolved=[...ledger.unresolved.map(x=>({id:x.category,value:null,status:'ENGINEER_INPUT_REQUIRED',sourceStatus:x.status,note:x.note??null})),
    ...['JOINT_DOF_STIFFNESS_CAPACITY','WALL_FLOOR_BEAM_SEAT','REGIONAL_WIND_AND_UPLIFT','SEISMIC_SITE_PARAMETERS','DURABILITY_COVER_EXPOSURE','AU_CODE_APPLICABILITY_AND_FACTORS','HANDLING_ASSEMBLY_LOADS','FOUNDATION_STIFFNESS_AND_CAPACITY'].map(id=>({id,value:null,status:'ENGINEER_INPUT_REQUIRED'}))];
  const loadRegister={schemaVersion:1,productId:product.productId,revision:REVISION,contractSha256:contractHash,units:{force:'kN',pressure:'kN/m2'},primaryLoadCases:[
    {id:1,name:'D_SELFWEIGHT_DEVELOPMENT',active:true,sourceRevision:'P123',rule:'SELFWEIGHT Y -1 once only',densityKgM3:2400,status:'DEVELOPMENT_INPUT_NOT_ENGINEER_APPROVED'},
    {id:2,name:'SDL_SUPERIMPOSED',active:false,value:null,status:'ENGINEER_INPUT_REQUIRED'},
    {id:3,name:'LL_FLOOR_TH',active:false,value:null,candidatePressureKNm2:live.provisionalBaseFloorPressureKNm2,candidateRow:live.provisionalBaseRowId,zonePolygons:null,status:'ENGINEER_INPUT_REQUIRED'},
    {id:4,name:'LL_ROOF_TH',active:false,value:null,candidateRows:live.roofCandidateRows,projectedAreaM2:null,status:'ENGINEER_INPUT_REQUIRED'},
    {id:5,name:'WIND_UPLIFT_SITE',active:false,value:null,status:'ENGINEER_INPUT_REQUIRED'},
    {id:6,name:'SEISMIC_SITE',active:false,value:null,status:'ENGINEER_INPUT_REQUIRED'},
    {id:7,name:'HANDLING_ASSEMBLY',active:false,value:null,status:'ENGINEER_INPUT_REQUIRED'},
  ],combinationTracks:{TH_EIT_ACI:{active:[{id:101,name:'TH_ACI_STRENGTH_D_ONLY',factors:{1:1.4},source:'P143 ACI-G01'},{id:201,name:'TH_ACI_SERVICE_D_ONLY',factors:{1:1.0},source:'development service grouping'}],disabled:combo.combinationIds.filter(id=>id!=='ACI-G01').map((id,i)=>({id:102+i,name:`TH_${id}`,status:'ENGINEER_INPUT_REQUIRED'})),thaiLegalCompatibilityApproved:false},AU:{active:[],disabled:true,status:'ENGINEER_INPUT_REQUIRED',reason:'AS/NZS load factors, amendments, site and applicability not verified'}},envelopes:[{id:1,name:'TH_ACI_SERVICE_DEVELOPMENT_D_ONLY',cases:[201],type:'SERVICEABILITY',resultDefinitionOnly:true},{id:2,name:'TH_ACI_STRENGTH_DEVELOPMENT_D_ONLY',cases:[101],type:'STRENGTH',resultDefinitionOnly:true},{id:3,name:'AU_SERVICE',cases:[],active:false,status:'ENGINEER_INPUT_REQUIRED'},{id:4,name:'AU_STRENGTH',cases:[],active:false,status:'ENGINEER_INPUT_REQUIRED'}],knownLedger:{historicalStructuralSubtotalKN:ledger.totals.trialModelledStructureGravityKN,completeBuildingDeadLoadKN:null,selfweightRule:ledger.beam.rule},unresolved,dependencies,statuses:STATUS};
  const assumptionRegister={schemaVersion:1,productId:product.productId,revision:REVISION,geometry:{sourceRevision:'P36',meshRevision:meshInfo.revision,nodeCount:meshInfo.mesh.nodes.length,plateCount:meshInfo.mesh.elements.length,physicalParts:meshInfo.mesh.parts.map(p=>({id:p.id,kind:p.kind,typicalId:p.typicalId??null,thicknessesMm:[...new Set(meshInfo.mesh.elements.filter(e=>e.part===p.id).map(e=>e.thicknessMm))]}))},material:{concrete:{type:'NORMALWEIGHT',fcPrimeKscCylinder:350,fcPrimeMPa:34.323275,E_KNm2:30000000,poisson:0.2,densityKgM3:2400,status:'DEVELOPMENT_INPUT_NOT_ENGINEER_APPROVED',source:'P138 confirmation + P121/P123 development stiffness/density'},reinforcement:{grade:'SD50',minimumYieldMPa:490,status:'SOURCE_REVIEWED_NOT_CODE_QUALIFIED_OR_DESIGNED',source:'P141'},prestress:{used:false,source:'P138'}},perimeterBeam:{widthMm:250,depthMm:400,axisInsetMm:125,centroidElevationMm:-200,status:'DEVELOPMENT_INPUT_NOT_ENGINEER_APPROVED',source:'P108/P121'},supports:{count:axis.supports.length,type:'PINNED',status:'DEVELOPMENT_INPUT_NOT_ENGINEER_APPROVED',source:'P108',foundationCapacity:null},interfaces:{candidateMap:joint,activatedInStd:false,status:'ENGINEER_INPUT_REQUIRED',requiredFamilies:['JO-CR','JO-BY','JO-BS','JO-FF','JO-ND','JO-NI','JO-SEAT']},analysis:{commandsPrepared:true,nativeRun:false,resultsExist:false},rcDesign:{automaticCommandsActivated:false,beamRoute:'RCDC_OR_ENGINEER_SELECTED_ROUTE_AFTER_INPUT_REVIEW',shellRoute:'STAAD_FORCE_OUTPUT_TO_ENGINEER_CALCULATION',status:'ENGINEER_INPUT_REQUIRED'},unresolved,statuses:STATUS,dependencies};
  return {loadRegister,assumptionRegister,dependencies};
}

function buildStd(productId,mesh,axis,assumptions){
  const maxNode=Math.max(...mesh.nodes.map(n=>n.id)),beam=beamModel(axis,maxNode),plateId=new Map(mesh.elements.map((e,i)=>[e.id,100001+i])),partGroups=mesh.parts.map((p,i)=>({name:`_P${String(i+1).padStart(4,'0')}`,partId:p.id,ids:mesh.elements.filter(e=>e.part===p.id).map(e=>plateId.get(e.id))}));
  const nodes=[...mesh.nodes.map(n=>({id:n.id,xyzMm:n.xyzMm})),...beam.nodes],members=beam.members,plates=mesh.elements.map(e=>({id:plateId.get(e.id),nodeIds:e.nodeIds,part:e.part,thicknessMm:e.thicknessMm,areaMm2:e.areaMm2}));
  const lines=['STAAD SPACE','START JOB INFORMATION',`JOB NAME ${productId} STARTER ${REVISION} NOT RUN NOT APPROVED`,`ENGINEER DATE 21-SEP-2026`,'END JOB INFORMATION','* LIBRARY_READY_STARTER / NOT_RUN_BY_CURRENT_SCOPE / ENGINEER_REVIEW_REQUIRED','* STATIC PREFLIGHT IS NOT STRUCTURAL VERIFICATION','UNIT METER KN','JOINT COORDINATES',...nodes.map(n=>`${n.id} ${(n.xyzMm[0]/1000).toFixed(9)} ${(n.xyzMm[2]/1000).toFixed(9)} ${(n.xyzMm[1]/1000).toFixed(9)}`),'MEMBER INCIDENCES',...members.map(m=>`${m.id} ${m.nodes.join(' ')}`),'ELEMENT INCIDENCES SHELL',...plates.map(e=>`${e.id} ${[...e.nodeIds].reverse().join(' ')}`),'START GROUP DEFINITION','MEMBER',...wrapped('_BPERIM',ranges(members.map(m=>m.id))),'ELEMENT'];
  for(const g of partGroups){lines.push(`* PHYSICAL_PART_MAP ${g.name} ${g.partId}`,...wrapped(g.name,ranges(g.ids)));}lines.push('END GROUP DEFINITION','MEMBER PROPERTY',...wrapped('',ranges(members.map(m=>m.id))).map((x,i)=>i===0?`${x} PRIS YD 0.4 ZD 0.25`:x),'ELEMENT PROPERTY');
  const byT=new Map();for(const p of plates){if(!byT.has(p.thicknessMm))byT.set(p.thicknessMm,[]);byT.get(p.thicknessMm).push(p.id);}for(const [t,ids] of [...byT].sort((a,b)=>a[0]-b[0]))for(const line of wrapped('',ranges(ids)))lines.push(`${line} THICKNESS ${(t/1000).toFixed(6)}`);
  lines.push('DEFINE MATERIAL START','ISOTROPIC CONCRETE','* DEVELOPMENT_INPUT_NOT_ENGINEER_APPROVED P121/P123','E 30000000','POISSON 0.2','DENSITY 23.53596','ALPHA 0.00001','DAMP 0.05','TYPE CONCRETE','STRENGTH FCU 34323.275','END DEFINE MATERIAL','CONSTANTS','MATERIAL CONCRETE ALL','SUPPORTS',...beam.supports.map(s=>`${s.node} PINNED`),'* INTERFACE ASSUMPTIONS','* ENGINEER_INPUT_REQUIRED: JO-CR JO-BY JO-BS JO-FF JO-ND JO-NI JO-SEAT DOF/STIFFNESS/CAPACITY','* No unverified rigid, spring or contact constraints are active in this starter revision.','LOAD 1 LOADTYPE Dead TITLE D_SELFWEIGHT_DEVELOPMENT','* DEVELOPMENT_INPUT_NOT_ENGINEER_APPROVED density 2400 kg/m3','SELFWEIGHT Y -1','* ENGINEER_INPUT_REQUIRED LOAD 2 SDL_SUPERIMPOSED - DISABLED','* ENGINEER_INPUT_REQUIRED LOAD 3 LL_FLOOR_TH WITH VERIFIED ZONE MAPPING - DISABLED','* ENGINEER_INPUT_REQUIRED LOAD 4 LL_ROOF_TH PROJECTED AREA BASIS - DISABLED','* ENGINEER_INPUT_REQUIRED LOAD 5 WIND_UPLIFT_SITE - DISABLED','* ENGINEER_INPUT_REQUIRED LOAD 6 SEISMIC_SITE - DISABLED','* ENGINEER_INPUT_REQUIRED LOAD 7 HANDLING_ASSEMBLY - DISABLED','LOAD COMBINATION 101 TH_ACI_STRENGTH_D_ONLY_DEVELOPMENT','1 1.4','LOAD COMBINATION 201 TH_ACI_SERVICE_D_ONLY_DEVELOPMENT','1 1.0','* ENGINEER_INPUT_REQUIRED TH_ACI combinations 102 TO 116 are disabled until load mapping/applicability is complete.','* ENGINEER_INPUT_REQUIRED AU combinations are disabled; do not mix TH/ACI and AU factors.','DEFINE ENVELOPE','201 ENVELOPE 1 TYPE SERVICEABILITY','101 ENVELOPE 2 TYPE STRENGTH','END DEFINE ENVELOPE','* AU ENVELOPES 3 SERVICEABILITY AND 4 STRENGTH DISABLED: ENGINEER_INPUT_REQUIRED','* ENGINEER_INPUT_REQUIRED: resolve interfaces, remaining loads, material stiffness and code applicability before run.','PERFORM ANALYSIS PRINT STATICS CHECK','PRINT SUPPORT REACTION','PRINT JOINT DISPLACEMENTS ALL','PRINT MEMBER FORCES GLOBAL ALL','PRINT ELEMENT STRESSES ALL','PRINT ELEMENT FORCES ALL','* RC_DESIGN_HANDOFF BEGIN','* RC_DESIGN_COMMANDS_PRESENT FALSE; RC_DESIGN_RUN FALSE; RC_DESIGN_PASS FALSE','* BEAM: hand off forces to RCDC/engineer route after input and import verification.','* SHELL/OPENINGS/NODES/JOINTS/SEATS/CONNECTIONS: force output plus engineer calculation only.','* ENGINEER_INPUT_REQUIRED: cover exposure durability bar sizes spacing joint capacities code settings.','* SD50 minimum yield 490 MPa source-reviewed; not automatic ASTM/AU equivalence.','* RC_DESIGN_HANDOFF END','FINISH','');
  return {text:lines.join('\n'),nodes,members,plates,partGroups,beam};
}

function engineerReadme(productId,load,assumptions){
  return `# ${productId} — STAAD starter package ${REVISION}\n\nสถานะ: **LIBRARY_READY_STARTER / NOT RUN / ENGINEER REVIEW REQUIRED**\n\nชุดนี้เป็นไฟล์ตั้งต้นที่สร้างแบบ deterministic และผ่าน static preflight เท่านั้น ไม่เคยรัน STAAD/RCDC และไม่มีผลวิเคราะห์ ผลออกแบบ การตรวจรับ หรือการอนุมัติผลิต\n\n## ก่อนรัน\n\n1. ตรวจ geometry/openings/thickness/axes และ source hashes ใน manifest.\n2. กำหนด joint/interface DOF, stiffness, contact, seats และ capacities; starter ไม่เปิด rigid/spring/contact ที่ยังไม่ยืนยัน.\n3. ปิดรายการ ENGINEER_INPUT_REQUIRED ทั้งหมด โดยห้ามแทน unknown ด้วยศูนย์.\n4. ตรวจ E, density, fc′, SD50 qualification, cover, durability และ effective stiffness ตามงานจริง.\n5. สร้าง load zones/site actions และเลือก code track แยก TH/EIT/ACI กับ AU; ห้ามผสม factors.\n6. สร้าง checkout/revision ใหม่ก่อนแก้ ห้ามเขียนทับ library R01.\n7. รันและตรวจ warnings, mechanisms, equilibrium, deformation, mesh sensitivity และ coexisting actions โดย responsible engineer.\n\n## ข้อมูลพัฒนาในไฟล์\n\n- Normalweight concrete fc′ 350 ksc cylinder; E=30,000,000 kN/m², ν=0.2, density=2,400 kg/m³ เป็น DEVELOPMENT_INPUT_NOT_ENGINEER_APPROVED.\n- Perimeter beam 250×400 mm, centroid Z=-200 mm และ pinned support ${assumptions.supports.count} จุด เป็น development basis P108/P121.\n- Active loads มี selfweight และ D-only development combinations/envelopes เพื่อเตรียม workflow; complete dead load ยังไม่ครบ.\n- SD50 อ้าง minimum yield 490 MPa จาก P141 แต่ยังไม่ใช่การรับรอง code equivalence หรือ mill certificate.\n\nUnresolved ${load.unresolved.length} รายการอยู่ใน assumption-register.json และ load-register.json.\n`;
}

function validatePackage(productId,stdText,model,load,assumptions,packageDir){
  const errors=[],required=['STAAD SPACE','UNIT METER KN','JOINT COORDINATES','MEMBER INCIDENCES','ELEMENT INCIDENCES SHELL','START GROUP DEFINITION','MEMBER PROPERTY','ELEMENT PROPERTY','DEFINE MATERIAL START','SUPPORTS','LOAD 1','LOAD COMBINATION 101','DEFINE ENVELOPE','PERFORM ANALYSIS','PRINT SUPPORT REACTION','RC_DESIGN_HANDOFF','FINISH'];for(const s of required)if(!stdText.includes(s))errors.push('Missing '+s);
  const nodeIds=model.nodes.map(n=>n.id),memberIds=model.members.map(m=>m.id),plateIds=model.plates.map(p=>p.id),nodeSet=new Set(nodeIds);if(new Set(nodeIds).size!==nodeIds.length)errors.push('Duplicate node');if(new Set(memberIds).size!==memberIds.length)errors.push('Duplicate member');if(new Set(plateIds).size!==plateIds.length)errors.push('Duplicate plate');
  for(const m of model.members)if(m.nodes.some(n=>!nodeSet.has(n))||m.nodes[0]===m.nodes[1]||m.lengthMm<=0)errors.push('Invalid member '+m.id);for(const p of model.plates)if(p.nodeIds.some(n=>!nodeSet.has(n))||new Set(p.nodeIds).size<3||!(p.areaMm2>0)||!(p.thicknessMm>0))errors.push('Invalid plate '+p.id);
  const loadIds=load.primaryLoadCases.map(x=>x.id),combIds=Object.values(load.combinationTracks).flatMap(t=>t.active??[]).map(x=>x.id);if(new Set([...loadIds,...combIds]).size!==loadIds.length+combIds.length)errors.push('Load/combination ID collision');
  if(load.unresolved.some(x=>x.value===0))errors.push('Unknown substituted by zero');if(!load.unresolved.every(x=>x.status==='ENGINEER_INPUT_REQUIRED'))errors.push('Unresolved flag missing');
  if(!stdText.includes('ENGINEER_INPUT_REQUIRED')||!stdText.includes('NOT_RUN_BY_CURRENT_SCOPE'))errors.push('Safety labels missing');if(/\b(ANALYSIS_STATUS\s+PASS|DESIGN_STATUS\s+PASS|ENGINEERING_APPROVED\s+TRUE|PRODUCTION_RELEASED\s+TRUE|NATIVE_VALIDATED)\b/i.test(stdText))errors.push('Prohibited completion claim');
  const names=fs.existsSync(packageDir)?fs.readdirSync(packageDir):[];if(names.some(n=>/\.(ANL|REA|BMD|DSP)$/i.test(n)))errors.push('Result artifact present');
  if(assumptions.analysis.nativeRun!==false||assumptions.analysis.resultsExist!==false||assumptions.statuses.engineeringApproved!==false)errors.push('False run/approval status');
  return {productId,pass:errors.length===0,errors,counts:{nodes:model.nodes.length,members:model.members.length,plates:model.plates.length,physicalParts:model.partGroups.length,supports:model.beam.supports.length},checks:{requiredSections:errors.every(e=>!e.startsWith('Missing')),idsAndReferences:!errors.some(e=>/Duplicate|Invalid/.test(e)),geometryPositive:!errors.some(e=>e.startsWith('Invalid')),loadIdsUnique:!errors.some(e=>e.includes('collision')),unknownPolicy:!errors.some(e=>/Unknown|Unresolved/.test(e)),noResults:!errors.some(e=>e.includes('Result')),statusSafety:!errors.some(e=>/claim|status/.test(e))}};
}

function generateOne(product,contractBytes,contractHash,liveAll,comboAll){
  const productId=product.productId,dir=path.join(libraryRoot,productId),meshInfo=meshFor(productId),axis=readJson(`output/staad-p7-p108/${productId}.json`),joint=jointSource(productId),ledger=readJson(`output/staad-p7-p123/${productId}.json`),live=liveAll.products.find(x=>x.productId===productId),combo=comboAll.products.find(x=>x.productId===productId);if(!live||!combo)throw new Error(productId+': missing load source');
  const {loadRegister,assumptionRegister,dependencies}=buildRegisters(product,meshInfo,axis,joint,ledger,live,combo,contractHash),std=buildStd(productId,meshInfo.mesh,axis,assumptionRegister),stdName=`${productId}-STARTER-${REVISION}.STD`,files={};fs.mkdirSync(dir,{recursive:true});
  const payloads={ [stdName]:Buffer.from(std.text), 'load-register.json':Buffer.from(stableJson(loadRegister)), 'assumption-register.json':Buffer.from(stableJson(assumptionRegister)), 'engineer-readme.md':Buffer.from(engineerReadme(productId,loadRegister,assumptionRegister)) };
  for(const [name,b] of Object.entries(payloads)){write(path.join(dir,name),b);files[name]={sha256:sha(b),bytes:b.length};}
  const manifest={schemaVersion:1,productId,productRevisionId:`${productId}-R02`,geometryRevisionId:'P36',starterRevision:REVISION,generatorVersion:VERSION,contract:{path:'../starter-model-contract.json',sha256:contractHash},sourceRevisions:dependencies.map(d=>({path:d.path,revision:d.revision,sha256:d.sha256})),physicalPartMap:std.partGroups.map(g=>({group:g.name,physicalPartId:g.partId,plateCount:g.ids.length})),files,statuses:STATUS,solverInvoked:false,rcdcInvoked:false,resultsIncluded:false};
  const manifestBytes=Buffer.from(stableJson(manifest));write(path.join(dir,'manifest.json'),manifestBytes);files['manifest.json']={sha256:sha(manifestBytes),bytes:manifestBytes.length};
  const zipEntries=Object.keys(files).sort().map(name=>({name:`${productId}/${name}`,bytes:fs.readFileSync(path.join(dir,name))})),zipName=`${productId}-STARTER-${REVISION}.zip`,zipBytes=deterministicZip(zipEntries);write(path.join(dir,zipName),zipBytes);files[zipName]={sha256:sha(zipBytes),bytes:zipBytes.length};
  const qa=validatePackage(productId,std.text,std,loadRegister,assumptionRegister,dir);if(!qa.pass)throw new Error(`${productId} preflight: ${qa.errors.join('; ')}`);
  const artifacts=Object.entries(files).map(([name,f])=>({id:`${productId}-P150-${name===stdName?'STD':name===zipName?'ZIP':name==='manifest.json'?'MANIFEST':name==='load-register.json'?'LOADS':name==='assumption-register.json'?'ASSUMPTIONS':'README'}`,kind:name===stdName?'STD':name===zipName?'ZIP':name.endsWith('.json')?'JSON':'MD',path:posix(path.join(productId,name)),filename:name,...f,classification:'ENGINEERING_DRAFT',...STATUS}));
  return {productId,plan:product.plan,family:/PM-[ILU]-([ABCD])/.exec(productId)[1],use:product.use,packagePath:productId,stdFile:stdName,zipFile:zipName,meshRevision:meshInfo.revision,geometrySourceSha256:dependencies[0].sha256,counts:qa.counts,artifacts,preflight:qa,statuses:STATUS};
}

function reconcile(index){
  const errors=[],ids=index.products.map(p=>p.productId);if(ids.length!==48||new Set(ids).size!==48)errors.push('48 unique product mapping failed');for(const plan of ['I','L','U'])if(index.products.filter(p=>p.plan===plan).length!==16)errors.push(`${plan} wave not 16`);
  for(const p of index.products){for(const a of p.artifacts){const full=path.join(libraryRoot,a.path);if(!fs.existsSync(full))errors.push('Missing '+a.path);else{const f=fileRecord(full);if(f.sha256!==a.sha256||f.bytes!==a.bytes)errors.push('Hash/bytes mismatch '+a.path);}}if(!p.preflight.pass)errors.push('Preflight failed '+p.productId);}
  return {pass:errors.length===0,errors,packages:index.products.length,stdFiles:index.products.filter(p=>p.artifacts.some(a=>a.kind==='STD')).length,waves:Object.fromEntries(['I','L','U'].map(x=>[x,index.products.filter(p=>p.plan===x).length])),analysedProducts:0,rcDesignedProducts:0,engineeringApproved:false,productionReleased:false};
}

export function validateLibrary(target=libraryRoot){
  const index=JSON.parse(fs.readFileSync(path.join(target,'library-index.json'),'utf8')),errors=[],productReports=[];
  const requiredNames=p=>[`${p.productId}-STARTER-${REVISION}.STD`,'manifest.json','load-register.json','assumption-register.json','engineer-readme.md',`${p.productId}-STARTER-${REVISION}.zip`];
  const contractPath=path.join(target,index.contract.path),contractFile=fileRecord(contractPath);if(contractFile.sha256!==index.contract.sha256||contractFile.bytes!==index.contract.bytes)errors.push('Contract hash/bytes mismatch');
  const allFiles=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,e.name);if(e.isDirectory())walk(full);else allFiles.push(full);}}walk(target);
  if(allFiles.some(f=>/\.(ANL|REA|BMD|DSP|EQL|ECF|EST|ESS|EJT|SCN)$/i.test(f)))errors.push('Solver/result artifact exists in library');
  for(const p of index.products){
    const local=[],dir=path.join(target,p.productId),names=fs.readdirSync(dir);for(const name of requiredNames(p))if(!names.includes(name))local.push('Missing '+name);
    const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8')),load=JSON.parse(fs.readFileSync(path.join(dir,'load-register.json'),'utf8')),assumptions=JSON.parse(fs.readFileSync(path.join(dir,'assumption-register.json'),'utf8')),stdPath=path.join(dir,p.stdFile),stdText=fs.readFileSync(stdPath,'utf8');
    if(manifest.productId!==p.productId||manifest.generatorVersion!==VERSION||manifest.solverInvoked||manifest.rcdcInvoked||manifest.resultsIncluded)local.push('Invalid manifest status/identity');
    for(const [name,expected] of Object.entries(manifest.files)){const full=path.join(dir,name);if(!fs.existsSync(full)){local.push('Manifest file missing '+name);continue;}const actual=fileRecord(full);if(actual.sha256!==expected.sha256||actual.bytes!==expected.bytes)local.push('Manifest hash/bytes mismatch '+name);}
    for(const dep of manifest.sourceRevisions){const full=path.resolve(ROOT,dep.path);if(!fs.existsSync(full)||fileRecord(full).sha256!==dep.sha256)local.push('Source dependency stale '+dep.path);}
    const required=['STAAD SPACE','UNIT METER KN','JOINT COORDINATES','MEMBER INCIDENCES','ELEMENT INCIDENCES SHELL','START GROUP DEFINITION','MEMBER PROPERTY','ELEMENT PROPERTY','DEFINE MATERIAL START','SUPPORTS','LOAD 1','LOAD COMBINATION 101','DEFINE ENVELOPE','PERFORM ANALYSIS','PRINT SUPPORT REACTION','RC_DESIGN_HANDOFF','FINISH'];for(const s of required)if(!stdText.includes(s))local.push('Missing STD section '+s);
    const lines=stdText.split(/\r?\n/),section=(a,b)=>lines.slice(lines.indexOf(a)+1,lines.indexOf(b)).filter(x=>x&&!x.startsWith('*'));
    const nodes=new Map();for(const line of section('JOINT COORDINATES','MEMBER INCIDENCES')){const [id,x,y,z]=line.trim().split(/\s+/).map(Number);if(!Number.isInteger(id)||![x,y,z].every(Number.isFinite)||nodes.has(id))local.push('Invalid/duplicate node '+line);else nodes.set(id,[x,y,z]);}
    const members=[];for(const line of section('MEMBER INCIDENCES','ELEMENT INCIDENCES SHELL')){const v=line.trim().split(/\s+/).map(Number);if(v.length!==3||!v.every(Number.isFinite)||v[1]===v[2]||!nodes.has(v[1])||!nodes.has(v[2]))local.push('Invalid member '+line);else members.push(v[0]);}
    const plates=[];for(const line of section('ELEMENT INCIDENCES SHELL','START GROUP DEFINITION')){const v=line.trim().split(/\s+/).map(Number),ids=v.slice(1);if(![4,5].includes(v.length)||!v.every(Number.isFinite)||new Set(ids).size<3||ids.some(id=>!nodes.has(id)))local.push('Invalid plate '+line);else{const a=nodes.get(ids[0]),b=nodes.get(ids[1]),c=nodes.get(ids[2]),u=b.map((x,i)=>x-a[i]),w=c.map((x,i)=>x-a[i]),cross=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];if(Math.hypot(...cross)<=1e-12)local.push('Zero-area plate '+v[0]);plates.push(v[0]);}}
    if(nodes.size!==p.counts.nodes||members.length!==p.counts.members||plates.length!==p.counts.plates)local.push('STD/index count mismatch');
    const primary=load.primaryLoadCases.map(x=>x.id),comb=Object.values(load.combinationTracks).flatMap(x=>x.active||[]).map(x=>x.id);if(new Set([...primary,...comb]).size!==primary.length+comb.length)local.push('Load/combination ID collision');if(load.unresolved.some(x=>x.value===0||x.status!=='ENGINEER_INPUT_REQUIRED'))local.push('Unknown policy violation');
    if(assumptions.analysis.nativeRun||assumptions.analysis.resultsExist||assumptions.statuses.engineeringApproved||assumptions.statuses.productionReleased)local.push('False analysis/approval state');
    for(const a of p.artifacts){const full=path.join(target,a.path);if(!fs.existsSync(full))local.push('Missing registered artifact '+a.path);else{const actual=fileRecord(full);if(actual.sha256!==a.sha256||actual.bytes!==a.bytes)local.push('Registered hash/bytes mismatch '+a.path);}}
    productReports.push({productId:p.productId,pass:local.length===0,errors:local,counts:{nodes:nodes.size,members:members.length,plates:plates.length}});errors.push(...local.map(x=>p.productId+': '+x));
  }
  const ids=index.products.map(p=>p.productId);if(ids.length!==48||new Set(ids).size!==48)errors.push('Inventory is not 48 unique products');for(const plan of ['I','L','U'])if(index.products.filter(p=>p.plan===plan).length!==16)errors.push(`${plan} wave is not 16`);
  return {pass:errors.length===0,errors,productReports,packages:index.products.length,stdFiles:index.products.filter(p=>p.artifacts.some(a=>a.kind==='STD')).length,waves:Object.fromEntries(['I','L','U'].map(x=>[x,index.products.filter(p=>p.plan===x).length])),analysedProducts:0,rcDesignedProducts:0,nativeValidatedProducts:0,engineeringApproved:false,productionReleased:false,solverInvoked:false,rcdcInvoked:false};
}

export function run(){
  const inventory=productInventory(),selected=only?inventory.filter(p=>p.productId===only):inventory;if(only&&!selected.length)throw new Error('Unknown product '+only);fs.mkdirSync(libraryRoot,{recursive:true});
  const contractBytes=Buffer.from(stableJson(contract)),contractHash=sha(contractBytes);if(!preflightOnly)write(path.join(libraryRoot,'starter-model-contract.json'),contractBytes);
  const live=readJson('output/staad-p7-p124/live-load-register.json'),combo=readJson('output/staad-p7-p143/gravity-combinations.json');let products=[];
  if(preflightOnly){const validation=validateLibrary(libraryRoot);if(!validation.pass)throw new Error(validation.errors.join('; '));return {libraryRoot,preflight:true,validation};}else products=selected.map(p=>generateOne(p,contractBytes,contractHash,live,combo));
  if(only)return {product:products[0],libraryRoot};
  const preliminary={schemaVersion:1,id:'STAAD-STARTER-LIBRARY-P150',revision:REVISION,generatorVersion:VERSION,contract:{path:'starter-model-contract.json',sha256:contractHash,bytes:contractBytes.length},products,statuses:STATUS,analysedProducts:0,rcDesignedProducts:0,finalStatus:'AWAITING_USER_STAGE_REVIEW'};
  const reconciliation=reconcile(preliminary);if(!reconciliation.pass)throw new Error(reconciliation.errors.join('; '));
  const index={...preliminary,summary:reconciliation};if(!preflightOnly)write(path.join(libraryRoot,'library-index.json'),stableJson(index));
  const allArtifacts=products.flatMap(p=>p.artifacts.map(a=>({productId:p.productId,...a}))),delivery={schemaVersion:1,id:'P150-DELIVERY-MANIFEST',revision:REVISION,generatorVersion:VERSION,library:'PRIVATE_LOCAL_LIBRARY',contract:index.contract,packages:products.map(p=>({productId:p.productId,packagePath:p.packagePath,stdFile:p.stdFile,zipFile:p.zipFile,sourceRevision:p.meshRevision,artifacts:p.artifacts.map(({id,kind,path,filename,sha256,bytes})=>({id,kind,path,filename,sha256,bytes})),statuses:STATUS})),artifactCount:allArtifacts.length,packageCount:products.length,stdCount:products.filter(p=>p.artifacts.some(a=>a.kind==='STD')).length,statuses:STATUS,solverInvoked:false,rcdcInvoked:false};
  const preflight={schemaVersion:1,id:'P150-STATIC-PREFLIGHT',generatorVersion:VERSION,scope:'STATIC_ONLY_NO_SOLVER',pass:products.every(p=>p.preflight.pass)&&reconciliation.pass,products:products.map(p=>p.preflight),reconciliation,checks:['inventory uniqueness and waves','package naming and required files','STD required sections','node/member/plate IDs and references','positive geometry and thickness','material/property mapping','load/combination/envelope IDs','known load sources and unresolved flags','SHA-256 bytes generator dependencies','no ANL/results or run/approval metadata'],solverInvoked:false,rcdcInvoked:false};
  const backendRegistered=fs.readFileSync(path.join(ROOT,'tools/catalogue/current-data.mjs'),'utf8').includes('staadDelivery'),frontendRegistered=fs.readFileSync(path.join(ROOT,'apps/web/src/catalogue/CurrentCatalogue.tsx'),'utf8').includes('STAAD Starter');
  const acceptance={schemaVersion:1,id:'P150-ACCEPTANCE',stage:7,completionPercent:preflight.pass&&backendRegistered&&frontendRegistered?100:0,status:preflight.pass&&backendRegistered&&frontendRegistered?'AWAITING_USER_STAGE_REVIEW':'INCOMPLETE',criteria:{packages48:products.length===48,std48:delivery.stdCount===48,staticPreflight48:preflight.products.filter(p=>p.pass).length===48,privateLibraryReady:true,downloadRegistrationReady:backendRegistered&&frontendRegistered,noAnlOrResults:true,analysedProducts0:true,rcDesignedProducts0:true,engineeringApprovedFalse:true,productionReleasedFalse:true},developmentInputs:['Normalweight concrete fc-prime 350 ksc cylinder; non-prestressed; SD50 confirmed basis','E=30,000,000 kN/m2, poisson 0.2 and density 2400 kg/m3 from P121/P123 are DEVELOPMENT_INPUT_NOT_ENGINEER_APPROVED','Perimeter beam 250x400 mm, axis 125 mm inset, centroid -200 mm and pinned support layout from P108/P121 are development inputs','Only selfweight and D-only development combinations/envelopes are active'],engineerInputRequired:[...new Set(products.flatMap(p=>JSON.parse(fs.readFileSync(path.join(libraryRoot,p.productId,'assumption-register.json'),'utf8')).unresolved.map(x=>x.id)))].sort(),analysedProducts:0,rcDesignedProducts:0,nativeValidatedProducts:0,engineeringApproved:false,productionReleased:false,solverInvoked:false,rcdcInvoked:false};
  const progress={stage:7,knowledge:'P150',completionPercent:acceptance.completionPercent,packages:`${products.length}/48`,std:`${delivery.stdCount}/48`,staticPreflight:`${preflight.products.filter(p=>p.pass).length}/48`,analysed:'0/48',rcDesigned:'0/48',engineeringApproved:false,productionReleased:false,status:acceptance.status};
  if(!preflightOnly){write(path.join(libraryRoot,'delivery-manifest.json'),stableJson(delivery));write(path.join(libraryRoot,'static-preflight-report.json'),stableJson(preflight));write(path.join(libraryRoot,'acceptance-report.json'),stableJson(acceptance));write(path.join(libraryRoot,'progress-report.json'),stableJson(progress));write(path.join(libraryRoot,'README.md'),`# STAAD Starter File Library P150\n\n48 private starter packages. Static preflight only. No STAAD/RCDC run, no ANL/results, no engineering approval or production release.\n\nStatus: ${acceptance.status}.\n`);}
  return {libraryRoot,products:products.length,std:delivery.stdCount,preflight:preflight.pass,acceptance};
}

if(fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){try{console.log(JSON.stringify(run(),null,2));}catch(error){console.error(error.stack||error);process.exitCode=1;}}
