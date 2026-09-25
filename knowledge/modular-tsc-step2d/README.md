# TS-C — Step 2D / S2D-R00

16 กันยายน 2026 · **PARTIAL SOLID AND CUT QA / NOT FOR DESIGN**

ต่อจาก [Step 2C](../modular-tsc-step2c/README.md) ตามคำสั่งดำเนินการต่อ เก็บผลใหม่แยกจาก R01/S2A/S2B/S2C ไม่เปลี่ยนสถานะหรือผลย้อนหลัง ไม่อนุมัติความหนา เหล็ก จุดต่อ หรือผลิต และยังไม่เข้าสู่การออกแบบ Step 3

## 1. ขอบเขตที่ทำแล้ว

- ตรวจ section-cut ของ shell เดิม 6 กรณี: t175 / FULL / P-H และ F-R / M2–M4 โดยรันซ้ำและตรวจว่าตรงกับผลเดิม
- วิเคราะห์ full 3D solid หนึ่ง bay ขอบข้างอิสระ 6 กรณี: t175 / F-R limit / FULL และ LEFT / D1–D3
- ตรวจแรงผ่านหน้าตัด 6 ตำแหน่งในแต่ละกรณี รวม 72 FBD ของชิ้นส่วนย่อย พร้อม action–reaction ทั้ง 6 องค์ประกอบ
- เก็บ raw mesh/load/displacement/element force/Gauss stress, SHA-256, ภาพ 2 แผ่น และหน้าเว็บ Step 2D พร้อมดาวน์โหลด

**t175 เป็นกรณีศึกษาที่เลือกเพื่อวินิจฉัย ไม่ใช่ความหนาที่ผู้ใช้เลือกผลิต** ฐานยึดการหมุนและ crown ต่อเนื่องเป็นขอบเขตอุดมคติ F-R ไม่ใช่ผลสรุปว่าจุดต่อจริงแข็งเกร็ง

## 2. ฐานแบบจำลอง

ใช้ฐานที่ผู้ใช้ยืนยัน: ภายนอก 3.00×3.00 ม. ความสูงรวมพื้น, R ภายนอก 0.40 ม., bay 1.50 ม., ผนังทึบ S00, NC320 ไม่ใส่ prestress เฉพาะรอบศึกษา, LP-A ผนัง–หลังคาลงฐานโดยตรง พื้นแยก

ใช้คอนกรีตเชิงเส้น isotropic ไม่ร้าว E=28,321.7865329 MPa, ν=0.20, ρ=2400 kg/m³ ตาม trial เดิม; E สืบทอดจาก clause register วสท. 8.5.1 และตรวจ SHA-256 ของ PDF เดิม ไม่เพิ่มคำกล่าวว่าตรวจ strength/serviceability ตามมาตรฐานแล้ว

พิกัด X ตามหน้าตัดกว้าง, Y ตาม bay, Z ขึ้น ฐานผนัง Z=0.175 ม. ไม่ใส่พื้นใน mesh; ระยะใต้ท้องหลังคาส่วนราบเหนือผิวพื้น =2.65 ม.

- Element: OpenSees 3.8.0 stdBrick 8 nodes, 3 translations/node, ElasticIsotropic
- ฐานแต่ละด้าน: Ux=Uz=0 ทุก node บนหน้ารองรับ; Uy=0 เฉพาะ node กึ่งกลางความหนาและความกว้างด้านละ 1 จุด ไม่ล็อก Uy ทั้งโมเดล
- Crown: รวม nodes เต็มหน้าสัมผัสเป็น bonded continuum; ไม่มี gap/contact/slip/bolt
- ผิว Y=0 และ 1.50 ม. อิสระ; ไม่ใช่ plane-strain coupon ของ S2C
- Solid face support ไม่เทียบเท่า shell line support ในเชิงพฤติกรรมเฉพาะที่ จึงเปรียบเทียบผลรวมและการเคลื่อนตัวร่วม ไม่ประกาศว่าทั้งสอง formulation เท่ากัน

| Mesh | เป้าหมายระยะ (มม.) | ช่องส่วนโค้ง | ช่องผ่านความหนา | ช่อง Y | Bricks | Nodes |
|---|---:|---:|---:|---:|---:|---:|
|D1|150|8|2|10|1,320|2,211|
|D2|75|16|4|20|10,240|13,545|
|D3|50|24|6|30|34,200|41,447|

## 3. โหลดและการรักษาสมดุล

Unfactored SW เต็มชิ้นทั้งสอง pattern + roof LL=50 kgf/m²=0.4903325 kN/m² บนพื้นที่ฉายแนวราบภายนอก FULL เต็มหลังคา / LEFT ครึ่งซ้าย ไม่มี floor LL ใน roof/wall model และไม่มี finishing/ฝ้า/อุปกรณ์/น้ำขัง/โหลดด้านข้าง

