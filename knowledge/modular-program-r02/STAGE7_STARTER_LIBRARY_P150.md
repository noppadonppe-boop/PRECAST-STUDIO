# P150 — ขอบเขตใหม่: STAAD Starter File Library ครบ 48 โมเดล

วันที่ 2026-09-21  
สถานะ: **100% COMPLETE — AWAITING_USER_STAGE_REVIEW**  
เอกสารนี้แทนขอบเขตดำเนินงาน 7C–7G ใน P149 เฉพาะส่วนที่ผู้ใช้แก้ไขล่าสุด โดยคง P149 เป็นประวัติการพักและแนวคิด Generator-first

## คำยืนยันล่าสุดของผู้ใช้

เป้าหมายของขั้นนี้คือเตรียมไฟล์ตั้งต้น STAAD ให้ครบทุกผลิตภัณฑ์สำหรับเก็บใน library และดึงไปใช้ภายหลัง ไม่ใช่การรันให้ผ่านหรือออกแบบรับรองให้ครบในขั้นนี้

แต่ละไฟล์ต้องเตรียม:

- geometry และ analytical mesh ของโมเดลนั้น
- material/property/support/joint assumptions ที่ต้องตรวจต่อ
- load cases และที่มาของ load
- load combinations และ load envelopes (ตีความคำว่า “evalop” เป็น envelope)
- analysis commands/output requests และแนวทางวิเคราะห์
- RC design commands หรือ design handoff ที่โปรแกรมรองรับจริง
- notes/flags สำหรับค่าที่ engineer ต้องตรวจ แก้ หรือเปิดใช้งานก่อนรัน

ผู้รับผิดชอบวิศวกรรมจะรับไฟล์ที่เลือกจาก library ไปตรวจ inputs, รัน, แก้โมเดล, ตรวจผล, ออกแบบ และอนุมัติในขั้นสุดท้ายเอง

## ขอบเขตที่แก้จาก P149

P149 เดิมกำหนด native reference run และ analysis QA เป็นส่วนหนึ่งของ milestone สร้างไฟล์ ผู้ใช้แก้ขอบเขตดังนี้:

- ไม่บังคับรัน solver เพื่อปิดงาน starter library
- ไม่บังคับให้ warnings, instability, equilibrium, stress, displacement หรือ RC design ผ่าน
- ไม่บังคับ native open/analysis ของทั้ง 48 ไฟล์ในขั้นนี้
- ย้าย solver run, model correction, result QA, code check, reinforcement/joint design และ engineering approval ไปขั้นสุดท้ายของ engineer
- คง static preflight และ traceability เพราะเป็น QA ของการสร้างไฟล์ ไม่ใช่ผลวิเคราะห์

## ลำดับงานใหม่ของ Stage 7

### 7A — Starter Model Contract

กำหนด schema กลางสำหรับ units, axes, node/element numbering, geometry revision, materials, thickness/sections, supports, joint assumptions, load naming, combination/envelope naming, output commands, design handoff และ placeholder policy

ค่าที่ยังไม่ทราบห้ามแทนด้วยศูนย์ หากคำสั่ง STAAD ต้องใช้ตัวเลข ให้เลือกหนึ่งในสองวิธีเท่านั้น:

1. ใช้ค่าพัฒนา/ค่าที่ผู้ใช้ยืนยันแล้วและติดป้าย `DEVELOPMENT_INPUT_NOT_ENGINEER_APPROVED`; หรือ
2. เก็บคำสั่งเป็น comment/disabled block พร้อม `ENGINEER_INPUT_REQUIRED` โดยไฟล์หลักยังอ่านเป็นข้อความ STAAD ได้

### 7B — Unified Starter-File Generator

สร้าง generator กลางจากข้อมูล geometry/load registers ที่มีอยู่ ไม่แก้ 48 STD ด้วยมือเป็นวิธีหลัก Output ต้อง deterministic และสร้างไฟล์หนึ่งชุดต่อ product ID

### 7C — Generate 48 Starter Packages

สร้างครบ 48 ชุด แบ่ง Wave I/L/U อย่างละ 16 แบบ แต่ละชุดประกอบด้วย:

```text
<productId>/
  <productId>-STARTER-R01.STD
  manifest.json
  load-register.json
  assumption-register.json
  engineer-readme.md
```

ไฟล์ STD เป็น primary artifact ส่วน JSON/README เป็นข้อมูลประกอบที่ต้องเดินทางไปกับไฟล์ ไม่แยกแจก STD โดยไม่มีข้อจำกัดและที่มาของ input

