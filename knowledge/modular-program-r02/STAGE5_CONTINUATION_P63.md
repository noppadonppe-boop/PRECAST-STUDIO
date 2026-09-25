# P63 — จุดล็อกแผ่นข้างช่องหน้าต่าง

ขั้น5/8 งานต่อจากP62 ตามขอบเขตP40 ไม่เริ่มขั้น6 ไม่เปลี่ยนTypicalคอนกรีต

## งานเพิ่ม

6รุ่น A/B/D LH/RH-W01 เพิ่ม4จุดยึด SL11/12/21/22 ต่อชุด: boss50×50×20 และแผ่นเชื่อมต่อหนา20ติดกับWC, tabหนา10ติดW03/W04, สกรูnominalM12 engagement18, washer14ID24OD3. รูtab14และช่องเกลียวnominal12เป็นsolid voidจริง ไม่ใช่สัญลักษณ์ทับเนื้อเหล็ก. ตัวเลขเกลียวยังไม่ใช่tap drillหรือกำลังรับรอง

ตำแหน่งbossด้านซ้ายy960และด้านขวาy2040, z360/1090; XตามผนังDจริงและสะท้อนRH. รูปtab/แผ่นต่อแนบโมเดลรายชิ้น ไม่ดัดSHSหรือเปลี่ยนคอนกรีตให้หลบจุดยึด

น้ำหนักWCstockเพิ่มเป็น100.527kg A/B และ100.577kg D แยกจากtabของside insertsและhardwareถอดได้ ไม่ใช้มวลP62เดิมเป็นมวลปัจจุบัน

## ลำดับและการตรวจ

- ยังยึดฐานWCไว้ขณะถอดจุดล็อก/แผ่นข้างช่อง แล้วจึงมีcapture/supportและปลดสกรูฐานก่อนถอนWC
- สกรูsideยก60Zแล้วถอนออกด้านนอก250X; ด้านบนยังอยู่ใต้แผ่นหัวช่อง. negative testยก200Zชนหัวช่องจริง
- ถอดwasherตามทางที่ตรวจแล้ว จากนั้นside retractตามผนัง20ก่อนถอนX. negative testแสดงว่าถ้าสกรูยังอยู่ sideเลื่อนไม่ได้
- 11testsผ่าน ครอบคลุม6geometry/51continuous legsต่อชุด, stockไม่ทับ,4tool envelopesต่อชุด, mirror/massและnegative controls. ช่องtoolØ28สูง34เป็นlow-profile right-angle driver envelope ไม่ได้ตรวจhandle/operator reachหรือกำลังขัน
- รูปคอนกรีต/ท่าหล่อเหมือนต้นทางทุกพิกัด ไม่อนุมานgeometry passเป็นcapacity

## งานต่อ

ต้องตรวจside plate stiffness, screw/boss/link/tab/weld strength, seals/tolerancesและtemporary supportจริง. P62แรงเดิมไม่รวมชิ้นเหล็กเพิ่มและทางถ่ายแรงsideเข้าจุดยึด จึงห้ามถือว่าเป็นcapacity checkของP63. ยังต้องรวมmain wall/roof ribs/frames/locksของA/B/D12ชุดแล้วตรวจภาพรวมตามP40 ไม่ปิดงานด้วยภาพสวย

ภาพโมเดลและไฟล์6รุ่น: [P63 index](../../output/abd-side-lock-p63/index.html). มีPNG/SVG,geometryJSON,stockCSVและบัญชีtag/owner. ใช้สีของSkillนำเสนอ แต่ภาพนี้เป็นdeterministic CAD-derived detail ไม่ใช่ภาพAI. ภาพระเบิดSL12มีdisplay offsetที่ไม่ใช่เส้นทางถอดจริง

เว็บคงP61; P62/P63เก็บเป็นชุดย่อยก่อนรวมfull hardware. coverageแม่แบบระดับพัฒนาคง32/44 (72.7%ของจำนวนชุด ไม่ใช่เปอร์เซ็นต์ทั้งขั้น). ขั้น5ยังไม่100% ไม่อนุมัติผลิต/ยก
