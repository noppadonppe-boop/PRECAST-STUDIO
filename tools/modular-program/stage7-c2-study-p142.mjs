import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const prior = JSON.parse(fs.readFileSync('output/staad-p7-p139/material-screen.json'));
const hash = crypto.createHash('sha256').update(fs.readFileSync(prior.source.path)).digest('hex');
assert.equal(hash, prior.source.sha256);
const psiToMPa = (0.45359237 * 9.80665) / (0.0254 ** 2) / 1e6;
const cases = [350, 360].map(fcKsc => {
  const fcMPa = fcKsc * 0.0980665;
  const fcPsi = fcMPa / psiToMPa;
  return {fcKsc, fcMPa, fcPsi, ecMPa:57000*Math.sqrt(fcPsi)*psiToMPa,
    meetsC2StrengthThresholdOnly:fcPsi >= 5000};
});
assert.equal(cases[0].meetsC2StrengthThresholdOnly,false);
assert.equal(cases[1].meetsC2StrengthThresholdOnly,true);
assert.ok(Math.abs(cases[1].fcMPa-35.30394)<1e-9);
const result = {revision:'P142',studyAuthorized:true,sourceHash:hash,
  clauseEvidence:'P139: ACI318-19 IN-LB Table19.3.2.1 and19.2.2.1(b)',cases,
  ecChangePercent:(cases[1].ecMPa/cases[0].ecMPa-1)*100,
  scope:'C2_STRENGTH_SCREEN_ONLY_NOT_COMPLETE_DURABILITY_OR_RC',
  allProductsMaterialChanged:false,adoptedSTDChanged:false,
  remainingChecks:['exposure assignment','mix w/cm and chloride','cover and detailing',
    'official errata','cracked stiffness','structural joints and loads','RC capacity'],
  auEquivalenceClaimed:false,engineeringApproved:false,productionReleased:false};
fs.mkdirSync('output/staad-p7-p142',{recursive:true});
fs.writeFileSync('output/staad-p7-p142/c2-study.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
