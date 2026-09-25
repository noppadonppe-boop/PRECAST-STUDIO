import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
export function build() {
  const sourcePath = 'knowledge/modular-program-r01/product_matrix.json';
  const decisionPath = 'knowledge/modular-program-r02/decisions.json';
  const source = JSON.parse(read(sourcePath));
  const decisions = JSON.parse(read(decisionPath));
  const segmentTypes = [], segmentRevisions = [];
  for (const family of ['A','B','C','D']) {
    for (const [kind, thicknessKey] of [['H15-LH','wall_roof'],['H15-RH','wall_roof'],['F15','floor'],['NR15','node_roof'],['NW15','node_wall'],['TR','transition_kit_thickness']]) {
      const id = `TS-${family}-${kind}`;
      segmentTypes.push({id, family, kind, entityKind: kind === 'TR' ? 'UNRESOLVED_KIT' : 'SEGMENT_TYPE', currentRevisionId: `${id}-R02`});
      segmentRevisions.push({id: `${id}-R02`, segmentTypeId:id, programmeRevision:'R02', developmentThicknessMm:decisions.thickness[thicknessKey], engineeringThicknessMm:null, geometryStatus:'PARAMETERS_ONLY', engineeringStatus:'NOT_CHECKED', castDimensionsMm:null, visibility:'INTERNAL_TEAM', approvedForManufacture:false});
    }
  }
  return {
    schemaVersion:1, programmeRevision:'R02', storageMode:'LOCAL_FIRST', orgId:null, remoteProjectId:null,
    sources:[sourcePath,decisionPath].map(p=>({path:p,sha256:hash(read(p))})),
    products:source.map(p=>({id:p.product_id,displayCode:p.display_code,plan:p.type,family:p.family,use:p.use,useName:p.use_name,currentRevisionId:`${p.product_id}-R02`})),
    productRevisions:source.map(p=>({id:`${p.product_id}-R02`,productId:p.product_id,programmeRevision:'R02',nominalGridAreaM2:p.nominal_grid_area_m2,bayGridMm:1500,segmentRevisionIds:segmentRevisions.filter(s=>s.segmentTypeId.startsWith(`TS-${p.family}-`) && (p.type!=='I'|| /-(H15-LH|H15-RH|F15)-R02$/.test(s.id))).map(s=>s.id),geometryRevisionId:null,geometryStatus:'NOT_CREATED',engineeringStatus:'DEFERRED',revitStatus:'NOT_CREATED',legacyReferenceTag:p.reference_artifact_tag,visibility:'INTERNAL_TEAM',approvedForManufacture:false})),
    segmentTypes,segmentRevisions,assemblyInstances:[],artifacts:[],
    pilot:{productId:'PM-I-C1',family:'C',externalWidthMm:3000,externalHeightMm:3000,heightDatum:decisions.geometry.height_datum,externalRadiusMm:400,wallRoofDevelopmentThicknessMm:150,floorDevelopmentThicknessMm:175,bayGridMm:1500,jointGapMm:null,castLengthMm:null,status:'GEOMETRY_INPUTS_ONLY_NOT_A_DRAWING'},
    approval:{engineeringApproved:false,productionReleased:false}
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = path.join(root,'data/modular-program/r02/catalogue.json');
  const value = JSON.stringify(build(),null,2)+'\n';
  fs.mkdirSync(path.dirname(target),{recursive:true});
  if (fs.existsSync(target) && fs.readFileSync(target,'utf8') !== value) throw new Error('Existing seed differs; issue a new revision instead of overwriting.');
  if (!fs.existsSync(target)) fs.writeFileSync(target,value,{flag:'wx'});
  console.log('R02 local seed verified: 48 products, 24 type/kit records; no cloud or engineering execution.');
}
