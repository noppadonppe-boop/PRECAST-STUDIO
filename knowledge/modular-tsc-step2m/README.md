# TS-C Step 2M — เพิ่มความละเอียดส่วนโค้งและกลางหลังคา

S2M-R00 / ARC_CROWN_REFINEMENT_STUDY_NOT_FOR_DESIGN

ต่อจาก [Step2L](../modular-tsc-step2l/README.md) ที่KPTยังผ่านtraction2/6cuts เพิ่มหนึ่งrun M1ตาม [basis.json](basis.json) ซึ่งประกาศก่อนรัน คงcriteriaเดิม ไม่เปลี่ยนความหนาคอนกรีตหรือเลือกแบบผลิต

## ชุดเปรียบเทียบ

| Mesh | Wall/arc/roof ต่อซีก | Y cells | ชั้นความหนา | Elements |
|---|---|---|---|---|
| KPT เดิม | 27/32/22 | 16 | 8 | 20,736 |
| M1 ใหม่ | 27/48/24 | 16 | 8 | 25,344 |

จากKPT แบ่ง16ช่องหยาบภายในส่วนโค้งเป็นสองต่อช่อง ได้48ช่องสม่ำเสมอช่องละ1.875°. อีก8+8ช่องละเอียดใกล้ปลายโค้งคงเดิม. หลังคาตรงเดิม22ช่อง×50มม. แบ่งสองช่องสุดท้ายติดcrownเป็น4ช่อง×25มม. ได้24ช่องต่อซีก ส่วนผนัง27,Y16และt8ไม่เปลี่ยน. Mirrorสองซีกและshared nodes ไม่มีhanging nodes

นี่เป็นการตรวจเพิ่มprofileอย่างเจาะจงหนึ่งคู่ ไม่ใช่uniform all-axis convergence. ไม่เพิ่มbase/YgradingแบบIBY และไม่เปลี่ยนสภาพรองรับเพื่อทำให้ผลผ่าน

## กรณีศึกษาที่คงเดิม

TS-C/S00นอก3×3ม.รวมพื้น, R.40,bay1.50, คอนกรีต175มม. Floorแยกไม่meshed/LP-A. NC320trial E28,321.786532937494MPa,ν.2,ρ2400kg/m³,g9.80665; linear isotropic uncracked; ไม่มีprestressเฉพาะtrialไม่ยกเลิกทางเลือกผลิต

F-R: Ux/Uz=0ทั้งหน้าฐาน,Uy datumหนึ่งจุดกลางต่อฐาน; crown shared nodesเต็มความหนา/bonded limit; freeY. FULL self-weightทั้งสองซีก+roofLL50kgf/m²บนouterhorizontalprojection. Explicit consistent body3³/roof3² ไม่ใส่elementgravityซ้ำ. ไม่มีfloorLL/finishes/loadfactors/ลม/แรงยก/handlingในกรณีนี้

20NodeBrick/OpenSees3.8.0 ใช้kernelเดิมไม่แก้ ผ่านfunction globalsที่แยกbuilder/cuts/output. เช็กDLLhashและpatchทุกครั้ง; geometry guardจำกัด3×3/R.4/bay1.5/t175ก่อนใช้selector. Exact-circle nodal positions แต่ผิวelementเป็นquadratic approximation ไม่ใช่วงกลมexactทุกจุด

## การตรวจ

- เกณฑ์เดิม S2H: equilibrium/FBD/energy≤10⁻⁶relative,volume/loadmapping≤10⁻⁵,Gauss recovery≤10⁻⁶kPa,inverse mapping≤10⁻⁹m
- S2E490physicalpoints,local s/y/n,one-sidedvaluesครบ6องค์ประกอบ; point/RMS/spread≤5%,floor10kPa. ผ่านเฉพาะกลุ่มหนึ่งไม่ใช่ผ่านทั้งโมเดล
- Cuts W-TOP/C22.5/C45/C67.5/R-START/CROWNเลือกจากพิกัดมุมจริงแบบS2L ไม่ใช้สัดส่วนจำนวนแถว; originmid-thickness,Y.75
- Nodal resisting forcesหักselectedelementconsistentloadsณcut; traction=∫σn dA และmoments=∫(x−origin)×σn dA. ไม่หักbodyloadซ้ำจากstress และไม่เฉลี่ยสองtraces
- Trace/referenceทั้งสองด้านและtrace-pair≤5%ครบ6องค์ประกอบ, floor.1kN/.1kN·m; quadrature4²→6²≤10⁻⁶relative. เปอร์เซ็นต์ไม่ใช่อัตราใช้กำลัง/น้ำหนักอาคาร
- Testsตรวจnestedcoordinates/จำนวนช่อง,แรงและพลังงานจากraw,physicalcuts,490จุด/criteria,finite-difference displacementgradientsและsurfaceintegrationแยกจากanalyticderivativesในPython

