import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {root} from './build-r02.mjs';
import {surfaceZ} from './weather-route-p21.mjs';

export function budget({nodeLoweringMm=0,coverThicknessMm=100,gapMm=20}={}) {
  if (![nodeLoweringMm,coverThicknessMm,gapMm].every(Number.isFinite)||nodeLoweringMm<0||coverThicknessMm<100||coverThicknessMm>200||gapMm<0) throw Error('Invalid study dimensions');
  const nodeHighZ=surfaceZ(7.5)-nodeLoweringMm;
  return {nodeLoweringMm,coverThicknessMm,gapMm,nodeRoofTopZ:2850-nodeLoweringMm,
    nodeWeatherHighZ:nodeHighZ,nodeWeatherLowZ:surfaceZ(2992.5)-nodeLoweringMm,
    capHighZ:nodeHighZ+gapMm+coverThicknessMm,
    remainingHeightMm:3000-nodeHighZ-gapMm-coverThicknessMm,
    heightOnlyPass:nodeHighZ+gapMm+coverThicknessMm<=3000,
    mainRoofChanged:false,fullTransitionFitVerified:false};
}
export function model(){
  return {revision:'P30',scope:'HEIGHT_BUDGET_NOT_CAST_GEOMETRY',units:'mm',
    userDirection:'LOCAL_L_U_TRANSITIONS_KEEP_MAIN_ROOF',
    minimumNodeLoweringForTrialStackMm:surfaceZ(7.5)+100+20-3000,
    cases:[0,40,50].map(nodeLoweringMm=>budget({nodeLoweringMm})),
    dependenciesUnchanged:['TS-C-P05_MAIN_PROFILE','TS-A-B-D-P08_MAIN_PROFILES','P28_EXTERNAL_END_PANELS'],
    affectedIfNodeLowered:['NR01_ELEVATION','NW01_NW02_HEIGHT','PORTAL_HEAD_CLEARANCE','P21_WEATHER_LEVELS','GUTTER_OUTLET_INTERFACES','LOCAL_TRANSITION_PIECES'],
    proposedTags:['TR-A-LU','TR-B-LU','TR-C-LU','TR-D-LU'],
    proposedTagsStatus:'KIT_PLANNING_IDS_NOT_COMPLETED_TYPICALS_OR_MOULD_IDS',
    selectedCase:null,wholeBuildingMassKg:null,anchorCoordinatesMm:null,
    engineeringApproved:false,waterproofingApproved:false,productionReleased:false,
    unresolved:['NODE_LEVEL_CHANGE_REVIEW','PROFILE_SPECIFIC_SOLID_TRANSITION_AND_CORNER_GEOMETRY','DRAINAGE_AND_MOVEMENT_INTERFACES','REVISED_MASS_AND_LIFTING_STUDY','CONSOLIDATED_QA_AND_STAGE_HANDOFF']};
}
export function checklist(){
  const c=JSON.parse(fs.readFileSync(path.join(root,'output/epx-normal-p28/stage2-checklist.json')));
  c.revision='P30';c.previousBaselinePercent=80;
  const item=c.items.find(x=>x.id==='P2-16');
  item.partialEvidence.push('output/local-transition-p30/register.json');
  item.remaining=['LOCAL_CONCRETE_TRANSITION_SOLIDS_WITHIN_3000','NODE_LEVEL_COORDINATION','COMMON_CORNER_D_SHOULDER_AND_END_CLOSURES','DRAINAGE_MOVEMENT_AND_EAVES_INTERFACE'];
  c.items.find(x=>x.id==='P2-17').acceptanceNote+='; MAIN_PROFILES_RETAINED_BY_P30_USER_DIRECTION';
  return c;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const out=path.join(root,'output/local-transition-p30');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'register.json'),JSON.stringify(model(),null,2));
  fs.writeFileSync(path.join(out,'stage2-checklist.json'),JSON.stringify(checklist(),null,2));
  const paths=['tools/modular-program/local-transition-p30.mjs','tools/modular-program/weather-route-p21.mjs','knowledge/modular-program-r02/decision-local-transition-p30.json','output/epx-normal-p28/register.json','output/local-transition-p30/register.json','output/local-transition-p30/stage2-checklist.json'];
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({files:paths.map(p=>({path:p,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')}))},null,2));
  console.log(JSON.stringify(model().cases));
}
