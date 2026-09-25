from pathlib import Path
import json,csv,shutil,hashlib,zipfile
from pypdf import PdfReader
root=Path(r'E:\1.0 Project GPT Work\Precast-Module')
out=root/'deliverables/PPE_Modular_Office_Shed_Solar'
a=json.loads((out/'model-audit.json').read_text(encoding='utf-8-sig'))
assert a['warnings']==[]
assert a['packageCounts']=={'MOD':17,'ARC':108,'SITE':54,'SOLAR':30}
assert a['assembly']['memberCount']==17
components=sorted(a['components'],key=lambda r:(r['package'],r['mark'] or '',r['id']))
assert len(components)==209
assert sum(r['name']=='ARC - Workstation 1100 x 550' for r in components)==4
assert sum(r['name']=='ARC - Visitor chair' for r in components)==2
pv=[r for r in components if r['name'].startswith('SOLAR - 450 W module')]
assert len(pv)==6
assert len({r['mark'] for r in pv})==6
for r in pv:
    b=r['boundsM'];assert 0<b['min'][0]<b['max'][0]<6
    assert 0<b['min'][1]<b['max'][1]<3
assert all(r['module']==('SITE' if r['package']=='SITE' else 'M02') for r in components)
pdf=out/'PPE_Engineering_Shed_Solar_Office_Drawings.pdf'
reader=PdfReader(pdf);assert len(reader.pages)==8
for page,sheet in zip(reader.pages,a['sheets']):
    txt=page.extract_text();assert sheet['number'] in txt and 'PPE Engineering' in txt
    assert 'PPE-PC-OFF-002' in txt
    assert abs(float(page.mediabox.width)*25.4/72-841)<2
    assert abs(float(page.mediabox.height)*25.4/72-594)<2
    assert 'curved' not in txt.lower()
