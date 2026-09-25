# คู่มือคลังภาพโมดูลาร์ WEB-03

## เปิดทดลองบนเครื่อง

ใช้ Node และ dependencies เดิมของโครงการ จาก project root:

```powershell
pnpm catalogue:build
pnpm catalogue:preview
```

หน้าเว็บอยู่ที่ URL ที่ server แสดง มี fragment `#access=...` สำหรับแลก session ครั้งเดียว เปิดทันทีภายใน 10 นาที อย่าเก็บ token ลงเอกสารหรือส่งต่อให้คนอื่น เมื่อหน้าเปิดจะลบ fragment ออกจาก address bar

ถ้า session เดิมยังไม่หมดอายุ เปิด `http://127.0.0.1:5186/catalogue` ได้โดยไม่ใช้ token อีก หากออกจากคลัง/ปิด server/ครบ 4 ชั่วโมง ต้องเริ่มรอบทดลองใหม่และใช้ลิงก์ใหม่ ไม่ใช้คำสั่ง preview เป็นการเปิด LAN หรือแชร์ผ่าน tunnel

เมื่อแก้ frontend ต้อง build ใหม่แล้ว refresh เนื่องจากบริการนี้ส่ง compiled UI ไม่ใช้ Vite dev filesystem server ถ้าแก้ backend/ทะเบียนข้อมูลให้หยุดและเริ่ม preview ใหม่ (ลิงก์และ session เปลี่ยน)

ทางเข้าบนแอป React เดิมคือ `/catalogue` แต่ต้องมี private API บน origin เดียวกัน; Vite dev ปกติหรือ Firebase hosting เดิมไม่มี API นี้ จะแสดงหน้าปิดสิทธิ์ ไม่ fallback ให้เห็นข้อมูล ตัวอย่างที่ส่งมอบใช้ dedicated build entry เพื่อไม่รวม fixture/BIM/shared-app bundles

## ทดสอบ

```powershell
node node_modules/vite/bin/vite.js build --config apps/web/vite.config.ts --mode catalogue
node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json
node node_modules/vitest/vitest.mjs run --config apps/web/vite.config.ts src/catalogue
node --test tools/catalogue/server.test.mjs tools/tsc-study/compute.test.mjs
```

HTTP tests ใช้ loopback 5197/5198 เฉพาะระหว่างทดสอบและปิดเมื่อจบ ถ้าพอร์ตไม่ว่างให้ตรวจ process เป้าหมายก่อน ไม่หยุด service อื่นหรือไล่ scan ports โดยอัตโนมัติ

## โหมดทีม (เตรียม code ไว้ ยังไม่เปิดใช้งาน)

ใช้ `node tools/catalogue/server.mjs --team` หลังได้รับอนุมัติการเปิดบริการเท่านั้น ต้องกำหนด:

- `CATALOGUE_ORIGIN` — HTTPS origin ที่ตรวจแล้ว ไม่มี trailing slash
- `CATALOGUE_PORT` — loopback upstream port (ค่าเริ่มต้น 5186)
- `CATALOGUE_FIREBASE_PROJECT_ID` — Firebase project เป้าหมาย
- `CATALOGUE_ORG_ID`, `CATALOGUE_PROJECT_ID` — ขอบเขตองค์กร/โครงการที่เลือกจริง
- `CATALOGUE_FIREBASE_API_KEY` — Firebase web identifier สำหรับ sign-in (ไม่ใช่ Admin credential)
- Firebase Admin application-default identity ที่ผู้ดูแล provision อย่างจำกัดสิทธิ์ ไม่ใส่ private key ใน source/client

ต้องไม่มี emulator host ใน environment ของ team mode และ frontend ต้องใช้ email/password provider ที่องค์กรอนุญาตแล้ว ไม่เพิ่ม anonymous account, signup หรือ membership เอง

สมาชิกต้องมี org document `organizations/{org}/members/{uid}` และ project document `organizations/{org}/projects/{project}/members/{uid}` ที่ `status=active` ทั้งคู่ ช่วง effectiveFrom/expiresAt ต้องใช้ได้ capability ของ project ต้องมี `catalogue:read` ผู้ดูแลอาจกำหนด `catalogueArtifactIds` เพื่อจำกัด artifact IDs ที่อ่านได้; empty array คือไม่ให้เห็นภาพใด ไม่ใช่ wildcard

ตัว adapter สร้าง Firebase session cookie ฝั่ง server และเก็บเฉพาะ opaque session ID ใน browser ใช้ verifySessionCookie(checkRevoked=true) และอ่านสมาชิกใหม่ทุก private request ไม่เชื่อ client roles หรือ shared-mode shortcut

TLS proxy ต้องส่ง Host ตรง approved origin และไม่ทำ static alias ของ workspace ไม่เปิด CORS กว้าง ไม่ cache metadata/images ระหว่างผู้ใช้ และไม่ expose `output/`, `knowledge/`, source PDF, token หรือ logs

Production rollout ยังต้องทำ rate limiting, persistent audit, service/backup/session strategy และ integration review ก่อนรับรองบริการจริง ตัวอย่างนี้เก็บ opaque sessions ใน process memory (restart แล้วต้อง login ใหม่) ไม่มีการติดตั้ง reverse proxy หรือสร้าง cloud resources ในงานนี้

## แหล่งข้อมูลและการแก้ต่อ

- UI: `apps/web/src/catalogue/` ใช้ React และ Icon component เดิม
- Dedicated entry: `apps/web/catalogue.html` → Vite mode `catalogue` → `apps/web/dist-catalogue/`
- Backend allowlist/auth: `tools/catalogue/server.mjs`
- Source adapter: `tools/catalogue/data.mjs`
- Team identity adapter: `tools/catalogue/firebase-identity.mjs`
- Progress ที่แยกจาก immutable R01: `knowledge/modular-web-step1/`

