import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, basename, join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

const digest = b => createHash('sha256').update(b).digest('hex');
const types = { png: 'image/png', svg: 'image/svg+xml', json: 'application/json', md: 'text/markdown', zip: 'application/zip', std:'application/octet-stream', rvt:'application/octet-stream', rfa:'application/octet-stream', rte:'application/octet-stream', pdf:'application/pdf', csv:'text/csv', txt:'text/plain' };
export async function loadCurrentCatalogue(root) {
  const json = async p => JSON.parse(await readFile(resolve(root, p), 'utf8'));
  const base = 'output/stage3-designs-p36/';
  const [catalogue, manifest, typicalIndex, slots, dependencies] = await Promise.all([
    json(base+'catalogue.json'), json(base+'manifest.json'), json('output/stage2-review-p35/typical-index.json'),
    json('data/modular-program/r02/file-slots-a01.json'), json(base+'dependencies.json'),
  ]);
  const artifacts = new Map();
  const outputRoot = await realpath(resolve(root, 'output'));
  const revitRoot = resolve(root,'deliverables/PM_Revit_48_P6');
  const arcRoots = [resolve(root,'deliverables/PM_ARC_P61_Pilot'),resolve(root,'deliverables/PM_ARC_48_P104')];
  const staadRoot = await realpath(resolve(process.env.PM_STAAD_STARTER_ROOT || join(process.env.LOCALAPPDATA || join(homedir(),'AppData','Local'),'Precast-Module','private','staad-starter-p150')));
  async function safePath(p) {
    const full = await realpath(resolve(root, p));
    const rel = relative(outputRoot, full);
    const revitRel=relative(revitRoot,full);
    const insideArc=arcRoots.some(r=>{const a=relative(r,full);return a && !a.startsWith('..') && !isAbsolute(a);});
    const staadRel=relative(staadRoot,full),insideStaad=staadRel && !staadRel.startsWith('..') && !isAbsolute(staadRel);
    if ((!rel || rel.startsWith('..') || isAbsolute(rel)) && (!revitRel || revitRel.startsWith('..') || isAbsolute(revitRel)) && !insideArc && !insideStaad) throw new Error(`Artifact outside output/Revit/STAAD allowlist: ${p}`);
    return full;
  }
  async function add(id, path, sha256, engineering = false, contains = []) {
    const full = await safePath(path);
    const bytes = await readFile(full);
    if (digest(bytes) !== sha256) throw new Error('Current artifact integrity mismatch: '+id);
    if (artifacts.has(id)) throw new Error('Duplicate artifact ID');
    const extension = path.split('.').at(-1).toLowerCase();
    const info = { id, filename: basename(path), contentType: types[extension], bytes: bytes.length, sha256,
      href: '/api/catalogue/current/artifacts/'+id, engineering };
    artifacts.set(id, { ...info, path, contains });
    return info;
  }
  const manifestByPath = new Map(manifest.files.map(f => [f.path, f]));
  const productFile = (p, path, engineering = false) => {
    const f = manifestByPath.get(path);
    if (!f) throw new Error('Missing manifest entry');
    return add(`${p.id}-P36-${basename(path).replaceAll('.', '-').toUpperCase()}`, base+path, f.sha256, engineering);
  };
  const products = [];
  for (const p of catalogue.products) {
    const modelArtifact = await productFile(p, p.model, true);
    const m = await json(base+p.model);
    const sheets = [];
    for (const s of p.sheets) sheets.push({ png: await productFile(p, s.png), svg: await productFile(p, s.svg) });
    products.push({ id:p.id, displayCode:p.displayCode, plan:p.plan, family:p.family, use:p.use,
      revision:'P36', useLabelTH:m.useLabelTH??m.useLabel, useName:m.useName, profileLabel:m.profileLabel,
      pieceCount:p.pieceCount, dimensions:m.dimensions, externalDimensionsMm:m.externalDimensionsMm,
      area:m.area, mass:m.mass, bom:m.bom, openings:m.openings.map(({cornersMm, ...o})=>o),
      fitout:{toiletProvision:m.fitout.toiletProvision,toiletNoteTH:m.fitout.toiletNoteTH??m.fitout.toiletNote},
      releaseBlocks:m.releaseBlocks, sheets, modelArtifact, scheduleArtifact:await productFile(p,p.schedule,true),
      slots:slots.slots.filter(s=>s.productId===p.id).map(({id,kind,dueStage,intakeStatus,artifactId,nativeValidationStatus})=>({id,kind,dueStage,intakeStatus,artifactId,nativeValidationStatus})),
      engineeringApproved:false,productionReleased:false });
  }
  const typical = [];
  let stage6Closure=null;
  try{stage6Closure=await json('output/revit-p6/acceptance.json');}catch(e){if(e.code!=='ENOENT')throw e;}
  let revitManifest=null;
  try { revitManifest=await json('output/revit-p6/delivery-manifest.json'); }
  catch(e) { if(e.code!=='ENOENT')throw e; }
  if(revitManifest) {
    if(revitManifest.geometryRevision!=='P36')throw new Error('Revit geometry revision mismatch');
    for(const delivery of revitManifest.products) {
      const product=products.find(p=>p.id===delivery.productId);
      if(!product)throw new Error('Unknown Revit product');
      const source=await readFile(resolve(root,delivery.sourcePath));
      if(digest(source)!==delivery.sourceSha256)throw new Error('Stale Revit source');
      product.revitDelivery={status:delivery.status,softwareVersion:'2026',files:[]};
      for(const f of delivery.files)product.revitDelivery.files.push({...await add(f.id,f.path,f.sha256,true),kind:f.kind});
      const rvt=product.revitDelivery.files.find(f=>f.kind==='RVT');
      if(rvt && delivery.nativeValidated)product.slots=product.slots.map(s=>s.kind==='RVT'?{...s,intakeStatus:'AVAILABLE',nativeValidationStatus:'VALIDATED_REVIT_2026',artifactId:rvt.id}:s);
    }
  }
  let arcManifest=null;
  try{arcManifest=await json('output/revit-p61-batch/delivery-manifest.json');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(arcManifest){
    if(arcManifest.stage!=='6.1'||arcManifest.geometryRevision!=='P36'||arcManifest.engineeringApproved!==false||arcManifest.productionReleased!==false)throw new Error('Invalid ARC delivery scope');
    const seen=new Set();
    for(const delivery of arcManifest.products){
      const product=products.find(p=>p.id===delivery.productId);
      if(!product||seen.has(product.id)||!delivery.nativeValidated)throw new Error('Invalid ARC product');
      seen.add(product.id);
      for(const [p,h] of [[delivery.sourcePath,delivery.sourceSha256],[delivery.manifestPath,delivery.manifestSha256]])if(digest(await readFile(await safePath(p)))!==h)throw new Error('Stale ARC dependency');
      product.arcDelivery={status:delivery.status,softwareVersion:'2026',revision:delivery.revision,files:[]};
      for(const f of delivery.files)product.arcDelivery.files.push({...await add(f.id,f.path,f.sha256,true),kind:f.kind});
    }
  }
  let staadIndex=null,staadAcceptance=null;const staadPins=[];
  try{
    staadIndex=JSON.parse(await readFile(join(staadRoot,'library-index.json'),'utf8'));
    staadAcceptance=JSON.parse(await readFile(join(staadRoot,'acceptance-report.json'),'utf8'));
  }catch(e){if(e.code!=='ENOENT')throw e;}
  if(staadIndex){
    if(staadIndex.id!=='STAAD-STARTER-LIBRARY-P150'||staadIndex.products.length!==48||staadIndex.analysedProducts!==0||staadIndex.rcDesignedProducts!==0||staadIndex.statuses.engineeringApproved!==false||staadIndex.statuses.productionReleased!==false)throw new Error('Invalid P150 starter library scope');
    const seen=new Set();
    for(const delivery of staadIndex.products){
      const product=products.find(p=>p.id===delivery.productId);if(!product||seen.has(product.id)||!delivery.preflight?.pass)throw new Error('Invalid P150 starter product');seen.add(product.id);
      product.staadDelivery={status:'LIBRARY_READY_STARTER',revision:'R01',nativeValidationStatus:'NOT_RUN_BY_CURRENT_SCOPE',analysisStatus:'NOT_RUN',designStatus:'NOT_RUN',engineerReviewStatus:'REQUIRED_BEFORE_RUN',files:[]};
      for(const f of delivery.artifacts)product.staadDelivery.files.push({...await add(f.id,join(staadRoot,f.path),f.sha256,true),kind:f.kind});
      const std=product.staadDelivery.files.find(f=>f.kind==='STD');
      if(std)product.slots=product.slots.map(s=>s.kind==='STD'?{...s,intakeStatus:'AVAILABLE',artifactStatus:'LIBRARY_READY_STARTER',nativeValidationStatus:'NOT_RUN_BY_CURRENT_SCOPE',analysisStatus:'NOT_RUN',designStatus:'NOT_RUN',engineerReviewStatus:'REQUIRED_BEFORE_RUN',artifactId:std.id,engineeringApproved:false,productionReleased:false}:s);
      const manifest=JSON.parse(await readFile(join(staadRoot,delivery.productId,'manifest.json'),'utf8'));
      staadPins.push(...manifest.sourceRevisions.map(s=>({path:resolve(root,s.path),sha256:s.sha256})));
    }
  }
  for (const t of typicalIndex.entries) typical.push({ id:t.id, family:/^TS-([ABCD])-/.exec(t.id)?.[1] ?? 'SHARED',
    concreteMassKg:t.concreteMassKg,densityKgM3:t.densityKgM3,
    png:await add(t.id+'-PNG',t.preview,t.previewSha256), svg:await add(t.id+'-SVG',t.svg,t.svgSha256),
    usedBy:products.filter(p=>p.bom.some(b=>b.typicalId===t.id)).map(p=>p.id) });
  const allIds = [...artifacts.keys()].filter(id=>!id.includes('-P6-')&&!id.includes('-ARC-'));
  const bundles = [
    await add('PM-STAGE3-P36-ZIP','output/PM-STAGE3-P36-REVIEW.zip','ab8cbf7e8c45aff15dc0f82e84dc235b62dc5f72fe3e9244caa1695add449782',true,allIds),
    await add('PM-STAGE2-P35-ZIP','output/PM-STAGE2-P35-REVIEW.zip','5661e4931bd88cf139a45c0ee75214af4dbaa0dd9155148dd717518e512164ae',true,allIds),
  ];
  if(revitManifest?.sharedLibrary){const f=revitManifest.sharedLibrary;bundles.push(await add(f.id,f.path,f.sha256,true));}
  if(staadIndex){
    for(const [id,name] of [['P150-LIBRARY-INDEX','library-index.json'],['P150-DELIVERY-MANIFEST','delivery-manifest.json'],['P150-ACCEPTANCE-REPORT','acceptance-report.json'],['P150-STATIC-PREFLIGHT','static-preflight-report.json']]){const full=join(staadRoot,name),bytes=await readFile(full);bundles.push(await add(id,full,digest(bytes),true));}
  }
  // Pin metadata and source files as well as the served artifacts. No mutable public data mount.
  const pins = [...dependencies.sources, ...typicalIndex.entries.map(t=>({path:t.source,sha256:t.sourceSha256}))];
  if(revitManifest){
    pins.push({path:'output/revit-p6/delivery-manifest.json',sha256:digest(await readFile(resolve(root,'output/revit-p6/delivery-manifest.json')))});
    pins.push(...revitManifest.products.map(p=>({path:p.sourcePath,sha256:p.sourceSha256})));
  }
  if(arcManifest){
    const path='output/revit-p61-batch/delivery-manifest.json';pins.push({path,sha256:digest(await readFile(resolve(root,path)))});
    for(const p of arcManifest.products)pins.push({path:p.sourcePath,sha256:p.sourceSha256},{path:p.manifestPath,sha256:p.manifestSha256});
  }
  if(staadIndex){
    for(const name of ['library-index.json','delivery-manifest.json','acceptance-report.json','static-preflight-report.json','starter-model-contract.json']){const full=join(staadRoot,name);pins.push({path:full,sha256:digest(await readFile(full))});}
    pins.push(...staadPins);
  }
  for (const path of [base+'catalogue.json',base+'manifest.json',base+'dependencies.json','output/stage2-review-p35/typical-index.json','data/modular-program/r02/file-slots-a01.json'])
    pins.push({path,sha256:digest(await readFile(resolve(root,path)))});
  const uniquePins = [...new Map(pins.map(p=>[p.path,p])).values()];
  let pinSnapshot=new Map(),lastPinScan=0,lastFullHash=0,cachedStale=false;
  async function stale(force=false) {
    const now=Date.now();if(!force&&now-lastPinScan<1000)return cachedStale;
    try {
      const fullHash=force||!pinSnapshot.size||now-lastFullHash>300000,next=new Map();
      for (const p of uniquePins){
        const full=resolve(root,p.path),s=await stat(full),previous=pinSnapshot.get(full),changed=!previous||previous.size!==s.size||previous.mtimeMs!==s.mtimeMs;
        if((fullHash||changed)&&digest(await readFile(full))!==p.sha256){cachedStale=true;lastPinScan=now;return true;}
        next.set(full,{size:s.size,mtimeMs:s.mtimeMs});
      }
      pinSnapshot=next;lastPinScan=now;if(fullHash)lastFullHash=now;cachedStale=false;return false;
    }
    catch { cachedStale=true;lastPinScan=now;return true; }
  }
  if (await stale(true)) throw new Error('Current source dependencies are stale');
  function mayRead(member, a, allow) {
    return Boolean(a && allow(member,a.id) && (!a.engineering || member.canReadEngineering)
      && (!a.contains?.length || (member.artifactIds === '*' && a.contains.every(id=>allow(member,id)))));
  }
  async function view(member, allow) {
    const visible = a => mayRead(member,artifacts.get(a.id),allow);
    const safeProducts = products.map(p=>({ ...p, sheets:p.sheets.map(s=>({png:visible(s.png)?s.png:null,svg:visible(s.svg)?s.svg:null})).filter(s=>s.png||s.svg),
      modelArtifact:visible(p.modelArtifact)?p.modelArtifact:null,scheduleArtifact:visible(p.scheduleArtifact)?p.scheduleArtifact:null,
      revitDelivery:p.revitDelivery?{...p.revitDelivery,files:p.revitDelivery.files.filter(visible)}:null,
      arcDelivery:p.arcDelivery?{...p.arcDelivery,files:p.arcDelivery.files.filter(visible)}:null,
      staadDelivery:p.staadDelivery?{...p.staadDelivery,files:p.staadDelivery.files.filter(visible)}:null,
      slots:p.slots.map(s=>s.artifactId && !visible({id:s.artifactId})?{...s,artifactId:null,intakeStatus:'RESTRICTED',nativeValidationStatus:'RESTRICTED'}:s) }))
      .filter(p=>p.sheets.length);
    const ids = new Set(safeProducts.map(p=>p.id));
    return { revision:'P37',geometryRevision:'P36',typicalRevision:'P35',status:await stale()?'STALE':'CURRENT_DEVELOPMENT',
      products:safeProducts,typical:typical.filter(t=>visible(t.png)).map(t=>({...t,svg:visible(t.svg)?t.svg:null,usedBy:t.usedBy.filter(id=>ids.has(id))})),
      bundles:bundles.filter(visible),engineeringApproved:false,productionReleased:false,
      stage6Complete:stage6Closure?.stageComplete===true && revitManifest?.products.length===48,
      nativeFileCount:safeProducts.filter(p=>p.revitDelivery?.files.some(f=>f.kind==='RVT')).length,
      stage7Complete:staadAcceptance?.completionPercent===100&&staadAcceptance?.status==='AWAITING_USER_STAGE_REVIEW'&&safeProducts.filter(p=>p.staadDelivery?.files.some(f=>f.kind==='STD')).length===48,
      starterFileCount:safeProducts.filter(p=>p.staadDelivery?.files.some(f=>f.kind==='STD')).length,
      analysedProductCount:0,rcDesignedProductCount:0,firebaseProvisioned:false };
  }
  async function readArtifact(id) {
    const a = artifacts.get(id);
    if (!a || await stale()) return null;
    try { const bytes = await readFile(await safePath(a.path)); return digest(bytes)===a.sha256?bytes:null; }
    catch { return null; }
  }
  return { artifacts,view,mayRead,readArtifact,stale };
}
