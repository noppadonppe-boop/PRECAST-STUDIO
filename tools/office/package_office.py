from pathlib import Path
import json,csv,shutil,hashlib,zipfile
from pypdf import PdfReader
root=Path(r'E:\1.0 Project GPT Work\Precast-Module')
out=root/'deliverables/PPE_Modular_Office'
a=json.loads((out/'model-audit.json').read_text(encoding='utf-8-sig'))
assert a['warnings']==[],a['warnings']
assert a['assembly']['memberCount']==17,a.get('assembly')
assert a['packageCounts']=={'MOD':17,'ARC':106,'SITE':54}
components=sorted(a['components'],key=lambda r:(r['package'],r['mark'] or '',r['id']))
assert len({r['id'] for r in components})==177
assert len([r for r in components if r['name']=='ARC - Workstation 1100 x 550'])==4
assert len([r for r in components if r['name']=='ARC - Visitor chair'])==2
pdf=out/'PPE_Engineering_Precast_Office_Drawings.pdf'
reader=PdfReader(pdf);assert len(reader.pages)==7
for page,sheet in zip(reader.pages,a['sheets']):
    text=page.extract_text()
    assert sheet['number'] in text
    assert 'PPE Engineering' in text
    assert abs(float(page.mediabox.width)*25.4/72-841)<2
    assert abs(float(page.mediabox.height)*25.4/72-594)<2
with (out/'PPE_Component_Register.csv').open('w',encoding='utf-8-sig',newline='') as f:
    fields=['id','package','module','mark','category','name','stage','spec','precastVolumeM3']
    w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(components)
pc=[r for r in components if r['package']=='MOD']
with (out/'PPE_Precast_Panel_Register.csv').open('w',encoding='utf-8-sig',newline='') as f:
    fields=['Revit ID','Mark','Category','Volume m3','Proposed density kg/m3','Concrete-only mass kg','Basis']
    w=csv.writer(f);w.writerow(fields)
    for r in pc:w.writerow([r['id'],r['mark'],r['category'],round(r['precastVolumeM3'],4),1800,round(r['precastVolumeM3']*1800,1),'Concept only; excludes reinforcement, fixtures and rigging; verify actual wet/lifting density.'])
    w.writerow(['','TOTAL','',round(a['precastVolumeM3'],4),'',round(a['proposedPrecastMassKg'],1),'Not a transport or lifting weight certification.'])
