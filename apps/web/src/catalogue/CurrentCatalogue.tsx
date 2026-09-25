import { useEffect, useState } from 'react';
import { Catalogue } from './Catalogue';
import { SignIn } from './SignIn';
import { MouldLibrary } from './MouldLibrary';
import { RevitDelivery, type RevitPackage } from './RevitDelivery';
import './current.css';

export type Artifact = { id:string; href:string; filename:string; bytes:number; sha256:string; contentType:string };
type Bom = { typicalId:string; quantity:number; unitConcreteMassKg:number; totalConcreteMassKg:number };
type StaadPackage = {status:string;revision:string;nativeValidationStatus:string;analysisStatus:string;designStatus:string;engineerReviewStatus:string;files:(Artifact&{kind:string})[]};
type Product = {
  id:string; displayCode:string; plan:string; family:string; use:number; useLabelTH:string; useName:string; profileLabel:string;
  pieceCount:number; externalDimensionsMm:number[]; dimensions:Record<string,number|null>;
  area:{nominalExternalM2:number;concreteFloorTopM2:number}; mass:{knownConcreteKg:number};
  bom:Bom[]; openings:{id:string;instanceId:string;type:string;roughWidthMm:number;roughHeightVerticalMm:number;sillAboveSlabMm?:number}[];
  fitout:{toiletNoteTH:string}; sheets:{png:Artifact|null;svg:Artifact|null}[];modelArtifact:Artifact|null;scheduleArtifact:Artifact|null;
  slots:{id:string;kind:string;dueStage:string;intakeStatus:string}[];
  revitDelivery?:RevitPackage|null;
  arcDelivery?:RevitPackage|null;
  staadDelivery?:StaadPackage|null;
};
type Typical = {id:string;family:string;concreteMassKg:number;png:Artifact;svg:Artifact|null;usedBy:string[]};
type Data = {status:string;products:Product[];typical:Typical[];bundles:Artifact[];nativeFileCount?:number;stage6Complete?:boolean;starterFileCount?:number;stage7Complete?:boolean;analysedProductCount?:number;rcDesignedProductCount?:number;access:{name:string;mode:string}};
const uses = ['ทั้งหมด','ออฟฟิศ','บ้านพัก','ร้านกาแฟ','รีสอร์ท'];
const families:Record<string,string> = {A:'จั่ว',B:'หลังคาโค้ง',C:'มุมหลังคา–ผนังโค้ง',D:'คางหมู'};
const sheets = ['01 · แปลน + ภาพ 3D','02 · รูปด้าน + รูปตัด','03 · การประกอบ + บัญชีชิ้นงาน'];
const number = (n:number|undefined|null) => n == null ? 'ยังไม่กำหนด' : n.toLocaleString('th-TH',{maximumFractionDigits:2});
let exchange:Promise<Response>|undefined;

export function Download({artifact,label}:{artifact:Artifact|null;label?:string}) {
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  if (!artifact) return null;
  const a=artifact;
  async function download() {
    setBusy(true);setError('');
    try {
      const r=await fetch(a.href+'?download=1');
      if(!r.ok) throw new Error(r.status===409?'ไฟล์หรือต้นทางเปลี่ยน กรุณาตรวจ revision':r.status===401||r.status===403?'เซสชันหมดอายุหรือไม่มีสิทธิ์ดาวน์โหลด':'ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่');
      const blob=await r.blob();
      if(blob.size!==a.bytes) throw new Error('ขนาดไฟล์ไม่ตรงกับบัญชี');
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
      if(hash!==a.sha256) throw new Error('ความถูกต้องของไฟล์ไม่ผ่าน');
      const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=a.filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e) {setError(e instanceof Error?e.message:'ดาวน์โหลดไม่สำเร็จ');} finally {setBusy(false);}
  }
  return <span className="p37-download"><button className="p37-button" disabled={busy} onClick={()=>void download()}>{busy?'กำลังตรวจไฟล์…':label??a.filename}</button>{error&&<small role="alert">{error}</small>}</span>;
}
export function Board({artifact,alt}:{artifact:Artifact|null;alt:string}) {
  const [failed,setFailed]=useState(false);
  if(!artifact)return <p>ไม่มีสิทธิ์อ่านภาพนี้</p>;
  return failed?<p role="alert">โหลดภาพไม่ได้ กรุณารีเฟรชหรือเข้าสู่ระบบใหม่</p>:<a className="cat-full-board" href={artifact.href} target="_blank" rel="noreferrer"><img loading="lazy" src={artifact.href} alt={alt} onError={()=>setFailed(true)}/><span>เปิดภาพขนาดเต็ม ↗</span></a>;
}
function Notice(){return <aside className="cat-notice legacy"><strong>แบบพัฒนา · ไม่ใช่แบบผลิตหรือแบบรับรองโครงสร้าง</strong><p>น้ำหนักเฉพาะคอนกรีตที่ความหนาแน่นสมมติ 2,400 กก./ลบ.ม. ไม่รวมน้ำหนักอาคารทั้งหมด และไม่ใช่น้ำหนักออกแบบยก ตำแหน่งหูยกยังเป็นแนวศึกษา ต้องออกแบบพุกและตรวจสภาวะยกก่อนใช้งาน</p></aside>;}

