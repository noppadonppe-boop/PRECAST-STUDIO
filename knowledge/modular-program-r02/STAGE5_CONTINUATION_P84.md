# P84 — Base-foot contact and bolt demand; actionable pattern revision

ขั้น5/8 ยังไม่ครบ100% ตามP40. รอบนี้ทำ24กลุ่มขาของผิวM01/M03 สำหรับA/B/D × LH/RH × W01 โดยใช้ผลh25ของP83. ไม่ใช้แทนขาของหลังคา/หัวท้าย/รุ่นทึบหรือ44setupทั้งหมด

[รายงานภาพ24แผ่น](../../output/foot-demand-p84/index.html) · [CSVแรงสลัก](../../output/foot-demand-p84/bolt-demand.csv)

## งานที่ทำและแบบจำลอง

- ดึงขา30mmและตำแหน่งสลักM20จริงจากP66 รวมรูØ22รูป32เหลี่ยมตามgeometry ไม่สมมติขาเป็นสี่เหลี่ยมตันไม่หักรู
- เปลี่ยนP83reactionเป็นแรงลงขาและเลื่อนmoment referenceจากz30ไปz0พร้อมcross productครบ ไม่ลืมโมเมนต์จากแรงแนวนอนที่สูง30mm
- Local u,v,zยังเป็นright-handed fabrication basisของP83; RHสะท้อนกลับก่อนใช้ ไม่สะท้อนmomentแบบvectorธรรมดาผิดทิศ
- สมมติขาเป็นrigid plate; ใช้w=w0+rx*y-ry*x, contactรับcompressionอย่างเดียว, สลักรับtensionอย่างเดียว. Integrateพื้นที่compressionโดยclippolygonด้วยneutral lineและintegralอันดับ2ที่แน่นอน ไม่ใช้meshก้อนหยาบหรือreactionหาร4
- Solve3DOFด้วยNewton/energy line search. พิกัดหมุนปรับสเกล100mmเพื่อconditioning. โหลดครบFz,Mx,My; shear Fx,Fy,Mzคำนวณแยกด้วยelastic rigid bolt group equal in-plane stiffness
- kc=100/1000/10000 N/mm³, Leff=30/50/80mm เป็น**sensitivity assumptions** รวม9กรณี/ขา. E200000MPa, As245mm²สมมติM20coarse thread; ยังไม่มีpitch/product/grade/certificate/pretensionยืนยัน. ไม่เรียกkcว่าsoil modulusหรือผลพื้นโรงงาน
- ไม่คิดpreload/friction, actual clearance slip, plate bending/prying, washer bearing, thread stripping, bed/floor flexibility, weld capacity, self-weight/dynamics หรือcode combinations
- One-way handoff: ยังไม่คืนbase flexibilityเข้าP83 ต้องทำก่อนใช้ผลเป็นwhole-mould response

## หลักฐานและผล

24กลุ่ม/96ตำแหน่งสลักเดิม/216กรณีครบ ตรวจ43tests: analytic purecompression/uplift, biaxialcontact/reflection, geometryarea/sourcehash, equilibriumแรง–โมเมนต์ทุกกรณี, unilateral forces และcandidateยังไม่แทนของเดิม

แรงดึงเดิมสูงสุด80.014kN/ตัวในstiffness study; shearเดิมสูงสุด14.293kN/ตัวในequal-stiffness bolt group. ไม่ใช่code factored envelopeหรือผลกำลังผ่าน/ไม่ผ่าน. baseline kc1000/Leff50แสดงรูปcontact,ค่ากดสูงสุดและแรงแต่ละตัว; individual maximumต่างกรณีห้ามรวมเป็นชุดแรงพร้อมกัน

ค่ากดcontactขึ้นกับkcมาก จึงยังนำค่าpeakไปอ้างbearing/พื้นผ่านไม่ได้. Nominal tension/245แสดงdemandเท่านั้น ไม่มีallowable comparison

## ข้อเสนอที่คำนวณแล้ว แต่ยังไม่เปลี่ยนP66

เพิ่มแขนแรงโดยย้าย**คู่สลักใกล้ผนัง**ไปnormal distance56mmจากผิวสัมผัส:

- M01: B3/B4 จากn246ไปn56; B1/B2คงn306
- M03: B1/B2 จากn236ไปn56; B3/B4คงn296
- tangent station±70mmและขา350×200×30mmคงเดิม
- สร้างรูใหม่ในpolygonข้อเสนอจริง ไม่ย้ายจุดแรงแต่ปล่อยรูเก่าในแบบจำลองcontact

กรณีข้อเสนออีก216cases แรงดึงสูงสุด28.305kN/ตัว. ยังไม่ได้ตรวจshearของpatternใหม่ การดัดขา กำลังเกลียว และcollision/continuous release. ไม่รับรองว่าลดแรงดึงแล้วปลอดภัยทันที

**งานต่อที่ควรทำจริง:** พัฒนาnew base-lock geometryในrevisionใหม่ครบ12ABDvariants โดยรักษาP66history. คู่ใกล้ผนังอาจต้องถอน+Z250ก่อนออกnormal400 เพื่อให้shaftต่ำสุดพ้นlowerwaler z200; อย่าคัดลอกทางถอน+100เดิมโดยไม่ตรวจ. ตรวจstatic/tool/socket/เส้นทางทุกช่วงร่วมกับP71/P74/P80, สร้างใหม่รูขาและรูเกลียวbed ไม่ทิ้งรูเก่าหรือduplicate bolts. จากนั้นตรวจแรงเฉือนใหม่และplate/bolt/thread/weld capacity กับแบบเดียวกัน ไม่ทำรูปสวยแทนงานนี้

## ขอบเขตและความคืบหน้า

งานย่อยdemand/contact24/24=100%; **ไม่ใช่Step5ครบ100%**. Base-foot plate bending, wall–roof–end/seam interaction, bed, weld/lock capacity, handling/lifting/rotation และแบบผลิต/QCครบ44setupยังต้องปิด. P83ยังvalidสำหรับrigid-foot boundaryเดิม แต่ไม่ใช่flexible-base whole assembly

P52คงเดิม: แนวเหล็กยกคอนกรีตไม่ใส่ขนาด/ระยะ และสมมติกำลังพอเฉพาะพัฒนาแบบ ไม่ถามซ้ำ. ไม่เริ่มขั้น6. เว็บP68/คลังภาพหลักและgeometryP66เดิมยังไม่เปลี่ยน

engineeringApproved=false / productionReleased=false / stageComplete=false
