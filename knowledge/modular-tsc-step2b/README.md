# TS-C Step 2B — Shell sensitivity / S2B-R00

วันที่ 16 กันยายน 2026 · **ANALYSED_QA_INCOMPLETE_NOT_FOR_DESIGN**

รัน plate/shell จริงแล้ว ไม่ใช่ภาพผลสมมติ แต่ยังไม่จบ Step 2 และยังห้ามใช้ผลเลือกความหนา เหล็ก ขนาดจุดต่อ หรือปล่อยผลิต การผ่านการทดสอบซอฟต์แวร์ไม่ใช่การผ่าน QA ทางวิศวกรรมทุกหัวข้อ

## สิ่งที่ผู้ใช้ยืนยันเพิ่ม

- เริ่มศึกษาคอนกรีตปกติ fc′ 320 ksc และไม่ใส่ prestress ในแบบจำลองรอบแรก เปรียบเทียบ 150/175/200 มม. ยังไม่ตัดสินใจวัสดุ/prestress สำหรับผลิตจริง
- LP-A: ผนัง–หลังคาลงคาน/ฐานรองรับโดยตรง แยกจากพื้น
- สืบทอด geometry จาก Step 2A: กรอบภายนอก 3×3 ม. ความสูงรวมพื้น, bay 1.50 ม., R ภายนอก 0.40 ม., S00 ทึบ

จุดต่อถาวร/ขนาดฐานยังไม่เลือก ใช้ 4 สมมติฐานเพื่อศึกษาความไว ไม่ได้ตั้ง rigid แล้วถือว่ามีรายละเอียดก่อสร้างรองรับโดยอัตโนมัติ

## ผลส่งมอบ

| ภาพ | ดาวน์โหลด |
|---|---|
| Mesh, local axes และสมมติฐาน | [PNG](../../output/tsc-step2b-r00/TS-C-MODEL-S2B-R00.png) / [SVG](../../output/tsc-step2b-r00/TS-C-MODEL-S2B-R00.svg) |
| แผนที่ Nss/Nyy/Nsy/Mss/Myy/Msy/Qs/Qy | [PNG](../../output/tsc-step2b-r00/TS-C-FORCES-S2B-R00.png) / [SVG](../../output/tsc-step2b-r00/TS-C-FORCES-S2B-R00.svg) |
| ตารางจุดต่อ/มวล/สถานะ QA | [PNG](../../output/tsc-step2b-r00/TS-C-QA-S2B-R00.png) / [SVG](../../output/tsc-step2b-r00/TS-C-QA-S2B-R00.svg) |

[ฐานศึกษา](basis.json) · [Clause register](clause_register.json) · [ผลทุก run และ convergence](../../output/tsc-step2b-r00/shell_results.json)

ผล nodal coordinates, applied loads ทั้ง 6 องค์ประกอบ, displacements, connectivity, local axes และค่า 4 Gauss points × 8 resultants ต่อ element อยู่ในไฟล์ `T{150/175/200}-{P-H/P-R/F-H/F-R}-{FULL/LEFT}-{M1/M2/M3}.json` ใน output เดียวกัน พร้อม M4 เพิ่ม 2 กรณี อ้างอิง solver/version/dependency hashes จาก report กลาง

ภาพแรงเป็นตัวอย่าง **T175-P-H-FULL-M3** เท่านั้น ไม่ใช่ envelope ของทุกกรณี และไม่เปลี่ยนตาม selector บนเว็บ สเกลสีแยกแต่ละองค์ประกอบ ใช้ค่าเฉลี่ย Gauss ภายใน element ไม่ทำ nodal smoothing; raw Gauss extrema เก็บแยกเพื่อไม่ซ่อน peak

## วัสดุ หน่วย และสูตรที่ตรวจจากมาตรฐาน

คอนกรีต uncracked isotropic linear elastic, ρ=2400 kg/m³ และ ν=0.20 เป็น **สมมติฐานผู้ช่วยเพื่อศึกษา** ไม่ใช่ค่าทดสอบ/ข้อบังคับ วสท. หรือข้อมูลที่ผู้ใช้ยืนยันรายค่า

