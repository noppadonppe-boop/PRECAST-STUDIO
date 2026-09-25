import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),out='output/mould-style-p43';
fs.mkdirSync(out,{recursive:true});
const reg=JSON.parse(fs.readFileSync('output/stage5-moulds-p38/register.json','utf8'));
const style='output/mould-style-sample-p42/TS-C-style-sample-01.png';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const jobs=reg.setups.map((s,i)=>{
 const pilot=s.typicalId==='TS-C-H15-LH-W01-P05';
 const source=pilot?'output/mould-hardware-p41/01-ASSEMBLY.png':`output/stage5-moulds-p38/${s.folder}/03-GEOMETRY-REVIEW.png`;
 const prompt=`Use case: style-transfer. Produce one landscape premium precast presentation sheet. Image1 is authoritative geometry and camera reference for ${s.typicalId}; image2 is STYLE ONLY, never copy its rounded shape or window into this item. Match image2 white studio background, navy condensed headings, thin grey frames, photoreal navy/silver steel and lightly textured grey concrete, amber ONLY for source-defined removable opening inserts. Preserve source silhouette, handedness, angles, openings/notches and relative dimensions. Smooth tessellation lines, not real joints. Do not alter casting orientation. Layout: left mould view, right corresponding casting, large objects, bottom legend. ${pilot?'Use existing P41 bracing and fasteners, no added parts. Show top concrete pouring cavity open, not capped by a silver band. Left heading ASSEMBLED MOULD STUDY.':'Source has ONLY contact surfaces, NOT designed hardware. Show these as clean thin metallic contact-surface study in the exact original orientation. Do NOT invent a base, ribs, braces, bolts, locks, lifting lugs or completed machine. Left heading CONTACT SURFACE STUDY. Add text Hardware not modelled.'} Right heading FINISHED CASTING. Top title PRECAST MOULD | ${s.typicalId}. Subtitle ${s.kind} / DEVELOPMENT VISUAL. Print metadata exactly: Casting envelope XYZ: ${s.dimensionsMm.map(n=>n.toFixed(2)).join(' x ')} mm. Envelope is NOT thickness. Concrete mass (source): ${s.concreteKg.toFixed(2)} kg. Do not add other numbers, dimensions or invented certification. Footer: AI PRESENTATION — SOURCE MODEL GOVERNS. NOT FOR FABRICATION OR LIFTING. Legend BLUE: SUPPORT / SILVER: CONTACT / AMBER: INSERT / GREY: CONCRETE. Match source geometry rather than attractive generic moulds. Only ONE setup on this board.`;
 return {index:i,id:s.id,typicalId:s.typicalId,kind:s.kind,source,sourceSha256:sha(source),style,styleSha256:sha(style),prompt,output:`${out}/${s.id}-STYLE.png`,status:'PENDING',usedBy:s.usedBy};
});
fs.writeFileSync(`${out}/jobs.json`,JSON.stringify(jobs,null,2));
console.log(JSON.stringify({count:jobs.length,output:out}));