images={
'PPE_Office - 3D View - 3D - ARCH OFFICE exterior.png':'PPE_Office_Exterior.png',
'PPE_Office - 3D View - 3D - Office interior cutaway.png':'PPE_Office_Interior.png',
'PPE_Office - 3D View - 3D - MOD precast components only.png':'PPE_Office_Precast_Module.png',
'PPE_Office - 3D View - 3D - MOD ARC SITE work packages.png':'PPE_Office_Work_Packages.png'}
for old,new in images.items():shutil.copyfile(out/old,out/new)
largest=max(pc,key=lambda r:r['precastVolumeM3'])
readme=f'''# PPE Engineering — PRECAST ARCH OFFICE 3 × 6 เมตร

ฉบับ P01 / 15 กันยายน 2026 / Revit 2026

ออกแบบใหม่จากบุคลิกของภาพร้านกาแฟ: หลังคาโค้ง ผิวคอนกรีต กระจกกรอบดำ และงานไม้โทนอุ่น เปลี่ยนการใช้งานเป็น Site Office สำหรับพนักงาน 4 คน และผู้มาติดต่อ 2 คน ใช้ห้องน้ำภายนอก ตามคำยืนยันของผู้ใช้ วัสดุหลักเป็นพรีคาสต์คอนกรีตมวลเบาสำหรับงานโครงสร้าง

## เปิดใช้งาน

- เปิด `PPE_Engineering_Precast_Office_3x6_R2026.rvt` ด้วย Revit 2026 หรือรุ่นใหม่กว่า โมเดลไม่ต้องอาศัยลิงก์ภายนอก
- แบบใน PDF ส่งออกจาก Sheet ของ Revit โดยตรง มี 7 แผ่น A1 และ Title block “PPE Engineering” ทุกแผ่น
- มี Title block แบบ `.rfa`, รูป 3D จากโมเดลจริง 4 มุมมอง, shared parameters และตาราง CSV ประกอบ
- รหัสโปรเจกต์ PPE-PC-OFF-001; โมดูล M01 มีกรอบภายนอกพรีคาสต์ 6000 × 3000 มม. พื้นที่รวม 18.00 ตร.ม. พื้นที่ห้องในโมเดลประมาณ {a['netRoomAreaM2']:.2f} ตร.ม.
- ระดับพื้นสำเร็จ +450 มม.; จุดเริ่มโค้งคอนกรีต +2800 มม.; ยอดคอนกรีต +3450 มม.; ยอดชั้นกันซึม +3455 มม.

## การแยกหมวดงานใน BIM

| หมวด | ส่วนที่รวม | จำนวนองค์ประกอบ |
|---|---|---:|
| MOD | พื้น ผนัง และหลังคาโค้งพรีคาสต์ | 17 |
| ARC | กระจก กรอบประตูหน้าต่าง ฝ้า ฉนวน กันซึม พื้นไม้ งานตกแต่ง เฟอร์นิเจอร์ และอุปกรณ์จำลอง | 106 |
| SITE | ฐานราก ระเบียง ขั้นบันได กันสาด และบริบทหน้างาน | 54 |

เลือกองค์ประกอบแล้วดู `PPE_WorkPackage`, `PPE_ModuleID`, `PPE_Assembly`, `PPE_InstallStage`, `PPE_Specification` และ Mark ใน Properties

พรีคาสต์ 17 ชิ้นรวมเป็น Native Revit Assembly ชื่อ `M01 - PRECAST ARCH OFFICE 3000 x 6000` งาน ARC ที่อยู่ในตัวสำนักงานใช้รหัสโมดูล M01 เช่นเดียวกัน แต่ไม่ได้รวมใน Assembly พรีคาสต์ ส่วน SITE ใช้รหัส SITE

เปิด `3D - MOD ARC SITE work packages` เพื่อดูสี: MOD สีน้ำเงิน, ARC สีเหลืองน้ำตาล, SITE สีเขียว สีเหล่านี้มาจาก Parameter Filters ใน Revit และเปลี่ยนตามค่าพารามิเตอร์

เปิด `3D - MOD precast components only` เพื่อดูชุดพรีคาสต์ และ `3D - Office interior cutaway` เพื่อดูผังภายใน เปิด Schedule `Q04 - PPE MOD ARC SITE component register` เพื่ออ่านรายการใน Revit

## ชิ้นส่วนพรีคาสต์

| รหัส | ลักษณะ | จำนวน | ขนาดเบื้องต้น |
|---|---|---:|---|
| PC-F1–F3 | แผงพื้น | 3 | ช่วง 2000 × กว้าง 3000; หนา 180 มม. |
| PC-WS1–4 / PC-WN1–4 | ผนังด้านยาว | 8 | ช่วงมาตรฐาน 1500; หนา 150 มม. |
| PC-WR | ผนังด้านหลัง | 1 | หนา 150 มม. |
| PC-WR-T | แผงโค้งเหนือผนังหลัง | 1 | หนา 150 มม. |
| PC-R1–R4 | แผงหลังคาโค้ง | 4 | ช่วง 1500; หนา 120 มม. |

รอยต่อแผงตั้งไว้ 15 มม. ช่วงขนาดเป็น nominal bay: ความยาวแผงจริงหักรอยต่อแล้ว โมเดลนี้เป็นแนวคิด **ชุดแผงโมดูลาร์ประกอบหน้างาน** การจัดเป็น Assembly ไม่ใช่การรับรองว่ายกทั้งอาคารหรือขนย้ายทั้งก้อนอย่างตู้คอนเทนเนอร์ได้

## ข้อเสนอวัสดุ

- PC-01: Structural lightweight aggregate concrete เสนอความหนาแน่น 1800 กก./ลบ.ม. และกำลังอัด 35 MPa เป็นค่าตั้งต้นเพื่อประสานผู้ผลิต มี Physical Structural Asset ใน Revit; ต้องยืนยัน mix design ผลทดสอบ กำลังถอดแบบ/ยก และรายละเอียดเหล็กเสริมก่อนผลิต
- พื้น 180 มม. ผนัง 150 มม. หลังคาคอนกรีต 120 มม. เป็นความหนาตั้งต้นทางรูปทรง ยังไม่ได้ออกแบบรับแรงหรือลดน้ำหนักให้เหมาะสมที่สุด
- GL-01: กระจกลามิเนตนิรภัย 6+6 มม. เบื้องต้น และกรอบอลูมิเนียมพ่นสีดำ ต้องยืนยันขนาดช่องเปิด การรองรับ และแรงลมกับผู้ผลิตกระจก
- CL-01: ฝ้าโค้งแยกจากคอนกรีต ประกอบฉนวนใยแร่ 50 มม. กับผิวโอ๊ค 12 มม.; ต้องประสานการยึด วัสดุรองรับ และการควบแน่น
- WP-01: ระบบกันซึมหลังคาแสดงหนา 5 มม. สีเทาคอนกรีต มีโมเดลแยกจากหลังคาพรีคาสต์ ต้องพัฒนารอยต่อแฟลชชิง รางน้ำ และท่อระบายกับผู้ผลิต
- FL-01: พื้น engineered oak หนา 20 มม. ตั้งต้น ต้องเตรียมผิวและควบคุมความชื้นตามผู้ผลิต
- WD-02: พื้นระเบียงไม้ภายนอกหนา 28 มม. ร่อง 6 มม.; โครงระเบียงและกันสาดถอดประกอบได้
- โต๊ะทำงาน 4 ตัว ขนาดช่วง 1100 × ลึก 550 มม.; เก้าอี้ทำงาน 4 ตัว โต๊ะคุยงานกลมประมาณ Ø580 มม. และเก้าอี้รับรอง 2 ตัว มีตู้เอกสาร ตู้ส่วนตัว เครื่องพิมพ์ ตำแหน่งแอร์ โคมไฟ และจุดไฟ/ข้อมูลเชิงแนวคิด

## ปริมาณและการขนย้าย

ปริมาตรคอนกรีตพรีคาสต์จากโมเดลรวม {a['precastVolumeM3']:.3f} ลบ.ม. เมื่อใช้ความหนาแน่นสมมติ 1800 กก./ลบ.ม. ได้มวลเฉพาะคอนกรีตประมาณ {a['proposedPrecastMassKg']/1000:.2f} ตัน ชิ้นที่มีปริมาตรมากที่สุดคือ {largest['mark']} ประมาณ {largest['precastVolumeM3']*1800/1000:.2f} ตันเฉพาะคอนกรีต

ค่าดังกล่าวไม่รวมเหล็กเสริม งานตกแต่ง อุปกรณ์ยึด ชุดยก ความชื้นจริง หรือค่าสัมประสิทธิ์ขณะยก จึง **ห้ามใช้เลือกเครนหรือรับรองการขนส่ง** โดยตรง ดู `PPE_Precast_Panel_Register.csv` เป็นข้อมูลตั้งต้นต่อชิ้นสำหรับประสานวิศวกรและผู้ผลิต

## ชุดแบบ

| Sheet | เนื้อหา |
|---|---|
| A001 | แนวคิด รูป 3D และข้อเสนอวัสดุ |
| A101 | แปลนสำนักงานและแปลนแผงหลังคา 1:25 |
| A201 | รูปด้าน 4 ด้าน 1:25 |
| A301 | รูปตัดตามยาวและตามขวาง 1:25 |
| A501 | รายละเอียดรอยต่อเชิงแนวคิดและลำดับประกอบ |
| A601 | ตารางปริมาณวัสดุจากโมเดลและภาพภายใน |
| M401 | ชุดพรีคาสต์และการแยก MOD / ARC / SITE |

มุมมอง 3D ใน Sheet ใช้มาตราส่วน 1:30; รายละเอียดเชิงแนวคิด 1:5 ขนาดในแบบเป็นมิลลิเมตร ทิศรูปด้านเป็นทิศของโปรเจกต์ ยังไม่ได้กำหนดทิศเหนือจริงของไซต์

## ระดับรายละเอียดและผลตรวจ

ผนัง พื้น หลังคา วัสดุหลายชั้น ห้อง Assembly มุมมอง รูปตัด Sheet ตาราง และพารามิเตอร์เป็นองค์ประกอบ Revit จริง กระจก แผงโค้งหลัง เฟอร์นิเจอร์ และอุปกรณ์พิเศษใช้ categorized DirectShape; ปรับรูปร่างโดยแทนที่ geometry ไม่ใช่ทุกชิ้นเป็น loadable parametric family

แบบระบุขนาดด้วย native Revit dimensions อ้างอิงเส้น witness ที่พิกัดกรอบอาคาร ต้องตรวจแก้เส้นอ้างอิงเมื่อเปลี่ยนรูปทรง โมเดลนี้ยังไม่มีเหล็กเสริม รายละเอียดฝังยึด การคำนวณโครงสร้าง ฐานราก อุปกรณ์ยก ระบบ MEP สมบูรณ์ หรือการรับรองการเข้าถึง/ทางหนีไฟ

ทางเดินตั้งใจให้เหลือประมาณ 900 มม. ตามตำแหน่งเก้าอี้ที่แสดง ต้องทวนพื้นที่ขณะใช้งานจริงและขนาดเฟอร์นิเจอร์จากผู้ผลิต ทางเข้าแสดงขั้นบันได; ทางลาดและห้องน้ำภายนอกต้องจัดร่วมกับผังไซต์จริง

ผลตรวจครั้งนี้: 177 องค์ประกอบมีหมวดงาน, พรีคาสต์ 17 ชิ้นอยู่ใน Assembly M01, แบบ PDF 7 หน้า A1, Title block ครบทุกแผ่น, คำเตือน Revit 0 รายการ การไม่มีคำเตือนซอฟต์แวร์ไม่ใช่ผลรับรองโครงสร้าง

## แหล่งข้อมูลวัสดุประกอบการเลือกแนวทาง

- [ACI — Lightweight concrete](https://www.concrete.org/topicsinconcrete/topicdetail.aspx?search=lightweight+concrete): ใช้อ้างอิงความหมายของคอนกรีตมวลเบาสำหรับงานโครงสร้าง ค่ากำลังอัด 35 MPa ในโมเดลเป็นข้อเสนอของงานนี้ ไม่ใช่ผลการทดสอบส่วนผสม
- [Holcim / Lytag — Design guidance for lightweight aggregate concrete](https://www.holcim.co.uk/sites/uk/files/documents/lytag_technical_data_sheet_-_design_guidance_for_lytagr_lwac_concrete_1.pdf): ข้อมูลประกอบเรื่องความหนาแน่นและการออกแบบ LWAC ต้องเลือกผลิตภัณฑ์และมาตรฐานที่ใช้กับโครงการจริง
- ภาพอ้างอิงร้านกาแฟจากผู้ใช้ใช้เป็นแนวทางรูปลักษณ์เท่านั้น ตัวเลขและคำแนะนำในภาพไม่ได้ถือเป็นคำสั่งหรือผลออกแบบที่ตรวจสอบแล้ว

สถานะส่งมอบ: **Concept design / For review / Not for construction**
'''
(out/'README_TH.md').write_text(readme,encoding='utf-8')
manifest={'files':[],'verification':{'revitWarnings':0,'pdfPages':7,'paper':'A1','workstations':4,'visitorSeats':2,'classifiedElements':177,'precastAssemblyMembers':17}}
selected=['PPE_Engineering_Precast_Office_3x6_R2026.rvt',pdf.name,'PPE_Engineering_A1.rfa','PPE_Office_SharedParameters.txt','README_TH.md','PPE_Component_Register.csv','PPE_Precast_Panel_Register.csv','model-audit.json']+list(images.values())
for n in selected:
    path=out/n
    # RVT uses a separate snapshot taken with Windows FileShare.ReadWrite below.
    if path.suffix.lower()!='.rvt':manifest['files'].append({'name':n,'size':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(out/'delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'verified':manifest['verification'],'assembly':a['assembly'],'largestPanel':largest['mark'],'readme':str(out/'README_TH.md')},ensure_ascii=False))