สำหรับงานในอนาคต ให้สร้าง revisioned live artifact records ตาม plan ไม่แก้ `baseline.json`/`product_matrix.json` ของ R01 ย้อนหลัง และไม่ถือว่าการ upload หรือเว็บเปิดได้เป็นการผ่าน engineering gate

## เพิ่มใน WEB-02: ดาวน์โหลดและ Step 2A

เมนู **ดาวน์โหลดภาพ** มีการค้นหาและตัวกรอง อาคาร / Typical / วิศวกรรม ปุ่มจะ fetch ภาพผ่าน session เดิมและตรวจชนิด `image/png` ก่อนบันทึก `${artifact.id}.png` ไม่คัดลอกไฟล์ไปพื้นที่ public และไม่เก็บ URL token ลงไฟล์ หาก session/สิทธิ์หมดอายุ จะแสดงข้อผิดพลาดแทนการบันทึก response ที่ไม่ใช่รูปภาพ

ข้อมูลหน้า **Step 2A · TS-C** มาจาก `output/tsc-step2a-r00/study_results.json` ไม่ hardcode ตัวเลขวิศวกรรมลง bundle รายละเอียดและข้อจำกัดอยู่ใน [Knowledge Step 2A](../knowledge/modular-tsc-step2a/README.md) ผลรอบนี้เป็น geometry/FBD/conditional equilibrium ไม่ใช่ plate/shell FEM หรือ capacity design

สำหรับการเปิดทีมในอนาคต ผู้ดูแลต้องให้ `catalogue:engineering` เพิ่มจาก `catalogue:read` จึงเห็น metadata และไฟล์วิศวกรรม หากใช้ `catalogueArtifactIds` ต้องอนุญาตทั้ง `STUDY-TS-C-S2A-R00` สำหรับ metadata และรายการภาพที่ต้องการ ได้แก่ `TS-C-GEOMETRY-S2A-R00`, `TS-C-FBD-S2A-R00`, `TS-C-JOINT-S2A-R00` ตามขอบเขตจริง ภาพถูกตรวจสิทธิ์อีกครั้งที่ direct URL ด้วย ไม่ใช่แค่ซ่อนเมนู

นี่เป็น capability ของบริการ catalogue ที่ยังไม่ deploy ไม่ได้แก้ Role Matrix/สมาชิก/Firestore Rules ของแอปหลักหรือเพิ่ม grant จริง การเปิดทีมต้อง review capability matrix, backend, Security Rules และ integration tests ร่วมกันตาม Knowledge หลักก่อนใช้งาน

### สร้าง technical boards ใหม่

เมื่อแก้ geometry/joints/compute/renderer ต้องสร้าง PNG, SVG และ JSON ใน revision งานที่เหมาะสมใหม่ด้วย generator ไม่แก้ผลตัวเลขด้วยมือ:

```powershell
$env:PM_SHARP_PATH='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'
node tools/tsc-study/render.mjs
```

พาธไลบรารีข้างต้นเป็น runtime ของเครื่องนี้ เครื่องอื่นใช้ตำแหน่ง Sharp ที่ติดตั้งจริง JSON เก็บ dependency hashes; metadata API ตรวจ SHA-256 ต้นทางใหม่ทุก request และแสดง `STALE` เมื่อไม่ตรง หลังสร้างผลใหม่ต้อง restart catalogue backend เพื่ออ่าน payload ล่าสุด สถานะ STALE/ลายน้ำไม่ใช่ระบบอนุมัติ และไม่อนุญาตให้ใช้ผลที่ยังไม่มีการรับรองไปผลิต

ภาพชุดใหม่ตรวจ local PNG แล้ว แต่ยังไม่ได้ทำ browser visual QA หรือทดสอบ Firebase กับบัญชีจริง

## เพิ่มใน WEB-03: ผล shell ที่ยังไม่ผ่าน QA ครบ

เมนู **Step 2B · Shell** เลือกความหนา/จุดต่อ/รูปแบบโหลดเพื่อดูผลคำนวณ M3 ได้24กรณี แสดง QA จากคู่ตาข่ายล่าสุดแยกต่างหาก ภาพบอร์ดเป็นภาพคงที่และมีป้าย case ไม่เปลี่ยนให้ดูเหมือนคำนวณใหม่ตาม selector

Metadata ID `STUDY-TS-C-S2B-R00` และ PNG IDs `TS-C-MODEL-S2B-R00`, `TS-C-FORCES-S2B-R00`, `TS-C-QA-S2B-R00` ใช้ capability และ artifact ACL วิศวกรรมเดียวกับ Step2A. ไม่เพิ่ม grant ให้ใคร และไม่มี endpoint เรียก solver จาก browser

Backend อ่าน `output/tsc-step2b-r00/web_summary.json` และตรวจ hashes ของ basis, clause register, solver script, requirements, raw summary, drawing generator และ geometry snapshot แต่ไม่ส่ง nodal arrays/binary solver/source PDF เข้า public build. Raw analysis files ยังอยู่ local สำหรับผู้ตรวจ

รันการตรวจผลด้วย `node --test tools/tsc-study/shell-results.test.mjs`; การผ่านการตรวจไฟล์นี้ยืนยันว่า QA incomplete ถูกเปิดเผย ไม่ใช่การอนุมัติวิศวกรรม ดูวิธีสร้างผลใหม่และข้อจำกัดใน [Knowledge Step2B](../knowledge/modular-tsc-step2b/README.md) หลังสร้างผลใหม่ restart catalogue backend เพื่อโหลด revision ล่าสุด
