# P127 — Type I A/B/D ครบชิ้นคอนกรีตในโมเดลเรขาคณิต

ต่อP126 เพิ่มพื้น4ชิ้นและผนังหัวท้าย2ชิ้นให้ทั้ง12แบบ รวมแบบละ14ชิ้นหรือ168physicalparts เป็นgeometry-only analytical mesh ไม่ใช่โมเดลถ่ายแรงที่เชื่อมครบ

## วิธีและต้นทาง

ใช้P36รายผลิตภัณฑ์พร้อมhash ผนังหลังคาจากP126 พื้นTypeIรูปสี่เหลี่ยมใช้ระดับกลางความหนาจากboundsจริง175mmและตรวจvolume×densityกับมวลต้นทาง ผนังENDดึงเส้นขอบหน้าตัดจากfacesMmที่ปลายชิ้น แล้วtriangulateแบบconstrainedด้วยTriangle pq25a10000Q ไม่ใช้ช่องประตูI-C1แทนทุกแบบ

ตัวmesherP112ปรับอ่านsourcePathในmeshโดยยังใช้defaultเดิมสำหรับhistoricalC1 inputs; ชื่อSTDตามproductจริง ไม่มีการเขียนทับnativeSTAADrunเดิม

## ตรวจแล้ว

- 12products ×14partsครบIDต้นทาง ไม่มีpartซ้ำหรือขาด
- Sourcehash,meshhash,STDhashและจำนวนnodes/elementsเก็บในindex
- Endminimumangleต่ำสุด25.0041degrees; topology/openingchecksทุกแบบdefects0/qualityflags0
- ความคลาดเคลื่อนปริมาตรสูงสุด0.0023232% อยู่ในเกณฑ์geometry-study0.2%
- พื้นที่/ช่องประตูของบ้านพักและรีสอร์ตอาจต่างจากoffice/cafe; ไม่copyผนังENDตัวเดียวกันทั้ง12แบบ

## ยังไม่ครบ

ชิ้นคอนกรีตมีmeshแยกกัน ยังไม่มีcompatibleconnectionmapping,คานขอบ,บ่ารับ,ฐาน,วัสดุ,loads/combinations หรือdesign commands ในSTDชุดนี้ ห้ามรันแล้วเติมsupportsทุกชิ้นตามใจเพื่อให้เสถียร
การเชื่อมENDกับfloorต้องจัดnodecompatibilityจากตำแหน่งจริงต่อไป; meshที่ดีรายชิ้นไม่ได้พิสูจน์การถ่ายแรงระหว่างชิ้น
No native analysis claimed for these12products. ไม่ใช่finalSTAADdeliverables/RCdesign ไม่เพิ่มstage7analysed_products

ไฟล์: `output/staad-p7-p127/index.json` และโฟลเดอร์รายแบบ/complete
Generators: `tools/modular-program/stage7-abd-full-seed-p127.mjs`, `remesh-ends-p112.py`
Audit: `tools/modular-program/verify-abd-full-geometry-p127.mjs`, `stage7-mesh-quality-p111.mjs`

ขั้น7/8ยัง5%ตามfull-gateP105. Gate14analyticalgeometry48ยังไม่ครบ. Finalanalysis0/48RC0/48engineering/production=false
