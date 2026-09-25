import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const target = 'references/stage7/TIS-24-2559p.pdf';
const expected = '0d4bab902203414041b4dcbb898b93d77129108b1912882be9328834d9c4f6f0';
const intake = fs.existsSync(target) ? target : 'tmp/pdfs/TIS-24-2559p.pdf';
const bytes = fs.readFileSync(intake);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256, expected);
if (!fs.existsSync(target)) {
  fs.mkdirSync('references/stage7', {recursive:true});
  fs.writeFileSync(target, bytes, {flag:'wx'});
}
const minimumYieldMPa = 490;
const minimumYieldKNm2 = minimumYieldMPa * 1000;
assert.equal(minimumYieldKNm2, 490000);
const result = {
  revision:'P141', source:{path:target,sha256,bytes:bytes.length,
    url:'https://service.tisi.go.th/fulltext/TIS-24-2559p.pdf',pdfPages:26,
    standard:'TIS24-2559 amendment with 2548 base',publicWebAllowed:false},
  evidence:{clause:'6.3.1 Table7',pdfPage:18,printedPage:6,visualChecked:true,
    amendmentPdfPagesReviewed:[1,2,3,4],testMethodFullyReviewed:false},
  userGrade:'SD50',minimumYieldMPa,minimumYieldKNm2,
  minimumTensileMPa:620,minimumElongationPercent:13,
  elongationBasis:'Clause9.5.2.3 initial gauge length 5d; specimen rules apply',
  actualMillProperties:null,actualTensileYieldRatio:null,
  aciQualification:'PENDING_NOT_AUTOMATIC_ASTМ_EQUIVALENCE',
  auQualification:'PENDING',adoptedModelChanged:false,
  engineeringApproved:false,productionReleased:false,
  validation:'SOURCE_HASH_AND_UNIT_ARITHMETIC_PASSED_NOT_CODE_COMPLIANCE'
};
fs.mkdirSync('output/staad-p7-p141',{recursive:true});
fs.writeFileSync('output/staad-p7-p141/sd50-source.json',JSON.stringify(result,null,2)+'\n');
console.log('P141: verified source hash; SD50 source threshold 490 MPa; qualification pending.');