ใช้ fc′=320×0.0980665=31.38128 MPa และ Ec=0.043ρ^1.5√fc′ =28,321.7865 MPa จาก วสท.011008-21 ข้อ 8.5.1 หน้าเล่ม55/PDF67 ซึ่งตรวจข้อความและภาพเต็มหน้าแล้ว ค่า ρ อยู่ในช่วง 1440–2560 kg/m³ ของสูตรนี้ ใช้สูตร SI แบบขึ้นกับความหนาแน่น ไม่ผสมสูตร MKS โดยใช้ conversion แบบปัดเศษจากภาคผนวก ไม่ใช้ 4700√fc′ อย่างเงียบ ๆ กับ density คนละค่า

Solver ใช้ kN,m จึงส่ง E×1000 เป็น kN/m² และ γ=ρg/1000=23.53596 kN/m³ ไม่ใช้ density เป็นหน่วยน้ำหนักโดยตรง ไม่ใส่ mass density เพื่อหวังให้ solver สร้าง gravity ให้อัตโนมัติ; ลง equivalent nodal loads อย่างชัดเจนและไม่ซ้ำ

ไม่ได้ใช้ข้อ 8.5.1 เป็นการรับรองการแตกร้าว กำลัง หรือความเหมาะสมของ shell; ยังไม่มีการคำนวณเหล็ก/กำลัง/ตัวคูณ combination ตาม วสท.

## โมเดลและแรง

OpenSees 3.8.0 ผ่าน OpenSeesPy 3.7.1.2 / openseespywin 3.8.0.0 ใช้ ShellMITC4 และ ElasticMembranePlateSection, 6 DOF/node, small displacement, gross section, ไม่มี P-delta/cracking/creep/prestress/contact nonlinear

ผิวกึ่งกลางอยู่ที่ผนัง X=t/2 และ 3−t/2, ฐาน Z=t_f=t, หลังคาราบ Z=3−t/2, รัศมี Rm=0.4−t/2 มีซีก LH/RH แยก node ที่ crown ขอบ Y=0 และ1.50 ม. อิสระ ไม่ได้จำลอง diaphragm ของอาคาร I/L/U

| Case | ฐานแต่ละด้าน | Crown |
|---|---|---|
| P-H | ยึด Ux/Uz, ปล่อย rotations | เท่ากัน Ux/Uy/Uz/Rx/Rz, ปล่อย relative Ry |
| P-R | เหมือน P-H | เท่ากันทั้ง 6 DOF |
| F-H | ยึด Ux/Uz และ Rx/Ry/Rz | เหมือน P-H |
| F-R | เหมือน F-H | เท่ากันทั้ง 6 DOF |

ทุก case ยึด Uy ที่กึ่งกลางแนวยาวของฐานซ้ายและขวาเท่านั้น ไม่ได้ยึด Uy ทุก node ตามแนวฐาน จุดต่อเป็นขีดจำกัดเชิงอุดมคติ ไม่ใช่ spring stiffness ของ bolt/grout จริง และไม่มี uplift contact/gap

โหลดทุก run =1.0SW+1.0RoofLL เป็น **unfactored study** ไม่เรียกว่า code service/ultimate combination. FULL มี LL50kgf/m² ลงเต็มพื้นที่ฉาย 4.5m²; LEFT ลงครึ่งซ้าย ส่วน self-weight ยังอยู่ทั้งสองซีก ไม่รวมพื้นหรือ LL พื้นใน shell model

น้ำหนักแต่ละ straight/annular sector ใช้ปริมาตรและ centroid จริง แรง LL ใช้ dx ของผิวภายนอก ไม่ใช้พื้นที่โค้งคูณ q. แรงแบ่งลง 4 node และเพิ่ม My equivalent couple เพื่อรักษา first moment เมื่อ centroid จริงไม่ตรง facet midsurface. บันทึก applied loads จึงมี nodal moments แม้ต้นกำเนิดเป็น gravity; ไม่ใช่ prestress หรือ applied joint design moment

แกนผล s จากฐาน LH ตามหน้าตัดผ่าน crown ลงฐาน RH; y ตาม bay, normal ออกนอก. N,Q หน่วย kN/m; M หน่วย kN·m/m; N บวก=แรงดึง M/Q เป็น raw section convention ของ solver ไม่ตีความ My global ที่ joint ว่าเท่ากับ Mss ต่อเมตร