### 7D — Static Preflight และ Library Registration

ตรวจโดยไม่เรียก solver:

- 48 product IDs ครบ ไม่มีซ้ำ และชื่อไฟล์ตรงทะเบียน
- STAAD header/units/required sections/FINISH มีครบตาม contract
- node/member/plate IDs และ references ไม่ซ้ำหรืออ้างรายการที่ไม่มี
- property/material/thickness mapping ครบตามระดับ starter ที่กำหนด
- load case/combination/envelope IDs ไม่ชนกัน
- known loads มี source/revision/unit และ unresolved loads มี flag ไม่ถูกแทนเป็นศูนย์
- design commands ใช้เฉพาะ element/design route ที่ประกาศว่ารองรับ; ส่วน shell/joint ที่ต้อง RCDC/manual check มี handoff note
- SHA-256, bytes, generator version, source hashes และ dependency revisions ครบ
- ไม่มี ANL/result artifact ปลอมหรือสถานะที่สื่อว่ารันแล้ว

เมื่อผ่านให้ลงทะเบียนใน private local library และหน้า Engineering ของแต่ละ product ตามสิทธิ์เดิม เว็บให้ดาวน์โหลดแต่ไม่ execute ไฟล์

## เนื้อหาขั้นต่ำภายใน STD

ลำดับ section มาตรฐาน:

1. `STAAD SPACE` / job information / units
2. joint coordinates
3. member/plate incidences และ element groups
4. properties/thickness/material constants
5. supports และ joint/interface assumptions
6. primary load cases
7. load combinations/repeat-load definitions ตาม applicability
8. load envelope definitions สำหรับ service/strength และ track ที่เกี่ยวข้อง
9. `PERFORM ANALYSIS` และ output requests ที่ engineer ใช้เมื่อพร้อมรัน
10. RC design block สำหรับ member/route ที่รองรับ หรือ commented handoff block เมื่อยังต้อง engineer เลือก
11. `FINISH`

การมีคำสั่ง `PERFORM ANALYSIS`, design หรือ envelope ในไฟล์หมายถึงเตรียม workflow ไว้ ไม่ใช่หลักฐานว่าเคยรันหรือผ่าน

## Load และ envelope policy

- Known/adopted loads ใช้ค่าจาก register พร้อม source hash และ unit conversion
- selfweight ห้ามบวกซ้ำกับบัญชีน้ำหนัก concrete ledger
- floor/roof loads ต้องรักษา loaded area, projection basis และ spatial pattern ไม่ใช้ gross footprint แทนโดยเงียบ
- dead load ที่วัสดุ/น้ำหนักยังไม่ยืนยันใช้ disabled block หรือ development input ที่ติดป้ายชัด
- wind, uplift, seismic, site/durability parameters และ AU track ที่ยังขึ้นกับ location/code access ใช้ `ENGINEER_INPUT_REQUIRED`; ห้ามใส่ศูนย์เพื่อให้ไฟล์ดูครบ
- TH/ACI และ AU combination/envelope sets แยกชื่อ แยก source และห้ามผสม factors
- envelopes เป็นการจัดกลุ่ม load results ที่จะเกิดหลังรัน ไม่ใช่ผล envelope ที่คำนวณแล้ว

## RC design preparation

- ใส่ design parameters/commands สำหรับ beam/member เฉพาะที่ STAAD/RCDC route รองรับและอ้าง code edition ชัดเจน
- plate/shell, curved shell, openings, node regions, joints, seats และ connections ต้องมี force/output requests กับ handoff note; ห้ามสร้างคำสั่งอัตโนมัติที่โปรแกรมไม่ได้พิสูจน์ว่ารองรับ
- concrete strength, reinforcement grade, cover/exposure และ effective stiffness ใช้ค่าที่ confirmed หรือ development-labelled เท่านั้น
- `RC_DESIGN_COMMANDS_PRESENT` ไม่เท่ากับ `RC_DESIGN_RUN` และไม่เท่ากับ `RC_DESIGN_PASS`

## สถานะของ artifact ใน library

เมื่อสร้างและผ่าน static preflight ใช้สถานะ:

```text
intakeStatus: AVAILABLE
artifactStatus: LIBRARY_READY_STARTER
nativeValidationStatus: NOT_RUN_BY_CURRENT_SCOPE
analysisStatus: NOT_RUN
designStatus: NOT_RUN
engineerReviewStatus: REQUIRED_BEFORE_RUN
engineeringApproved: false
productionReleased: false
```

