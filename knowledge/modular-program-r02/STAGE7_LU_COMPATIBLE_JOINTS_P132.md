# P132 — ตาข่ายและพิกัดรอยต่อที่เข้ากันได้ของL/U32แบบ

ต่อจากP131ตามเป้าหมายขั้น7ครบ48แบบ×สองมาตรฐาน ขอบเขตรอบนี้เป็น geometric compatibility ไม่ใช่เลือกconnection DOFหรือออกแบบรอยต่อ

## ผลตรวจ

- L16แบบ: ต่อแบบ JO-CR4 + JO-BY4 + JO-FF6 =14แนว
- U16แบบ: ต่อแบบ JO-CR6 + JO-BY6 + JO-FF11 =23แนว
- รวม592interfaces, 17,094คู่nodeตรงกันตามพิกัดขวางแนวรอยต่อ
- END-floor864จุดฉายตรงกันทุกจุด; sourceENDbaseZ185, floor midsurfaceZ87.5 ระยะเยื้องยังไม่ใช่การอนุมัติให้ยึดแข็ง
- missing remesh target0ทั้ง32แบบ; ทุกDOF/stiffness/capacityยังnull
- ช่องกลางหลังคา20มม. และช่องbay/floor15มม.คงเดิม ไม่merge nodeหรือnearest-node tie
- floor trianglesมุมต่ำสุด25.013688°; listed topology/opening/quality checksไม่มีข้อบกพร่องทั้ง32แบบ
- พิกัดnodeของชิ้นที่ไม่ใช่พื้นคงเดิมทุกจุด (เปลี่ยนIDตามการประกอบmesh) ปริมาตรทุกชิ้นคงเดิมภายใน1e-8ม³
- independent part QAตามP131และnegative opening regressions4กรณีผ่านซ้ำ; ไม่ใช้ผลnativeชุดIแทนการทดสอบL/U

## วิธีแก้

ใช้bayId/axis/sideจริงระบุcrownและsame-wing bay; floorใช้ขอบpolygonจริงและnormalหันเข้าหากัน ไม่ใช้bounding boxเติมส่วนบาก พื้นต่างฝั่งมีboundary stationไม่เท่ากัน จึงรวมstationและendpointของช่วงต่อจริง

การบังคับห้ามแบ่งขอบแบบYครั้งแรกทำให้L-A1มีtriangleมุม0.48352° จึงไม่ส่งเข้าSTAAD เปลี่ยนเป็นTriangle `pq25a10000Q` ที่แบ่งขอบเพิ่มได้ แล้วส่งstationขอบใหม่ไปฝั่งตรงข้ามและremeshจนจับคู่ได้ครบ ไม่ลดเกณฑ์คุณภาพเพื่อให้ผ่าน มีขีดจำกัด16รอบและassertไม่ให้วนไม่สิ้นสุด

จุดฉายใต้ENDที่ใกล้ขอบพื้นเพิ่มจุดแบ่งขอบเฉพาะที่ ไม่เลื่อนผนังหรือจุดฐาน และไม่เพิ่มความหนา/ขนาดชิ้นงาน

## หลักฐาน

- `output/staad-p7-p132/index.json` / รายแบบjoint-map: พิกัดก่อนแก้และรายการที่ต้องเพิ่ม
- `output/staad-p7-p132-compatible/index.json`: meshและgeometry-onlySTDใหม่
- `output/staad-p7-p132-compatible-joints/index.json`: joint mapsหลังแก้
- **ทะเบียนตรวจรวม:** `output/staad-p7-p132-compatible/joint-verification-index.json`
- Scripts: `stage7-lu-joints-p132.mjs`, `remesh-lu-floors-p132.py`, `verify-lu-joints-p132.mjs`

## ยังต้องทำก่อนรันอาคาร

592แนวนี้ไม่ใช่jointครบทุกชนิด ยังไม่รวมnode wall/roof/fascia/cap, wing-to-node structural transitions, wall/beam seatsและsupport coupling ต้องพัฒนาระบบรองรับและระบุสมมติฐานความแข็ง/การสัมผัสให้ชัด
P33/P34เป็นรูปทรงและช่องประสาน ไม่ใช่หลักฐานรอยต่อรับแรงที่อนุมัติ ห้ามอาศัยผิวอยู่ใกล้กันเชื่อมเป็นrigidเองโดยไม่ระบุกรณีศึกษาและความหมายทางกายภาพ
ชุดนี้ไม่มีmaterial/loadcase/combination/analysis/RC ไม่ส่งเป็นfinal STAAD design

งานย่อยcompatible interfacesตามขอบเขตข้างต้น32/32=100%; ขั้น7/8ภาพรวม5%ตาม20gatesP105; final analysis0/48 RC0/48; engineeringApproved=false, productionReleased=false