`base` และ `crown_on_half` เป็นแรงรวมทั้งแนว interface ที่พิกัดอ้างอิงกึ่งกลาง Y=L/2. ลำดับ [Fx,Fy,Fz,Mx,My,Mz] รวม r×F แล้ว; global +My=dzFx−dxFz. ค่า min/max ของ resultants แต่ละช่องอาจเกิดคนละจุด ห้ามใช้เป็นคู่แรงร่วมกันในการออกแบบ

## ผลที่ใช้เป็นข้อสังเกตได้ในขอบเขตการศึกษา

ตัวอย่าง t175, FULL, M3:

| Case | ฐาน LH: Fz kN | ฐาน LH: Fx kN | crown บน LH: My kN·m | max displacement mm |
|---|---:|---:|---:|---:|
| P-H | 25.914 | 2.528 | ≈0 | 0.5736 |
| P-R | 25.914 | 1.103 | −3.901 | 0.1561 |
| F-H | 25.914 | 3.795 | ≈0 | 0.4572 |
| F-R | 25.914 | 1.849 | −3.548 | 0.1371 |

จุดต่อที่สมมติให้ถ่ายโมเมนต์ช่วยลดการเคลื่อนตัวในโมเดลนี้ แต่ต้องรับโมเมนต์เพิ่มจริง ไม่ใช่ประโยชน์ที่ได้จากการกด rigid โดยไม่ออกแบบอุปกรณ์ แรงดิ่งรวมสมมาตรเหมือนกันไม่ได้แปลว่าแรงภายในหรือจุดต่อเหมือนกัน

มวลหลักต่อหนึ่ง bay (2ซีก+พื้น) จาก density สมมติ: t150≈6005kg, t175≈6950kg, t200≈7879kg ไม่รวมเหล็ก embeds finishes/supports. ซีกละ≈2193/2530/2859kg ตามลำดับ ไม่ใช่น้ำหนักยกที่ผ่านการตรวจแล้ว และไม่ใช่ BOM ทั้งอาคาร

## QA ที่ได้และที่ยังไม่ผ่าน

- 24 physical sensitivity combinations ×3 meshes =72 runs; เพิ่ม M4 เฉพาะ t175 P-H/F-R FULL อีก2 รวม74 runs ไม่ใช่74 design load combinations
- Mesh M1/M2/M3 target≈0.30/0.15/0.075m, arc4/8/16 facets; M4≈0.0375m/arc32 ใช้10,160 elements ต่อกรณี
- Benchmark flat cantilever (ν=0): displacement เทียบ bending+shear analytical error≈0.01084% ใน finest benchmark; constant-strain membrane patch error≈1.42e−16; ลด E ครึ่งหนึ่งแล้ว displacement เพิ่ม2เท่าและ reactionsคงเดิมใน case ตรวจ
- Global force/moment residual สูงสุด≈2.0e−13 normalized; interface action/reaction≈5.31e−14. P-H เทียบสมการสามบานพับจาก Step2A independently ตรงภายใน tolerance. นี่เป็น numerical checks ไม่ใช่ tolerance ก่อสร้าง
- เกณฑ์ก่อนรัน: Δdisplacement≤5%, Δbase reaction/moment≤2%, Δinterior peak ทั้ง8องค์ประกอบ≤5%. Normalization floor 0.001mm /0.1kN(หรือkN·m)/0.1kN/m(หรือkN·m/m) กำหนดใน basis ไม่ปรับเพื่อให้ผ่าน
- displacement/base resultant เข้าเกณฑ์24/24ชุด แต่แรงภายในครบ8ตัว **ยังไม่เข้าเกณฑ์0/24**. M3→M4 ที่175 P-H/F-R FULL: Qy ยังต่าง≈7.03% /11.61% ตามลำดับ จึงไม่ประกาศ mesh-converged ทั้งโมเดล
- Interior mask ใช้ centroid ห่างฐาน/crown/free Y edges อย่างน้อย0.30m; ไม่ใช่การตัดบริเวณ critical ออกจาก design. Raw peaks ทั้งโมเดลยังเก็บอยู่ ใช้เพิ่มเพื่อแยกความไวของ singular/local regions; จุดสุ่ม Gauss เปลี่ยนกับ mesh จึงต้องทำ fixed-location/section-integral study เพิ่ม ไม่สรุปสาเหตุของ Qy จากตัวเลขนี้เพียงอย่างเดียว
- Rm ทำให้ t/Rm≈0.462–0.667: ยังไม่ได้ตรวจ solid/continuum comparison จึงไม่ยืนยันความเหมาะสมของ shell formulation บริเวณมุมโค้ง
- ยังไม่ทำ eigen/mechanism/physical connection stability verification ครบ3D; solver รันสำเร็จไม่ใช่หลักฐานว่าฐาน/รอยต่อจริงเสถียร