ไม่ใช้ automatic body force หรือ mass load เพื่อไม่ให้นับ SW ซ้ำ คำนวณน้ำหนักแต่ละชิ้นย่อยจากพื้นที่สี่เหลี่ยมหรือวงแหวนจริง แบ่งให้ 8 vertices ด้วย

`wi = 1/8 + (xi − x̄)(xG − x̄) / Σ(xj − x̄)²`

ตรวจ wi ไม่ติดลบ; คงผลรวม Fz และโมเมนต์จาก X centroid จริง, symmetry ตาม Y คง My/Mx ที่สอดคล้อง ส่วน LL ลงเฉพาะ 4 vertices ของ outer face ตามพื้นที่ฉายจริง คำนวณผลรวมกายภาพอีกทางโดยไม่ใช้ผล FEM เป็นคำตอบอ้างอิง

Stiffness ใช้ผิวโค้งประกอบจาก facets ไม่ใช่ผิวโค้ง exact ปริมาตร mesh ต่างจากกายภาพ D1/D2/D3 เท่ากับ 0.078390% / 0.019626% / 0.008725% ตามลำดับ แต่ SW ใช้ปริมาตรกายภาพทุก mesh

ปริมาตรผนัง–หลังคาหนึ่ง bay =2.10833377 m³, มวลประมาณ 5,060 kg ที่ρ2400 ไม่รวมพื้น งานตกแต่ง และอุปกรณ์ โหลดรวม FULL=51.82815558 kN; LEFT=50.72490746 kN

## 4. Section-cut และ FBD

แยกชิ้น LH จากฐานถึง W-TOP, C22.5, C45, C67.5, R-START และ CROWN ส่วนมุมวัดจากแนวผนังขึ้นไปหาแนวหลังคา

`C = Σ(element resisting nodal forces ของชิ้นที่เลือกบนแนวตัด − nodal loads ที่ชิ้นนั้นแบ่งให้แนวตัด)`

รวม r×F และ nodal moment ของ shell ครบ อ้างโมเมนต์ทุกแรงใน FBD เดียวกันที่ `(X แนวกึ่งกลางความหนา, Y=0.75, Z แนวกึ่งกลางความหนา)` ของ cut นั้น แล้วตรวจ `Rbase + Pphysical + C = 0` เทียบกับโหลดกายภาพที่รวมแยกอีกทาง ตรวจ opposite cut ด้วย ไม่ใช้ stress smoothing และไม่เอาแรงทั้ง bay หารจำนวน bolt

เวกเตอร์เรียง `[Fx,Fy,Fz,Mx,My,Mz]` หน่วย kN/kN·m, แกน global; My บวกเป็นตามเข็มในภาพที่ +X ขวา/+Z ขึ้น ต่าง cut มีจุดอ้างอิงโมเมนต์ต่างกัน ห้ามนำ My จากคนละจุดมาบวกโดยไม่ย้ายจุดอ้างอิง

ค่าตรวจ normalized =max(max|residual force|/W, max|residual moment|/(W×3m)); เกณฑ์ก่อนรัน 10⁻⁶ ค่า shell cut สูงสุด2.63×10⁻¹³, solid cut1.29×10⁻¹²; action–reaction ผ่านทุก cut การปิดสมดุลเป็นเงื่อนไขจำเป็น **ไม่พิสูจน์ stress convergence หรือเสถียรภาพ**

## 5. ผลละเอียดสุด D3

| ผลต่อ bay | FULL | LEFT |
|---|---:|---:|
|ขนาดการเคลื่อนตัวสูงสุด (มม.)|0.13213|0.12531|
|Crown กึ่งกลาง Uz (มม.)|−0.12597|−0.11945|
|ฐาน LH: Fx (kN)|1.85035|1.75304|
|ฐาน LH: Fz (kN)|25.91408|25.66530|
|ฐาน RH: Fz (kN)|25.91408|25.05960|
|ฐาน LH: My รอบกึ่งกลางฐาน (kN·m)|1.69086|1.58787|
|CROWN cut บน LH: My (kN·m)|−3.54661|−3.35861|

ค่า u ไม่ใช่ผลผ่านเกณฑ์แอ่นตัว เพราะยังไม่รวม cracking/creep/load combinations และเงื่อนไขจุดต่อจริง

| D2→D3 | FULL | LEFT | เกณฑ์ตัวเลขก่อนรัน |
|---|---:|---:|---:|
|เปลี่ยน u สูงสุด|3.4045%|3.4010%|≤5%|
|เปลี่ยนแรงฐาน Fx/Fz/My สูงสุด|0.3736%|0.3735%|≤2%|
|เปลี่ยนแรง cut Fx/Fz/My สูงสุด|2.1625%|2.3611%|≤5%|

