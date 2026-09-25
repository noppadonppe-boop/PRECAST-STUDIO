# P149 — พักงาน STAAD และปรับขั้นสร้างโมเดลเป็น Generator-first

วันที่ 2026-09-21  
สถานะ: **PAUSED_BY_USER — KNOWLEDGE REPLAN FOR REVIEW**  
เอกสารนี้เป็นภาคผนวกปัจจุบัน ไม่แก้หรือลบหลักฐาน P105–P148 และไม่เพิ่มเปอร์เซ็นต์ความก้าวหน้า

## คำสั่งและขอบเขตการพัก

ผู้ใช้ขอหยุดขั้นสร้าง STAAD ชั่วคราวและให้จัดทำ Knowledge เพื่อปรับขั้นตอนใหม่ก่อนดำเนินการต่อ จึงให้หยุดงานที่สร้างหรือขยายโมเดลวิเคราะห์ รัน solver เพิ่ม ออกแบบ RC/รอยต่อ หรือสร้างชุด 48 ไฟล์รอบใหม่ จนกว่าผู้ใช้จะตรวจแผนนี้และสั่งเริ่มอีกครั้ง

การพักนี้:

- ไม่ลบหรือเขียนทับไฟล์ ผลรัน หรือทะเบียนเดิม
- ไม่ย้อนสถานะ benchmark และ reference studies ที่ตรวจไว้แล้ว
- ไม่ยกเลิกคำยืนยันฐานวัสดุที่ P138 หรือสิทธิ์ศึกษาที่ P142
- ไม่ทำให้ reference run กลายเป็น final analysis หรือ engineering approval
- อนุญาตเฉพาะการอ่าน ตรวจบัญชี และปรับ Knowledge/แผนโดยไม่สร้างผลวิเคราะห์ใหม่

## การเทียบเลขขั้น

ผู้ใช้เรียกงานนี้ว่า “ขั้นตอนที่ 8 — สร้าง STAAD file model” แต่ Master Plan R02 ที่ใช้อยู่กำหนดดังนี้:

| คำเรียก | เลขใน Master Plan R02 | ความหมาย |
|---|---:|---|
| งานสร้าง STAAD ที่กำลังปรับ | 7 | STAAD และรายการคำนวณ EIT/ชุดมาตรฐานที่เกี่ยวข้อง |
| ขั้นปิดโครงการหลังงานวิศวกรรม | 8 | Reconcile ผลส่งมอบและให้ผู้รับผิดชอบมนุษย์ตรวจ/อนุมัติก่อนผลิต |

เพื่อรักษาประวัติและการอ้างอิง เอกสารนี้ไม่เปลี่ยนเลข Stage เดิม แต่แบ่ง Stage 7 ใหม่เป็น 7A–7G ส่วน Stage 8 ยังคงเป็นการตรวจรวมและอนุมัติของมนุษย์

## เหตุผลที่ขั้นเดิมปิดงานยาก

1. งานสร้างไฟล์ geometry, การกำหนด joint/support, การลง load, การวิเคราะห์ และ RC design ถูกนับรวมอยู่ใน acceptance ชุดเดียว ทำให้มีไฟล์ที่ใช้พัฒนาต่อได้แล้วแต่ยังปิดคำว่า “สร้างไฟล์” ไม่ได้
2. งาน P105–P148 พิสูจน์องค์ประกอบหลายส่วนแยกกัน แต่ยังไม่มี compiler กลางที่ประกอบข้อมูลชุดเดียวเป็น 48 primary STD อย่างทำซ้ำได้
3. มี script เฉพาะงานหลายตัว หากแก้ geometry, joint หรือ load ต้องเสี่ยงแก้หลายจุดและเกิด revision ไม่ตรงกัน
4. ข้อมูลที่ยังไม่ปิด เช่น joint stiffness/capacity, node roof–wall–fascia–cap, dead load บางรายการ, regional wind/seismic และ AU full-code access มีผลต่อ final analysis แต่ไม่ควรทำให้สถานะการสร้าง draft analytical file ไม่ชัดเจน

## ขั้นตอนใหม่แบบ Generator-first

### 7A — Freeze และ Model Contract

จัดทำ machine-readable model contract หนึ่งชุด ระบุ units, axes, geometry revision/hash, material sets, plate/beam conventions, physical-part-to-analysis mapping, joint/support schema, load schema, output schema และสถานะ unknown ที่ห้ามแทนด้วยศูนย์

ผลส่งมอบ: `model-contract.json`, source register, unresolved-input register และกติกา revision/stale

### 7B — Unified STAAD Compiler

สร้าง compiler กลางที่รับ `productId + analysisTrack + modelStage` แล้วประกอบส่วนต่อไปนี้จากแหล่งเดียว:

1. geometry/openings
2. plate/beam properties และ material case
3. interfaces/joint DOF/spring/contact
4. supports/beam seats
5. loads และ combinations
6. analysis/output commands

ห้ามแก้ 48 STD ด้วยมือเป็นวิธีหลัก การแก้เฉพาะไฟล์หลัง generate ต้องถูกตรวจพบจาก hash และมี exception record

ผลส่งมอบ: generator, schema validation, deterministic output test และ preflight report

### 7C — Pilot PM-I-C1

ใช้ PM-I-C1 เป็น pilot ตามแผนเดิม โดยผ่านตามลำดับ:

`GENERATED_DRAFT → PREFLIGHT_PASS → NATIVE_OPEN_PASS → REFERENCE_RUN_PASS`

ตรวจ geometry/openings, element quality, interfaces, supports, load/resultant balance, local axes, signs, solver warnings และ source hashes ก่อนอนุญาต batch

