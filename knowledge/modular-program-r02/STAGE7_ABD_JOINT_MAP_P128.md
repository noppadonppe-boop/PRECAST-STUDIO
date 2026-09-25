# P128 — ตรวจพิกัดรอยต่อ A/B/D Type I จำนวน12แบบ

ต่อP127 ตรวจmeshhashและพิกัดขอบทั้งสองฝั่งจริง ได้13interfacesต่อแบบ (กลางหลังคา4,ระหว่างbay6,ระหว่างพื้น3) รวม156interfacesและ3,804nodepairs
ช่องกลางหลังคา20mmและช่องระหว่างbay15mmคงอยู่ ไม่mergeพิกัด ไม่ใส่DOF/stiffness/capacityแทนค่าที่ยังไม่ทราบ

## ผลตรวจและข้อแก้ก่อนcoupling

ทุกแบบมี12nodesที่อยู่มากกว่าหนึ่งinterface ห้ามนำpairsแต่ละชุดใส่CONTROL/DEPENDENTซ้ำกันตรงๆ ต้องจัดconstraint topologyตามพฤติกรรมที่เลือกและข้อจำกัดSTAAD

ENDbase28–33nodesต่อแบบมีพิกัดฉายอยู่ในแผ่นพื้น แต่ไม่มีfloornodeที่XYตรงกันในmeshปัจจุบันทั้ง12แบบ บันทึกพิกัดเป้าหมายและverticaloffsetในauditรายแบบแล้ว ต้องremesh/insertcompatiblefloorpointsก่อนใช้endbase-to-floorcoupling ไม่มีการต่อnearestnodeหรือปลอมว่าเชื่อมครบ
การฉายลงfloorเป็นgeometriccandidate ไม่ใช่การเลือกว่าENDต้องถ่ายแรงลงพื้นหรือการรับรองกำลังพื้น การกำหนดENDconnectionจริงยังต้องตรวจ

## หลักฐาน

- `output/staad-p7-p128/index.json`
- รายผลิตภัณฑ์ `*-joints.json`, `*-audit.json`
- `tools/modular-program/stage7-compatible-joints-p115.mjs` เพิ่มinput/outputargumentsและsourcePathโดยรักษาdefaultเดิม
- `tools/modular-program/verify-abd-joints-p128.mjs` ตรวจsourceownership/hash/คู่จุด/พิกัดfloorcandidate

Paircountคือการจับคู่mesh ไม่ใช่จำนวนbolt/anchor และไม่ใช่แรงต่อจุด ไม่มีการคำนวณกำลังรอยต่อ
ขั้น7/8ยัง5%ตามP105;fullanalysis0/48RC0/48. ขั้นถัดไปcompatiblefloorremeshและbeam-seatgeometry ก่อนชุดstudyconnections/nativeanalysis ไม่เริ่มStage8