export function CurrentCatalogue(){
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[auth,setAuth]=useState(false),[reload,setReload]=useState(0);
  const [view,setView]=useState('original'),[selected,setSelected]=useState(''),[tab,setTab]=useState('drawings');
  const [use,setUse]=useState(0),[family,setFamily]=useState('ALL'),[plan,setPlan]=useState('ALL'),[query,setQuery]=useState('');
  const [compareFamily,setCompareFamily]=useState('C'),[compareUse,setCompareUse]=useState(1);
  useEffect(()=>{
    let active=true;
    const token=new URLSearchParams(location.hash.slice(1)).get('access');
    if(token){history.replaceState(null,'','/catalogue');exchange=fetch('/api/catalogue/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});}
    async function load(){try{
      if(exchange){const r=await exchange;if(!r.ok)throw new Error('ลิงก์เข้าใช้หมดอายุหรือใช้แล้ว');}
      const r=await fetch('/api/catalogue/current');
      if(r.status===401||r.status===403){if(active){setData(null);setSelected('');setAuth(true);}return;}
      if(!r.ok)throw new Error('อ่านข้อมูลล่าสุดไม่ได้ กรุณาลองใหม่');
      const d=await r.json() as Data;if(active){setData(d);setAuth(false);setError('');}
    }catch(e){if(active){setData(null);setSelected('');setError(e instanceof Error?e.message:'ติดต่อคลังไม่ได้');}}}
    void load();const timer=setInterval(()=>void load(),60000);return()=>{active=false;clearInterval(timer);};
  },[reload]);
  async function signOut(){await fetch('/api/catalogue/session',{method:'DELETE'});exchange=undefined;setData(null);setSelected('');setAuth(true);setView('gallery');}
  function navigate(next:string){setView(next);setSelected('');setQuery('');setFamily('ALL');setPlan('ALL');setUse(0);window.scrollTo(0,0);}
  function open(id:string){setSelected(id);setTab('drawings');setView('gallery');window.scrollTo(0,0);}
  const product=data?.products.find(p=>p.id===selected);
  const filtered=data?.products.filter(p=>(!use||p.use===use)&&(family==='ALL'||p.family===family)&&(plan==='ALL'||p.plan===plan)&&`${p.displayCode} ${p.useLabelTH} ${p.useName} ${families[p.family]} ${p.bom.map(b=>b.typicalId).join(' ')}`.toLowerCase().includes(query.toLowerCase().trim()))??[];
  const typical=data?.typical.filter(t=>(family==='ALL'||t.family===family)&&`${t.id} ${families[t.family]??'โหนดร่วม shared node'}`.toLowerCase().includes(query.toLowerCase().trim()))??[];
  function filters(isTypical=false){return <><div className="cat-tools"><label className="cat-search">ค้นหา<input aria-label="ค้นหาแบบหรือ Tag" placeholder="เช่น U-C3, ร้านกาแฟ, TS-C…" value={query} onChange={e=>setQuery(e.target.value)}/></label>{!isTypical&&<label>แปลน<select value={plan} onChange={e=>setPlan(e.target.value)}><option value="ALL">I / L / U ทั้งหมด</option>{['I','L','U'].map(p=><option key={p}>{p}</option>)}</select></label>}</div><div className="cat-profiles">{['ALL','A','B','C','D',...(isTypical?['SHARED']:[])].map(f=><button key={f} aria-pressed={family===f} onClick={()=>setFamily(f)}>{f==='ALL'?'ทุกรูปทรง':f==='SHARED'?'ชิ้นส่วนโหนดร่วม':`${f} · ${families[f]}`}</button>)}</div></>;}
  function card(p:Product){return <article className="cat-card" key={p.id}><button className="cat-board" onClick={()=>open(p.id)} aria-label={`เปิด ${p.displayCode}`}>{p.sheets[0]?.png?<img loading="lazy" src={p.sheets[0].png.href} alt={`${p.displayCode} แปลนและ3D`}/>:<span>ไม่มีสิทธิ์ดูภาพ</span>}</button><div className="cat-card-body"><div className="cat-card-heading"><h3>{p.displayCode}</h3><span>{p.area.nominalExternalM2}<small> ตร.ม.</small></span></div><p>{uses[p.use]} · {families[p.family]}</p><span className="cat-badge">STD15 · P36 · แบบพัฒนา</span><div className="cat-card-footer"><span>{p.pieceCount} ชิ้น · {number(p.mass.knownConcreteKg/1000)} ตัน*</span><button className="cat-text-button" onClick={()=>open(p.id)}>เปิดรายละเอียด →</button></div></div></article>;}
  if((view==='original'||view==='history')&&data)return <><div className="catalogue p37" style={{minHeight:0}}><div className="cat-main"><h1>คลังแบบโมดูลาร์คอนกรีต</h1><nav className="cat-topnav" aria-label="ชุดข้อมูลคลัง"><button aria-pressed="true" onClick={()=>navigate('original')}>ภาพชุดเดิม</button><button aria-pressed="false" onClick={()=>navigate('gallery')}>แบบและข้อมูลชุดใหม่</button></nav><p>ภาพแนวคิดชุดเดิม R00/R01 · เก็บสถานะและมิติเดิมไว้ ไม่ใช่แบบผลิตมาตรฐานใหม่</p><p>{data.stage6Complete?'ขั้น 6/8 · Revit 48 แบบ ส่งมอบ 100% · รอตรวจรับ | ':''}ขั้น 5/8 · 100% ตามขอบเขตแม่แบบฉบับวางแผน P100 · ไม่ใช่อนุมัติวิศวกรรมหรือปล่อยผลิต</p></div></div><Catalogue embedded/></>;
  return <div className="catalogue p37"><header className="cat-header"><div className="cat-brand"><span className="cat-mark">PM</span> PRECAST MODULE <span className="cat-brand-sub">DESIGN LIBRARY · R02</span></div><div className="cat-access">{data?.access.mode==='LOCAL_OWNER_PREVIEW'?'Local owner preview · ไม่ใช่ระบบทีม':'คลังภายในทีม'}{data&&<button className="cat-signout" onClick={()=>void signOut()}>ออกจากระบบ</button>}</div></header><main className="cat-main">
    <nav className="cat-topnav" aria-label="เมนูคลัง">{[['original','ภาพชุดเดิม'],['gallery','แบบและข้อมูลชุดใหม่'],['typical','Typical Segment'],['moulds','แม่แบบ'],['compare','เปรียบเทียบ I/L/U'],['downloads','ดาวน์โหลด'],['history','ประวัติ']].map(([v,label])=><button key={v} aria-pressed={view===v} onClick={()=>navigate(v!)}>{label}</button>)}</nav>
    {!data?<section className="cat-state"><h1>{auth?'เข้าสู่คลังแบบ':error?'เปิดคลังไม่ได้':'กำลังโหลดคลังปัจจุบัน…'}</h1>{error&&<p role="alert">{error}</p>}{auth&&<SignIn onSuccess={()=>{exchange=undefined;setReload(x=>x+1);}}/>}<button onClick={()=>{exchange=undefined;setReload(x=>x+1);}}>ลองใหม่</button></section>:<>
      <div className="p37-stage">ขั้น 7/8 · STAAD starter {data.starterFileCount??0}/48 แบบ{data.stage7Complete?' · static preflight ครบ 100% · รอตรวจรับ':''} · วิเคราะห์ {data.analysedProductCount??0}/48 · RC design {data.rcDesignedProductCount??0}/48 · ไม่ใช่อนุมัติวิศวกรรม/ผลิต · Firebase ยังไม่เปิดใช้</div>
      {data.status==='STALE'?<section className="cat-state" role="alert"><h1>ต้นทางมีการเปลี่ยนแปลง</h1><p>ระงับการแสดงแบบและดาวน์โหลด เพื่อป้องกันใช้ข้อมูลต่าง revision กรุณาตรวจสอบชุดข้อมูลก่อน</p></section>:<>
      {view==='moulds'?<MouldLibrary/>:product?<section className="cat-detail"><button className="cat-text-button" onClick={()=>setSelected('')}>← กลับรายการแบบ</button><div className="cat-detail-heading"><div><div className="cat-eyebrow">CURRENT DIMENSIONED DESIGN · P36</div><h1>{product.displayCode} <span>{uses[product.use]} · {families[product.family]}</span></h1><p>กริด 1.50 ม. · {product.pieceCount} ชิ้น · พื้นที่กริด {product.area.nominalExternalM2} ตร.ม.</p></div></div><Notice/>
        <nav className="cat-tabs">{[['drawings','ภาพและแบบ'],['architecture','สถาปัตย์ ARC · 6.1'],['segments','ชิ้นงาน / น้ำหนัก'],['dimensions','มิติ / ช่องเปิด'],['files','BIM / Engineering / แม่แบบ']].map(([v,l])=><button key={v} aria-pressed={tab===v} onClick={()=>setTab(v!)}>{l}</button>)}</nav>
        {tab==='architecture'&&<RevitDelivery delivery={product.arcDelivery} architectural/>}
        {tab==='drawings'&&product.sheets.map((s,i)=><section className="p37-sheet" key={s.png?.id??s.svg?.id}><h2>{sheets[i]}</h2><Board artifact={s.png} alt={`${product.displayCode} ${sheets[i]}`}/><div className="p37-actions"><Download artifact={s.png} label="ดาวน์โหลด PNG"/><Download artifact={s.svg} label="ดาวน์โหลด SVG"/></div></section>)}
        {tab==='segments'&&<><h2>น้ำหนักคอนกรีตรวม {number(product.mass.knownConcreteKg)} กก.</h2><p>ไม่รวมเหล็ก พุกยก เพลท กระจก งานตกแต่ง ฐานราก และชิ้นส่วนที่ยังไม่ได้ออกแบบ</p><div className="cat-table-scroll"><table className="cat-table"><thead><tr><th>Typical Tag</th><th>จำนวน</th><th>กก./ชิ้น</th><th>รวม กก.</th><th>แบบชิ้นงาน</th></tr></thead><tbody>{product.bom.map(b=><tr key={b.typicalId}><td>{b.typicalId}</td><td>{b.quantity}</td><td>{number(b.unitConcreteMassKg)}</td><td>{number(b.totalConcreteMassKg)}</td><td><button onClick={()=>{navigate('typical');setQuery(b.typicalId);}}>เปิด Typical</button></td></tr>)}</tbody></table></div><Download artifact={product.scheduleArtifact} label="ดาวน์โหลดบัญชี SCHEDULE.md"/></>}
        {tab==='dimensions'&&<><h2>มิติคอนกรีต ไม่รวมวัสดุตกแต่ง</h2><div className="cat-facts"><dl><dt>ขอบเขตภายนอก กว้าง × ยาว × สูง (มม.)</dt><dd>{product.externalDimensionsMm.join(' × ')}</dd><dt>ผนัง–หลังคา / พื้น (มม.)</dt><dd>{product.dimensions.wallRoofNormalThicknessMm} / {product.dimensions.floorThicknessMm}</dd><dt>ความยาวหล่อ / รอยต่อช่วง / รอยต่อกลางหลังคา (มม.)</dt><dd>{product.dimensions.castLengthMm} / {product.dimensions.bayJointMm} / {product.dimensions.crownJointMm}</dd><dt>พื้นที่ผิวบนพื้นคอนกรีต (ไม่ใช่พื้นที่ใช้งานสุทธิ)</dt><dd>{number(product.area.concreteFloorTopM2)} ตร.ม.</dd><dt>โหนด L/U: ระดับบนหลังคา / ช่องสูงใต้หลังคาก่อนตกแต่ง (มม.)</dt><dd>{number(product.dimensions.nodeRoofTopZ)} / {number(product.dimensions.nodeClearUnderRoofBeforeFinishesMm)}</dd><dt>ห้องน้ำ</dt><dd>{product.fitout.toiletNoteTH}</dd></dl></div><h2>ช่องเปิดดิบ (มม.)</h2><div className="cat-table-scroll"><table className="cat-table"><thead><tr><th>ชิ้นงาน / ช่องเปิด</th><th>ชนิด</th><th>กว้าง</th><th>สูงแนวดิ่ง</th></tr></thead><tbody>{product.openings.map((o,i)=><tr key={o.id+'-'+i}><td>{o.instanceId} / {o.id}</td><td>{o.type}</td><td>{o.roughWidthMm}</td><td>{o.roughHeightVerticalMm}</td></tr>)}</tbody></table></div><p>ความสูงใช้งานสุทธิ การเข้าถึง และความสอดคล้องกฎหมายอาคารยังต้องตรวจ ก่อนผลิต/ใช้งาน</p></>}
        {tab==='files'&&<><h2>ไฟล์ส่งต่องาน</h2><RevitDelivery delivery={product.revitDelivery}/>{product.staadDelivery&&<section className="cat-notice"><h3>STAAD Starter · {product.staadDelivery.status}</h3><p>{product.staadDelivery.nativeValidationStatus} · analysis {product.staadDelivery.analysisStatus} · design {product.staadDelivery.designStatus} · {product.staadDelivery.engineerReviewStatus}</p><div className="p37-actions">{product.staadDelivery.files.filter(f=>['ZIP','STD','JSON','MD'].includes(f.kind)).map(f=><Download key={f.id} artifact={f} label={`${f.kind} · ${f.filename}`}/>)}</div><p>ไฟล์ตั้งต้นผ่าน static preflight เท่านั้น เว็บดาวน์โหลดได้แต่ไม่ execute STD; responsible engineer ต้องตรวจ แก้ และรันใน revision ใหม่</p></section>}<div className="cat-table-scroll"><table className="cat-table"><thead><tr><th>ชนิด</th><th>ขั้น</th><th>สถานะ</th></tr></thead><tbody>{product.slots.map(s=><tr key={s.id}><td>{s.kind} · {s.id}</td><td>{s.dueStage}</td><td>{s.intakeStatus==='NOT_CREATED'?'ยังไม่สร้าง · ':''}{s.intakeStatus}</td></tr>)}</tbody></table></div><p>ขั้น 5: แบบวางแผนแม่แบบ → ขั้น 6: Revit ครบ 48 แบบ → ขั้น 7: STAAD starter library → ขั้น 8: วิเคราะห์/ออกแบบ/ทบทวนและอนุมัติโดยผู้รับผิดชอบ</p><Download artifact={product.modelArtifact} label="ดาวน์โหลด model.json (เรขาคณิต ไม่ใช่ RVT/STD)"/><p>ยังไม่มีผลออกแบบเหล็กเสริม จุดต่อ พุกยก หรือการรับรองความปลอดภัยในชุดนี้</p></>}
      </section>:view==='gallery'?<><div className="cat-title"><div><div className="cat-eyebrow">THE STANDARD COLLECTION</div><h1>แบบและข้อมูลชุดใหม่</h1><p>4 การใช้งาน · 4 รูปทรง · 3 แปลน — ใช้ Segment กริด 1.50 ม. ร่วมกัน</p></div><div className="cat-total"><strong>{data.products.length}</strong><span>แบบปัจจุบันตามสิทธิ์</span></div></div><div className="cat-uses">{uses.map((u,i)=><button key={u} aria-pressed={use===i} onClick={()=>setUse(i)}>{u}<small>{data.products.filter(p=>!i||p.use===i).length} แบบ</small></button>)}</div>{filters()}<div className="cat-result-line"><h2>พบ {filtered.length} แบบ</h2><span>*น้ำหนักคอนกรีตเท่านั้น · ภาพไม่ตัดขอบแบบ</span></div><div className="cat-grid">{filtered.map(card)}</div>{!filtered.length&&<p className="cat-state">ไม่พบแบบที่ตรงกับตัวกรอง</p>}<Notice/></>:view==='typical'?<><div className="cat-title"><div><div className="cat-eyebrow">STANDARD SEGMENT REFERENCES · P35</div><h1>Typical Segment</h1><p>{data.typical.length} รายการอ้างอิง · A / B / C / D และชิ้นส่วนโหนดร่วม — ไม่เท่ากับจำนวนแม่แบบผลิต</p></div></div>{filters(true)}<Notice/><p>พบ {typical.length} รายการ</p><div className="cat-grid">{typical.map(t=><article className="cat-card" key={t.id}><Board artifact={t.png} alt={`${t.id} 2D 3D มิติและแนวศึกษายก`}/><div className="cat-card-body"><h2 className="p37-tag">{t.id}</h2><p>คอนกรีต {number(t.concreteMassKg)} กก./ชิ้น</p><div className="p37-actions"><Download artifact={t.png} label="PNG"/><Download artifact={t.svg} label="SVG"/></div><details><summary>ใช้ใน {t.usedBy.length} แบบ</summary><div className="p37-actions">{t.usedBy.map(id=><button key={id} onClick={()=>open(id)}>{id.replace('PM-','')}</button>)}</div></details></div></article>)}</div></>:view==='compare'?<><h1>เปรียบเทียบ I / L / U</h1><div className="cat-tools"><label>รูปทรง<select value={compareFamily} onChange={e=>setCompareFamily(e.target.value)}>{Object.entries(families).map(([f,n])=><option key={f} value={f}>{f} · {n}</option>)}</select></label><label>การใช้งาน<select value={compareUse} onChange={e=>setCompareUse(Number(e.target.value))}>{uses.slice(1).map((u,i)=><option key={u} value={i+1}>{u}</option>)}</select></label></div><div className="cat-compare-grid">{data.products.filter(p=>p.family===compareFamily&&p.use===compareUse).map(card)}</div><Notice/></>:view==='downloads'?<><h1>ดาวน์โหลดชุดแบบและไฟล์</h1><p>ตรวจ SHA-256 ก่อนส่งไฟล์ให้ทุกครั้ง · ไฟล์ส่วนตัว · STAAD P150 เป็น starter package ผ่าน static preflight แต่ยังไม่เคยรันหรือออกแบบ</p><div className="p37-actions">{data.bundles.map(a=><Download key={a.id} artifact={a} label={`${a.filename} · ${number(a.bytes/1048576)} MB`}/>)}</div>{!data.bundles.length&&<p>ชุด ZIP รวมและข้อมูลเทคนิคต้องมีสิทธิ์ engineering และสิทธิ์ครบทั้งชุด</p>}<h2>ดาวน์โหลดแยกรายแบบ</h2>{filters()}<div className="p37-download-list">{filtered.map(p=><article key={p.id}><h3><button onClick={()=>open(p.id)}>{p.displayCode} · {uses[p.use]}</button></h3><div className="p37-actions">{p.sheets.map((s,i)=><span key={i}><Download artifact={s.png} label={`${i+1} PNG`}/> <Download artifact={s.svg} label={`${i+1} SVG`}/></span>)}<Download artifact={p.modelArtifact} label="JSON"/><Download artifact={p.scheduleArtifact} label="บัญชีชิ้นงาน"/>{p.revitDelivery?.files.filter(f=>['RVT','PDF','ZIP'].includes(f.kind)).map(f=><Download key={f.id} artifact={f} label={f.kind}/>)}{p.staadDelivery?.files.filter(f=>['ZIP','STD'].includes(f.kind)).map(f=><Download key={f.id} artifact={f} label={`STAAD ${f.kind}`}/>)}</div></article>)}</div></>:null}
      </>}
      <footer className="cat-footer"><span>P36 DESIGNS · P35 TYPICAL · REVIT 2026 · P150 STAAD STARTER · INTERNAL ONLY</span><span>ไม่มีการรับรองผลิต · ไฟล์ RVT {data.nativeFileCount??0}/48 · STD starter {data.starterFileCount??0}/48 · analysed 0/48</span></footer>
    </>}
  </main></div>;
}
