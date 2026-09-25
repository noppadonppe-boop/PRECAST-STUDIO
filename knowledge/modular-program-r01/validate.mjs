import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../..');
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8').replace(/^\uFEFF/,''));
const b=read('baseline.json'),s=read('source_register.json'),m=read('product_matrix.json');
const legacy=read('../modular-segments-r00/variant_register.json');
const checks=[];
function c(name,pass,detail=null){checks.push({name,pass,detail});}
c('user_plan_accepted_but_engineering_not_approved',b.approval.product_plan==='USER_ACCEPTED'&&b.approval.engineering_design==='NOT_APPROVED'&&b.approval.manufacturing_release===false);
c('1500mm_all_plans',b.standardization.segment_length_mm===1500&&['I','L','U'].every(t=>b.standardization.applies_to.includes(t)));
c('legacy_retained_not_relabelled',b.standardization.legacy_I.length_mm===2000&&b.standardization.legacy_I.preserve_originals&&b.standardization.legacy_I.do_not_relabel_as_STD15);
c('thickness_target_not_selected',b.thickness_policy.target_range[0]===150&&b.thickness_policy.target_range[1]===200&&b.thickness_policy.selected_thickness_mm===null&&b.thickness_policy.allow_engineered_piece_exceptions&&b.thickness_policy.scope.length===3);
c('internal_not_public',b.access.initial==='INTERNAL_TEAM'&&b.access.public_catalog_enabled===false&&b.access.authorization_per_artifact);
c('pilot_C',b.pilot.family==='C'&&b.pilot.typical==='TS-C');
c('unselected_materials_and_prestress',b.materials.concrete_selected===null&&b.materials.reinforcement_selected===null&&b.materials.prestress_decision==='UNDECIDED');
c('force_conversion_roof',Math.abs(b.loads.roof_LL.si_kN_m2-b.loads.roof_LL.user_value*b.loads.standard_gravity_m_s2/1000)<1e-10);
c('force_conversion_floor',Math.abs(b.loads.floor_LL.si_kN_m2-b.loads.floor_LL.user_value*b.loads.standard_gravity_m_s2/1000)<1e-10);
c('48_unique_product_slots',m.length===48&&new Set(m.map(x=>x.product_id)).size===48);
c('complete_category_matrix',['I','L','U'].every(t=>['A','B','C','D'].every(f=>[1,2,3,4].every(u=>m.filter(x=>x.type===t&&x.family===f&&x.use===u).length===1))));
for(const u of [1,2,3,4])c('use_'+u+'_12_slots',m.filter(x=>x.use===u).length===12);
for(const t of ['I','L','U']){
 c('plan_'+t+'_16_slots',m.filter(x=>x.type===t).length===16);
 const r=b.recipes[t];
 c('recipe_'+t+'_floor_area',r.floors_total*3*1.5===r.area_m2);
 c('recipe_'+t+'_halves_and_primary_count',r.half_shells===2*r.straight_bays&&r.known_primary_panels===r.half_shells+r.floors_total+r.NR15+r.NW15&&r.NR15===r.N90_kits*2&&r.NW15===r.N90_kits*4);
}
for(const v of m){
 const p=path.resolve(dir,v.reference_image);
 const old=legacy.find(x=>x.building_tag===v.reference_artifact_tag);
 c(v.display_code+'_image_mapping',fs.existsSync(p)&&old!==undefined&&path.resolve(dir,'../modular-segments-r00',old.image)===p);
 c(v.display_code+'_not_manufacture_ready',v.engineering_status==='NOT_ANALYSED'&&v.approved_for_manufacture===false&&v.image_geometry_certified===false&&v.target_segment_length_mm===1500);
 if(v.type==='I')c(v.display_code+'_legacy_warning',v.image_role==='LEGACY20_CONCEPT_REFERENCE'&&v.target_image_status==='NEW_STD15_IMAGE_REQUIRED');
}
for(const src of s.sources){
 const p=path.resolve(dir,src.path);
 c(src.source_id+'_exists',fs.existsSync(p));
 if(fs.existsSync(p)){
  const data=fs.readFileSync(p);
  c(src.source_id+'_hash',crypto.createHash('sha256').update(data).digest('hex').toUpperCase()===src.sha256&&data.length===src.bytes);
 }
 c(src.source_id+'_identity_only',src.standard_number==='011008-21'&&src.year_BE===2564&&src.verified_scope==='BIBLIOGRAPHIC_IDENTITY_ONLY_NOT_TECHNICAL_CLAUSES'&&src.public_web_allowed===false);
}
c('primary_code_source_resolves',s.sources.some(x=>x.source_id===b.code.primary_source_id));
for(const [name,p] of Object.entries(b.references))c('reference_'+name,fs.existsSync(path.resolve(dir,p)),p);
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.md'))){
 const doc=fs.readFileSync(path.join(dir,f),'utf8');
 for(const match of doc.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  const link=match[1].replace(/^<|>$/g,'').split('#')[0];
  if(!link||/^[a-z]+:\/\//i.test(link))continue;
  // The report being created by this run cannot be a prerequisite of its first run.
  if(path.resolve(dir,decodeURIComponent(link))===path.join(dir,'validation.json'))continue;
  c(f+'_local_link_'+link,fs.existsSync(path.resolve(dir,decodeURIComponent(link))));
 }
}
c('skill_source_exists',fs.existsSync(path.join(root,'skills/precast-modular-workflow/SKILL.md')));
const report={date:'2026-09-16',revision:'R01',scope:'Plan/data/source identity/link integrity ONLY. Not web implementation, FEM, code compliance, design approval or production release.',status:checks.every(x=>x.pass)?'PASS_PLAN_DATA_CHECKS_ONLY':'FAIL',checks_total:checks.length,failures:checks.filter(x=>!x.pass),checks};
fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks:checks.length,failures:report.failures},null,2));
if(report.failures.length)process.exitCode=1;
