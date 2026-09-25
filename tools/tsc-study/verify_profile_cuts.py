"""S2K physical-angle cut correction. No new FEM solve, no old evidence overwrite."""
import json,copy,math
import numpy as np
from profile_thickness_study import ROOT,OUT,read,write,sha,build
from bay_study import cuts
from traction_audit import audit,patch_check

def main():
    source='output/tsc-step2k-r00/profile_thickness_results.json';r=read(source)
    for p,h in {**r['dependency_hashes'],**r['raw_output_hashes']}.items():
        if sha(p)!=h:raise RuntimeError('Stale raw evidence '+p)
    parent=r['inherited_basis'];g=read(parent['geometry_source'])['geometry'];cb=read(parent['section_cuts_source']);ab=read(r['basis']['traction_criteria_source']);E=parent['material']['E_MPa']*1000;nu=parent['material']['nu']
    r['dependency_hashes'][source]=sha(source);r['dependency_hashes']['tools/tsc-study/verify_profile_cuts.py']=sha('tools/tsc-study/verify_profile_cuts.py')
    allruns=[];traction=[];patches=[]
    for s in [r['reference_run'],*r['runs']]:
        path=r['basis']['reference'] if s['mesh']=='H4' else f'output/tsc-step2k-r00/{s["id"]}.json';raw=read(path)
        m=next((m for m in r['basis']['meshes'] if m['id']==s['mesh']),{'id':'H4','profile_refine':False,'through_thickness':6})
        nodes,els,logical,grid,profile,cells,yy,nh,ny,nr,wall=build(g,.175,m,r['basis']['reference_mesh'])
        # Assert rebuilt mesh matches actual solved connectivity and coordinates.
        if len(nodes)!=len(raw['nodes']) or len(els)!=len(raw['elements']):raise RuntimeError('Geometry mismatch')
        for n,p in nodes.items():
            if max(abs(p-np.array(raw['nodes'][str(n)])))>1e-12:raise RuntimeError('Node mismatch')
        for a,b in zip(els,raw['elements']):
            if a['nodes']!=b['nodes']:raise RuntimeError('Connectivity mismatch')
        regions=[c['region'] for c in cells];start=regions.index('shoulder');count=regions.count('shoulder');fixed=copy.deepcopy(cb)
        for c in fixed['cuts']:
            if c['kind']=='crown':continue
            ang=c['degrees']*math.pi/180;rad=g['outer_shoulder_radius_m']-.175/2
            target=np.array([g['outer_shoulder_radius_m']-rad*math.cos(ang),g['overall_height_m']-g['outer_shoulder_radius_m']+rad*math.sin(ang)])
            idx=min(range(len(profile)),key=lambda i:np.linalg.norm(np.array(profile[i])-target))
            if np.linalg.norm(np.array(profile[idx])-target)>1e-10:raise RuntimeError('Missing exact-angle cut')
            # Adapt index-only legacy selector, preserving public ID and physical coordinates.
            c['degrees']=(idx-start)*90/count
        base={int(n):np.array(raw['reactions'][str(n)]) for n in raw['bases']['LH']}
        corrected=cuts(fixed,profile,regions,nodes,[{**e,'physical_load_6':e['mapped_load_6']} for e in raw['elements']],base,-s['total_load_6'][2])
        for c in corrected:
            if c['fbd_relative']>1e-6 or c['pair_relative']>1e-6:raise RuntimeError('Cut FBD')
        s={**s,'cuts':corrected};raw['summary']=s;patches.append({'mesh':s['mesh'],**patch_check(raw,E,nu)})
        tr=audit(raw,ab,E,nu);name='VERIFIED-TRACTION-'+s['id']+'.json';write(name,tr);r['raw_output_hashes']['output/tsc-step2k-r00/'+name]=sha('output/tsc-step2k-r00/'+name)
        allruns.append(s);traction.append(tr);print(s['mesh'],'verified cuts',sum(c['targets_met'] for c in tr['cuts']),flush=True)
    r['reference_run']=allruns[0];r['runs']=allruns[1:];r['traction_runs']=traction;r['physical_cut_patch_checks']=patches
    r['cut_selection_note']='Use this verified report for cuts. Initial KP report/raw summary selected nonuniform arc cuts by row fraction, so C22.5/C67.5 were misplaced. FEM displacement/stress fields unchanged. Recomputed cuts by physical target coordinates, verified all meshes against raw nodes/connectivity, then affine patches on all 36 traces. Initial evidence retained, not valid labelled KP cut output.'
    write('profile_thickness_verified.json',r)
if __name__=='__main__':main()
