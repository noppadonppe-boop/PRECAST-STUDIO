# P109 — พื้นที่สัมผัสในแปลนและระดับรองรับ

2026-09-18; คงขอบเขตขั้น7ทั้งหมด. รอบก่อนprogress: ผู้ใช้อนุญาตแกนคาน/บ่ารับ และบันทึกข้อมูลแล้ว

ใช้sourceP36 + แกนคานP108ที่อนุญาตให้พัฒนาต่อ ตรวจbottom facesจริง ไม่ใช้bounding rectangleของพื้นเว้าเป็นพื้นที่สัมผัส
clipแต่ละbottompolygonกับrectangleของbeamstrip250mmบนaxisP108 ได้รายงานJSON48แบบและindex: output/staad-p7-p109
generator tools/modular-program/stage7-bearing-audit-p109.mjs

## ผล
- 48แบบ พื้น320ชิ้น; ทุกชิ้นมีพื้นที่ซ้อนในแปลนกับbeamstripอย่างน้อย2แนว
- ไม่ถือจำนวนแนวซ้อนเป็นการผ่านsupport/span/stability เพราะบางแนวเป็นเพียงพื้นที่เล็กใกล้มุม โดยเฉพาะN90
- ทดสอบอิสระ I-C1พื้นช่วงกลาง: 2แนวซ้อน แนวละ80x1485=118800mm2 ตรงpolygonclipping
- พื้นโหนดL/Uต้องตรวจplateactionและjoint ไม่สมมติพาดแบบเดียวกับพื้นตรง ไม่เพิ่มคานภายในหรือrigidlinkโดยอัตโนมัติ
- cornerbeamstripsมีพื้นที่ทับกัน ห้ามบวกcontactareasข้ามstripเป็นuniqueareaโดยไม่union
- ระดับใต้ผนังSHELL/NODE_WALL175mm; END185mm. ENDอาจถ่ายผ่านพื้นและรอยต่อ ไม่จำเป็นต้องสร้างบ่าสูง185ให้ทุกชิ้นโดยอัตโนมัติ

## Trial datum สำหรับประสาน
คงใต้พื้นเดิมZ0, ทดลองbeamtop0,bottom-400,centroid-200. ยังไม่ได้เลือกbearingpad/groutและoffsetสุดท้าย
บ่ารับผนังต้องชดเชย175mmรวมวัสดุรองรับ ไม่ถือว่าคอนกรีตบ่าสูง175mmสำเร็จโดยไม่มีgrout/pad
ไม่เปลี่ยนความสูงคอนกรีตโมดูลเดิม0..3000; คานที่อยู่ต่ำลงไม่ถูกนับย้อนว่าโมดูลเดิมสูง3400

Gate5ยังIN_PROGRESS: geometrycontactตรวจแล้ว แต่ระดับจริง/มุมเยื้อง/การถ่ายแรงจุดต่อยังต้องออกแบบและทดสอบ
ขั้น7/8=5%, อาคารวิเคราะห์ครบ0/48,RC0/48; ไม่อ้างปิดงานด้วยgeometryaudit
ข้อรอข้อมูลเดิมยังอยู่: normalweight/nonprestress/beamcontinuity, codefulltextsและsitecoverage. ยังทำanalyticalgeometry/benchmarkต่อได้โดยไม่แต่งคำตอบ
