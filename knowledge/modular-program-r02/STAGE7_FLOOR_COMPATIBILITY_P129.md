# P129 — แก้ตาข่ายพื้นใต้ฐานผนังENDครบ12แบบ

ปิดปัญหาพิกัดจากP128ด้วยconstrainedtriangularfloorremesh ไม่เลื่อนผนัง ไม่ต่อnearestnode และไม่กำหนดรอยต่อเป็นrigidเพื่อให้ผ่าน

ใช้boundarynodesพื้นเดิมร่วมกับจุดฉายใต้ENDbaseเป็นinput Triangle pq25a10000YQ ขอบรอยต่อพื้นไม่เพิ่มSteinernodeแบบไม่ตรงกันระหว่างbay ส่วนinternalmeshแบ่งตามarea10000mm² พร้อมตรวจคุณภาพจริง ไม่ถือว่าคำสั่งq25รับรองมุมขั้นต่ำทุกจุด

## ผลตรวจ

- 12products; END-to-floorจุดฉายตรงกันครบ368คู่ ไม่มีmissingtarget
- พิกัดSHELL/ENDทุกnodeคงเดิม (เปลี่ยนเลขnodeตามการรวมmeshเท่านั้น)
- ปริมาตรทุกpartคงเดิมในtolerance1e-8m³ ไม่มีน้ำหนักหายหรือเพิ่มจากremesh
- Listedtopology/openingchecks: defects0 / qualityflags0ทุกแบบ
- รอยต่อกลางหลังคา/ระหว่างbay/ระหว่างพื้นยังจับคู่ครบ13interfacesต่อแบบ
- source/predecessor/meshhashและคู่nodeใหม่เก็บในverificationรายแบบ

คู่END-floorนี้เป็นเพียงgeometriccandidate DOF/stiffness/capacityยังnull ไม่ได้ตัดสินว่าfloorต้องรับENDด้วยการยึดชนิดใด และยังไม่มีbeamseat/supports/material/loadcases/RCdesign

หลักฐาน `output/staad-p7-p129/verification-index.json` และfolderรายproduct
Scripts `remesh-abd-floors-p129.py`, `verify-floor-remesh-p129.mjs`

ขั้น7/8ยัง5%ตามP105;finalanalysis0/48RC0/48engineering/productionfalse. NoStage8.
