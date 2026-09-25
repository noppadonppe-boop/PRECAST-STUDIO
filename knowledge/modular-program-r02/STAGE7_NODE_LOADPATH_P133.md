# P133 — ระบบรองรับโหนด: พิกัดจริงและข้อกำหนดก่อนตั้งสมมติฐานรับแรง

ต่อP132 ในขั้น7; รอบก่อนเป็นprogressจากการแก้compatible mesh ไม่ใช่full structural solution

## ผลตรวจ32แบบ / 48node kits

L16node kits และU32node kits; node kitละ17physical pieces ทุกแบบตรวจsourcehashและการสะท้อนN02ของU ไม่แก้P36
ชุดละ15geometric candidate interfaces รวม720:

| เส้นทางที่เสนอให้พัฒนา | จำนวนต่อnode | เรขาคณิตที่ตรวจพบ |
|---|---:|---|
| CAP → FASCIA | 7 | footprintเหลื่อมกัน แต่ผิวคอนกรีตมีช่องแนวดิ่ง20มม. |
| FASCIA → NODE_ROOF | 4 | ขอบอยู่ติดกันโดยมีช่องแนวราบ20มม. ไม่ใช่ผิวรับแรงสัมผัส |
| NODE_ROOF → NODE_WALL | 4 | พื้นที่ทับบนหัวผนังและมีช่องแนวดิ่ง20มม. |

จำนวนนี้ไม่ใช่จำนวนพุก/แผ่นเหล็กหรือจำนวนจุดต่อที่เพียงพอ ขอบเขตเป็นcandidate regions: DOF/stiffness/capacityยังnull; contactEstablished=false ไม่มีการเพิ่มtiesลงSTAAD
ตรวจเฉพาะคู่ชิ้นที่พิสูจน์แล้วว่าplanเป็นสี่เหลี่ยมจริง ใช้สมการผิวลาดจากverticesเพื่อหาช่องว่าง ไม่ใช้ความสูงboundingboxแทนผิวลาด

## ประเด็นที่มีผลต่อการวิเคราะห์

**NR-SมีแนวรองรับบนNODE_WALLตรงเพียงด้านเดียว; NR-Nมีสามแนว**
กราฟที่เชื่อมถึงฐานไม่ได้พิสูจน์เสถียรภาพหรือตำแหน่งreaction ต้องพัฒนาmoment/shear/uplift transfer, rotational restraint, actionที่รอยต่อNR-S/NR-Nและผนัง พร้อมตรวจcantilever/torsionตามระบบจริง

แนวทางศึกษาภายในรูปทรงเดิม: พัฒนาจุดต่อแผ่นหลังคา–ผนังและรอยต่อระหว่างแผ่นให้มีหน้าที่รับแรงชัดเจน แล้วศึกษาความไวต่อความแข็งรอยต่อ ไม่อนุมานว่ารับโมเมนต์ได้แล้วจากการอยู่ใกล้กัน หากต้องเพิ่มคาน/เสาหรือเปลี่ยนgeometry ให้เสนอผลกระทบก่อน ไม่เพิ่มโดยเงียบๆ

ครอบCAPควรมีbearing/positive restraintที่พัฒนาเป็นชิ้นส่วนจริง; แผงFASCIAต้องมีstructural edge attachmentถ่ายแรงเข้าหลังคา ไม่ใช้sealหรือชั้นกันน้ำเป็นรอยต่อรับแรงสมมติ รายละเอียด/วัสดุ/ระยะ/กำลังยังไม่ถูกเลือกโดยรายงานนี้
ผนังโหนดเริ่มZ175 ส่วนบนคานทดลองZ0 จึงคงประเด็นบ่ารับแยกระดับตามP108 ห้ามบันทึกว่าbearingสำเร็จเพราะมีrigid offsetในโมเดลทดสอบ

## บัญชีน้ำหนักที่ห้ามตกหล่นหรือรวมซ้ำ

ต่อnode kit:
- มวลคอนกรีตNODE_ROOF+CAP+FASCIA =4,172.599908kg; แรงน้ำหนักฐาน2400kg/m³ประมาณ40.919227kN
- รวมชิ้นคอนกรีตทั้ง17ชิ้น =13,299.037158kg รวมพื้นและผนังด้วย
- ตัวเลข40.919227kNเป็นน้ำหนักรวม ไม่ใช่แรงแบ่งลงแต่ละผนัง/พุก และไม่ใช่โหลดออกแบบที่factored
- P33กำหนดweather surface `2810 + 0.02*(2992.5-localY)` เหนือNRtop2800 ทำให้มีspaceระหว่างแผ่นกับผิวลาดรวม0.3155353425m³/node; Lหนึ่งชุด, Uสองชุด
- spaceนี้ **ยังไม่ใช่ปริมาตรปูนที่เลือกแล้ว** อาจเป็นระบบอื่น ต้องเลือกbuild-up/ความหนาแน่นจึงได้dead load; material/density/loadยังnull ไม่ถือศูนย์ ไม่เติมคอนกรีตในช่องเอง
- มวลชิ้นเดิมมีในP123แล้ว ไม่addเป็นnodalweightซ้ำกับSELFWEIGHTของelement

## หลักฐานและข้อจำกัด

`output/staad-p7-p133/index.json` + JSONรายproduct
`output/staad-p7-p133/verification.json`: 32products,48node kits,720candidate interfaces, sourceและmirror checks
Scripts `stage7-node-loadpath-p133.mjs`, `verify-node-loadpath-p133.mjs`

sourceหลัก: P36solid geometry และP33waterZจาก `tools/modular-program/node-cover-p33.mjs`; P33ระบุsupportGeometry=nullและไม่รับรองระบบรองรับเองอยู่แล้ว P34เป็นweather coordination ไม่ใช่structural details

ตรวจชื่อไฟล์มาตรฐานในโครงการซ้ำ: AUยังมีNCC2025Housing/V2/V3 ไม่พบชื่อไฟล์ACI318-19/AS3600/ASNZS1170ฉบับเต็มในโครงการ การค้นชื่อไฟล์ไม่ได้พิสูจน์ว่าไม่มีเอกสารที่ใช้ชื่ออื่น จึงคงสถานะfull texts not locatedตามP117 ไม่อ้างตรวจRCตามข้อกำหนดแล้ว

ขั้น7/8ยัง5%ตามP105; finalanalysis0/48 RC0/48 ไม่ลดขอบเขตสองมาตรฐานเพื่อปิดงาน; engineeringApproved=false productionReleased=false