with (out/'PPE_Component_Register.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=['id','package','module','mark','category','name','spec','precastVolumeM3'],extrasaction='ignore');w.writeheader();w.writerows(components)
pc=[r for r in components if r['package']=='MOD']
with (out/'PPE_Precast_Panel_Register.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(['Revit ID','Mark','Category','Volume m3','Proposed density kg/m3','Concrete-only mass kg','Basis'])
    for r in pc:w.writerow([r['id'],r['mark'],r['category'],round(r['precastVolumeM3'],4),1800,round(r['precastVolumeM3']*1800,1),'Concept; excludes reinforcement, fixtures, moisture and rigging; not a lifting certification.'])
    w.writerow(['','TOTAL','',round(a['precastVolumeM3'],4),'',round(a['precastVolumeM3']*1800,1),'Concrete only; structural and transport design pending.'])
with (out/'PPE_Solar_Panel_Register.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(['Revit ID','Mark','Reference model','Rated power Wp','Length mm','Width mm','Thickness mm','Module mass kg','Tilt degrees','Status'])
    for r in pv:w.writerow([r['id'],r['mark'],a['solar']['reference'],450,1762,1134,30,21,round(a['solar']['slopeDegrees'],2),'Product reference; local supply and system design to be confirmed'])
    w.writerow(['','TOTAL','6 modules',2700,'','','',126,'','Excludes mounting-system mass'])
images={
'PPE_Solar - 3D View - 3D - SHED SOLAR OFFICE exterior.png':'PPE_Solar_Office_Exterior.png',
'PPE_Solar - 3D View - 3D - Office interior cutaway.png':'PPE_Solar_Office_Interior.png',
'PPE_Solar - 3D View - 3D - MOD precast components only.png':'PPE_Solar_Precast_Module.png',
'PPE_Solar - 3D View - 3D - MOD ARC SITE SOLAR work packages.png':'PPE_Solar_Work_Packages.png'}
for old,new in images.items():shutil.copyfile(out/old,out/new)
readme=f'''# PPE Engineering — PRECAST SHED + SOLAR OFFICE 3 × 6 เมตร

ฉบับ P01 / 15 กันยายน 2026 / Revit 2026 / PPE-PC-OFF-002 / โมดูล M02

แบบทางเลือกใหม่จากสำนักงานหลังคาโค้ง เปลี่ยนเป็น **หลังคาเพิงหมาแหงนพร้อมโซลาร์เซลล์** คงผิวพรีคาสต์คอนกรีตมวลเบา กระจกกรอบดำ งานไม้โทนอุ่น และผังโต๊ะทำงาน 4 คนกับมุมคุยงาน 2 คน ใช้ห้องน้ำภายนอก เก็บรุ่นหลังคาโค้งไว้แยกต่างหาก

## ไฟล์และการใช้งาน

- เปิด `PPE_Engineering_Precast_Office_Shed_Solar_3x6_R2026.rvt` ด้วย Revit 2026 หรือใหม่กว่า ไม่มี external model links ที่จำเป็น
- PDF ส่งออกจาก Revit โดยตรง มี 8 แผ่น A1 พร้อม Title block “PPE Engineering” ทุกแผ่น
- มี Title block `.rfa`, ภาพ 3D จริงจากโมเดล 4 ภาพ, shared parameters, ทะเบียนชิ้นส่วน/พรีคาสต์/แผงโซลาร์ CSV และผลตรวจโมเดล
- ภาพประกอบเป็นภาพจาก BIM เพื่อทบทวนแบบ ไม่ใช่ภาพเรนเดอร์สมจริง

## รูปทรงและการใช้งาน

กรอบภายนอกพรีคาสต์ 6000 × 3000 มม. หรือ 18 ตร.ม. ระเบียงหน้าและกันสาดเป็นส่วนแยก ระดับพื้นสำเร็จ +450 มม. หลังคาคอนกรีตขอบต่ำ +2950 และขอบสูง +3550 มม. ชั้นกันซึมขอบสูงประมาณ +3555 มม. หลังคาลาด 20% หรือ 11.31° ไปทางทิศใต้ของโปรเจกต์ ทิศดังกล่าวเป็น convention ในแบบ ยังไม่ได้ผูกกับทิศเหนือจริง

โต๊ะทำงาน 4 ตัวขนาด 1100 × 550 มม. วางตามผนังหน้าต่าง มีเก้าอี้รับรอง 2 ตัวกับโต๊ะกลม ตู้เก็บเอกสาร ตู้ส่วนตัว เครื่องพิมพ์ และตำแหน่งแอร์/โคมไฟเบื้องต้น ทางเดินประมาณ 900 มม. ตามตำแหน่งเก้าอี้ที่แสดง ต้องทวนพื้นที่ขณะใช้งานจริง ทางเข้าแสดงบันได; ทางลาดและห้องน้ำภายนอกต้องประสานผังไซต์

## การแยกงานใน BIM

| หมวด | สีในมุมมองจำแนกงาน | องค์ประกอบ | จำนวน |
|---|---|---|---:|
| MOD | น้ำเงิน | พื้น ผนัง แผงหลังคาเพิงหมาแหงน และแผงหลังพรีคาสต์ | 17 |
| ARC | เหลืองน้ำตาล | กระจก กรอบ ฝ้า ฉนวน กันซึม พื้นไม้ เฟอร์นิเจอร์ รางน้ำ/ท่อระบาย | 108 |
| SITE | เขียว | ฐานราก ระเบียง ขั้นบันได กันสาด และบริบทหน้างาน | 54 |
| SOLAR | ฟ้า | แผง PV รางยึด จุดรองรับ อินเวอร์เตอร์ ตู้ตัดตอน และแนวสายจำลอง | 30 |

เลือกชิ้นส่วนแล้วดู `PPE_WorkPackage`, `PPE_ModuleID`, `PPE_Assembly`, `PPE_InstallStage`, `PPE_Specification` และ Mark ใน Properties แผง PV มี `PPE_PV_Rated_Wp` และ `PPE_PV_Model` เพิ่มเติม

พรีคาสต์ 17 ชิ้นอยู่ใน Native Assembly `{a['assembly']['name']}` ส่วน ARC/SOLAR ใช้รหัส M02 แต่แยกหมวดและไม่รวมใน Assembly พรีคาสต์ ส่วน SITE ใช้รหัส SITE

มุมมองที่ใช้: `3D - SHED SOLAR OFFICE exterior`, `3D - Office interior cutaway`, `3D - MOD precast components only`, `3D - MOD ARC SITE SOLAR work packages` ตาราง `Q04` เป็นทะเบียนชิ้นส่วนเดิมและ `Q05 - Solar panel rated capacity` เป็นตารางแผง PV ใน Revit

## ข้อเสนอวัสดุและระบบ

- **PC-01:** Structural lightweight aggregate concrete เสนอ 1800 กก./ลบ.ม. และกำลังอัด 35 MPa มี Physical Structural Asset ใน Revit เป็นค่าตั้งต้นเพื่อประสานผู้ผลิต ยังไม่มีผลทดสอบ mix design หรือการคำนวณรับแรง ไม่ใช่การระบุให้ใช้อิฐมวลเบาทั่วไปแทนแผงโครงสร้าง
- แผงพื้น 180 มม. จำนวน 3 ชิ้น ช่วง 2000 มม.; ผนัง 150 มม. แผงข้างช่วง 1500 มม.; หลังคาเพิงหมาแหงนคอนกรีต 120 มม. จำนวน 4 ชิ้น ช่วง 1500 มม. รอยต่อ 15 มม. ขนาดช่วงเป็น nominal bay
- กระจกลามิเนตนิรภัยตั้งต้น 6+6 มม. กรอบอลูมิเนียมดำ; ฝ้าแยกจากคอนกรีตเป็นฉนวนใยแร่ 50 มม. กับผิวโอ๊ค 12 มม.; กันซึมหลังคา 5 มม.; พื้น engineered oak 20 มม.
- รางน้ำขอบต่ำและท่อระบายเป็นโมเดลเชิงแนวคิด ต้องคำนวณน้ำฝนและรายละเอียดแฟลชชิงให้เหมาะกับไซต์
- **PV:** 6 แผงอ้างอิง Trina TSM-450NEG9R.28 แผงละ 450 Wp รวม **2.70 kWp DC** เรียง 3 คอลัมน์ × 2 แถว แนวนอน ขนาดแผง 1762 × 1134 × 30 มม. น้ำหนักอ้างอิง 21 กก./แผง รวมเฉพาะแผง 126 กก. ข้อมูลจาก [เอกสารผู้ผลิต TSM_EN_2023_B](https://pages.trinasolar.com/rs/567-KJK-096/images/NEG9R.28_EN_2023_POWER_450W.pdf) ใช้เป็น design reference และต้องยืนยันรุ่นที่จำหน่ายในพื้นที่
- ระยะห่างแผง nominal 20 มม. ขอบปลายหลังคาประมาณ 337 มม. แผงเอียงตามหลังคา เว้นใต้แผง nominal 140 มม. มีราง 4 เส้นและจุดรองรับ 16 จุด แผงใช้พื้นที่หลังคาส่วนใหญ่ จึงต้องวางวิธีเข้าบำรุงรักษาจากไซต์ ไม่ได้อ้างว่ามีทางเดินบนหลังคา
- เสนออินเวอร์เตอร์ grid-tie 3 kW เป็น placeholder ที่ผนังหลัง ไม่มีแบตเตอรี่และไม่ได้รับรองไฟสำรอง ต้องเลือกอินเวอร์เตอร์จริงและตรวจ MPPT, cold Voc, จำนวนแผงต่อ string, สายไฟ, protection, SPD, earthing และข้อกำหนดการไฟฟ้า
- จุดยึดแสดงแนวทาง cast-in insert กับ standoff/แฟลชชิง ยังไม่ออกแบบสมอ เหล็กเสริม แรงยกลม ความสามารถหลังคา หรือรายละเอียดกันรั่ว การยึดต้องประสานผู้ผลิตพรีคาสต์และผู้ติดตั้ง PV

## แบบ 8 แผ่น

| Sheet | เนื้อหา |
|---|---|
| A001 | แนวคิด รูป 3D และวัสดุ |
| A101 | แปลนสำนักงานและผังแผงหลังคา 1:25 |
| A201 | รูปด้าน 4 ด้าน 1:25 |
| A301 | รูปตัดตามยาว/ตามขวาง 1:25 |
| A501 | รอยต่อพรีคาสต์และลำดับประกอบเชิงแนวคิด |
| A601 | ตารางปริมาณวัสดุและภาพภายใน |
| E701 | ผังติดตั้งโซลาร์และแผนภาพหน้าที่ระบบไฟฟ้า |
| M401 | พรีคาสต์และการแยก MOD / ARC / SITE / SOLAR |

ภาพ 3D บนแบบใช้ 1:30; รายละเอียดเชิงแนวคิด 1:5; หน่วยขนาดมิลลิเมตร E701 เป็น functional diagram ไม่ใช่ single-line diagram ที่ออกแบบสายและอุปกรณ์ป้องกันเสร็จแล้ว

## ปริมาณและขอบเขตโมเดล

ปริมาตรพรีคาสต์จากโมเดล {a['precastVolumeM3']:.3f} ลบ.ม. ที่ความหนาแน่นสมมติ 1800 กก./ลบ.ม. ได้มวลเฉพาะคอนกรีตประมาณ {a['precastVolumeM3']*1.8:.2f} ตัน ไม่รวมเหล็กเสริม ความชื้น งานตกแต่ง และชุดยก จึงไม่ใช่น้ำหนักรับรองเพื่อเลือกเครนหรือขนส่ง

เป็นแนวคิด **ชุดแผงโมดูลาร์ประกอบหน้างาน** การรวมเป็น Assembly ไม่ได้หมายความว่าออกแบบให้ยกทั้งอาคารเป็นตู้สำเร็จแล้ว ผนัง พื้น หลังคา วัสดุหลายชั้น ห้อง Assembly มุมมอง รูปตัด Sheet และตารางเป็นองค์ประกอบ Revit จริง กระจก แผงหลังทรงลาด เฟอร์นิเจอร์ และอุปกรณ์ PV ใช้ categorized DirectShape; ไม่ใช่ทุกชิ้นเป็น loadable parametric family

มิติ native Revit อ้างอิงเส้น witness ที่พิกัดกำหนด ต้องทวนเมื่อเปลี่ยน geometry ยังไม่รวมเหล็กเสริม การคำนวณฐานราก/โครงสร้าง รายละเอียดการยก MEP สมบูรณ์ หรือการตรวจรับรองทางหนีไฟ/การเข้าถึง

ผลตรวจ: 209 องค์ประกอบจำแนกหมวดครบ, Assembly พรีคาสต์ 17 ชิ้น, PV 6 แผงอยู่ในกรอบหลังคา 3 × 6 ม., PDF A1 ครบ 8 หน้าและ Title block ครบ, คำเตือน Revit 0 รายการ การไม่มีคำเตือนซอฟต์แวร์ไม่ใช่การรับรองทางวิศวกรรม

[ACI — Lightweight concrete](https://www.concrete.org/topicsinconcrete/topicdetail.aspx?search=lightweight+concrete) ใช้ประกอบความหมายวัสดุ ค่ากำลังอัดและความหนาแน่นในงานนี้เป็นข้อเสนอ ภาพร้านกาแฟของผู้ใช้เป็นแนวทางรูปลักษณ์ ไม่ใช่เอกสารผลคำนวณ

สถานะส่งมอบ: **Concept design / For review / Not for construction**
'''
(out/'README_TH.md').write_text(readme,encoding='utf-8')
selected=['PPE_Engineering_Precast_Office_Shed_Solar_3x6_R2026.rvt',pdf.name,'PPE_Engineering_A1_Shed_Solar.rfa','PPE_Office_SharedParameters.txt','README_TH.md','PPE_Component_Register.csv','PPE_Precast_Panel_Register.csv','PPE_Solar_Panel_Register.csv','model-audit.json']+list(images.values())
snapshot=root/'tools/office-solar/package-snapshot.rvt'
assert snapshot.read_bytes()[:8]==bytes.fromhex('D0CF11E0A1B11AE1')
manifest={'files':[],'verification':{'revitWarnings':0,'pdfPages':8,'paper':'A1','workstations':4,'visitorSeats':2,'classifiedElements':209,'precastAssemblyMembers':17,'pvPanels':6,'arrayKWp':2.7}}
for n in selected:
    path=snapshot if n.endswith('.rvt') else out/n
    manifest['files'].append({'name':n,'size':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
mp=out/'delivery-manifest.json';mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
dest=out/'PPE_Engineering_Precast_Shed_Solar_Office_3x6_P01.zip'
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
    for n in selected:z.write(snapshot if n.endswith('.rvt') else out/n,n)
    z.write(mp,mp.name)
with zipfile.ZipFile(dest) as z:
    assert z.testzip() is None
    for info in manifest['files']:assert hashlib.sha256(z.read(info['name'])).hexdigest()==info['sha256']
print(json.dumps({'zip':str(dest),'bytes':dest.stat().st_size,'verification':manifest['verification']},ensure_ascii=False))
