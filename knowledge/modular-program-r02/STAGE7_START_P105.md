# ขั้น 7 — P105: เริ่มตามคำสั่งผู้ใช้ 2026-09-18

สถานะ IN_PROGRESS; ไม่ใช่อนุมัติวิศวกรรมหรือผลิต ไม่เริ่มขั้น8
คำสั่งล่าสุดอนุญาตขั้น7 แทนข้อพัก STAAD ใน R01/R02/P104 เฉพาะเรื่องนี้ ไม่เปลี่ยนการตรวจรับ ARC48 ที่ยังรอผู้ใช้

## ฐานที่ยืนยัน
- ใช้ geometry P36 ที่ส่งต่อเป็น STR Revit ขั้น6 ไม่ใช้ steel mould เป็นโมเดลอาคาร
- คานขอบทดลอง250x400mm จุดรองรับตามแนวขอบช่วงไม่เกิน3000mm ไม่ใช้ดินรองรับต่อเนื่อง
- ส่งตำแหน่งและแรงปฏิกิริยาพร้อมองค์ประกอบที่เกิดร่วมกันให้ทีมฐานราก ไม่ออกแบบขนาดฐานราก
- fc'350kgf/cm2 cylinder=34.323275MPa; SD50 (ค่าคุณสมบัติเหล็กต้องตรวจมาตรฐาน)
- ไทยทั้ง4ภาคเป็นเป้าหมาย coverage ไม่ใช่ใช้ได้ทุกพื้นที่โดยอัตโนมัติ ต้องกำหนด wind/seismic/site classes และข้อยกเว้น
- เปลี่ยน ACI2025 เป็น ACI318-2019 ตามคำสั่งผู้ใช้; AU แยกมาตรฐาน/ชุดแรง
- ชนิดคอนกรีต ความหนาแน่น prestress วิธีผลิต/ความต่อเนื่องคานและjoint DOF ยังไม่ยืนยัน ไม่แทน unknown ด้วยzero
- ห้ามใช้สมมติกำลังยกเดิมแทนผลตรวจอาคาร; Production Engineering ของแม่แบบตามP100อยู่นอกscope

## หลักฐานเริ่มงาน
พบ engine C:/Program Files/Bentley/Engineering/STAAD.Pro 2023/STAAD/SProStaad/SProStaad.exe รุ่น23.00.02.361
ใช้วิธีbatchตาม Bentley KB0112741: https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0112741
benchmark BEAM_QA.STD: คาน3m UDL10kN/m ไม่มีselfweight, E30GPa, หน้าตัด250x400mm; คำตอบตรวจอิสระ Ry=15kNต่อปลาย, Mกลาง=11.25kNm, deflectionกลาง=0.263671875mm ตามEuler-Bernoulli (STAADอาจรวมshear deformation)
ผลทดสอบ: engineออกก่อนสร้างANL; การเรียกStart-Processได้exit -1073740791 (0xC0000409). ยังไม่ทราบสาเหตุ ไม่ใช่ผลคำนวณFAILของชิ้นอาคาร และยังไม่ยืนยันlicenseใช้งาน solver

## ข้อมูล AU ที่พบ (ตรวจชื่อไฟล์เท่านั้น)
- Australia Spec/NCC-2025-Housing-Provisions_Optimized.pdf
- Australia Spec/NCC-2025-Volume-Two_Optimized.pdf
- Australia Spec/NCC-2025-Volume-Three_Optimized.pdf
ยังไม่พบ AS3600/ASNZS1170ฉบับเต็มในโฟลเดอร์นี้ ไม่อ้างว่าNCCสามเล่มแทนมาตรฐานเหล่านี้ หรือครอบคลุมoffice/cafeแล้ว ต้องอ่านเนื้อหาและclassificationต่อ

## ผลงานปัจจุบัน
output/staad-p7-p105/support-layouts: JSON/SVG48คู่+index
ตำแหน่งตามfootprint P36: I6 L8 U12จุด ทุกช่วง<=3000mm มีsourcehash
เป็นผังnominalบนขอบภายนอกเท่านั้น ไม่ใช่แกนคานที่ตรวจbearing/offsetแล้ว; beam elevation, joint DOF, capacitiesและreactionsยังnull
generator: tools/modular-program/stage7-supports-p105.mjs