## งานต่อที่ถูกต้องก่อน Step 3

1. ศึกษา Qy/local force convergence ที่ fixed sections และ refine shoulder/edges โดยคงเกณฑ์เดิม พร้อม solid/continuum comparison บริเวณหนาโค้ง
2. กำหนด joint stiffness/contact และ geometry ก่อสร้างจริง รวมฐาน bearing/anchors/tie path, slope/gaps/offsets; ไม่ให้ four idealizations กลายเป็น final BC
3. เพิ่ม cracking/stiffness sensitivity และ load cases/combinations/ลม/ยก/ประกอบตามข้อกำหนด ก่อนคำนวณกำลัง เหล็ก และอุปกรณ์จุดต่อโดยผู้รับผิดชอบ

ลำดับนี้เป็น engineering safeguards จาก `precast-modular-workflow`: **หยุดการเลือกความหนาหรือทำแบบผลิตไว้ที่ QA ที่ยังเปิดอยู่** ไม่ได้หยุดการวิจัยแบบจำลองต่อ และยังไม่ข้ามไป Step3–5

## ทำซ้ำและสถานะเว็บไซต์

Python runtime แยกใน `.local-engineering-runtime/` (ignored ไม่รวม web build), versions ใน `tools/tsc-study/requirements-shell.txt`; `shell_study.py` รันในเครื่องเท่านั้น ไม่ใช่ callable cloud service. ใบอนุญาต package ระบุ internal use แต่ commercial redistribution ต้องตรวจสิทธิ์ต่างหาก; ไม่ได้นำตัว solver มาแจกในเว็บไซต์

```powershell
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/tsc-study/shell_study.py
$env:PM_SHARP_PATH='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'
node tools/tsc-study/render_shell.mjs
node --test tools/tsc-study/shell-results.test.mjs
```

หน้า Step2B อ่านเฉพาะ protected summary/PNG ผ่าน `catalogue:engineering`+artifact ACL และตรวจ dependency hashes. รายการ product48แบบ/R01/Step2Aเดิมไม่ถูกเปลี่ยนสถานะย้อนหลัง คลังรวม58ภาพ ไม่มี PDFมาตรฐานหรือ binary solver ใน public assets

ตรวจภาพ PNG ทั้ง3แล้ว; ยังไม่ทำ browser visual QA/real Firebase integration. การทดสอบผล5ข้อผ่านหมายถึงมีหลักฐาน/สถานะสอดคล้อง รวมถึงยืนยันว่า convergence ยังไม่ผ่าน ไม่ได้แก้สถานะให้เป็น Approved

## แหล่งอ้างอิง

- วสท.011008-21 ข้อ8.5.1 ตาม Clause register ข้างต้น ใช้เฉพาะประมาณ Ec; เก็บต้นฉบับ private ไม่คัดลอกหน้ามาตรฐานขึ้นเว็บ
- [OpenSeesPy ShellMITC4](https://openseespydoc.readthedocs.io/en/latest/src/ShellMITC4.html), [ElasticMembranePlateSection](https://openseespydoc.readthedocs.io/en/latest/src/elasticMembranePlateSection.html), [equalDOF](https://openseespydoc.readthedocs.io/en/latest/src/equalDOF.html): formulation/section/constraint API
- [OpenSees v3.8.0 ShellMITC4 source](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/element/shell/ShellMITC4.cpp), [section source](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/material/section/ElasticMembranePlateSection.cpp): local basis, 8-component Gauss output และ sign convention
- [COMSOL shell theory](https://doc.comsol.com/6.3/doc/com.comsol.help.sme/sme_ug_theory.06.130.html): ข้อจำกัด thickness/curvature และ shell–solid formulation; ใช้ตั้งข้อควรตรวจ ไม่แทน building code
