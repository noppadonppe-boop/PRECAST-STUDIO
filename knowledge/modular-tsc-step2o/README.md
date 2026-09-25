# TS-C Step 2O — เพิ่ม mesh ผนังใกล้ฐาน

S2O-R00 / BASE_PROFILE_REFINEMENT_STUDY_NOT_FOR_DESIGN

ดำเนินกรณี NB ตามแผน [Step2N](../modular-tsc-step2n/README.md). [basis.json](basis.json) ประกาศก่อนรัน; เปลี่ยนเฉพาะ3ช่องผนังแรกเหนือฐานแต่ละซีกจาก97เป็น24.25มม. ในช่วงZ=.175–.466ม. รวมwall36/arc48/roof24ต่อซีก,Y16,t8. ทั้งโมเดล27,648elements/127,009nodes/746,496Gauss points

การเพิ่มmeshไม่ใช่เพิ่มความหนาคอนกรีต: คง175มม., NC320trial E28,321.786532937494MPa,ν.2,ρ2400,g9.80665, exterior3×3ม.รวมพื้น,R.4,bay1.5. พื้นแยก/LP-A ไม่meshed. FULL SW+roofLL50kgf/m²ฉายแนวราบเท่านั้น ไม่มีfloorLL/finishes/แรงลม/แรงยก/handling/loadfactors. Non-prestressedเฉพาะtrial ไม่สรุปวัสดุหรือprestressผลิต

F-R: หน้าฐานUx/Uz=0และUy datumหนึ่งจุดกึ่งกลางแต่ละฐาน; crown bonded/shared nodesเต็มหน้าตัด,Yendsfree. ไม่เปลี่ยนฐานรองรับเพื่อให้ผลผ่าน; actualjoint/contact/supportยังไม่ออกแบบ

## วิธีตรวจ

ใช้20NodeBrick/OpenSees3.8.0ตามDLLhash/affinepatchเดิม. ใช้kernelเดิมและphysical-angle cut selectorเดิมโดยไม่แก้ประวัติ. Bodyload3³และroof3²consistent quadrature ไม่ใส่elementgravityซ้ำ. พิกัดnodesส่วนโค้งอยู่บนวงกลม แต่ผิวภายในelementเป็นquadratic approximation

- global equilibrium/FBD/energy≤10⁻⁶; physical mapping/volume≤10⁻⁵; Gauss reproduction≤10⁻⁶kPa; inverse mapping≤10⁻⁹m
- M1→NB ที่490พิกัดเดิม: point/RMS/spread≤5%ทุก6องค์ประกอบต่อกลุ่ม, floor10kPa; ไม่smoothข้ามหน้า
- 6cuts W-TOP/C22.5/C45/C67.5/R-START/CROWNที่พิกัดกายภาพจริง; สองtracesเทียบnodal referenceและpair≤5%, floors.1kN/.1kNm; quadrature4²→6²≤10⁻⁶
- Nodalcutหักconsistentloadเฉพาะselectedelementsที่cutnodesแล้ว; stress tractionไม่หักbodyloadซ้ำ. Momentsรอบoriginmiddepth,Y=.75
- Testsแยกคำนวณแรง/งาน/พิกัดcuts, ตรวจnestednodesและขนาดช่องwall, ตรวจlocalmetrics และอ่านstress/tractionด้วยfinite-difference shape derivatives

