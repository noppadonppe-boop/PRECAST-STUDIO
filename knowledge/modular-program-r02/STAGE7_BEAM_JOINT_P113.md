# P113 — I-C1 beam mesh และทะเบียน interface

2026-09-18; รอบก่อนprogressแก้ENDmesh. เป้าหมายยังครบขั้น7 ไม่ปิดด้วยไฟล์geometry
ใช้P112 shellgeometryและP108 axisที่ผู้ใช้อนุญาต. เพิ่มคาน250x400mm trialcentroidZ-200, ไม่ใช้continuoussoil
สร้าง216beam nodes/216beam elementsรวมความยาวแกน17m, closedloop node degree2 และsupport6จุดตรงพิกัดP108
แบ่งคานตามfoundationpositions, projectedseatstations และmaxspacing250mm ไม่เปลี่ยนจำนวนชิ้นคอนกรีตหรือจำนวนฐานเป็น216

ไฟล์:
- output/staad-p7-p113/PM-I-C1-BEAM-SHELL-GEOMETRY.STD
- output/staad-p7-p113/beam-joint-map.json
- tools/modular-program/stage7-beam-joint-map-p113.mjs

188nodeตำแหน่งเสนอรับแรงshell/floor มีprojectionและeccentricityครบ3แกน. จุดใกล้มุมอาจมีcandidateมากกว่า1คาน ต้องเลือกระบบกระจายแรง ไม่ลงแรงซ้ำทุกcandidate
864boundaryedgesจัดเป็นJO-BS,JO-BY,JO-CR,JO-FF,JO-END-BASE. ตัวเลขไม่ใช่จำนวนboltหรือconnectorผลิต
pairing/DOF/stiffness/capacityยังnull ไม่สร้างrigidlink/zero springแทนข้อมูลที่ยังไม่ออกแบบ
DOFsupportยังnull. ENDbaseอาจลงพื้นก่อน ไม่ผูกลงคานลัดทางอัตโนมัติ
รอยต่อnonmatchingmeshต้องมีinterpolation/compatiblemeshก่อนไม่ใช้nearestnodetieโดยไม่มีการตรวจ

ตรวจassertions: supportครบ6, length17m, memberlength>0<=250mm, closedloopทุกbeamnode, candidatebeamnodeมีอยู่จริง, IDbeamไม่ซ้ำกับplate
ยังต้องตรวจshortsegmentconditioning/offsetmappingและรายละเอียดบ่ารับ. โปรแกรมไม่ได้รันโมเดลนี้เพราะไม่มีmaterial/load/support/interfaceconditions
ขั้น7/8=5%; gate8ยังไม่ครบcoupling/QA/loads, อาคารวิเคราะห์0/48 RC0/48. engineering/productionfalse
