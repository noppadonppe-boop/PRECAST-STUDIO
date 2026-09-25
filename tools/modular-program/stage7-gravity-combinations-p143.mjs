import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const read = p => JSON.parse(fs.readFileSync(p));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

// ACI318-19 Table5.3.1(a,b,c), gravity-only branches. Not the full table.
// Lr, S and R are alternatives, not three simultaneous roof actions.
export function gravityCombinations() {
  const found = new Map();
  function add(coefficients, origin) {
    const key = JSON.stringify(Object.fromEntries(Object.entries(coefficients).sort()));
    if (found.has(key)) found.get(key).origins.push(origin);
    else found.set(key, {coefficients, origins:[origin]});
  }
  add({D:1.4}, {equation:'5.3.1a',absent:[]});
  for (const roof of ['Lr','S','R']) {
    for (const [equation,lFactor,rFactor] of [['5.3.1b',1.6,0.5],['5.3.1c-L',1,1.6]]) {
      for (const floorPresent of [true,false]) for (const roofPresent of [true,false]) {
        add({D:1.2,...(floorPresent ? {L:lFactor}:{}),...(roofPresent ? {[roof]:rFactor}:{})},
          {equation,roofAlternative:roof,
            absent:[...(!floorPresent?['L']:[]),...(!roofPresent?[roof]:[])],
            omissionBasis:'5.3.2 independent transient absence study'});
      }
    }
  }
  return [...found.values()].map((c,i)=>({id:`ACI-G${String(i+1).padStart(2,'0')}`, ...c}));
}

// Scalar totals are bookkeeping only, never member demands or foundation reactions.
export function evaluateScalar(coefficients, actions) {
  let knownSubtotalKN = 0;
  const unresolved = [];
  for (const [symbol,factor] of Object.entries(coefficients)) {
    assert.ok(Number.isFinite(factor) && factor > 0);
    const action = actions[symbol];
    if (!action || action.complete !== true || !Number.isFinite(action.valueKN)) unresolved.push(symbol);
    else knownSubtotalKN += factor * action.valueKN;
  }
  return {knownSubtotalKN, totalKN:unresolved.length ? null:knownSubtotalKN,unresolved};
}

export function assertFinalReady(product) {
  const failures = [];
  for (const name of ['deadLoadComplete','liveZonesComplete','roofClassificationComplete',
    'rainSnowApplicabilityResolved','loadMappingVerified','spatialPatterningVerified',
    'thaiAciRouteReviewed','allActionFamiliesComplete','jointsReady']) {
    if(product.readiness[name] !== true) failures.push(name);
  }
  if(!Number.isFinite(product.deadLoad?.completeBuildingDeadLoadKN)) failures.push('numeric complete dead load');
  if(!Array.isArray(product.liveLoad?.finalZoneAssignments) || !product.liveLoad.finalZoneAssignments.length) failures.push('actual live-load zones');
  if(!Number.isFinite(product.liveLoad?.totalFloorLiveKN)) failures.push('numeric floor live load');
  if(!product.roofLoad?.selectedRow || !Number.isFinite(product.roofLoad?.totalRoofLiveKN)) failures.push('actual roof live-load basis');
  if(failures.length) throw new Error(`${product.productId}: final export blocked: ${failures.join(', ')}`);
}

