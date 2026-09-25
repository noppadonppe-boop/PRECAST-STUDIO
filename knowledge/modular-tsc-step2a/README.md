# TS-C / Step 2A — ฐานศึกษา รูปตัด FBD และทะเบียนจุดต่อ

Revision `S2A-R00` · 16 กันยายน 2026 · **DRAFT_PRE_ANALYSIS / NOT FOR CONSTRUCTION**

เริ่ม Step 2 แล้ว แต่ยังไม่จบ plate/shell FEM และยังไม่เลือกความหนาหรือออกแบบอุปกรณ์จุดต่อ งานนี้ไม่เปลี่ยน snapshot R01 หรือภาพ R00

## การยืนยันเพิ่มจากผู้ใช้ในรอบนี้

1. TS-C กว้างภายนอก 3.00 ม. สูงภายนอก 3.00 ม. มุมโค้งภายนอก R0.40 ม. ช่วงยาว 1.50 ม.
2. เริ่มจากซีกทึบ S00 ก่อนเพิ่มช่องหน้าต่าง
3. ความสูง 3.00 ม. **รวมพื้น** วัดจากใต้พื้นถึงผิวบนหลังคา

นี่คือการยืนยันฐานศึกษา ไม่ใช่การอนุมัติ Design Basis/แบบผลิต ความลาดระบายน้ำ ช่องรอยต่อ ผิวตกแต่ง ฐานรองรับ และวัสดุยังต้องกำหนด

## ผลงานรอบนี้

- [รูปตัดและแปลน PNG](../../output/tsc-step2a-r00/TS-C-GEOMETRY-S2A-R00.png) / [SVG](../../output/tsc-step2a-r00/TS-C-GEOMETRY-S2A-R00.svg)
- [FBD แยก LH/RH/รวมเปลือก/พื้น PNG](../../output/tsc-step2a-r00/TS-C-FBD-S2A-R00.png) / [SVG](../../output/tsc-step2a-r00/TS-C-FBD-S2A-R00.svg)
- [ตำแหน่งจุดต่อและ topology PNG](../../output/tsc-step2a-r00/TS-C-JOINT-S2A-R00.png) / [SVG](../../output/tsc-step2a-r00/TS-C-JOINT-S2A-R00.svg)
- [ฐานศึกษาที่อ่านด้วยเครื่อง](study_basis.json), [Joint register](joint_register.json)
- [สมการและผลเชิงเงื่อนไข](EQUILIBRIUM_TH.md), [ผลคำนวณเรขาคณิต/coefficients](../../output/tsc-step2a-r00/study_results.json)

ภาพเป็น technical diagrams ที่สร้างจากพิกัด ไม่ใช่ภาพ AI หรือ heatmap สมมติ ใช้ t=t_f=175 มม. เพื่อวาดเท่านั้น รูปทรงเป็น parametric reference ที่รอยต่อยังมี zero gap; ไม่ใช่ CAD/fabrication tolerance ที่ freeze แล้ว

## ระบบพิกัดและข้อมูลเรขาคณิต

X ข้ามความกว้าง 0–3.00; Y ตามยาวหนึ่งช่วง 0–1.50; Z ชี้ขึ้น โดยใต้พื้น Z=0, ผิวบนพื้น Z=t_f, หลังคานอก Z=3.00

ซีก LH ประกอบด้วยผนังตรงสูง H−R−t_f, วงแหวนหนึ่งในสี่รัศมีนอก R/รัศมีใน R−t, และหลังคาราบครึ่งหนึ่งยาว B/2−R; RH สะท้อน X→B−X

| t=t_f ที่เสนอศึกษา | ปริมาตรต่อซีก H15 (ม³) | ปริมาตร F15 (ม³) | กว้างภายในส่วนผนังตรง (ม.) | สูงภายในใต้หลังคาราบ (ม.) |
|---|---:|---:|---:|---:|
| 150 มม. | 0.913614 | 0.675000 | 2.700 | 2.700 |
| 175 มม. | 1.054167 | 0.787500 | 2.650 | 2.650 |
| 200 มม. | 1.191372 | 0.900000 | 2.600 | 2.600 |

ตัวเลขมาจาก integration เรขาคณิตทึบ ไม่รวม steel/embeds/block-outs/ผิว/ช่องรอยต่อ ไม่ใช่น้ำหนักจริงหรือพื้นที่ใช้สอยอนุมัติ ความสูงใกล้มุมโค้งต่ำกว่าใต้ช่วงราบ และพื้นที่สุทธิของอาคารต้องหักชิ้นปิดปลาย/ผนังกั้น/งานระบบอีก

น้ำหนักใช้ W=γV โดย γ หน่วย kN/m³ ยังไม่เลือก; มวลใช้ m=ρV โดย ρ หน่วย kg/m³ ยังไม่เลือก ไม่สมมติว่าคอนกรีตมวลเบาใช้สมบัติปกติได้

## จุดที่พบและต้องแก้ก่อนเชื่อผล FEM

รัศมีกึ่งกลาง R_m=R−t/2 ทำให้ t/R_m เท่ากับ 0.462 / 0.560 / 0.667 ในชุดศึกษา เป็น curvature ที่หนาเมื่อเทียบกับรัศมี จึงเสนอให้ตรวจผลบริเวณ shoulder/joint กับ solid submodel หรือ continuum formulation ที่เหมาะสม ไม่รับรอง thin-shell approximation เพียงเพราะ solver รันสำเร็จ นี่เป็นข้อพิจารณาจากรูปทรง ไม่ใช่ค่า limit ผ่าน/ไม่ผ่านตามโค้ด