ตัวหาร=max(abs(ค่าละเอียด), floor); floor0.001mm/0.1kN/0.1kN·m ตามชนิด **เข้าเกณฑ์เฉพาะผลรวมเหล่านี้** ไม่ลบล้าง S2B ที่ interior resultants ทั้ง8องค์ประกอบยังไม่ผ่านครบ

Crown Uz ของ solid ต่างจาก shell F-R เท่ากับ−3.7078% (FULL เทียบM4) และ−3.5587% (LEFT เทียบM3) ตามสูตร `solid/shell−1` จึงหมายถึงขนาดการเคลื่อนตัวลงน้อยกว่า ไม่ใช่เพิ่มขึ้น; support idealization ยังต่างเฉพาะที่

เก็บ stress ที่8Gaussต่อbrickครบ6องค์ประกอบ `[xx,yy,zz,xy,yz,zx]` หน่วยkPa, tensionบวก แต่ **local_stress_convergence=NOT_ESTABLISHED** ไม่สร้าง contour ที่ติดป้ายว่าใช้กำหนดเหล็กได้

## 6. ทำซ้ำและตรวจสอบ

- [basis.json](basis.json): ขอบเขตและเกณฑ์ก่อนรัน
- [bay_results.json](../../output/tsc-step2d-r00/bay_results.json): ผลรวม/inputs/raw hashes
- [ภาพ Solid bay](../../output/tsc-step2d-r00/TS-C-SOLID-BAY-S2D-R00.png)
- [ภาพ cut FBD](../../output/tsc-step2d-r00/TS-C-CUT-FBD-S2D-R00.png)
- `tools/tsc-study/bay_study.py`: ใช้ isolated Python/runtime เดิม; `--reuse` ใช้ cache ได้เฉพาะ source/basis/solver DLL fingerprint ตรงทั้งหมด
- `tools/tsc-study/render_bay.mjs`: สร้าง SVG/PNG และ web_summary จากค่าจริง ไม่ใช้ภาพ AI แทนผลวิเคราะห์
- `tools/tsc-study/bay-results.test.mjs`: 5 tests ตรวจ hashes, independent geometry/load, 72cuts, global mesh criteria และ finite raw3D data

Solver D3 FULL เคยล้มเหลวด้วย UmfPack numeric factorization−1 / analysis−3 ทั้ง default และ `-useLongIndices`; เก็บบันทึก `attempt-D3-FULL-32bit-failed.json` และ `attempt-D3-FULL-long-indices-failed.json` ไม่ใช้เป็นผลคำนวณ และไม่สรุปสาเหตุว่าเป็นหน่วยความจำหรือชนิด index แน่นอน

เปลี่ยน linear system เป็น **SuperLU / Plain numbering** ตามเอกสาร ไม่เปลี่ยน physics/mesh/load และรันชุดปัจจุบันสำเร็จทั้ง6solidcases มีexit0และตรวจสมดุลภายหลัง

แหล่งปฐมภูมิ: [stdBrick](https://openseespydoc.readthedocs.io/en/latest/src/stdBrick.html), [element resisting force](https://openseespydoc.readthedocs.io/en/latest/src/eleForce.html), [UmfPack](https://openseespydoc.readthedocs.io/en/latest/src/UmfPack.html), [SuperLU/Plain numberer](https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/system/SuperLU.html)

## 7. เว็บและงานต่อไป

WEB-05 เพิ่ม Step 2D พร้อมเลือก FULL/LEFT และดาวน์โหลด2PNG รวม62ภาพ ข้อมูลใช้ engineering capability + study/image ACL เดิม, ตรวจ dependencies เป็น STALE ทุก metadata request ไม่เสิร์ฟ raw JSON/PDF/solver และไม่มีการ deploy หรือเพิ่มสิทธิ์ทีม

งานถัดไปคือกำหนดเกณฑ์และตรวจ local stress ผ่านความหนา/ความกว้างที่พิกัดกายภาพร่วม แยก free-edge/support effects กับบริเวณภายใน ก่อนสรุปความเหมาะสมของ shell formulation; สำรวจ joint stiffness/contact ของ JO-CR/JO-BS ต่อเมื่อหลักฐานเพียงพอ ไม่เลือกรายละเอียด bolt อัตโนมัติ

ยังต้องจัด load register และมาตรฐานสำหรับการใช้งานแต่ละประเภท รวม roof/floor, finishing, ลม/แผ่นดินไหว/ยกขน/ประกอบ, opening, multi-bay, floor/ฐาน และ I/L/U ทั้งอาคารให้วิศวกรผู้รับผิดชอบตรวจ ก่อนความหนา/เหล็ก/จุดต่อและแบบผลิต
