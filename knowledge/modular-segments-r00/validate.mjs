import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8').replace(/^\uFEFF/,''));
const cat=read('catalog.json'), regs=read('variant_register.json'), grid=read('placement_grid.json'), boms=read('proposed_variant_bom.json');
const checks=[];
function check(name,passed,detail){checks.push({name,passed,detail});}
function area(p){return Math.abs(p.reduce((s,a,i)=>{let b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0))/2}
function overlap(a,b){return Math.max(0,Math.min(a.origin[0]+a.size[0],b.origin[0]+b.size[0])-Math.max(a.origin[0],b.origin[0]))*Math.max(0,Math.min(a.origin[1]+a.size[1],b.origin[1]+b.size[1])-Math.max(a.origin[1],b.origin[1]));}
const expected={I:{area:18,bays:4,nodes:0,floors:4},L:{area:27,bays:4,nodes:1,floors:6},U:{area:45,bays:6,nodes:2,floors:10}};
for(const [t,g]of Object.entries(grid)){
 const e=expected[t],a=area(g.polygon),fa=g.floors.reduce((s,p)=>s+p.size[0]*p.size[1],0);
 check(t+'_area',a===e.area&&fa===a,{polygon_m2:a,floor_sum_m2:fa,note:t==='I'?'I-STD15 proposal; legacy image not changed':null});
 check(t+'_bay_floor_node_counts',g.bays.length===e.bays&&g.floors.length===e.floors&&g.cells.filter(c=>c.kind==='node').length===e.nodes,e);
 check(t+'_floor_nonoverlap',g.floors.every((a,i)=>g.floors.slice(i+1).every(b=>overlap(a,b)===0)),null);
 check(t+'_floors_within_cells',g.floors.every(p=>g.cells.some(c=>p.cell===c.id&&p.origin[0]>=c.origin[0]&&p.origin[1]>=c.origin[1]&&p.origin[0]+p.size[0]<=c.origin[0]+3&&p.origin[1]+p.size[1]<=c.origin[1]+3)),null);
 const delta={N:[0,3],S:[0,-3],E:[3,0],W:[-3,0]};
 check(t+'_node_ports_connect_straight_cells',g.cells.filter(c=>c.kind==='node').every(c=>c.open_faces.every(f=>g.cells.some(b=>b.kind==='straight'&&b.origin[0]===c.origin[0]+delta[f][0]&&b.origin[1]===c.origin[1]+delta[f][1]))),null);
}
const tags=new Set(cat.segments.map(s=>s.tag));
check('unique_segment_tags_47',tags.size===47&&cat.segments.length===47,tags.size);
check('48_unique_buildings',new Set(regs.map(x=>x.building_tag)).size===48&&regs.length===48,regs.length);
check('16_per_plan_type',['I','L','U'].every(t=>regs.filter(x=>x.type===t).length===16),null);
check('no_manufacturing_approval',regs.every(x=>x.approved_for_manufacture===false)&&cat.segments.every(x=>x.approved_for_manufacture===false),null);
let instances=[];
for(const b of boms){
 const e=expected[b.type], known=b.type==='L'?20:34;
 instances.push(...b.items.map(x=>x.instance));
 check(b.building_tag+'_bom',b.items.length===known&&b.known_panel_count===known&&b.items.every(x=>tags.has(x.segment_tag))&&b.items.filter(x=>x.kind==='half_shell').length===e.bays*2&&b.items.filter(x=>x.kind==='floor_panel').length===e.floors&&b.items.filter(x=>x.kind==='node_roof_panel').length===e.nodes*2&&b.items.filter(x=>x.kind==='node_perimeter_wall_panel').length===e.nodes*4,{known_panels:known,exclusions:b.excluded_unresolved});
 const actual={};for(const p of b.items)actual[p.segment_tag]=(actual[p.segment_tag]||0)+1;
 check(b.building_tag+'_grouped_matches',Object.keys(actual).length===Object.keys(b.grouped_panel_bom).length&&Object.entries(actual).every(([k,v])=>b.grouped_panel_bom[k]===v),null);
}
check('32_variant_boms',boms.length===32,boms.length);
check('864_unique_panel_instances',instances.length===864&&new Set(instances).size===864,instances.length);
const images=[];
function inspectPng(p,label){
 if(!fs.existsSync(p)){check(label+'_exists',false,p);return;}
 const buf=fs.readFileSync(p),ok=buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const width=ok?buf.readUInt32BE(16):null,height=ok?buf.readUInt32BE(20):null;
 check(label+'_png_header',ok&&width>0&&height>0,{width,height});
 images.push({label,path:path.relative(dir,p).replaceAll('\\','/'),bytes:buf.length,width,height});
}
for(const r of regs)inspectPng(path.resolve(dir,r.image),r.building_tag);
for(const f of ['A','B','C','D'])inspectPng(path.resolve(dir,'../../output/ilu-standard-r00/TS-'+f+'_typical_segments.png'),'TS-'+f);
const report={date:'2026-09-16',scope:'Data consistency, nominal grid areas, panel quantities, file existence and PNG header only; visual review limitations in IMAGE_QA.md; NOT structural or mold validation.',status:checks.every(c=>c.passed)?'PASS_DATA_CHECKS_ONLY':'FAIL_DATA_CHECKS',checks_total:checks.length,checks_failed:checks.filter(c=>!c.passed),checks,images};
fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks:checks.length,failures:report.checks_failed,images:images.length},null,2));
if(report.checks_failed.length)process.exitCode=1;

