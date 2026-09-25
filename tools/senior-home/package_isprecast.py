from pathlib import Path
import json,csv,shutil,zipfile,hashlib
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'deliverables/PPE_Senior_Home_P02_IFC'
OLD=ROOT/'deliverables/PPE_Senior_Home_P02_CIP'
read=lambda n:json.loads((OUT/n).read_text(encoding='utf-8'))
rvt=read('Revit_IsPrecast_Audit.json');ifc=read('IFC_Web_Classification_Audit.json');qa=read('Final_Preservation_QA.json')
physical=set(qa['physicalMaterialBearingIds'])
byid={str(e.get('revitId')):e for e in ifc['elements'] if e.get('revitId') and e['type']!='IfcOpeningElement'}
assert physical<=set(byid)
assert len(physical)==439 and ifc['counts'].get('precast')==34 and ifc['counts'].get('review',0)==0
records=[r for r in rvt['elements'] if r['id'] in physical]
assert len(records)==439
for r in records:
    element=byid[r['id']]
    value=next(p['value'] for p in element['properties'] if p['name']=='IsPrecast')
    assert isinstance(value,bool) and value==r['IsPrecast']
    assert (element['precast']['status']=='precast')==r['IsPrecast']
    if r['system']=='LC-PC' and r['category']=='Roofs':assert element['type']=='IfcSlab' and element['predefinedType']=='ROOF'
