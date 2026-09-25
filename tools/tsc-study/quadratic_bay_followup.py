"""One predeclared H4 follow-up; preserve the original H1-H3 result file."""
import json
import numpy as np
from quadratic_bay_study import ROOT,OUT,read,write,sha,run,compare,ops

def main():
    source='output/tsc-step2h-r00/quadratic_bay_results.json';initial=read(source);b=initial['basis'];follow=read('knowledge/modular-tsc-step2h/followup.json')
    for p,h in {**initial['dependency_hashes'],**initial['raw_output_hashes']}.items():
        if sha(p)!=h:raise RuntimeError('Stale input '+p)
    if ops.version()!=initial['solver']['version'] or sha('.local-engineering-runtime/openseespywin/opensees.pyd')!=initial['solver']['dll_sha256']:raise RuntimeError('Runtime mismatch')
    g=read(b['geometry_source'])['geometry'];lb=read(b['local_points_source']);cb=read(b['section_cuts_source']);runs=list(initial['runs']);globals=[];locals=[];profiles=[];previous=[];prior=read(b['prior_solid']);qa=b['qa_declared_before_solving']
    for pattern in follow['patterns']:
        c=run(b,g,follow['mesh'],pattern,lb,cb);runs.append(c);a=next(r for r in initial['runs'] if r['pattern']==pattern and r['mesh']=='H3')
        ar=read(f'output/tsc-step2h-r00/{a["id"]}.json');cr=read(f'output/tsc-step2h-r00/{c["id"]}.json')
        rd=max(abs(c['base'][h][k]-a['base'][h][k])/max(abs(c['base'][h][k]),.1) for h in ['LH','RH'] for k in [0,2,4]);cd=max(abs(x['cut_on_lower_LH_6'][k]-y['cut_on_lower_LH_6'][k])/max(abs(x['cut_on_lower_LH_6'][k]),.1) for x,y in zip(c['cuts'],a['cuts']) for k in [0,2,4]);ud=abs(c['max_displacement_mm']-a['max_displacement_mm'])/max(abs(c['max_displacement_mm']),.001);ed=abs(c['strain_energy_kNm']/a['strain_energy_kNm']-1)
        globals.append({'pattern':pattern,'pair':['H3','H4'],'displacement_change':ud,'reaction_change':rd,'cut_change':cd,'energy_change':ed,'selected_global_targets_met':bool(ud<=qa['displacement_relative'] and rd<=qa['reaction_relative'] and cd<=qa['cut_relative'] and ed<=qa['energy_relative'])})
        ca={'mesh':'H3','pattern':pattern,'samples':ar['samples']};cc={'mesh':'H4','pattern':pattern,'samples':cr['samples']};locals.append(compare(ca,cc,lb))
        old=next(r for r in prior['solid_runs'] if r['pattern']==pattern and r['mesh']=='D3');os=read(f'output/tsc-step2e-r00/STRESS-{old["id"]}.json');diff=compare(os,cc,lb)
        for group in diff['groups']:
            group.pop('all_six_targets_met')
            for f in group['fields']:f.pop('targets_met')
        previous.append({'pattern':pattern,'source_id':old['id'],'quadratic_id':c['id'],'crown_uz_relative_difference':c['crown_mid_uz_mm']/old['crown_mid_uz_mm']-1,'LH_base_difference_6':(np.array(c['base']['LH'])-old['base']['LH']).tolist(),'local_difference':diff,'warning':'Geometry/load interpolation differ; not independent exact reference or formulation-only comparison.'})
        profiles.append({'pattern':pattern,'points':[{k:v for k,v in s.items() if k!='sides'} for s in cr['samples'] if s['hand']=='LH' and s['station']=='C45' and s['y_m']==.75]})
    deps={**initial['dependency_hashes'],**initial['raw_output_hashes']}
    for p in [source,'knowledge/modular-tsc-step2h/followup.json','tools/tsc-study/quadratic_bay_followup.py']:deps[p]=sha(p)
    report={**initial,'runs':runs,'followup':follow,'initial_global_comparisons':initial['global_comparisons'],'initial_local_comparisons':initial['local_comparisons'],'global_comparisons':globals,'local_comparisons':locals,'prior_model_comparisons':previous,'profiles':profiles,'dependency_hashes':deps,'raw_output_hashes':{f'output/tsc-step2h-r00/{r["id"]}.json':sha(f'output/tsc-step2h-r00/{r["id"]}.json') for r in runs},'full_bay_quadratic_scope':'EIGHT_TRIAL_RUNS_NOT_INDEPENDENT_FULL_VALIDATION'}
    write('quadratic_bay_followup.json',report)
    print('FINISHED H4',json.dumps(globals),json.dumps([{'pattern':c['pattern'],'groups':[{'group':g['group'],'met':g['all_six_targets_met'],'maxchange':max(f['max_point_change'] for f in g['fields']),'maxspread':max(f['max_spread_relative'] for f in g['fields'])} for g in c['groups']]} for c in locals]),flush=True)
if __name__=='__main__':main()
