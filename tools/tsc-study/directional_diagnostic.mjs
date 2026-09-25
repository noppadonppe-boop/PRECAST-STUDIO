import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const bp='knowledge/modular-tsc-step2n/basis.json', out='output/tsc-step2n-r00';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
export function diagnose(coarse,fine,basis){
  const qa=basis.qa_declared_before_postprocessing, floor=qa.stress_reference_floor_kPa;
  if(coarse.samples.length!==490||fine.samples.length!==490)throw Error('Expected 490 points');
  const elements=new Map(fine.elements.map(e=>[e.id,e]));
  const points=fine.samples.map((p,i)=>{
    const a=coarse.samples[i];if(a.key!==p.key||JSON.stringify(a.xyz_m)!==JSON.stringify(p.xyz_m))throw Error('Different physical grid');
    const pairs=[];
    for(let x=0;x<p.sides.length;x++)for(let y=x+1;y<p.sides.length;y++){
      const s=p.sides[x],t=p.sides[y],ei=elements.get(s.element).indices,ej=elements.get(t.element).indices;
      const axes=[0,1,2].filter(k=>ei[k]!==ej[k]);
      if(!axes.length)throw Error('Duplicate element sample');
      const axis=axes.length===1?['profile','Y','thickness'][axes[0]]:'multiple';
      if(axes.length===1){const k=axes[0];if(Math.abs(ei[k]-ej[k])!==1||Math.abs(Math.abs(s.natural[k])-1)>1e-7||Math.abs(s.natural[k]+t.natural[k])>1e-7)throw Error('Not opposite adjacent faces');}
      const jumps=s.local_kPa.map((v,k)=>Math.abs(v-t.local_kPa[k]));
      pairs.push({elements:[s.element,t.element],indices:[ei,ej],direction:axis,jump_kPa:jumps,relative:jumps.map((v,k)=>v/Math.max(Math.abs(p.mean_kPa[k]),floor))});
    }
    return {key:p.key,group:p.group,xyz_m:p.xyz_m,station:p.station,side_count:p.sides.length,pairs,fields:basis.stress_order.map((component,k)=>({component,coarse_kPa:a.mean_kPa[k],fine_kPa:p.mean_kPa[k],difference_kPa:Math.abs(p.mean_kPa[k]-a.mean_kPa[k]),change:Math.abs(p.mean_kPa[k]-a.mean_kPa[k])/Math.max(Math.abs(p.mean_kPa[k]),floor),spread_kPa:p.max_kPa[k]-p.min_kPa[k],spread:(p.max_kPa[k]-p.min_kPa[k])/Math.max(Math.abs(p.mean_kPa[k]),floor)}))};
  });
  const groups=basis.groups.map(group=>{
    const ps=points.filter(p=>p.group===group);
    const fields=basis.stress_order.map((component,k)=>{
      const worst=ps.reduce((a,b)=>a.fields[k].change>=b.fields[k].change?a:b),spread=ps.reduce((a,b)=>a.fields[k].spread>=b.fields[k].spread?a:b);
      const rms=Math.sqrt(ps.reduce((s,p)=>s+p.fields[k].difference_kPa**2,0)/ps.length)/Math.max(Math.sqrt(ps.reduce((s,p)=>s+p.fields[k].fine_kPa**2,0)/ps.length),floor);
      return {component,worst_point:worst.key,spread_point:spread.key,point_change:worst.fields[k].change,rms_change:rms,spread:spread.fields[k].spread,difference_kPa:worst.fields[k].difference_kPa,spread_kPa:spread.fields[k].spread_kPa,failed_metrics:[...(worst.fields[k].change>qa.max_point_relative_change?['point']:[]),...(rms>qa.component_rms_relative_change?['RMS']:[]),...(spread.fields[k].spread>qa.one_sided_spread_relative?['spread']:[])]};
    });
    const directions=['profile','Y','thickness','multiple'].map(direction=>{
      const candidates=ps.flatMap(p=>p.pairs.filter(a=>a.direction===direction).flatMap(a=>a.relative.map((value,k)=>({value,jump_kPa:a.jump_kPa[k],component:basis.stress_order[k],point:p.key,elements:a.elements}))));
      return {direction,pair_count:ps.reduce((s,p)=>s+p.pairs.filter(a=>a.direction===direction).length,0),worst:candidates.length?candidates.reduce((a,b)=>a.value>=b.value?a:b):null};
    });
    return {group,points:ps.length,fields,directions,all_six_targets_met:fields.every(f=>!f.failed_metrics.length)};
  });
  return {points,groups};
}
async function main(){
  const b=await read(bp),up=await read(b.upstream),criteria=await read(b.criteria_source);
  const deps={...up.dependency_hashes,...up.raw_output_hashes};
  for(const [p,h]of Object.entries(deps))if(await hash(p)!==h)throw Error('Stale '+p);
  for(const p of [bp,b.upstream,b.criteria_source,'tools/tsc-study/directional_diagnostic.mjs'])deps[p]=await hash(p);
  const [a,z]=await Promise.all(b.raw_sources.map(read));
  const result=diagnose(a,z,criteria);
  const r={...b,...result,dependency_hashes:deps,raw_output_hashes:Object.fromEntries(await Promise.all(b.raw_sources.map(async p=>[p,await hash(p)]))),whole_model_local_stress_convergence:'NOT_ESTABLISHED'};
  await mkdir(out,{recursive:true});await writeFile(resolve(out,'directional_results.json'),JSON.stringify(r));
  console.log(JSON.stringify(result.groups.map(g=>({group:g.group,failed:g.fields.filter(f=>f.failed_metrics.length),directions:g.directions})),null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===resolve('tools/tsc-study/directional_diagnostic.mjs'))await main();
