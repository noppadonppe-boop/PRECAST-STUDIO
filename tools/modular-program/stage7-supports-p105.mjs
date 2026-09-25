import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root=process.cwd(), source=path.join(root,'output/stage3-designs-p36');
const out=path.join(root,'output/staad-p7-p105/support-layouts');
fs.mkdirSync(out,{recursive:true});
const records=[];
for(const dir of fs.readdirSync(source)){
 const file=path.join(source,dir,'model.json'); if(!fs.existsSync(file))continue;
 const raw=fs.readFileSync(file), m=JSON.parse(raw); if(!m.id?.startsWith('PM-'))continue;
 const polygon=m.footprintMm, supports=[], spans=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]); assert(length>0);
  const n=Math.ceil(length/3000);
  for(let j=0;j<n;j++){
   const p=a.map((v,k)=>v+(b[k]-v)*j/n);
   supports.push({tag:`F${String(supports.length+1).padStart(2,'0')}`,planMm:p,corner:j===0});
   spans.push({edge:i+1,lengthMm:length/n});
  }
 }
 spans.forEach((s,i)=>Object.assign(s,{from:supports[i].tag,to:supports[(i+1)%supports.length].tag}));
 assert(spans.every(s=>s.lengthMm<=3000.000001));
 assert(new Set(supports.map(s=>s.planMm.join(','))).size===supports.length);
 const data={id:m.id,revision:'P105',status:'NOMINAL_PERIMETER_SUPPORT_PROPOSAL_NOT_ANALYTICAL_MODEL',source:path.relative(root,file).replaceAll('\\','/'),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),beamWidthMm:250,beamDepthMm:400,continuousSoilSupport:false,beamAxisOffsetMm:null,beamElevationMm:null,supportDOF:null,foundationCapacity:null,notes:['Coordinates follow external footprint, not verified beam centreline.','Verify bearing widths, eccentricities, internal floor seams and joint load paths before meshing.','No reactions or RC capacities calculated.'],supports,spans};
 fs.writeFileSync(path.join(out,`${m.id}.json`),JSON.stringify(data,null,2)+'\n');
 const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]),w=Math.max(...xs)+1400,h=Math.max(...ys)+1800;
 const pts=polygon.map(p=>`${p[0]+700},${p[1]+900}`).join(' ');
 const circles=supports.map(s=>`<circle cx="${s.planMm[0]+700}" cy="${s.planMm[1]+900}" r="65" fill="#c07800"/><text x="${s.planMm[0]+800}" y="${s.planMm[1]+800}" font-size="120">${s.tag}</text>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="white"/><g fill="#102747" font-family="Arial"><text x="200" y="250" font-size="170">${m.id} | PERIMETER SUPPORT PROPOSAL</text><text x="200" y="470" font-size="110">250 x 400 mm trial beam | spans &lt;= 3000 mm | no soil support</text><text x="200" y="650" font-size="100">FOOTPRINT DATUM ONLY - NOT VERIFIED BEAM AXES / NOT FOR CONSTRUCTION</text><polygon points="${pts}" fill="#edf1f5" stroke="#102747" stroke-width="35"/>${circles}</g></svg>`;
 fs.writeFileSync(path.join(out,`${m.id}.svg`),svg);
 records.push({id:m.id,plan:m.plan,count:supports.length,maxSpanMm:Math.max(...spans.map(s=>s.lengthMm)),sourceSha256:data.sourceSha256});
}
assert.equal(records.length,48);
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify({status:'LAYOUT_ONLY',count:records.length,records},null,2)+'\n');
console.log(JSON.stringify({products:records.length,plans:[...new Set(records.map(r=>`${r.plan}: ${r.count} supports, max ${r.maxSpanMm} mm`))],checks:'48 counts, unique supports, all spans <=3000 mm PASS'}));
