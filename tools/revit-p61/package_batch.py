"""P104 schedules/specs and evidence-gated packaging; never self-approve visual QA."""
from pathlib import Path
import csv, json, hashlib, zipfile, re, argparse

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'deliverables/PM_ARC_48_P104'
WORK=ROOT/'output/revit-p61-batch'

def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def dump(p,data): p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def csvout(p,rows):
    if not rows: return
    fields=list(dict.fromkeys(k for r in rows for k in r))
    with p.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for r in rows:w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in r.items()})

def prepare(folder):
    m=read(folder/'Recipe_P104.json');rows=read(folder/'ARC_ItemRegister_P104.json')
    coord_path=folder/'Coordination_QA_P104.json'
    coord=read(coord_path) if coord_path.exists() else {}
    csvout(folder/'ARC_ItemSchedule_P104.csv',rows)
    csvout(folder/'MEP_Locations_P104.csv',[r for r in rows if r['group']=='MEP'])
    count=lambda name:sum(name in r['family'] for r in rows)
    spec=[]
    def add(code,item,proposal,unit='',quantity=None,status='PROPOSED / not approved procurement specification'):
        spec.append(dict(code=code,item=item,unbrandedProposedSpec=proposal,unit=unit,quantity=quantity,modelStatus=status))
    add('FL-01','Floor finish','Cleanable slip-resistant porcelain assembly; 10mm total study allowance; substrate, adhesive and movement joints to confirm','m2',coord.get('floorFinishAreaM2'),'Native floor net geometry, excludes waste')
    add('JN-01','Joinery and furniture','Moisture-resistant substrate and washable timber-look laminate; sealed edges; upholstery to use-specific selection')
    add('CT-01','Worktops','Non-porous cleanable surface; food-contact and hygiene suitability where used for cafe/kitchen')
    add('DK-01','Exterior decking','Durable exterior timber boards28mm, nominal6mm gaps; support and fixings subject to engineering')
    add('MT-01','Metal frames','Black coated metal; section, corrosion protection and support fixings by responsible designer')
    add('GL-01','Safety glazing','Safety glass proposal; makeup, thickness, operation and performance to final design','opening',count('Window')+count('Door_1000'),'In original concrete openings; not certified clear opening')
    add('PC-01','Exposed precast','Preparation/repair/sealer to architectural selection; preserve movement joints')
    add('WP-ROOF','Roof waterproofing','Membrane, terminations, drainage and joint movement compatibility to develop',status='SPEC ONLY / membrane geometry not modeled')
    add('IN-ROOF','Insulation','Thermal/acoustic insulation and condensation control suitable for site',status='UNSELECTED / NOT MODELED')
    if m['partitions']:
        add('PT-01','Wet-room partition','75mm lightweight partition proposal; wet-facing board, waterproofing and head detail to coordinate','panel',len(m['partitions']))
        add('DR-INT','Internal door','Closed sliding-leaf spatial proposal. Rail support, full travel and clear passage require architectural coordination; no tested operability claim','each',count('SlidingDoor'))
        add('SN-01','Sanitary fixtures','Unbranded cleanable fixtures; water supply, trap, vent and drainage by plumbing designer',status='POSITION/GEOMETRY ONLY / no pipe sizing')
    else:
        add('WC-EXT','External shared toilet','Provide site sanitary and accessible facilities outside this unit',status='REQUIRED OUTSIDE UNIT / NOT MODELED')
    for code,label,key in [('AC-I','Indoor AC','AC_Indoor'),('AC-O','Outdoor AC','AC_Outdoor'),('LT','Lighting','Pendant'),('SO','Power outlet','Socket'),('DB','Distribution board','P61_DB'),('WP','Water/waste interface','WaterDrainPoint')]:
        add(code,label,'Preliminary coordination location only; capacity, mounting, maintenance access and services to discipline design','each',count(key),'MODELED POSITION / no capacity or concrete penetration approval')
    csvout(folder/'MaterialSpec_P104.csv',spec)
    if coord.get('materialGeometryVolumeM3'):
        csvout(folder/'MaterialGeometryVolumes_P104.csv',[dict(material=k,geometryVolumeM3=v,basis='Model geometry only; not procurement quantity or certified dead load') for k,v in sorted(coord['materialGeometryVolumeM3'].items())])
    pid=m['id']
    (folder/'README_TH.md').write_text(f'''# {pid} — {m['useName']} / ขั้น6.1 P104

แบบตั้งต้นสำหรับสถาปนิกและการคุยกับลูกค้า ไม่ใช่แบบก่อสร้างหรืออนุมัติผลิต

## วิธีเปิด

แตก ZIP ทั้งชุดแล้วเปิด `{pid}_ARC_R2026_P104.rvt` ใน Revit2026 โดยคงโฟลเดอร์ References และ Families ไว้
ARC Link แบบ Relative / Origin-to-Origin ไปยังสำเนา STR ที่ตัดเฉพาะ placeholder ARC เก่าออก คงคอนกรีต {m['concreteCount']} ชิ้นและช่องเปิดเดิม
ต้นฉบับขั้น6ที่ไม่แก้ไขอยู่ใน References/Baseline ตรวจที่มาได้จาก Recipe/QA และ StructuralFingerprint

## สิ่งที่แก้ไขได้

Native Floor/Wall และ Loadable Families ย้าย หมุน คัดลอก และ Edit Family เพื่อแก้ extrusion sketch ได้
ยังไม่ fully parametric width/depth ทุกชิ้น ส่วนสูง extrusion ใช้ Part_N_Height
ประตูและหน้าต่างเป็น non-hosted เพื่อไม่เจาะโครงสร้าง Link การย้ายกรอบไม่ย้ายช่องคอนกรีต ต้องตรวจ alignment ใหม่
มิติ witness geometry และ CSV เป็น snapshot ต้องตรวจ/ส่งออกใหม่หลังแก้ไข

## รายการส่งมอบ

ARC RVT + STR reference + baseline + RFA, แบบ A1 A001/A101/A201/A301/A401/A601/A701, ภาพ Exterior/Interior/Plan/MEP จาก Revit จริง
รายการวัสดุไม่ผูกยี่ห้อ, item register, MEP locations, geometry volumes และ QA
ภาพ Interior ตัดที่+1450เพื่อดูผัง ไม่ได้ลบหลังคาจริง

## ข้อจำกัดที่ต้องพัฒนาต่อ

ตำแหน่งแอร์/ไฟฟ้า/สุขาภิบาลเป็นข้อเสนอ ไม่มีขนาดระบบ การคำนวณโหลด ท่อ สายไฟ เบรกเกอร์ หรือรูเจาะใหม่
วัสดุและพื้นสำเร็จ10มม.เป็น allowance ไม่ใช่สเปกจัดซื้อ ส่วนกันน้ำ/ฉนวน/การควบแน่นยังต้องออกแบบ
ประตูภายในเป็นข้อเสนอปิดบาน ต้องพัฒนาระยะเลื่อน ราง และระยะเปิดใช้งาน ไม่ใช่รายละเอียดฮาร์ดแวร์ที่ผ่านตรวจแล้ว
ตรวจ access/egress การใช้งานจริง สุขอนามัย และการบำรุงรักษาโดยผู้รับผิดชอบ งานนี้ไม่รับรองข้อกำหนดอาคารครบถ้วน
น้ำหนักตกแต่ง จุดยึด กันสาด ระเบียงและฐานรอง ต้องส่งทีมโครงสร้างตรวจภายหลัง ไม่เริ่ม STAAD ในขั้นนี้
engineeringApproved=false / productionReleased=false
''',encoding='utf-8')