## หลักฐานและขอบเขต

## ผลรอบ M1 และการส่งมอบ

M1 มี25,344elements / 116,461nodes / 684,288Gauss points; การกระจัดสูงสุด0.1362342498มม. และการอ่านความเค้นกลับที่Gaussต่างสูงสุด2.4194×10⁻⁹kPa. เกณฑ์แรงจากความเค้นทั้งสองด้านเทียบnodal referenceและสมดุลระหว่างด้านผ่านครบ6/6cuts จากKPT2/6 โดยไม่เปลี่ยนเกณฑ์5%หรือBC

ที่CROWN แรงFzด้านlowerประมาณ−0.0007202kN และผลรวมสองด้าน−0.0014403kN เทียบKPT−0.0056643/−0.0113286kN. ผลรวมใกล้ศูนย์ไม่ใช่หลักฐานว่าความเค้นทุกจุดถูกต้อง

ความเค้น490พิกัดร่วม KPT→M1 ผ่านครบเฉพาะcrown_probe (1/4กลุ่ม). regular_interiorและside_edgeยังมีpoint changeสูงสุด8.128%/8.125%; base_probeมีspread31.644%. จึงคงwhole-model local stress convergence=NOT_ESTABLISHED

WEB-14เพิ่มหน้าStep2MและPNGดาวน์โหลด1ภาพ รวม78ภาพ(52concept+26engineering). numerical69+UI37+HTTP13=119testsผ่าน; TypeScript/buildและR01snapshot162checksผ่าน; ตรวจภาพPNGแล้ว. BuildมีคำเตือนJoint3DViewerเดิมเกิน500kB ไม่ใช่build failure. ยังไม่ได้browser visual QA/Firebaseจริง/deployment

ขั้นถัดไป: แยกตรวจความเค้นภายใน/ขอบและฐานด้วยmesh refinementที่ประกาศล่วงหน้า โดยคงพิกัดอ่านผล/เกณฑ์เดิม และพิจารณาผลจากเงื่อนไขรองรับอย่างแยกกรณี ไม่ลบจุดที่ไม่ผ่านเพื่อประกาศconvergence. หลังฐานตัวเลขเพียงพอจึงศึกษาจุดต่อจริง/แรงด้านข้าง/การยกประกอบและตรวจมาตรฐานก่อนStep3; ไม่เริ่มแบบผลิตจากผลรอบนี้

[ผลคำนวณ](../../output/tsc-step2m-r00/arc_crown_results.json) / [solver](../../tools/tsc-study/arc_crown_study.py) / [tests](../../tools/tsc-study/arc-crown-results.test.mjs) / [ภาพดาวน์โหลด](../../output/tsc-step2m-r00/TS-C-ARC-CROWN-QA-S2M-R00.png)

ทำซ้ำด้วยPythonruntimeเดิม `arc_crown_study.py --reuse` ตรวจhashก่อนreuse → `render_arc_crown.mjs` ตั้งPM_SHARP_PATH. ไม่มีexternalcompute/deployment; solverใช้ภายในตามlicense ไม่เผยแพร่solverหรือPDFมาตรฐาน

อ้างอิง API: [OpenSees eleForce](https://openseespydoc.readthedocs.io/en/latest/src/eleForce.html) ระบุelemental resisting force; ตรวจเอกสารอีกครั้งในรอบนี้. Runtime3.8.0ยืนยันจากDLLhash/patch ไม่อนุมานversionจากเว็บ. งานนี้ไม่มีสูตรกำลังตาม วสท./ACI

ตาม skill `precast-modular-workflow` คง`whole_model_local_stress_convergence=NOT_ESTABLISHED`, `engineering_approval=false`, `manufacturing_release=false`. ไม่มีexact full-baysolution,actualjoint/contact/cracking/openings/lateral/handling/code strength. การผ่านcutเฉพาะที่ไม่อนุมัติเหล็กหรือแม่แบบผลิต