`NOT_RUN_BY_CURRENT_SCOPE` ไม่ใช่ `FAILED` และห้ามเปลี่ยนเป็น `VALIDATED` เพียงเพราะ static preflight ผ่าน

## เกณฑ์ปิด Milestone M7-FILE-48 ฉบับแก้ไข

Milestone ปิดได้เมื่อ:

- starter package ครบ 48/48 และตรวจ unique product mapping ผ่าน
- STD ทุกไฟล์มี geometry, load scaffolding, combinations/envelopes, analysis/output route และ RC design/handoff ตาม contract
- static preflight ผ่าน 48/48
- manifest/source/dependency/hash/assumption/load registers ครบ
- library index และสิทธิ์ดาวน์โหลดภายในพร้อม
- ทุกไฟล์แสดง `NOT_RUN`, `ENGINEER_REVIEW_REQUIRED`, `engineeringApproved=false`, `productionReleased=false`

Milestone นี้ไม่ต้องมี ANL, reactions, stresses, displacements, reinforcement results, solver-pass evidence หรือ engineering signature

เมื่อ M7-FILE-48 ครบ สามารถปิด Stage 7 ตามขอบเขตที่ผู้ใช้แก้ไข แม้ final analysed products และ RC designed products ยังคง 0/48

## Workflow เมื่อผู้ใช้ต้องการนำโมเดลไปใช้

1. เลือก product ID และดาวน์โหลด starter package ทั้งชุด
2. สร้าง checkout/revision ใหม่ ไม่แก้ทับ starter revision ใน library
3. Engineer ตรวจ site/use/material/load/joint/support/code applicability
4. Engineer เปิด STAAD, แก้ inputs, รันและตรวจ warnings/equilibrium/results/sensitivity
5. Engineer ออกแบบ RC/joints และแก้โมเดลตามผล
6. ส่งไฟล์ STD/ANL/calculation/review ที่ตรวจแล้วกลับเป็น revision ใหม่
7. ผู้มีอำนาจอนุมัติจึงเปลี่ยนสถานะ checked/approved/released ตามจริง

ผลจากโมเดลหนึ่งห้ามคัดลอกเป็นผลผ่านของโมเดลอื่น แม้ใช้ starter template ร่วมกัน

## สถานะปิดงาน P150

- สร้าง private local starter library ครบ 48/48 package: I/L/U อย่างละ 16 แบบ
- มี STD 48/48 ไฟล์ และ package metadata ครบ `manifest.json`, `load-register.json`, `assumption-register.json`, `engineer-readme.md` พร้อม ZIP รายแบบ
- generator กลางคือ `tools/modular-program/stage7-starter-library-p150.mjs`; การสร้างซ้ำสองรอบให้ hash/bytes ตรงกันทุกไฟล์
- static preflight ผ่าน 48/48 และ manifest reconciliation ผ่าน โดยตรวจ ID/reference/geometry/property/load/status/hash/dependency และไม่มี result artifact ปลอม
- backend/frontend ลงทะเบียนไฟล์ใน STD slot และหน้า Engineering ของทั้ง 48 แบบแล้ว ภายใต้สิทธิ์ engineering เดิม; เว็บดาวน์โหลดได้แต่ไม่ execute STD
- ที่เก็บจริง: `%LOCALAPPDATA%/Precast-Module/private/staad-starter-p150`
- สถานะสุดท้าย: `AWAITING_USER_STAGE_REVIEW`
- `analysedProducts = 0/48`, `rcDesignedProducts = 0/48`, `nativeValidationStatus = NOT_RUN_BY_CURRENT_SCOPE`
- `engineeringApproved = false`, `productionReleased = false`
- ไม่มีการเรียก STAAD, RCDC หรือ solver และไม่มี ANL/result ที่สร้างเพื่อแสดงว่างานผ่าน

รายงานหลักใน private library:

- `library-index.json`
- `delivery-manifest.json`
- `static-preflight-report.json`
- `acceptance-report.json`
- `progress-report.json`
- `starter-model-contract.json`

ผล P105–P148 คงเป็น source/research evidence และ historical runs เท่านั้น ห้ามถ่ายสถานะ PASS เดิมมาเป็นผลผ่านของ starter R01 ขั้นถัดไปต้องรอผู้ใช้ตรวจรับตาม Stage Review Gate
