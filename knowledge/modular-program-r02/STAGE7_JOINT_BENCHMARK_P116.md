# P116 — ตรวจคำสั่งรอยต่อด้วย STAAD จริง

2026-09-18; ขั้น7/8 ยัง5% งานทั้งหมดตามP105 ไม่ย่อscopeเป็นbenchmark

## ฐานข้อมูลโปรแกรม

อ่านHelpที่ติดตั้งของSTAAD.Pro2023: `Help/STD_SLAVE.html` (TR28.1 Control/Dependent), `Help/STD_SET.html` (SET SHEAR)
แหล่งผู้ผลิตออนไลน์ประกอบ: https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0112556

DEPENDENT FX FY FZ ไม่ใช่การคัดลอกtranslationอย่างเดียวเมื่อสองจุดมีระยะเยื้อง ต้องรวมการหมุนของcontrolกับoffset; ไม่ผูกrotationของdependentโดยตรงเหมือนRIGID
Helpกำหนดข้อจำกัดnodeซ้ำระหว่างcontrol/dependent entries และใช้กับlinear static/dynamic ไม่ใช่ข้ออนุญาตจำลองcontactเปิด–ปิดด้วยคำสั่งนี้

## ทดลองแยกผลoffsetกับrotation

สองcantileversยาว3m ห่างกัน0.2m ฐานfixed หน้าตัด0.25x0.4m E30GPa เป็นวัสดุbenchmark ไม่ใช่วัสดุอาคาร
เปรียบเทียบTRANSLATIONSและRIGID แต่ละแบบมี2load cases: แรงFX10kN และโมเมนต์MZ10kNmที่tipขวา
สร้างreferenceแบบmatrix beam2Dอิสระ รวมoffset transformation T, ตรวจ T^T(Ku-f)=0 และสมดุลแรง/โมเมนต์ทั้งระบบ

รอบแรกเปิดdefault shear รันผ่านทั้งสองmodel warnings0/errors0 แต่ยังไม่verifyTimoshenko referenceภายในเกณฑ์rounding ห้ามนับเป็นผลผ่านอิสระ
รอบตรวจหลักใช้SET SHEARตามHelpเพื่อตัดpure shear distortionออกเฉพาะbenchmarkนี้และเทียบEuler–Bernoulliโดยตรง ไม่ใช่ตั้งค่าอาคารให้ละเลยshearเพื่อให้ผ่าน
กำหนดtoleranceก่อนรันรอบEB: reaction0.0051kN, moment0.0051kNm, translation0.00000051m, rotation0.0000501rad ตามความละเอียดตารางพิมพ์

ผลSTAADnativeรอบEBทั้ง4กรณีผ่านreferenceและสมดุลภายในrounding: forceerrorสูงสุด0.004194kN, moment0.004839kNm, translation4.839e-7m; warnings0/errors0
แยกreactionที่เกิดร่วมกันตามแต่ละloadcase ไม่เอาenvelopeคนละกรณีมารวม

## ข้อค้นพบที่กระทบโมเดลจริง

P115มี390nodepairs แต่มี12nodesอยู่ทั้งJO-CRและJO-BY: 707,1442,2344,3050,2357,3064,3938,4672,3951,4686,5588,6294
จึงห้ามออกDEPENDENTหนึ่งคำสั่งต่อpairทั้ง390โดยตรง เพราะซ้ำข้อจำกัดcontrol/dependent ต้องออกแบบtopologyและjointmechanicsที่intersectionก่อน ไม่รวมclusterเป็นrigidแทนโดยไม่มีbasis และไม่ลบคู่รอยต่อเพื่อเลี่ยงwarning

## หลักฐาน

- tools/modular-program/staad-joint-benchmark-p116.py — independentreference+STD, --euler สำหรับEB
- tools/modular-program/run-staad-joint-benchmarks-p116.ps1 — nativeSTAAD, -Euler, unique run folder, no overwrite
- tools/modular-program/verify-staad-joints-p116.mjs — explicitunits, printedprecision, forces/displacements/equilibrium+hashes
- output/staad-p7-p116/eb/reference.json
- output/staad-p7-p116/eb/runs/e7812044dce2456e8211b27015786525/verification.json
- output/staad-p7-p116/eb/runs/e7812044dce2456e8211b27015786525/TRANSLATIONS.STD และ.ANL
- output/staad-p7-p116/eb/runs/e7812044dce2456e8211b27015786525/RIGID.STD และ.ANL

ผลนี้ไม่ได้เลือกDOF/stiffness/strengthให้รอยต่ออาคาร ไม่ตรวจcontact, slip, uplift, shell drilling หรือความสามารถรับแรงจริง ยังต้องpilotcoupling/โหลด/วัสดุ/มาตรฐาน/RCและregionalcoverageตามP105 วิเคราะห์อาคาร0/48,RC0/48; engineering/production=false
