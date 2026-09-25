import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function areaM2(poly) {
  assert.ok(poly.length>=3);
  let a=0;
  for(let i=0;i<poly.length;i++) {
    const p=poly[i],q=poly[(i+1)%poly.length];
    assert.ok([...p,...q].every(Number.isFinite));
    a+=p[0]*q[1]-q[0]*p[1];
  }
  return Math.abs(a)/2e6;
}
assert.equal(areaM2([[0,0],[3000,0],[3000,1500],[0,1500]]),4.5);
assert.equal(areaM2([[0,1500],[3000,1500],[3000,0],[0,0]]),4.5);
const rules={
  'GL-01':'GLASS_GEOMETRY_STUDY_ONLY_FINAL_MAKEUP_PENDING',
  'FL-01':'ASSEMBLY_10MM_ALLOWANCE_NOT_SOLID_PORCELAIN_MASS',
  'MT-01':'MIXED_METAL_APPEARANCE_SOLID_PLACEHOLDERS_NOT_STEEL_TAKEOFF',
  'JN-01':'CABINET_AND_FURNITURE_GEOMETRY_NOT_SOLID_TIMBER',
  'CT-01':'WORKTOP_MATERIAL_AND_SUPPORT_PENDING',
  'DK-01':'DECK_BOARDS_SPECIES_AND_EXTERNAL_SUPPORT_ROUTE_PENDING',
  'EQ-01':'EQUIPMENT_ENVELOPE_USE_MANUFACTURER_OPERATING_MASS',
  'MEP-01':'SERVICE_LOCATION_NOT_PHYSICAL_COMPONENT_MASS',
  'MEP-02':'SERVICE_LOCATION_NOT_PHYSICAL_COMPONENT_MASS',
  'SN-01':'FIXTURE_GEOMETRY_NOT_SOLID_STAINLESS_MASS',
  'LS-01':'PLANT_SYMBOL_NOT_SATURATED_PLANTER_MASS',
  'SITE-01':'ILLUSTRATIVE_SITE_PLANE_EXCLUDED_FROM_SUPERSTRUCTURE'
};
const unitReviewPath='output/staad-p7-p125/source-review.json';
const unitReview=read(unitReviewPath);
assert.equal(hash(unitReview.source.path),unitReview.source.sha256);
const gamma=unitReview.unitWeights.find(r=>r.material==='glass').kNm3;
assert.equal(gamma,24.5);
const products=[];
for(const p of read('output/staad-p7-p123/index.json').products) {
  const ledger=read(p.path), ref=ledger.arcReference;
  assert.equal(hash(ref.manifestPath),ref.manifestSha256);
  const dir=path.dirname(ref.manifestPath),manifest=read(ref.manifestPath);
  function checked(prefix) {
    const entry=manifest.files.find(f=>f.path.startsWith(prefix)&&f.path.endsWith('.json'));
    assert.ok(entry,`${p.productId} missing ${prefix}`);
    const file=path.join(dir,entry.path);
    assert.equal(hash(file),entry.sha256,`${p.productId}: changed ${entry.path}`);
    return {file,sha256:entry.sha256,data:read(file)};
  }
  const coord=checked('Coordination_QA_'),items=checked('ARC_ItemRegister_');
  const rvt=manifest.files.find(f=>!f.path.includes('/')&&f.path.endsWith('.rvt'));
  assert.ok(rvt);
  assert.equal(hash(path.join(dir,rvt.path)),rvt.sha256,`${p.productId}: stale native model`);
  const recipeEntry=manifest.files.find(f=>f.path==='Recipe_P104.json');
  let floors=null,areaCheck=null;
  if(recipeEntry) {
    const recipe=checked('Recipe_');
    floors=recipe.data.finishFloors.map(f=>({sourceConcreteInstance:f.sourceId,
      polygonXYmm:f.poly,finishTopMm:f.top,studyThicknessMm:f.thickness,
      areaM2:areaM2(f.poly),finalFinishPressureKNm2:null,finalDeadLoadKN:null}));
    const a=floors.reduce((s,f)=>s+f.areaM2,0);
    areaCheck={recipeAreaM2:a,nativeAreaM2:coord.data.floorFinishAreaM2,
      differenceM2:a-coord.data.floorFinishAreaM2,
      matches:Math.abs(a-coord.data.floorFinishAreaM2)<1e-6};
  }
  const materials=Object.entries(coord.data.materialGeometryVolumeM3).map(([name,volumeM3])=>{
    const code=name.split(' ')[0];assert.ok(rules[code],`Unclassified ${name}`);
    assert.ok(Number.isFinite(volumeM3)&&volumeM3>=0);
    return {code,name,modelGeometryVolumeM3:volumeM3,interpretation:rules[code],
      studyOnlyGravityKN:code==='GL-01'?volumeM3*gamma:null,
      unitWeightSource:code==='GL-01'?{review:unitReviewPath,pdfPage:10,table:2,kNm3:gamma}:null,
      adoptedGravityKN:null,loadPathAssigned:false};
  });
  products.push({productId:p.productId,arcManifest:ref,
    nativeModelHashChecked:true,sourceCoordination:{path:coord.file,sha256:coord.sha256},
    sourceItems:{path:items.file,sha256:items.sha256},
    nativeFinishAreaM2:coord.data.floorFinishAreaM2,floorGeometry: floors,areaCheck,
    pilotFloorPolygonStatus:floors?'RECIPE_VS_NATIVE_AREA_CHECK':'P103_NATIVE_AREA_ONLY_POLYGONS_NOT_EXTRACTED',
    materials,
    items:items.data.map(i=>({mark:i.mark,family:i.family,group:i.group,positionMm:i.p,
      finalLoadKN:null,loadClass:null,receivingStructuralPart:null})),
    unmodelledLoads:['waterproofing and insulation','support brackets and fixings',
      'floor assembly build-up confirmation','equipment contents and operation',
      'unmodelled roof slope build-up where applicable'],
    completeAddedDeadLoadKN:null,finalStaadLoadGenerated:false});
}
assert.equal(products.length,48);
assert.equal(new Set(products.map(p=>p.productId)).size,48);
const summary={revision:'P144',status:'ARC_QUANTITY_TO_LOAD_INTAKE_NOT_FINAL_DEAD_LOAD',
  productCount:products.length,materialRows:products.reduce((s,p)=>s+p.materials.length,0),
  itemCount:products.reduce((s,p)=>s+p.items.length,0),
  recipeAreaChecks:products.filter(p=>p.areaCheck).length,
  recipeAreaMismatches:products.filter(p=>p.areaCheck&&!p.areaCheck.matches).map(p=>p.productId),
  nativeRevitReopenedThisTurn:false,
  sourceUnitReviewHash:hash(unitReviewPath),products,
  engineeringApproved:false,productionReleased:false};
assert.equal(summary.recipeAreaMismatches.length,0,'Investigate source/native area mismatch before delivery');
const example=products.find(p=>p.productId==='PM-I-C1');
assert.ok(Math.abs(example.materials.find(m=>m.code==='GL-01').studyOnlyGravityKN-2.09328)<1e-9);
assert.ok(products.every(p=>p.completeAddedDeadLoadKN===null && !p.finalStaadLoadGenerated));
fs.mkdirSync('output/staad-p7-p144',{recursive:true});
fs.writeFileSync('output/staad-p7-p144/arc-load-intake.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,products:undefined},null,2));
