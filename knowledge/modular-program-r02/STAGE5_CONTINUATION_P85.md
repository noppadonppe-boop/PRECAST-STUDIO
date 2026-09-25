# P85 — Near-wall base screw relocation implemented in actual geometry

ขั้น5/8 ยังไม่ครบ100%. งานย่อยย้ายสลักและตรวจgeometryครบ12/12 ABD LH/RH S00/W01 พร้อมภาพ3D12ชุดและตารางรู. ไม่ใช่แรง/กำลังทุก44setupครบ

[ภาพและดาวน์โหลด](../../output/abd-base-pattern-p85/index.html) · [แรงสลัก W01](../../output/abd-base-pattern-p85/bolt-demand.csv)

## แบบที่เปลี่ยนจริง

จากข้อเสนอP84: ย้าย8สลักและ8แหวนต่อsetup. M01คู่B3/B4ไปn56 (far n306), M03คู่B1/B2ไปn56 (far n296); tangent±70mm. ขา4แผ่นผนัง350×200×30mmเดิม สร้างรูØ22ใหม่ในsolid ไม่แค่ย้ายจุดแรง. สร้างbedใหม่จากP65ที่ยังเก็บรูcassetteเดิม แล้วเจาะ40nominal seatsตามตำแหน่งปัจจุบัน; ไม่เหลือรูสลักเก่าที่ถูกย้าย

โมเดลนี้เป็น **new fabrication geometry** ไม่ใช่คำสั่งอุดรู/เจาะแก้เหล็กที่ผลิตแล้ว. Ø20×20mmที่bedคือnominal thread envelope ไม่ใช่ขนาดดอกเจาะเกลียว; thread specยังต้องออกแบบ

คอนกรีตTypicalไม่เปลี่ยน. P66/P80ประวัติไม่ถูกแก้. รวมgeometryปัจจุบันเป็น **P85 base + P71 web + P74 seam + P80 edge stock** แต่ละชุดครั้งเดียว และใช้sequenceP85. อย่าใส่P66baseซ้ำอีก

## ตรวจการประกอบ/ถอดจริงในโมเดล

- คู่ใกล้ผนังถอน+Z250ก่อนเลื่อนoutward400mm. ทดสอบnegative caseยืนยันทางเก่า+Z100ของA-LH-W01-M01-F1-B3ชนlowerwalerจริง และ+250พ้น
- ตรวจcontinuous translationของชิ้นที่เปลี่ยนกับทุกobstacleปัจจุบัน และชิ้นอื่นกับobstacleที่เปลี่ยน. คู่unchanged–unchangedอาศัยหลักฐานP66/P71/P74/P80ที่ตรวจว่าผ่าน ไม่กล่าวว่าคำนวณใหม่ทุกคู่
- รวมค้ำP71 seamP74และedge/walerP80ในobstacles. staticHits/changed-motionHitsเป็นศูนย์ครบ12รุ่น. socket bodies76จุดต่อรุ่นตรวจต่อcombined geometryครบ ไม่ใช่ด้ามเครื่องมือ/พื้นที่มือ
- รูเดิมที่ย้ายมีเนื้อเหล็กกลับคืนและรูใหม่ว่างจริงทั้งfoot/bed ตรวจด้วยsolid probes; ตรวจจำนวนparts/locksไม่ซ้ำ มวลแผ่นเดิมเท่ากัน และสะท้อนLH/RH
- ยังต้องcapture/supportแม่แบบก่อนถอดbase screws; collision-freeไม่พิสูจน์เสถียรภาพหรือแผนยก

## แรงจุดต่อที่ตามแบบใหม่

`bolt-demand.json` ตรวจphysical coordinatesและintegralพื้นที่รูP85ตรงP84option จึงreuse216rigid-contactcasesในW01โดยบันทึกhashและจุดอ้างอิงเดิม. คำนวณshear rigid bolt groupใหม่ตามpatternนี้ พร้อมสมดุลFx,Fy,Mz. ครบ24กลุ่ม/96bolt positionsของW01; tensionสูงสุด28.305kN, shearสูงสุด9.527kN. เป็นdemandสมมติฐานเดิม ไม่ใช่nominal/factored code capacity

ไม่ขยายแรงนี้ไปS00โดยอัตโนมัติ. รูขาใหม่เปลี่ยนความแข็งฐานจริง แต่P83ยังเป็นrigid-foot analysisเดิม ไม่ถือว่าwhole-mould flexiblebaseครบแล้ว

เก็บmodelled steel mass/CGใหม่รวมP85+P71+P74+P80ในแต่ละJSON. ไม่รวมweld/seal/rebar/rigging. จำนวนรูเท่าเดิมทำให้มวลรวมไม่เปลี่ยนโดยสาระ แต่CGต้องตามตำแหน่งวัสดุ/สลักใหม่

## Verification และการส่งงาน

20testsตรวจ12models,6mirrorpairs,negative withdrawal caseและ24กลุ่มแรงที่มีcurrent hashes. ภาพจากsolid modelโดยตรงตามสีnavy/silver/amber/greyของSkill; ไม่สร้างมุมหรือhardwareด้วยAI. ภาพdetailM01-F1ใช้local outward-normal coordinates ตัดช่วงดูเฉพาะขาฐาน ไม่ใช่แบบผลิตเต็มชิ้น

เว็บหลักยังP68/ภาพเดิมไม่เปลี่ยน; supplementมีlocal index,PNG/SVG/JSON/CSVสำหรับตรวจ. ไม่มีFirebase/public deployment/เริ่มขั้น6

## งานต่อที่ยังต้องปิดP40

ตรวจplate bending/prying, washer/bolt/thread/weld capacityด้วยรายละเอียดP85, รวมbase/seam flexibilityและแรงหลังคา/หัวท้าย, supported handling/lifting/rotation, manufacturing tolerance/seals/QCและdrawingชุดเดียวกันครบ44setup. อย่านำgeometry12/12ไปเท่ากับStage5ครบ100%

P52คงเดิม: แนวเหล็กยกคอนกรีตไม่ใส่ขนาด สมมติกำลังพอเฉพาะพัฒนาแบบ ไม่ขอข้อมูลเดิมซ้ำ

engineeringApproved=false / productionReleased=false / stageComplete=false