def package(folder):
    pid=folder.name;qa=read(folder/'QA_P104.json');m=read(folder/'Recipe_P104.json')
    assert all(qa.get(k) for k in ['nativeSavedReopened','sourceUnchanged','structureFingerprintMatch','linkLoaded'])
    assert qa.get('coordinationAudit')=='PASS' and qa.get('relocationTest')=='PASS',pid
    assert qa.get('auditedRvtSha256')==sha(folder/(pid+'_ARC_R2026_P104.rvt')),'Missing/stale native audit'
    assert qa.get('auditedStrSha256')==sha(folder/'References'/(pid+'_STR_Coordination_P104.rvt')),'Missing/stale linked audit'
    # A human/model visual review record is external input, not generated by this script.
    review=read(WORK/'visual-review'/pid/'approval.json')
    assert review.get('approved') is True and review.get('productId')==pid
    required=[folder/(pid+'_ARC_A1_P104.pdf')]+sorted(folder.glob('*.png'))
    assert len(required)==5
    assert review['sha256']=={p.name:sha(p) for p in required},'Stale or incomplete visual review'
    dump(folder/'VisualReview_P104.json',review)
    assert sha(ROOT/m['source'])==m['sourceSha256'],'Source changed'
    assert sha(folder/'References'/'Baseline'/Path(m['source']).name)==m['sourceSha256']
    qa['visualReview']='PASS / hash-bound approval.json';qa['packaged']=True
    dump(folder/'QA_P104.json',qa)
    files=[p for p in folder.rglob('*') if p.is_file() and not re.search(r'\.\d{4}\.(rfa|rvt|rte)$',p.name,re.I) and p.suffix.lower() not in ['.slog','.log','.bak'] and p.name!='DeliveryManifest_P104.json']
    manifest=dict(productId=pid,stage='6.1',revision='P104',engineeringApproved=False,productionReleased=False,files=[dict(path=p.relative_to(folder).as_posix(),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(files)])
    dump(folder/'DeliveryManifest_P104.json',manifest);files.append(folder/'DeliveryManifest_P104.json')
    dest=OUT/(pid+'_ARC_P104_ReviewPackage.zip')
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
        for p in files:z.write(p,pid+'/'+p.relative_to(folder).as_posix())
    with zipfile.ZipFile(dest) as z:
        assert z.testzip() is None
        for r in manifest['files']:assert hashlib.sha256(z.read(pid+'/'+r['path'])).hexdigest()==r['sha256']
    return dict(productId=pid,zip=str(dest.relative_to(ROOT)),sha256=sha(dest),files=len(files),verified=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--package',action='store_true');ap.add_argument('--ids');args=ap.parse_args()
    selection=read(WORK/'selection.json') if (WORK/'selection.json').exists() else None
    if args.ids:selection=args.ids.split(',')
    results=[]
    for folder in sorted(OUT.glob('PM-*')):
        if not folder.is_dir() or (selection and folder.name not in selection) or not (folder/'Recipe_P104.json').exists():continue
        prepare(folder)
        results.append(package(folder) if args.package else dict(productId=folder.name,schedulesPrepared=True,packaged=False))
    dump(WORK/'last-package-result.json',results);print(json.dumps(results,ensure_ascii=False))
