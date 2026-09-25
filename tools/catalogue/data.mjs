import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

const studyDependencies = ['knowledge/modular-tsc-step2a/study_basis.json', 'knowledge/modular-tsc-step2a/joint_register.json', 'tools/tsc-study/compute.mjs', 'tools/tsc-study/render.mjs'];
const shellDependencies = ['knowledge/modular-tsc-step2a/study_basis.json','knowledge/modular-tsc-step2b/basis.json','knowledge/modular-tsc-step2b/clause_register.json','tools/tsc-study/shell_study.py','tools/tsc-study/requirements-shell.txt','output/tsc-step2b-r00/shell_results.json','tools/tsc-study/render_shell.mjs','output/tsc-step2a-r00/study_results.json'];
const diagnosticDependencies=[...shellDependencies.slice(0,6),'knowledge/modular-tsc-step2c/basis.json','tools/tsc-study/diagnostic_study.py','output/tsc-step2c-r00/diagnostic_results.json','tools/tsc-study/render_diagnostics.mjs'];
const diagnosticRawSources=['P-H','F-R'].flatMap(j=>['M2','M3','M4'].map(m=>`output/tsc-step2b-r00/T175-${j}-FULL-${m}.json`));
const bayDependencies=[...diagnosticDependencies.filter(p=>!p.endsWith('render_diagnostics.mjs')),...diagnosticRawSources,'knowledge/modular-tsc-step2d/basis.json','tools/tsc-study/bay_study.py','output/tsc-step2d-r00/bay_results.json','tools/tsc-study/render_bay.mjs'];
const stressDependencies=[...bayDependencies.filter(p=>!p.endsWith('render_bay.mjs')),'knowledge/modular-tsc-step2e/basis.json','tools/tsc-study/stress_study.py','output/tsc-step2e-r00/stress_results.json','tools/tsc-study/render_stress.mjs'];
const stressRawSources=['FULL','LEFT'].flatMap(p=>['D1','D2','D3'].map(m=>`output/tsc-step2d-r00/SOLID-T175-FR-${p}-${m}.json`));
const benchmarkDependencies=['knowledge/modular-tsc-step2f/basis.json','tools/tsc-study/benchmark_study.py','output/tsc-step2e-r00/stress_results.json','output/tsc-step2b-r00/shell_results.json','output/tsc-step2f-r00/benchmark_results.json','tools/tsc-study/render_benchmark.mjs'];
const benchmarkRawSources=['stdBrick','20NodeBrick'].flatMap(k=>[...['M','V'].flatMap(c=>['Q1','Q2','Q3','Q4','Q5','Q6'].map(m=>`output/tsc-step2f-r00/${k}-${c}-${m}-consistent.json`)),...['Q2','Q6'].map(m=>`output/tsc-step2f-r00/${k}-V-${m}-equal_nodes.json`)]);
export async function studyIsStale(root, generated) {
  if(generated.id==='STUDY-TS-C-S2N-R00'){
    const deps=['knowledge/modular-tsc-step2n/basis.json','tools/tsc-study/directional_diagnostic.mjs','tools/tsc-study/render_directional.mjs','output/tsc-step2n-r00/directional_results.json','output/tsc-step2m-r00/arc_crown_results.json'];
    const raw=['output/tsc-step2l-r00/COMBINED-T175-FR-FULL-KPT.json','output/tsc-step2m-r00/ARC-T175-FR-FULL-M1.json'];
    if(deps.some(p=>!generated.dependency_hashes?.[p])||raw.some(p=>!generated.raw_output_hashes?.[p]))return true;
    for(const [p,h] of Object.entries({...generated.dependency_hashes,...generated.raw_output_hashes})){
      const path=resolve(root,p),rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep))return true;
      try{const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);if(hash.digest('hex')!==h)return true;}catch{return true;}
    }
    return false;
  }
  if(generated.id==='STUDY-TS-C-S2O-R00'){
    const deps=['knowledge/modular-tsc-step2o/basis.json','tools/tsc-study/base_profile_study.py','tools/tsc-study/combined_mesh_study.py','tools/tsc-study/local_mesh_study.py','tools/tsc-study/traction_audit.py','tools/tsc-study/render_base_profile.mjs','output/tsc-step2o-r00/base_profile_results.json','output/tsc-step2m-r00/arc_crown_results.json'];
    const raw=['BASE-T175-FR-FULL-NB','TRACTION-BASE-T175-FR-FULL-NB'].map(id=>`output/tsc-step2o-r00/${id}.json`);
    if(deps.some(p=>!generated.dependency_hashes?.[p])||raw.some(p=>!generated.raw_output_hashes?.[p]))return true;
    for(const [p,h] of Object.entries({...generated.dependency_hashes,...generated.raw_output_hashes})){
      const path=resolve(root,p),rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith(`..${sep}`))return true;
      try{const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);if(hash.digest('hex')!==h)return true;}catch{return true;}
    }
    return false;
  }
  if(generated.id==='STUDY-TS-C-S2M-R00'){
    const deps=['knowledge/modular-tsc-step2m/basis.json','tools/tsc-study/arc_crown_study.py','tools/tsc-study/combined_mesh_study.py','tools/tsc-study/local_mesh_study.py','tools/tsc-study/traction_audit.py','tools/tsc-study/render_arc_crown.mjs','output/tsc-step2m-r00/arc_crown_results.json','output/tsc-step2l-r00/combined_mesh_results.json'];
    const raw=['ARC-T175-FR-FULL-M1','TRACTION-ARC-T175-FR-FULL-M1'].map(id=>`output/tsc-step2m-r00/${id}.json`);
    if(deps.some(p=>!generated.dependency_hashes?.[p])||raw.some(p=>!generated.raw_output_hashes?.[p]))return true;
    for(const [p,h] of Object.entries({...generated.dependency_hashes,...generated.raw_output_hashes})){
      const path=resolve(root,p),rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith(`..${sep}`))return true;
      try{const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);if(hash.digest('hex')!==h)return true;}catch{return true;}
    }
    return false;
  }
  if(generated.id==='STUDY-TS-C-S2L-R00'){
    const deps=['knowledge/modular-tsc-step2l/basis.json','tools/tsc-study/combined_mesh_study.py','tools/tsc-study/profile_thickness_study.py','tools/tsc-study/local_mesh_study.py','tools/tsc-study/traction_audit.py','tools/tsc-study/render_combined_mesh.mjs','output/tsc-step2l-r00/combined_mesh_results.json','output/tsc-step2k-r00/profile_thickness_verified.json'];
    const raw=['COMBINED-T175-FR-FULL-KPT','TRACTION-COMBINED-T175-FR-FULL-KPT'].map(id=>`output/tsc-step2l-r00/${id}.json`);
    if(deps.some(p=>!generated.dependency_hashes?.[p])||raw.some(p=>!generated.raw_output_hashes?.[p]))return true;
    for(const [p,h] of Object.entries({...generated.dependency_hashes,...generated.raw_output_hashes})){
      const path=resolve(root,p),rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith(`..${sep}`))return true;
      try{const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);if(hash.digest('hex')!==h)return true;}catch{return true;}
    }
    return false;
  }
  if(generated.id==='STUDY-TS-C-S2K-R00'){
    const deps=['knowledge/modular-tsc-step2k/basis.json','tools/tsc-study/profile_thickness_study.py','tools/tsc-study/local_mesh_study.py','tools/tsc-study/traction_audit.py','tools/tsc-study/verify_profile_cuts.py','tools/tsc-study/render_profile_thickness.mjs','output/tsc-step2k-r00/profile_thickness_results.json','output/tsc-step2k-r00/profile_thickness_verified.json','output/tsc-step2h-r00/QSB-T175-FR-FULL-H4.json'];
    const raw=[...['KP','KT'].map(m=>`output/tsc-step2k-r00/PT-T175-FR-FULL-${m}.json`),...['QSB-T175-FR-FULL-H4',...['KP','KT'].map(m=>`PT-T175-FR-FULL-${m}`)].flatMap(id=>['TRACTION-','VERIFIED-TRACTION-'].map(prefix=>`output/tsc-step2k-r00/${prefix}${id}.json`))];
    if(deps.some(p=>!generated.dependency_hashes?.[p])||raw.some(p=>!generated.raw_output_hashes?.[p]))return true;
    for(const [p,h] of Object.entries({...generated.dependency_hashes,...generated.raw_output_hashes})){
      const path=resolve(root,p),rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith(`..${sep}`))return true;
      try{const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);if(hash.digest('hex')!==h)return true;}catch{return true;}
    }
    return false;
  }
  if(generated.id==='STUDY-TS-C-S2J-R00'){
    const deps=['knowledge/modular-tsc-step2j/basis.json','tools/tsc-study/gravity_coupon.py','tools/tsc-study/traction_audit.py','tools/tsc-study/benchmark_study.py','tools/tsc-study/render_gravity_coupon.mjs','output/tsc-step2j-r00/gravity_coupon_results.json','output/tsc-step2i-r00/traction_results.json'];
    const raw=[...['J1','J2','J3','J4','J5','J6','J7'].map(m=>`output/tsc-step2j-r00/GRAVITY-NU20-${m}.json`),...['J3','J7'].map(m=>`output/tsc-step2j-r00/GRAVITY-NU00-${m}.json`)];
    if(deps.some(p=>!generated.dependency_hashes?.[p])||raw.some(p=>!generated.raw_output_hashes?.[p]))return true;
    for(const [p,h] of Object.entries({...generated.dependency_hashes,...generated.raw_output_hashes})){
      const path=resolve(root,p),rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith(`..${sep}`))return true;
      try{const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);if(hash.digest('hex')!==h)return true;}catch{return true;}
    }
    return false;
  }
  if(generated.id==='STUDY-TS-C-S2I-R00'){
    const deps=['knowledge/modular-tsc-step2i/basis.json','tools/tsc-study/local_mesh_study.py','tools/tsc-study/traction_audit.py','tools/tsc-study/render_local_mesh.mjs','output/tsc-step2i-r00/local_mesh_results.json','output/tsc-step2i-r00/traction_results.json','output/tsc-step2h-r00/quadratic_bay_followup.json',...['FULL','LEFT'].flatMap(p=>['H1','H2','H3','H4'].map(m=>`output/tsc-step2h-r00/QSB-T175-FR-${p}-${m}.json`))];
    const ids=[...['FULL','LEFT'].flatMap(p=>['H1','H2','H3','H4'].map(m=>`QSB-T175-FR-${p}-${m}`)),...['IB','IY','IBY'].map(m=>`LOCAL-T175-FR-FULL-${m}`)];
    const raw=[...['IB','IY','IBY'].map(m=>`output/tsc-step2i-r00/LOCAL-T175-FR-FULL-${m}.json`),...ids.map(id=>`output/tsc-step2i-r00/TRACTION-${id}.json`)];
    if(deps.some(p=>!generated.dependency_hashes?.[p])||raw.some(p=>!generated.raw_output_hashes?.[p]))return true;
    // Stream large evidence files sequentially; hashes never imply engineering approval.
    for(const [p,h] of Object.entries({...generated.dependency_hashes,...generated.raw_output_hashes})){
      const path=resolve(root,p),rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith(`..${sep}`))return true;
      try{const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);if(hash.digest('hex')!==h)return true;}catch{return true;}
    }
    return false;
  }
  if(generated.id==='STUDY-TS-C-S2H-R00'){
    const deps=[...stressDependencies.filter(p=>!p.endsWith('render_stress.mjs')),...stressRawSources,'knowledge/modular-tsc-step2f/basis.json','tools/tsc-study/benchmark_study.py','output/tsc-step2f-r00/benchmark_results.json','knowledge/modular-tsc-step2g/basis.json','tools/tsc-study/curved_study.py','output/tsc-step2g-r00/curved_results.json','knowledge/modular-tsc-step2h/basis.json','knowledge/modular-tsc-step2h/followup.json','tools/tsc-study/quadratic_bay_study.py','tools/tsc-study/quadratic_bay_followup.py','tools/tsc-study/render_quadratic_bay.mjs','output/tsc-step2h-r00/quadratic_bay_results.json','output/tsc-step2h-r00/quadratic_bay_followup.json'];
    const raw=['FULL','LEFT'].flatMap(p=>['H1','H2','H3','H4'].map(m=>`output/tsc-step2h-r00/QSB-T175-FR-${p}-${m}.json`));
    return (await Promise.all([...new Set(deps)].map(async p=>createHash('sha256').update(await readFile(resolve(root,p))).digest('hex')!==generated.dependency_hashes?.[p]).concat(raw.map(async p=>createHash('sha256').update(await readFile(resolve(root,p))).digest('hex')!==generated.raw_output_hashes?.[p])))).some(Boolean);
  }
  if(generated.id==='STUDY-TS-C-S2G-R00'){
    const deps=['knowledge/modular-tsc-step2g/basis.json','tools/tsc-study/curved_study.py','tools/tsc-study/benchmark_study.py','knowledge/modular-tsc-step2f/basis.json','output/tsc-step2f-r00/benchmark_results.json','knowledge/modular-tsc-step2c/basis.json','output/tsc-step2c-r00/diagnostic_results.json','output/tsc-step2g-r00/curved_results.json','tools/tsc-study/render_curved.mjs'];
    const raw=[...[150,175,200].flatMap(t=>['H8-CHORD','H20-CHORD','H20-CURVED'].flatMap(k=>['G1','G2','G3'].map(m=>`output/tsc-step2g-r00/${k}-T${t}-NU20-${m}.json`))),...['G1','G2','G3'].map(m=>`output/tsc-step2g-r00/H20-CURVED-T175-NU00-${m}.json`)];
    return (await Promise.all([...deps.map(async p=>createHash('sha256').update(await readFile(resolve(root,p))).digest('hex')!==generated.dependency_hashes?.[p]),...raw.map(async p=>createHash('sha256').update(await readFile(resolve(root,p))).digest('hex')!==generated.raw_output_hashes?.[p])])).some(Boolean);
  }
  if(generated.id==='STUDY-TS-C-S2F-R00')return (await Promise.all([...benchmarkDependencies.map(async p=>createHash('sha256').update(await readFile(resolve(root,p))).digest('hex')!==generated.dependency_hashes?.[p]),...benchmarkRawSources.map(async p=>createHash('sha256').update(await readFile(resolve(root,p))).digest('hex')!==generated.raw_output_hashes?.[p])])).some(Boolean);
  const diagnostic=generated.id==='STUDY-TS-C-S2C-R00';
  const dependencies=generated.id==='STUDY-TS-C-S2E-R00'?stressDependencies:generated.id==='STUDY-TS-C-S2D-R00'?bayDependencies:diagnostic ? diagnosticDependencies : generated.id === 'STUDY-TS-C-S2B-R00' ? shellDependencies : studyDependencies;
  const checks=dependencies.map(async path => createHash('sha256').update(await readFile(resolve(root,path))).digest('hex') !== generated.dependency_hashes?.[path]);
  if(diagnostic)checks.push(...diagnosticRawSources.map(async path=>createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')!==generated.raw_source_hashes?.[path]));
  if(generated.id==='STUDY-TS-C-S2E-R00')checks.push(...stressRawSources.map(async path=>createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')!==generated.raw_source_hashes?.[path]));
  return (await Promise.all(checks)).some(Boolean);
}

export async function loadCatalogue(root) {
  const source = resolve(root, 'knowledge/modular-program-r01/product_matrix.json');
  const matrixText = await readFile(source, 'utf8');
  const matrix = JSON.parse(matrixText);
  const rows = Array.isArray(matrix) ? matrix : matrix.products;
  if (!Array.isArray(rows) || rows.length !== 48) throw new Error('Expected 48 R01 product slots.');
  const baseline = JSON.parse(await readFile(resolve(root, 'knowledge/modular-program-r01/baseline.json'), 'utf8'));
  const segmentCatalogue = JSON.parse(await readFile(resolve(root, 'knowledge/modular-segments-r00/catalog.json'), 'utf8'));
  const artifacts = new Map();
  const outputRoot = await realpath(resolve(root, 'output'));
  async function artifact(id, path, extra = {}) {
    const absolute = await realpath(path);
    const rel = relative(outputRoot, absolute);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`) || !absolute.endsWith('.png')) throw new Error('Artifact is outside the approved image source.');
    const file = await stat(absolute);
    const record = { id, revision: 'R00', status: 'CONCEPT_NOT_FOR_CONSTRUCTION', visibility: 'INTERNAL_TEAM', classification: 'CONCEPT', bytes: file.size, source_hash: createHash('sha256').update(await readFile(absolute)).digest('hex'), ...extra };
    artifacts.set(id, { ...record, path: absolute });
    return { ...record, url: `/api/catalogue/artifacts/${id}` };
  }
  const products = await Promise.all(rows.map(async ({ reference_image, ...row }) => ({ ...row,
    artifact: await artifact(row.reference_artifact_tag, resolve(dirname(source), reference_image)),
    recipe: baseline.recipes[row.type],
    design_status: 'NOT_STARTED', fabrication_status: 'NOT_STARTED', bim_status: 'NOT_STARTED',
    legacy_history: row.type === 'I' ? 'LEGACY20 · ช่วง 2.00 ม. · 6 H20 + 3 F20 คงภาพและข้อมูลเดิม' : null,
  })));
  const typical = await Promise.all(['A', 'B', 'C', 'D'].map(async family => ({ id: `TS-${family}`, family,
    pilot: family === 'C', status: 'CONCEPT_NOT_FOR_CONSTRUCTION',
    artifact: await artifact(`TS-${family}-R00`, resolve(root, `output/ilu-standard-r00/TS-${family}_typical_segments.png`)),
    profile: segmentCatalogue.profiles.find(profile => profile.family === family),
    segments: segmentCatalogue.segments.filter(segment => segment.family === family || !segment.family),
    openings: segmentCatalogue.openings,
  })));
  const generated = JSON.parse(await readFile(resolve(root, 'output/tsc-step2a-r00/study_results.json'), 'utf8'));
  const stale = await studyIsStale(root, generated);
  const pilotStudy = { ...generated, status: stale ? 'STALE' : generated.status, drawings: await Promise.all(generated.drawings.map(async drawing => ({ id: drawing.id, title: drawing.title, artifact: await artifact(drawing.id, resolve(root, 'output/tsc-step2a-r00', drawing.file), { revision: generated.revision, status: stale ? 'STALE' : 'DRAFT_PRE_ANALYSIS', classification: 'ENGINEERING_DRAFT' }) }))) };
  const shellGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2b-r00/web_summary.json'),'utf8'));
  const shellStale=await studyIsStale(root,shellGenerated);
  const shellStudy={...shellGenerated,status:shellStale?'STALE':shellGenerated.status,drawings:await Promise.all(shellGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2b-r00',d.file),{revision:shellGenerated.revision,status:shellStale?'STALE':shellGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const diagGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2c-r00/web_summary.json'),'utf8'));
  const diagStale=await studyIsStale(root,diagGenerated);
  const diagnosticStudy={...diagGenerated,status:diagStale?'STALE':diagGenerated.status,drawings:await Promise.all(diagGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2c-r00',d.file),{revision:diagGenerated.revision,status:diagStale?'STALE':diagGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const bayGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2d-r00/web_summary.json'),'utf8'));
  const bayStale=await studyIsStale(root,bayGenerated);
  const bayStudy={...bayGenerated,status:bayStale?'STALE':bayGenerated.status,drawings:await Promise.all(bayGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2d-r00',d.file),{revision:bayGenerated.revision,status:bayStale?'STALE':bayGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const stressGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2e-r00/web_summary.json'),'utf8'));
  const stressStale=await studyIsStale(root,stressGenerated);
  const stressStudy={...stressGenerated,status:stressStale?'STALE':stressGenerated.status,drawings:await Promise.all(stressGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2e-r00',d.file),{revision:stressGenerated.revision,status:stressStale?'STALE':stressGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const benchmarkGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2f-r00/web_summary.json'),'utf8'));
  const benchmarkStale=await studyIsStale(root,benchmarkGenerated);
  const benchmarkStudy={...benchmarkGenerated,status:benchmarkStale?'STALE':benchmarkGenerated.status,drawings:await Promise.all(benchmarkGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2f-r00',d.file),{revision:benchmarkGenerated.revision,status:benchmarkStale?'STALE':benchmarkGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const curvedGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2g-r00/web_summary.json'),'utf8'));
  const curvedStale=await studyIsStale(root,curvedGenerated);
  const curvedStudy={...curvedGenerated,status:curvedStale?'STALE':curvedGenerated.status,drawings:await Promise.all(curvedGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2g-r00',d.file),{revision:curvedGenerated.revision,status:curvedStale?'STALE':curvedGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const quadraticGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2h-r00/web_summary.json'),'utf8'));
  const quadraticStale=await studyIsStale(root,quadraticGenerated);
  const quadraticBayStudy={...quadraticGenerated,status:quadraticStale?'STALE':quadraticGenerated.status,drawings:await Promise.all(quadraticGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2h-r00',d.file),{revision:quadraticGenerated.revision,status:quadraticStale?'STALE':quadraticGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const localGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2i-r00/web_summary.json'),'utf8'));
  const localStale=await studyIsStale(root,localGenerated);
  const localMeshStudy={...localGenerated,status:localStale?'STALE':localGenerated.status,drawings:await Promise.all(localGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2i-r00',d.file),{revision:localGenerated.revision,status:localStale?'STALE':localGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const gravityGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2j-r00/web_summary.json'),'utf8'));
  const gravityStale=await studyIsStale(root,gravityGenerated);
  const gravityCouponStudy={...gravityGenerated,status:gravityStale?'STALE':gravityGenerated.status,drawings:await Promise.all(gravityGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2j-r00',d.file),{revision:gravityGenerated.revision,status:gravityStale?'STALE':gravityGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const profileGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2k-r00/web_summary.json'),'utf8'));
  const profileStale=await studyIsStale(root,profileGenerated);
  const profileThicknessStudy={...profileGenerated,status:profileStale?'STALE':profileGenerated.status,drawings:await Promise.all(profileGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2k-r00',d.file),{revision:profileGenerated.revision,status:profileStale?'STALE':profileGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const combinedGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2l-r00/web_summary.json'),'utf8'));
  const combinedStale=await studyIsStale(root,combinedGenerated);
  const combinedMeshStudy={...combinedGenerated,status:combinedStale?'STALE':combinedGenerated.status,drawings:await Promise.all(combinedGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2l-r00',d.file),{revision:combinedGenerated.revision,status:combinedStale?'STALE':combinedGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const arcGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2m-r00/web_summary.json'),'utf8'));
  const arcStale=await studyIsStale(root,arcGenerated);
  const arcCrownStudy={...arcGenerated,status:arcStale?'STALE':arcGenerated.status,drawings:await Promise.all(arcGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2m-r00',d.file),{revision:arcGenerated.revision,status:arcStale?'STALE':arcGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const directionalGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2n-r00/web_summary.json'),'utf8'));
  const directionalStale=await studyIsStale(root,directionalGenerated);
  const directionalStudy={...directionalGenerated,status:directionalStale?'STALE':directionalGenerated.status,drawings:await Promise.all(directionalGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2n-r00',d.file),{revision:directionalGenerated.revision,status:directionalStale?'STALE':directionalGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  const baseGenerated=JSON.parse(await readFile(resolve(root,'output/tsc-step2o-r00/web_summary.json'),'utf8'));
  const baseStale=await studyIsStale(root,baseGenerated);
  const baseProfileStudy={...baseGenerated,status:baseStale?'STALE':baseGenerated.status,drawings:await Promise.all(baseGenerated.drawings.map(async d=>({id:d.id,title:d.title,artifact:await artifact(d.id,resolve(root,'output/tsc-step2o-r00',d.file),{revision:baseGenerated.revision,status:baseStale?'STALE':baseGenerated.status,classification:'ENGINEERING_DRAFT'})})))};
  return { artifacts, data: { baseProfileStudy, directionalStudy, revision: 'WEB-16', source_revision: 'R01', source_hash: createHash('sha256').update(matrixText).digest('hex'), pilotStudy, shellStudy, diagnosticStudy, bayStudy, stressStudy, benchmarkStudy, curvedStudy, quadraticBayStudy, localMeshStudy, gravityCouponStudy, profileThicknessStudy, combinedMeshStudy, arcCrownStudy,
    products, typical, recipes: baseline.recipes, public_catalog_enabled: false, standardization: baseline.standardization,
    engineering: { thickness: baseline.thickness_policy, materials: baseline.materials, loads: baseline.loads, code: 'วสท. 011008-21 · พฤศจิกายน 2564', status: 'NOT_STARTED' },
  } };
}
