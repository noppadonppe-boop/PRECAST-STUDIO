import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const source = 'F:/Downloads/ACI-318R-19.pdf';
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
assert.equal(sha256, 'b9f35acac5ffcbad9147cf7858911f072e7da55f1737317a7a64c944e57be7d3');
// Geometric illustration only: two mats, two contacting orthogonal layers per mat.
// Does not address laps, tolerances, aggregate, minimum spacing, capacity or anchorage.
const cases = [100, 150, 175, 200].flatMap(thicknessMm => [10, 12, 16].map(illustrativeBarDiameterMm => {
  const coverEachFaceMm = 40;
  const remainingGapMm = thicknessMm - 2 * coverEachFaceMm - 4 * illustrativeBarDiameterMm;
  return {thicknessMm, coverEachFaceMm, illustrativeBarDiameterMm, remainingGapMm,
    geometryStatus: remainingGapMm < 0 ? 'OVERLAP' : 'NONNEGATIVE_GAP_ONLY_NOT_DETAILING_PASS',
    reinforcementSelected: false, codeSpacingVerified: false};
}));
assert.equal(cases.find(c => c.thicknessMm === 100 && c.illustrativeBarDiameterMm === 12).remainingGapMm, -28);
assert.equal(cases.find(c => c.thicknessMm === 150 && c.illustrativeBarDiameterMm === 12).remainingGapMm, 22);
assert.equal(cases.length, 12);
const result = {
  revision: 'P140', scope: 'GEOMETRY_SCREEN_AND_COVER_PROPOSALS_NOT_RC_DESIGN',
  source: {path: source, sha256, unitEdition: 'IN-LB', errataReconciled: false},
  proposalsNotAdopted: [
    {member: 'PLANT_CONTROLLED_PRECAST_WALL_OR_SLAB', coverMm: 40,
      basis: 'R20.5.1.4.1 commentary recommendation 1.5 inch; not universal mandatory cover'},
    {member: 'FORMED_CIP_BEAM_CORROSIVE_EXPOSURE_STUDY', coverMm: 65,
      basis: 'R20.5.1.4.1 commentary recommendation 2.5 inch; not ground-cast'},
    {member: 'CIP_CAST_AGAINST_AND_PERMANENTLY_IN_CONTACT_WITH_GROUND', coverMm: 80,
      basis: '20.5.1.3.1 mandatory minimum 3 inch = 76.2 mm, proposal rounded upward'}
  ],
  coverMeasuredTo: 'OUTERMOST_REINFORCEMENT_SURFACE',
  caseAssumptions: {faces: 2, orthogonalLayersPerFace: 2, constructionReserveMm: null},
  cases,
  steel: {userGrade: 'SD50', automaticASTMEquivalence: false, qualifiedForACI: null,
    requiredEvidence: ['manufacturing standard and edition', 'lot traceability',
      'diameter and area', 'yield/tensile tests and methods', 'elongation',
      'bend tests', 'chemistry and weldability if welded', 'applicable seismic properties']},
  adoptedModelsChanged: false, engineeringApproved: false, productionReleased: false,
  validation: 'SOURCE_HASH_AND_GEOMETRIC_ARITHMETIC_ASSERTIONS_PASSED'
};
fs.mkdirSync('output/staad-p7-p140', {recursive: true});
fs.writeFileSync('output/staad-p7-p140/cover-screen.json', JSON.stringify(result, null, 2) + '\n');
console.log('P140: source hash and 12 geometry cases checked; no RC or detailing pass claimed.');