เอกสาร [COMSOL shell theory](https://doc.comsol.com/6.3/doc/com.comsol.help.sme/sme_ug_theory.06.130.html) อธิบายสมมติฐานผ่านความหนาและข้อจำกัดเมื่อ thickness/curvature ratio สูง; ใช้เป็นเหตุผลตรวจ formulation ไม่ได้นำมาแทนมาตรฐานออกแบบคอนกรีต

## จุดต่อและเส้นทางถ่ายแรง

JO-CR กลางหลังคา, JO-BS ซ้าย/ขวา, JO-BY ระหว่างช่วง, JO-FF ระหว่างพื้น; JO-ND/NI สงวนไว้สำหรับ L/U และ JO-LF/TB สำหรับการยก/ค้ำชั่วคราว

แต่ละรอยต่อมีตำแหน่งและหน้าที่ใน `joint_register.json` แต่ DOF/stiffness/contact และ capacity ยังคง null ไม่มีการนับ bolt จากภาพแล้วอ้างว่ามีเสถียรภาพ การยกซีกเดี่ยวต้องมี temporary stability design แยกก่อนใช้งานจริง

ต้องเลือกระหว่าง LP-A: เปลือกลงฐาน/คานขอบที่ออกแบบแยกจากพื้น และ LP-B: เปลือกลง F15 แล้วลงฐาน ถ้าเลือก LP-B ต้องเพิ่มแรงและโมเมนต์คู่จากฐานผนังลง floor model; ห้ามออกแบบพื้นด้วย LL ของพื้นอย่างเดียว

หลักการแยกบทบาท bearing, shear/tension restraint, movement และ stability อ้างอิง [PCI Connections](https://www.pci.org/Connections) โดยไม่ได้คัดลอกหรือรับรอง capacity ของตัวอย่างต่างประเทศ รายละเอียดสุดท้ายต้องให้วิศวกรผู้รับผิดชอบตรวจตามมาตรฐานโครงการ

## สิ่งที่คำนวณ / ยังไม่คำนวณ

คำนวณแล้ว: ปริมาตร/centroid, ช่วงว่างภายใน, ผลรวมโหลดจาก user inputs ภายใต้ area assumption ที่ระบุ, reaction coefficients ของแบบจำลองสามบานพับ 2D แบบสมมาตรและ LL ครึ่งซ้าย

ยังไม่คำนวณ: stiffness compatibility ของจุดต่อจริง, shell Nxx/Nyy/Nxy/Mxx/Myy/Mxy/Qx/Qy, deflection/cracking, capacity, reinforcement, prestress losses, wind/uplift/seismic, foundation, handling/erection, L/U nodes และ openings

สมมติฐานสามบานพับเป็น **benchmark เพื่อเช็กสมดุลเท่านั้น** ไม่ใช่การเลือก connection และไม่ใช้แทนแบบจำลอง plate/shell หรือการรับรองเสถียรภาพ 3D

ตัวเลือก solver ที่ศึกษาไว้คือ [OpenSees ShellMITC4](https://opensees.berkeley.edu/OpenSees/manuals/usermanual/640.htm) แต่ยังไม่ติดตั้ง/เลือก/รัน และต้องมี benchmark/mesh convergence/formulation checks ตาม workflow โครงการก่อนใช้จริง

## ก่อน Step 2B: FEM ของชิ้นงานจริง

| เรื่อง | สิ่งที่ยังต้องมี |
|---|---|
| วัสดุ | case คอนกรีต, ρ, E, ν, cracked/uncracked assumption; กำลัง/อายุที่เกี่ยวข้อง |
| จุดต่อ/ฐาน | LP-A หรือ LP-B, support coordinates/DOF, crown และ bay joint stiffness/contact, tie path |
| โหลด | roof area basis, occupancy/LL ของ floor, finishes/SDL, load cases/combinations, site/lateral/temporary stages |
| Geometry | slope/drainage, physical gaps, wall-floor detail/offsets, tolerances, ช่องเปิดรอบต่อไป |
| QA | solver/version, units/signs, benchmark, mesh and local-solid comparison criteria ก่อนรัน |

วสท.011008-21 ยังเป็น primary code ที่เลือกไว้ แต่รอบนี้ไม่ได้ทำ capacity check หรืออ่านข้อกำหนดเพื่อเลือก load factors ดังนั้นไม่อ้างว่าผ่าน วสท./ACI/Australian code

## การทดสอบและทำซ้ำ

`node --test tools/tsc-study/compute.test.mjs` ผ่าน 6 tests: มิติรวมพื้น, numeric quadrature เทียบปริมาตร/centroid, area/load mapping, สมดุล LH/RH/global ทั้งสองรูปแบบโหลด, crown shear asymmetry และสถานะไม่อนุมัติ

ทดสอบสมดุลด้วย γ=0/12/24 เป็น synthetic numerical checks เท่านั้น ไม่ใช่การเลือกความหนาแน่นวัสดุ ค่า residual absolute ต่ำกว่า 1e−10 สำหรับชุดทดสอบนี้เป็น numerical QA ของสมการ ไม่ใช่เกณฑ์ safety

สร้างรูปและผล JSON ด้วย `tools/tsc-study/render.mjs` โดยตั้ง `PM_SHARP_PATH` ไปยังไลบรารี sharp ที่มีใน runtime; รูป PNG ตรวจด้วยสายตาแล้ว ไม่มีการใช้ browser QA เพื่ออ้างว่าเว็บได้รับการตรวจทุกหน้าจอ

สถานะวิศวกรรมใน product slots R01 ยังคง `NOT_ANALYSED`; เว็บเพิ่มหมวด “Step 2A · TS-C” เป็น engineering draft แยกจากภาพ concept เดิม
