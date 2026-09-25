# -*- coding: utf-8 -*-
from pathlib import Path
import json,csv,zipfile,hashlib,shutil
from pypdf import PdfReader,PdfWriter
root=Path(__file__).resolve().parents[2]
out=root/'deliverables/PPE_Senior_Home_P02_CIP'
audit=json.loads((out/'P02-model-audit.json').read_text(encoding='utf8'))
qa=json.loads((out/'P02-final-qa.json').read_text(encoding='utf8'))
reader=PdfReader(out/'PPE_Engineering_Senior_Home_P02_Drawings.pdf')
assert len(reader.pages)==9 and not qa['warnings']
for page in reader.pages:
    text=page.extract_text()
    assert 'PPE Engineering' in text and 'REV  P02' in text
    assert all(bad not in text for bad in ['REV  P01','LC-LC-PC','180 PC + 30 screed','8 nominal 2400'])
writer=PdfWriter();writer.add_page(reader.pages[-1]);writer.write(out/'PPE_P02_Construction_Systems_S001.pdf')
shutil.copy2(out/'P02 - 3D View - 3D - P02 Construction systems - CIP blue LCPC orange.png',out/'PPE_P02_Construction_Systems.png')
with (out/'PPE_P02_Element_Register.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=['id','mark','category','method','role','code','areaM2']);w.writeheader();w.writerows(audit['elements'])
(out/'README_P02_TH.md').write_text('''# PPE Engineering — บ้านพักผู้สูงวัย P02

แก้ไขตามข้อกำหนดวันที่ 7 กันยายน 2026: ฐานรากและพื้นหล่อในที่ โครงสร้างเหนือพื้นเป็นพรีคาสท์มวลเบา

## ไฟล์ส่งมอบ

- `PPE_Engineering_Senior_Home_P02_CIP_R2026.rvt` — Revit 2026 ฉบับ P02
- `PPE_Engineering_Senior_Home_P02_Drawings.pdf` — แบบ A1 จำนวน 9 แผ่น รวมแปลน รูปด้าน รูปตัด รายละเอียด ตาราง และ S001
- `PPE_P02_Construction_Systems_S001.pdf` — แบบแยกระบบก่อสร้างสำหรับตรวจเร็ว
- `PPE_Engineering_Senior_A1.rfa` — Title block PPE Engineering วันที่ 07 SEP 2026 / REV P02
- `PPE_Construction_Systems_SharedParameters.txt` — นิยาม Shared Parameters ที่ฝังใช้งานในโมเดลแล้ว
- `PPE_P02_Element_Register.csv` — รายการชิ้นส่วนที่จัดระบบ 97 ชิ้น

## การเปลี่ยนแปลงในโมเดล

**CIP / สีฟ้า / CAST IN PLACE — 47 ชิ้น**

- เปลี่ยนพื้นพรีคาสท์ 8 แผ่น เป็น native Revit Floor แผ่นต่อเนื่อง `CIP-S01` ขนาด 9.60 × 5.60 ม. พื้นที่ 53.76 ตร.ม.
- ชั้นพื้นหลัก: คอนกรีตหล่อในที่ 180 มม. + ปรับระดับ 30 มม. + ผิวพื้น 10 มม. ระดับผิวสำเร็จ +0.450 ม.
- เพิ่ม native Revit Floor ระเบียง `CIP-S02` คอนกรีตหล่อในที่ 180 มม. พื้นที่ 17.28 ตร.ม. ผิวคอมโพสิต 30 มม. แยกเป็นงานผิว
- ฐานราก 12 จุดและตอม่อเดิมเปลี่ยนเป็นวัสดุ CIP-01 ชัดเจน เพิ่มคานคอดินหล่อในที่แทนโครงเหล็กรองพื้นเดิม รวมฐานรองรับระเบียงที่เพิ่ม
- ทางลาดและชานพักกำหนดเป็นคอนกรีตหล่อในที่ วัสดุกันลื่นระบุเป็นงานผิว
- ชนิดวัสดุ `CIP-01 - Cast in place reinforced concrete - proposed` มี Structural Asset เสนอ RC28 / 2400 kg/m³

**LC-PC / สีส้ม / LIGHTWEIGHT PRECAST — 34 ชิ้น**

- ผนังภายนอก 150 มม. ผนังกั้นภายใน 100 มม. และส่วนปิดโค้ง รวม 29 ชิ้น
- หลังคาโค้ง 4 ช่วงและหลังคาแบน 1 ชิ้น โดยแกนคอนกรีตโครงสร้างหนา 120 มม.
- ใช้วัสดุ `LC-PC-01 - Structural lightweight PRECAST - proposed LC35` และข้อมูลเสนอ 35 MPa / 1800 kg/m³ เป็นคอนกรีตมวลเบาสำหรับชิ้นส่วนโครงสร้าง ไม่ใช่อิฐมวลเบา AAC ทั่วไป
- ฉนวน กันน้ำ และผิวหลังคายังคงเป็นชั้นวัสดุแยกในชนิดหลังคา

**FIN / FINISH ONLY — 16 ชิ้น** เป็นงานผิวพื้น แผ่นผิวระเบียง และพื้นอาบน้ำ ไม่ใช่แผ่นพื้นโครงสร้างพรีคาสท์

## วิธีตรวจใน Revit

เปิดมุมมอง `3D - P02 Construction systems - CIP blue LCPC orange` เพื่อดูสีแยกระบบ และ `3D - P02 CIP foundations and continuous floors` เพื่อดูฐานราก/คานผ่านพื้นที่แสดงโปร่งใส

เลือกชิ้นส่วนแล้วดู Identity Data:

- `PPE_Construction_Method`
- `PPE_System_Code`
- `PPE_Element_Role`

ตาราง `Q05 - P02 Construction systems register` เป็นตาราง live ภายใน Revit จัดกลุ่มตามวิธีก่อสร้างและหน้าที่ชิ้นส่วน อยู่ในแบบ S001 พร้อมคำอธิบายระบบ ตารางวัสดุเดิมปรับตามวัสดุของโมเดลแล้ว

## ขอบเขตและผลตรวจ

พื้นโครงสร้างหลักและระเบียงเป็น native Revit Floors จำนวน 2 ชิ้น พื้นที่รวม 71.04 ตร.ม. ฐานราก คานคอดิน และทางลาดบางส่วนเป็น categorized DirectShape พร้อมข้อมูลระบบก่อสร้าง ไม่มี native precast floor panel เหลือในฉบับ P02

ตรวจใน Revit ไม่พบ warnings และตรวจ PDF ทั้ง 9 แผ่นว่ามี PPE Engineering / REV P02 วันที่ 07 SEP 2026

ขนาดฐานราก คาน พื้น กำลังคอนกรีต และน้ำหนักวัสดุยังเป็นข้อเสนอระดับแนวคิด ต้องออกแบบตามผลสำรวจดิน ช่วงพาด น้ำหนักบรรทุก และรายละเอียดจุดต่อจริง ยังไม่มีเหล็กเสริมที่ออกแบบหรือแผนยกอนุมัติ คานคอดินกำหนดเป็นส่วนของฐานรากหล่อในที่ และโครงสร้างเหนือพื้นเป็นระบบผนัง/หลังคาพรีคาสท์มวลเบาตามข้อกำหนด

วิดีโอที่ส่งก่อนหน้านี้อ้างอิง P01 ซึ่งเป็นพื้นพรีคาสท์ จึงยังไม่ใช่วิดีโอวิธีก่อสร้างของ P02 ให้ใช้โมเดลและแบบฉบับนี้สำหรับข้อกำหนดใหม่
''',encoding='utf8')
files=['PPE_Engineering_Senior_Home_P02_CIP_R2026.rvt','PPE_Engineering_Senior_Home_P02_Drawings.pdf','PPE_P02_Construction_Systems_S001.pdf','PPE_Engineering_Senior_A1.rfa','PPE_Construction_Systems_SharedParameters.txt','PPE_P02_Element_Register.csv','PPE_P02_Construction_Systems.png','README_P02_TH.md','P02-model-audit.json','P02-final-qa.json']
manifest={n:{'bytes':(out/n).stat().st_size,'sha256':hashlib.sha256((out/n).read_bytes()).hexdigest()} for n in files}
(out/'delivery-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
with zipfile.ZipFile(out/'PPE_Engineering_Senior_Home_P02_Package.zip','w',zipfile.ZIP_DEFLATED) as z:
    for n in files+['delivery-manifest.json']:z.write(out/n,n)
print(json.dumps({'pages':len(reader.pages),'warnings':qa['warnings'],'classifiedElements':len(audit['elements']),'packageBytes':(out/'PPE_Engineering_Senior_Home_P02_Package.zip').stat().st_size}))