with (OUT/'PPE_IsPrecast_Element_Register.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(['RevitElementId','Mark','Category','Name','System','IsPrecast','IFC_GUID','IFC_Type','Web_Classification'])
    for r in records:
        e=byid[r['id']];w.writerow([r['id'],r['mark'],r['category'],r['name'],r['system'],'Yes' if r['IsPrecast'] else 'No',e['guid'],e['type'],e['precast']['status']])
for name in ['PPE_Engineering_Senior_Home_P02_Drawings.pdf','PPE_P02_Construction_Systems_S001.pdf','PPE_Engineering_Senior_A1.rfa','PPE_Construction_Systems_SharedParameters.txt','README_P02_TH.md']:
    shutil.copy2(OLD/name,OUT/name)
summary={'all439PhysicalElementsExported':True,'IsPrecastBooleanMatchesRevitForAll439':True,'precast':34,'notPrecast':405,'pendingReview':0,'CIP':47,'finishOnlyClassified':16,'allOriginalMaterialAssignmentsPreserved':qa['allMaterialAssignmentsPreserved'],'revitMaterialDefinitions':123,'IFCUsedMaterials':16,'sheets':9,'titleBlock':'PPE Engineering','testMethod':'Actual apps/web/src/bim/parseIfc.ts and precast.ts with web-ifc 0.0.77, run locally; no live-site upload','roofMapping':'5 individual precast roof panels -> IfcSlab.ROOF','warnings':qa['warnings']}
(OUT/'Delivery_QA_Summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'README_IsPrecast_TH.md').write_text('''# PPE Engineering — P02 / IsPrecast

ส่งมอบวันที่ 7 กันยายน 2026 — โมเดลบ้านผู้สูงวัยพร้อมวัสดุตกแต่งเดิม

- RVT: Revit 2026 พร้อมแบบ 9 แผ่น ผังพื้น รูปด้าน รูปตัด รายละเอียด และ Title block PPE Engineering
- IFC: IFC2x3 Coordination View 2.0 ส่งออกทั้งโมเดล ไม่จำกัดด้วยมุมมองโครงสร้าง
- IsPrecast เป็น Project Parameter แบบไม่ใช้ shared parameter, Common / Yes-No / Instance / Identity Data
- พรีคาสท์มวลเบา 34 ชิ้น = Yes (ผนัง 29 และแผ่นหลังคา 5)
- ฐานราก คานคอดิน พื้น ทางลาด และชานพักหล่อในที่ 47 ชิ้น = No
- ชิ้นงานกายภาพที่ส่งออก 439 ชิ้น: Yes 34, No 405 ชิ้น พร้อมช่องเปิด IFC อีก 12 รายการ
- งานตกแต่ง เฟอร์นิเจอร์ ประตู หน้าต่าง กระจก สุขภัณฑ์ เคาน์เตอร์ โคมไฟ ราว และองค์ประกอบเดิมอยู่ครบ
- ตรวจ Element ID และการกำหนดวัสดุเดิมตรงกันทุกชิ้น; วัสดุใน RVT 123 รายการ (รวมรายการไม่ได้ใช้) และวัสดุใช้จริงใน IFC 16 รายการ

## ผลตรวจ IFC

ตรวจด้วย parseIfc.ts และ precast.ts ของเว็บในโครงการนี้ พร้อม web-ifc 0.0.77 บนเครื่องนี้ พบพรีคาสท์ 34 ชิ้นและรอยืนยัน 0 ชิ้น ค่า IsPrecast เป็น IfcBoolean ตรงกับ Revit ทั้ง 439 ชิ้น ไม่มี GlobalId ขาดหรือซ้ำ ไม่ได้อัปโหลดขึ้นเว็บไซต์ภายนอก

## การส่งออกครั้งถัดไป

ใน IFC Property Mapping เลือก **PPE Engineering - Full model with IsPrecast** ที่บันทึกอยู่ใน RVT แล้ว ชุดนี้เปิด Export Revit element parameters, IFC common property sets, base quantities และ material parameters แล้ว ส่งออกทั้งโมเดลโดยไม่เปิดการจำกัดเฉพาะชิ้นที่มองเห็นใน view

แผ่นหลังคาแต่ละชิ้นตั้ง IFC Export As = IfcSlab และ Predefined Type = ROOF เพื่อรักษาความหมายว่าเป็นแผ่นหลังคาและให้เว็บรองรับ ชิ้นทางลาดได้รับ DirectShapeType เพื่อแก้ข้อผิดพลาด IFC exporter โดยไม่เปลี่ยนรูปทรงหรือวัสดุ

ไฟล์ PPE_Construction_Systems_SharedParameters.txt ใช้กับพารามิเตอร์ข้อความระบบก่อสร้างเดิมเท่านั้น IsPrecast อยู่ใน RVT และไม่ได้เป็น shared parameter

## เอกสารตรวจสอบ

- PPE_IsPrecast_Element_Register.csv: รายการชิ้นงาน 439 ชิ้น พร้อม Revit ID / IFC GUID / IsPrecast / ผลจำแนก
- Delivery_QA_Summary.json: สรุปการตรวจรับไฟล์
- Revit_IsPrecast_Audit.json: รายการก่อน–หลังเพิ่มพารามิเตอร์
- Final_Preservation_QA.json: ตรวจขั้นสุดท้าย รวมการเพิ่ม Type ให้ทางลาด
- IFC_Web_Classification_Audit.json: ผลอ่าน IFC จริง

การแก้ไขนี้คงรูปทรงและสเปก P02 เดิม แบบยังเป็นระดับแนวคิดสำหรับพัฒนาโครงการ ไม่ใช่ผลออกแบบโครงสร้างหรือ FEM ที่รับรองแล้ว ดูรายละเอียดสมมติฐานวัสดุและระบบก่อสร้างใน README_P02_TH.md
''',encoding='utf-8')
names=['PPE_Engineering_Senior_Home_P02_IsPrecast_R2026.rvt','PPE_Engineering_Senior_Home_P02_IsPrecast_R2026.ifc','PPE_Engineering_Senior_Home_P02_Drawings.pdf','PPE_P02_Construction_Systems_S001.pdf','PPE_Engineering_Senior_A1.rfa','PPE_Construction_Systems_SharedParameters.txt','README_P02_TH.md','README_IsPrecast_TH.md','PPE_IsPrecast_Element_Register.csv','Delivery_QA_Summary.json','Revit_IsPrecast_Audit.json','Revit_IFC_Export_Result.json','Final_Preservation_QA.json','IFC_Web_Classification_Audit.json']
names += [p.name for p in OUT.glob('PPE_Full_Finishes*.png')]
manifest={n:{'bytes':(OUT/n).stat().st_size,'sha256':hashlib.sha256((OUT/n).read_bytes()).hexdigest()} for n in names}
(OUT/'delivery-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8');names+=['delivery-manifest.json']
with zipfile.ZipFile(OUT/'PPE_Engineering_P02_IsPrecast_Complete.zip','w',zipfile.ZIP_DEFLATED) as z:
    for n in names:z.write(OUT/n,n)
with zipfile.ZipFile(OUT/'PPE_Engineering_P02_IsPrecast_Complete.zip') as z:assert z.testzip() is None
print(json.dumps(summary,ensure_ascii=False,indent=2))