export function build() {
  const quantitiesPath='output/staad-p7-p123/index.json';
  const livePath='output/staad-p7-p124/live-load-register.json';
  const material=read('output/staad-p7-p139/material-screen.json');
  assert.equal(hash(material.source.path),material.source.sha256,'ACI source changed');
  const quantities=read(quantitiesPath), live=read(livePath);
  assert.equal(hash(live.source.localPath),live.source.sha256,'Thai LL source changed');
  const combinations=gravityCombinations();
  assert.equal(combinations.length,16);
  assert.equal(quantities.products.length,48);
  assert.equal(live.products.length,48);
  const products=quantities.products.map(q=>{
    const l=live.products.find(p=>p.productId===q.productId);
    assert.ok(l,`No LL record for ${q.productId}`);
    const ledger=read(q.path);
    assert.equal(hash(ledger.source),ledger.sourceSha256);
    assert.equal(hash(ledger.axisPath),ledger.axisSha256);
    assert.ok(Math.abs(ledger.totals.trialModelledStructureGravityKN-q.trialStructureGravityKN)<1e-8);
    return {productId:q.productId,plan:q.plan,use:q.use,
      sourceLedger:{path:q.path,sha256:hash(q.path)},
      deadLoad:{knownHistoricalStructuralSubtotalKN:q.trialStructureGravityKN,
        completeBuildingDeadLoadKN:null,
        unresolvedDeadLoadCategories:ledger.unresolved.filter(v=>!['FOUNDATIONS','ROOF_DRAINAGE_OR_PONDING',
          'CODE_LIVE_LOADS_BY_OCCUPANCY','WIND_SEISMIC_AND_OTHER_ACTIONS'].includes(v.category)).map(v=>v.category),
        foundationMassScope:'SEPARATE_FOUNDATION_TEAM_NOT_MISSING_SUPERSTRUCTURE_LOAD',
        selfweightRule:'Use element selfweight once; ledger subtotal is NOT an additional nodal load'},
      liveLoad:{provisionalFloorRow:l.provisionalBaseRowId,
        provisionalFloorKNm2:l.provisionalBaseFloorPressureKNm2,
        otherRowsToAssess:l.otherRowsToAssess,finalZoneAssignments:null,
        floorAreaForLoadingM2:null,totalFloorLiveKN:null,loadReductionApplied:false},
      roofLoad:{candidateRows:l.roofCandidateRows,selectedRow:null,
        projectedAreaM2:null,totalRoofLiveKN:null,totalRainKN:null,totalSnowKN:null,
        note:'Unknown/not applicable must be explicitly resolved, never silently zero'},
      combinationIds:combinations.map(c=>c.id),
      readiness:Object.fromEntries(['deadLoadComplete','liveZonesComplete','roofClassificationComplete',
        'rainSnowApplicabilityResolved','loadMappingVerified','spatialPatterningVerified',
        'thaiAciRouteReviewed','allActionFamiliesComplete','jointsReady'].map(k=>[k,false])),
      nativeStaadRun:false,finalDesignReady:false};
  });
  assert.equal(new Set(products.map(p=>p.productId)).size,48);
  for(const p of products) assert.throws(()=>assertFinalReady(p),/final export blocked/);
  const result={revision:'P143',status:'GRAVITY_COMBINATION_COMPILER_NOT_FINAL_LOAD_CASES',
    sources:{aci:{path:material.source.path,sha256:material.source.sha256,
      reviewedPdfPages:[63,64,65],printedPages:[61,62,63],errataReconciled:false},
      quantities:{path:quantitiesPath,sha256:hash(quantitiesPath)},
      liveRegister:{path:livePath,sha256:hash(livePath)}},
    combinations,products,
    noLiveCombinationFactorReduction:true,spatialLoadPatternsGenerated:false,
    omittedFromThisSubset:['5.3.1c wind branch','wind combinations','earthquake combinations',
      'fluid/earth/thermal/settlement/flood/ice provisions as applicable','handling/erection'],
    auApplied:false,thaiLegalCompatibilityApproved:false,
    engineeringApproved:false,productionReleased:false};
  fs.mkdirSync('output/staad-p7-p143',{recursive:true});
  fs.writeFileSync('output/staad-p7-p143/gravity-combinations.json',JSON.stringify(result,null,2)+'\n');
  return result;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const r=build();
  console.log(`P143: ${r.combinations.length} gravity-only factor sets; ${r.products.length} product mappings; final export blocked for incomplete inputs.`);
}