Reference run อาจใช้สมมติฐานที่ประกาศชัดเพื่อทดสอบระบบ แต่ต้องไม่ถูกเลื่อนเป็น final analysis โดยอัตโนมัติ

### 7D — Batch 48 Primary STD

เมื่อ pilot ผ่าน ให้ compiler สร้าง primary STD ครบ 48 product IDs แบบ deterministic โดยใช้ geometry และ mapping ของแต่ละแบบจริง ไม่คัดลอกผลวิเคราะห์จาก pilot

แบ่ง batch เพื่อควบคุมความเสียหาย:

- Wave I: 16 แบบ
- Wave L: 16 แบบ
- Wave U: 16 แบบ

รัน preflight แบบ fail-fast รายไฟล์และสร้าง manifest กลาง ห้ามให้ไฟล์หนึ่งที่ล้มทำลายผลที่ผ่านแล้วของไฟล์อื่น

### 7E — Loads และ Code Tracks

เพิ่ม load cases/combinations เป็น revision แยกจาก geometry-base:

- TH/EIT + ACI 318-19 design basis ที่ตรวจใช้ได้
- AU track แยก ไม่ผสม factors/clauses และไม่อ้างผ่านจนมี source/access ที่เพียงพอ
- gravity, spatial pattern, wind/uplift, seismic, handling/assembly และกรณีที่เกี่ยวข้องต้องแยกสถานะ

Primary STD 48 ไฟล์เป็น artifact หลักตาม FILE_INTAKE; run bundle หรือ track-specific derivatives อาจมีมากกว่า 48 แต่ต้องชี้กลับ primary geometry/model revision เดียวกัน

### 7F — Native Analysis และ QA

รัน native STAAD แบบ batch พร้อมเก็บ input/output hash, solver version, warnings/errors, load/reaction equilibrium, deformation pattern, mesh/stiffness sensitivity, singularity disposition และ coexisting actions ต่อ load case

ผลที่ผ่านเฉพาะ gravity หรือ reference conditions ใช้สถานะ `ANALYSED_PARTIAL_SCOPE` ไม่ใช้ `ANALYSED_FULL_SCOPE`

### 7G — RC/Joint Design และ Handoff

ออกแบบ/ตรวจ shell, beam, joint, seat, connection และ reinforcement ตาม route ที่รองรับจริง แยก RCDC import ที่ตรวจแล้วออกจาก calculation route สำหรับ curved shell/joint ที่โปรแกรมไม่ได้พิสูจน์ว่ารองรับ ส่ง reactions พร้อม coexisting forces และข้อจำกัดให้ฐานราก

เมื่อ 7A–7G ผ่าน acceptance ทั้งหมดจึงปิด Stage 7 และส่ง Stage 8 ตรวจรวมโดยมนุษย์

## เกณฑ์ปิด “งานสร้าง STAAD file model” โดยไม่รอ final approval

เพื่อไม่ให้คำว่า “สร้างไฟล์” ค้างรวมกับงานรับรอง ให้ใช้ Milestone **M7-FILE-48** ซึ่งไม่ใช่การปิด Stage 7 ทั้งหมด เกณฑ์คือ:

- primary STD ครบ 48 product IDs และไม่มีซ้ำ
- ทุกไฟล์ผูก product/product revision/geometry revision/source hashes/software version
- geometry, openings, thickness, member sections, materials, axes, supports และ interface assumptions อ่านย้อนกลับได้
- preflight ผ่าน: syntax/ID/reference, orphan/duplicate, zero/invalid element, units และ required blocks
- เปิดและรัน native reference case ได้; warning/error เป็นศูนย์หรือมี disposition ที่ผู้ตรวจรับได้
- load/resultant และ reaction equilibrium ผ่าน tolerance ที่กำหนดล่วงหน้าในกรณีที่รัน
- manifest, QA report และ revision/stale status ครบ
- ป้ายสถานะสูงสุด ณ milestone นี้คือ `REFERENCE_RUN_PASS` หรือ `ANALYSED_PARTIAL_SCOPE`; `engineeringApproved=false` และ `productionReleased=false`

สิ่งที่ **ไม่รวม** ใน M7-FILE-48: final code compliance, final reinforcement, joint/anchor capacity, unrestricted nationwide/AU suitability และ production release รายการเหล่านี้อยู่ 7E–7G และ Stage 8 ตามลำดับ

## สถานะข้อมูลเดิมที่นำกลับมาใช้

- P126–P130: Type I A/B/D geometry, joint maps และ native rigid/selfweight references
- P131–P133: L/U part meshes, compatible joint maps และ node load-path candidates
- P143–P145: gravity combination compiler, ARC quantity intake และ floor load geometry
- P146–P148: load-transfer/reference method studies; P148 ที่มีไฟล์เตรียมไว้ยังไม่ถือว่าผ่าน native verification หรือเพิ่ม progress จนมีหลักฐานตรวจครบ

ของเดิมเป็น input/research evidence สำหรับ compiler ไม่ใช่เหตุให้ข้าม pilot หรือประกาศ 48 final models เสร็จแล้ว

## สถานะและเงื่อนไขกลับมาเริ่ม

- Stage 7 completion คง 5% ตาม acceptance gates P105 จนมีการอนุมัติและใช้เกณฑ์ใหม่
- final analysed products = 0/48; RC designed products = 0/48
- engineering approved = false; production released = false
- execution status = `PAUSED_BY_USER_FOR_GENERATOR_FIRST_REPLAN`
- กลับมาเริ่มเมื่อผู้ใช้ตรวจ Knowledge นี้และสั่งเริ่ม 7A หรือระบุการแก้ไขแผน
- การยอมรับแผนไม่อนุมัติค่า unknown, ไม่อนุญาตข้าม 7A–7C และไม่อนุมัติ Stage 8/production โดยอัตโนมัติ