## Checklist ความคืบหน้า 20 gates น้ำหนักเท่ากัน
แต่ละgateต้องครบทั้งขอบเขตก่อนนับ ไม่ใช่เปอร์เซ็นต์ความปลอดภัย
1. COMPLETE — ผังรองรับnominal48แบบและตรวจช่วง/พิกัดซ้ำ
2. PENDING — มาตรฐานฉบับเต็ม/ทะเบียนข้อกำหนดไทยและAU
3. PENDING — วัสดุ/cover/durability/prestress design basis
4. PENDING — เขตแรงและขอบเขตcoverageไทย/AU
5. PENDING — แนวแกนคาน ระดับ bearing/offset และload paths
6. PENDING — joint DOFและรายละเอียดระบบรองรับ
7. IN_PROGRESS — beamผ่าน2รอบและplatebending3meshผ่านตามP107; พบข้อจำกัดbatchcodeแล้ว แต่ยังต้องตรวจRCDC/codeexecutionและshelldesignroute
8. PENDING — pilot shell/beam meshตรงsource/openings
9. PENDING — load/combination pilotพร้อมclause evidence
10. PENDING — pilotrun/equilibrium/warnings
11. PENDING — pilotmesh convergence/stiffness sensitivity
12. PENDING — pilotRCและjoint design
13. PENDING — L/U nodeและinternalfloorbearing validation
14. PENDING — analyticalgeometry48แบบตรวจครบ
15. PENDING — โหลด/combinationทั้งสองtrackครบ
16. PENDING — รัน/QAผลครบทุกแบบและtrack
17. PENDING — RC design/เหล็ก/รอยต่อทั้งสองtrackครบ
18. PENDING — reactionhandoffและcoverage/limitationsครบ
19. PENDING — รายการคำนวณ/ไฟล์/เว็บ/traceabilityครบ
20. PENDING — ตรวจรวมและส่งผู้รับผิดชอบตรวจ ไม่มีรายการคำนวณสำคัญค้าง

ขั้น7/8 = 5% (1/20); วิเคราะห์อาคารจริง0/48; RC design0/48. ยังไม่มีผลรับรองความปลอดภัย
การเรียกengineแก้แล้วตามP106ด้านล่าง; ถัดไปplate benchmarkและcode capability พร้อมsource/material/jointbasis

## P106 — แก้การรัน STAAD สำเร็จ 2026-09-18

ขอบเขตคำสั่ง: แก้การรันให้ผ่านก่อน ไม่ขยายโมเดลอาคารในรอบนี้
ใช้ Skill precast-modular-workflow แยกsolver benchmarkออกจากผลรับรองโครงสร้าง

หลักฐาน: ไฟล์BEAM_QA.STDเดิมรันนอกrestricted sandboxผ่านด้วยexecution approval; process exit0, log internal completioncode100, warnings0/errors0, ANLมีEND OF THE STAAD.Pro RUN
รันซ้ำผ่านscriptในโฟลเดอร์ใหม่ผ่านอีกครั้ง ไม่ใช่อ่านผลเก่าค้าง
การเปลี่ยนexecution contextแก้ปัญหาที่ทำซ้ำได้; ยังไม่ได้แยกว่าทรัพยากร/สิทธิ์ใดภายในsandboxเป็นต้นเหตุระดับลึก จึงไม่วินิจฉัยว่าเครื่องติดตั้งเสียหรือlicenseผิด
ไม่แก้license, antivirus, system ACL, installationหรือregistry

ผลตรวจ: reaction15+15kNตรงUDL10kN/mยาว3m; momentกลางขนาด11.25kNm (member signsตรงข้ามตามปลายสมาชิก)
deflectionรายงาน0.274mm เทียบEuler-Bernoulli0.263671875mm + shear estimate0.0108mm =0.274471875mm ผ่านtolerance0.001mmซึ่งครอบคลุมความละเอียดผลพิมพ์

ไฟล์:
- tools/modular-program/run-staad-benchmark.ps1 — สร้างโฟลเดอร์แยกทุกรอบ ไม่เขียนทับผลเดิม; timeout30s, exit/output freshness/log checks
- tools/modular-program/verify-staad-beam.mjs — ตรวจผลแรง/การโก่ง/unitsและเก็บhash
- output/staad-p7-p105/benchmark/verification.json — ผลตรวจรอบแรก
- output/staad-p7-p105/benchmark-runs/ef83909c980f43c183e4efda6324fec6/verification.json — ผลตรวจซ้ำ

การใช้ครั้งต่อไป: เรียก PowerShell script ผ่านexecution approvalนอกsandboxตามpolicy ไม่ใช่ปรับปิดsandboxหรือยกระดับสิทธิ์ถาวร
งานย่อยแก้การรัน=100%; ขั้น7/8ยัง5% เพราะgate7รวมplateและcode capabilityที่ยังไม่ครบ วิเคราะห์อาคาร0/48 ออกแบบRC0/48
