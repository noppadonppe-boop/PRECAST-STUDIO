import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Source-specific IN-LB calculation, not an ACI metric-edition substitution.
const sourcePath = 'F:/Downloads/ACI-318R-19.pdf';
const expectedHash = 'b9f35acac5ffcbad9147cf7858911f072e7da55f1737317a7a64c944e57be7d3';
const hash = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
assert.equal(hash, expectedHash, 'Source changed; review clauses again');
const psiToMPa = (0.45359237 * 9.80665) / (0.0254 ** 2) / 1e6;
const kscToMPa = 9.80665 / 100;
const fcMPa = 350 * kscToMPa;
const fcPsi = fcMPa / psiToMPa;
const ecMPa = 57000 * Math.sqrt(fcPsi) * psiToMPa;
const frMPa = 7.5 * Math.sqrt(fcPsi) * psiToMPa;
assert.ok(Math.abs(fcMPa - 34.323275) < 1e-9);
assert.ok(Math.abs(psiToMPa - 0.006894757293168361) < 1e-14);
assert.ok(Math.abs(fcPsi * psiToMPa / kscToMPa - 350) < 1e-9);
assert.ok(fcPsi < 5000, 'Do not round 350 ksc up to 5000 psi');
assert.ok(ecMPa > 27000 && ecMPa < 29000);
assert.ok(frMPa > 3.5 && frMPa < 3.8);
const result = {
  revision: 'P139', scope: 'SOURCE_SPECIFIC_MATERIAL_SCREEN_NOT_RC_DESIGN',
  source: {path: sourcePath, sha256: hash, bytes: fs.statSync(sourcePath).size,
    pdfPages: 628, units: 'IN-LB', title: 'ACI 318-19 with ACI 318R-19',
    completeness: 'SAMPLED_NOT_EVERY_PAGE_AUDITED', publicWebAllowed: false,
    redistributionRightsVerified: false, errataReconciliation: 'PENDING'},
  concrete: {type: 'NORMALWEIGHT', fcKsc: 350, fcMPa, fcPsi,
    lambda: 1, ecMPa, frMPa, priorReferenceEcMPa: 30000,
    ecDifferencePercent: (ecMPa / 30000 - 1) * 100,
    ecClause: '19.2.2.1(b)', ecPrintedPage: 356, ecPdfPage: 358,
    frClause: '19.2.3.1', lambdaClause: '19.2.4.3',
    status: 'CALCULATED_FROM_LOCAL_EDITION_PENDING_ERRATA_FINAL_ADOPTION'},
  exposureScreen: {clause: 'Table 19.3.2.1', printedPage: 366, pdfPage: 368,
    condition: 'IF_MEMBER_ASSIGNED_C2_IN_ACI_TRACK', minimumFcPsi: 5000,
    minimumFcMPa: 5000 * psiToMPa, minimumFcKsc: 5000 * psiToMPa / kscToMPa,
    meetsStrengthThreshold: false, maxWaterCementitiousRatio: 0.40,
    nonprestressedMaxWaterSolubleChloridePercent: 0.15,
    coverClause: '20.5', actualExposureAssigned: false,
    completeDurabilityCheck: false, auApplicability: 'NOT_APPLIED'},
  adoptedModelChanged: false, historicalRunsPreserved: true,
  engineeringApproved: false, productionReleased: false,
  validation: 'SOURCE_HASH_AND_UNIT_TESTS_PASSED'
};
fs.mkdirSync('output/staad-p7-p139', {recursive: true});
fs.writeFileSync('output/staad-p7-p139/material-screen.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