APIอ้างอิง: [Twenty Node Brick](https://openseespydoc.readthedocs.io/en/latest/src/20NodeBrick.html). เอกสารออนไลน์ไม่ใช่หลักฐานversionหรือstress-orderของDLLที่ใช้; ยึดruntimehashและaffine/Gauss recoveryจากชุดทดสอบ ไม่เปลี่ยนลำดับstressตามคำอธิบายเว็บโดยไม่ทดสอบ

## ผล NB

แรงหน้าตัดผ่านครบ6/6cuts; global equilibrium relative6.61×10⁻¹², energy/work1.35×10⁻¹¹ และGauss reproduction2.41×10⁻⁹kPa. การกระจัดสูงสุด0.1362422300มม. ปฏิกิริยาฐานLH Rx1.85714709kN,Rz25.91407778kN,My1.69589603kNm รอบจุด[.0875,.75,.175]ม.; RHมีแรงถ่าง/โมเมนต์กลับเครื่องหมายตามสมมาตร

ในคู่M1→NB ผ่านครบ3/4กลุ่มเฉพาะคู่: regular_interior/side_edge/crown_probe. ไม่ใช่การยืนยันการลู่เข้าทั้งโมเดล และไม่ปิดปัญหาarcจากKPT→M1 เพราะรอบนี้ไม่ได้refinearc

ฐานยังไม่ผ่าน: max point change59.8815%(nn), RMS31.3600%(nn), one-sided spread9.7181%(nn). ss/yy/snยังไม่ครบด้วย ส่วนsy/ynผ่านเฉพาะคู่. Point changeสูงสุดnnเกิดที่RH/BASE50/Y.75/F.9: M1=6.95021kPa→NB=.962055kPa ต่าง5.98815kPa หารfloor10kPa; ไม่ใช่การใช้กำลัง59.9%และไม่ใช่errorเทียบexact

SpreadnnสูงสุดลดจากM1 3.16440kPa(31.644%)เป็นNB .971812kPa(9.718%) แต่พิกัดสูงสุดย้ายจากRH/Y.75ไปLH/Y1.45 ที่BASE50/F.5. เปรียบเทียบนี้เป็นmaxของกลุ่ม ไม่ใช่จุดเดียวกัน. สอดคล้องว่าการแบ่งผนังใกล้ฐานมีผลต่อjumpที่วัดข้ามชั้นความหนา แต่ยังไม่พิสูจน์สาเหตุเดียว

ขั้นถัดไป: ตรวจYใกล้ขอบบนฐานNBเป็นกรณีแยก เนื่องจากspreadสูงสุดย้ายไปใกล้ขอบ; วางกรณีเพิ่มชั้นmeshความหนาแยกต่างหากและยังต้องมีarc refinementคู่ถัดไป. ต้องประกาศbasis/ทรัพยากรก่อนรัน ไม่เลือกชั้นเหล็กหรือจุดต่อจากผลนี้

## ไฟล์และการทำซ้ำ

[ผลคำนวณ](../../output/tsc-step2o-r00/base_profile_results.json) / [ภาพดาวน์โหลด](../../output/tsc-step2o-r00/TS-C-BASE-PROFILE-QA-S2O-R00.png) / [solver](../../tools/tsc-study/base_profile_study.py) / [tests](../../tools/tsc-study/base-profile-results.test.mjs)

Pythonruntimeเดิม `base_profile_study.py --reuse` ตรวจhashก่อนreuse; ตามด้วย `render_base_profile.mjs` โดยตั้งPM_SHARP_PATH. เก็บrawและผลเก่าคงเดิม. ไม่redistributeOpenSeesDLLหรือPDFมาตรฐาน

Skill `precast-modular-workflow` กำหนดให้ผลนี้เป็นdirectional study ไม่ใช่whole-model convergenceหรือcode strength approval. คงengineering_approval=false/manufacturing_release=false. ขั้นถัดไปต้องอาศัยผลจริง ไม่ตัดจุดไม่ผ่านหรือผ่อนเกณฑ์

ส่งมอบWEB-16พร้อมหน้าStep2OและPNGดาวน์โหลด1ภาพ รวม80ภาพ(52concept+28engineering). ทดสอบnumerical79+UI41+HTTP13=133รายการผ่าน; TypeScript/buildและR01snapshot162checksผ่าน; ตรวจPNGแล้ว. BuildมีคำเตือนJoint3DViewerเดิมเกิน500kB. ไม่มีbrowser visualQA/Firebaseจริง/deploymentหรือเปิดสาธารณะ
