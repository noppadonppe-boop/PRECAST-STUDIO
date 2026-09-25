# TS-C Step 2H — quadratic-solid เต็ม bay

S2H-R00 / 16 กันยายน 2026 / `QUADRATIC_BAY_SENSITIVITY_NOT_FOR_DESIGN`

ต่อจาก [ชิ้นโค้ง Step2G](../modular-tsc-step2g/README.md) สู่ TS-C เต็ม bay โดยไม่แก้ผลเก่า [basis.json](basis.json) ระบุเงื่อนไขและเกณฑ์ก่อนรัน H1–H3; [followup.json](followup.json) ระบุ H4 เพิ่มหลังพบว่าเกณฑ์เฉพาะที่ยังไม่ครบ **เกณฑ์เดิมไม่เปลี่ยน และเก็บรายงาน 6 runs แรกไว้**

## ขอบเขต

- ภายนอกกว้าง3.00 × สูง3.00ม. รวมพื้น / bay1.50ม. / Rภายนอก.40ม. / ทึบไม่มีช่องเปิด
- t175มม. เท่านั้น เป็นกรณีเปรียบเทียบ ไม่ใช่การเลือกความหนาผลิต; พื้นไม่ meshed ฐานผนัง Z=.175ม. แรงลงฐานแยกโดยตรง LP-A
- NC320 trial: E=28,321.786532937494MPa, ν=.20, ρ=2400kg/m³, g=9.80665m/s²; isotropic linear-uncracked ไม่มี prestress เฉพาะการศึกษา ไม่มีการเลือกเหล็กหรือวัสดุจริง
- น้ำหนักตัวเต็มทั้งสองซีก + Roof LL50kgf/m²=.4903325kN/m² บน **พื้นที่ฉายแนวราบภายนอก**; FULL เต็มหลังคา และ LEFT เฉพาะ LL ครึ่งซ้าย น้ำหนักตัวไม่ลดครึ่ง ไม่คูณ load factors
- ฐานเหมือน F-R limit เดิม: Ux=Uz=0 ทั้งหน้าฐานแต่ละด้าน; Uy=0 เพียง datum กึ่งกลางความหนา/ความกว้างหนึ่งจุดต่อฐาน ไม่ใช่ plane strain
- Y=0/1.50ม. อิสระ; crown shared nodes ทั้งความหนา เป็น bonded-continuum limit ไม่ใช่รอยต่อกลศาสตร์/bolt/contact ที่ออกแบบหรือทดสอบแล้ว

ไม่มี finishes/floor load/ช่องเปิด/ร้าว/creep/ฐานรากจริง/รอยต่อจริง/โมดูลข้างเคียง/ลม/แรงยก/แผ่นดินไหว/สภาวะยกขนส่ง และไม่ได้ตรวจ code strength/crack/serviceability จึงไม่รับรองเสถียรภาพหรือความปลอดภัยอาคารจากรอบนี้

## แบบจำลองและโหลด

OpenSees3.8.0 `20NodeBrick`, SuperLU/Plain, 3 displacement DOF/node; ตรวจ affine patch, solver DLL hash และ ordering ผ่าน helper ที่ตรวจใน Step2F/2G ไม่ใช้ stress-order จากเอกสารเก่าแทน runtime ที่ตรวจแล้ว

Natural axes ξตามแนวprofile LH→crown→RH, η=+Y, ζจากผิวในออกนอก. Midside ตามแนวโค้งอยู่บนวงกลม แต่ผิวระหว่าง node เป็น quadratic approximation ไม่ใช่วงกลม exact

| Mesh | targetส่วนตรง (ม.) | จำนวนแบ่งมุม90° | ชั้นตามความหนา | แบ่งตามY | Elements | Nodes |
|---|---:|---:|---:|---:|---:|---:|
| H1 | .30 | 8 | 2 | 6 | 504 | 3,161 |
| H2 | .20 | 12 | 3 | 8 | 1,488 | 8,217 |
| H3 | .15 | 16 | 4 | 10 | 3,280 | 16,877 |
| H4 follow-up | .10 | 24 | 6 | 16 | 11,520 | 54,573 |

รวม8 runs / 48subbody cuts / 3,920พิกัดตรวจ / ตรวจ Gauss906,768จุด ไม่มีการแก้ upstream S2D–S2G

น้ำหนักตัวเป็น explicit consistent nodal loads `∫Nᵀρg detJ dξdηdζ` ด้วย3×3×3 integration. หลังคาใช้ `∫Nᵀq |X,ξY,η−X,ηY,ξ| dξdη` บนผิวนอก3×3 ไม่คูณพื้นที่ผิวโค้งซ้ำ ไม่มี body-force/mass-gravity อีกชุด

Shape functions แบบ serendipity อาจให้ equivalent nodal coefficients ติดลบ เป็นผลการแทน distributed load ไม่ได้หมายถึงมีแรงดันขึ้นจริงที่คอนกรีต ตรวจแรงรวมและโมเมนต์กับปริมาตร/centroidวงกลมจาก analytic geometry แยกต่างหาก

H4 ปริมาตร≈2.108333763m³; relative volume error≈4.672×10⁻⁹. ตัวเลขนี้เป็นความคลาดเคลื่อน geometry integration ไม่ใช่ tolerance การหล่อ

## FBD และแรงฐานจริงของกรณีศึกษา

หน่วย kN และ kN·m; แกน global Xขวา/Yตามbay/Zขึ้น; Myของฐานอ้างอิงกึ่งกลางฐานแต่ละด้าน (X=t/2 หรือ3−t/2,Y=.75,Z=.175)

| H4 | แรงลงรวม | LH Rx | LH Rz | LH My | RH Rx | RH Rz | RH My |
|---|---:|---:|---:|---:|---:|---:|---:|
| FULL | 51.828155 | 1.857484 | 25.914078 | 1.696629 | −1.857484 | 25.914078 | −1.696629 |
| LEFT | 50.724907 | 1.759797 | 25.665291 | 1.593343 | −1.759797 | 25.059616 | −1.621424 |

FULL มีน้ำหนักตัว≈49.621659kN + LL2.206496kN. แม้โหลดลงแนวดิ่งยังมีแรงแนวนอนที่ฐาน; ไม่ถือสมดุลแนวดิ่งเพียงอย่างเดียวเป็นการตรวจครบ

แนวตัด W-TOP/C22.5/C45/C67.5/R-START/CROWN ใช้ resultant ของ resisting nodal forces จาก element ฝั่งล่าง LH **ลบ consistent nodal load ของ selected elements ที่แนวตัด** แล้วรวม r×F. เทียบสมดุลส่วนย่อยและคู่ action/reaction ทั้ง6องค์ประกอบ ไม่แบ่งค่าให้ bolt ตามจำนวนสมมติ

สมการตรวจ `Fcut + Rbase + Wsubbody = 0` และ `Fcut + Fopposite = 0`; numerical FBD ใช้ mapped load ส่วน exact circular physical load แสดงแยกพร้อม mapping error. Myแต่ละ cut อ้างอิงกึ่งกลางแนวตัดนั้น ไม่ใช้ origin ของฐานปะปน

ตัวอย่าง crown force บน LH: FULL Fx≈−1.857484kN,Fz≈0,My≈−3.532843kN·m; LEFT Fx≈−1.759797kN,Fz≈+0.248786kN,My≈−3.345565kN·m. อีกซีกได้แรงตรงข้าม ค่าเหล่านี้ **ไม่ใช่แรงออกแบบรอยต่อจริงที่อนุมัติ**

## ผลการเพิ่มความละเอียด

| H3→H4 | เปลี่ยนขนาดการเคลื่อนตัวสูงสุด | แรงฐานที่ตรวจ | แรงแนวตัดที่ตรวจ | พลังงาน |
|---|---:|---:|---:|---:|
| FULL | .033764% | .059398% | .053117% | .027240% |
| LEFT | .033733% | .059852% | .058180% | .027135% |

เข้าเกณฑ์ตัวเลขเฉพาะผลรวมที่ตรวจทั้ง2กรณี: displacement≤5%, reaction≤2%, cut≤5%, energy≤2%. Reaction/cut convergence table ใช้ Fx,Fz,My ที่มีนัยในโจทย์นี้; ส่วน equilibrium/FBD ตรวจทั้ง6องค์ประกอบ ไม่เรียกตารางนี้ว่าการลู่เข้าทุก DOF

H4 |u|max≈.136227mm(FULL),.129190mm(LEFT); crown Uz≈−.129753และ−.123033mm ตามลำดับ. **ค่าการโก่งน้อยไม่ใช่หลักฐานว่าปลอดภัยหรือผ่าน serviceability** เพราะยังเป็นแบบจำลองคอนกรีตไม่ร้าวและฐาน/crown อุดมคติ

Crown Uz ต่างจาก stdBrick D3 เดิม≈+3.005%/3.002% ในอัตราส่วน signed displacement. Geometry/load interpolation ต่างกันด้วย จึงไม่ใช่การแยกผล element formulation อย่างเดียว และ stdBrick เดิมไม่ใช่คำตอบ exact

## ความเค้นเฉพาะที่ยังไม่เข้าเกณฑ์ครบ

ใช้490พิกัดกายภาพเดิมของ S2E ต่อrun: สองซีก×7stations×7Y×5f. เก็บทุกone-sided value,min/max/mean และ local axes s/y/n เดิม. sต่อเนื่องตามprofileจากฐานLHขึ้นและลงฐานRH, y=+Y,n=s×yออกนอก; local stress order `[ss,yy,nn,sy,sn,yn]`, tensionบวก หน่วยkPa. ไม่ extrapolateถึงผิว ไม่ทำsmoothed field

เกณฑ์เดิมทั้ง point/RMS/spread≤5%ครบ6องค์ประกอบ; normalization floor10kPa. ผล H3→H4:

| กลุ่ม | FULL max point | FULL max spread | LEFT max point | LEFT max spread | ครบ6องค์ประกอบ |
|---|---:|---:|---:|---:|---|
| ภายในทั่วไป | 10.604% | 3.583% | 10.093% | 3.398% | ยังไม่ครบ |
| ใกล้ขอบด้านข้าง | 27.830% | 3.900% | 26.400% | 3.699% | ยังไม่ครบ |
| ใกล้ฐาน50mm | 147.402% | 42.036% | 141.440% | 40.257% | ยังไม่ครบ |
| ใกล้crown50mm | 12.435% | 1.202% | 11.845% | 1.345% | ยังไม่ครบ |

รวม0/8กลุ่มเข้าเกณฑ์ทั้งหมด แม้บางองค์ประกอบผ่านและ spread นอกฐานลดต่ำกว่า5%. ผลฐานบางตัวไม่ได้ดีขึ้นแบบ monotonic; ไม่เลือกแสดงเฉพาะค่าที่ดีขึ้นและไม่ลดเกณฑ์หลังเห็นผล

ตัวอย่างFULL:

- ภายในทั่วไป σss จุด RH/C22.5/Y.30/F.50 ต่าง1.0604kPa =10.604% เมื่อหาร floor10kPa ไม่ใช่อัตราใช้กำลังคอนกรีต
- ใกล้ฐาน σnn จุด LH/BASE50/Y.75/F.90 ต่าง14.7402kPa =147.402% เมื่อหาร floor10kPa
- ใกล้crown ตัวที่ยังไม่ครบคือτyn; point change12.435%, RMS6.864% ไม่ได้หมายความว่าทุกองค์ประกอบแย่เท่ากัน

จุดตรวจเหล่านี้ไม่ได้อยู่บนผิวคอนกรีต/support edge พอดี และไม่ใช่ peak envelope ทั้งโมเดล **ยังแยกไม่ได้เด็ดขาด** ว่าความไวแต่ละจุดเกิดจาก mesh, load interpolation, boundary layer หรือ support idealization มากเพียงใด ห้ามสรุปว่าเป็น singularity แล้วละทิ้งโดยไม่ตรวจ

## การตรวจที่ทำแล้ว / ที่ยังไม่ทำ

ทำแล้ว: positive Jacobian, affine patch, independently summed load/resultants, exact circular volume/first moments, equilibrium, energy/work, cut FBD/action-reaction, ทุกGauss stress recovery, common-point inverse mapping, one-sided spread, FULL mirror symmetry และ numerical/HTTP/UI regression tests

Gauss recovery สูงสุด≈1.382×10⁻⁹kPa และสมดุลรวมสูงสุด≈1.10×10⁻¹¹(relative) เป็นการตรวจ implementation/equilibrium ไม่ใช่ความคลาดเคลื่อนเทียบ exact solution ของโมดูล. Tests ยังตรวจ derivative ของ shape functions ด้วย finite difference แยกจาก implementation หลัก ณตัวอย่างจุด/element

ยังไม่ทำ: independent exact/full-bay reference, stress-traction section integral validation ครบชุด, local convergenceทุกตำแหน่ง, physical joint/support calibration, material nonlinear/cracking และcode design. การผ่าน software tests รวมการยืนยันว่า engineering QA ยังไม่ครบ ไม่ได้อนุมัติแบบ

## ขั้นถัดไปที่ถูกต้อง

1. คงโหลดและBCเดิมก่อน ใช้ local/nonuniform mesh ใกล้ฐาน/ขอบY/ช่วงต่อผนัง–โค้ง เพื่อแยก discretization จากการเปลี่ยนรูปแบบฐาน ไม่เพิ่มละเอียดทั้งโมเดลอย่างเดียว
2. ตรวจ stress-traction integration ผ่านหน้าตัดเทียบกับ nodal cut resultants พร้อมทั้งสองด้านของแนวตัด; เก็บ absolute kPa และ normalized metrics คู่กัน
3. แยก support/edge sensitivity ภายใต้สมมติฐานที่ประกาศชัด จากนั้นจึงพิจารณา idealization ของ joint ที่สอดคล้องกับรายละเอียดจริง ไม่เลือก spring stiffness หรือจำนวนboltโดยเดา
4. เมื่อหลักฐานพอแล้วจึงกลับไปเปรียบเทียบความหนา/ช่องเปิด/วัสดุและ Step3 ตามมาตรฐาน โดยผู้รับผิดชอบตรวจ

ตาม skill `precast-modular-workflow` คง `whole_model_local_stress_convergence=NOT_ESTABLISHED`, `engineering_approval=false`, `manufacturing_release=false` ไม่ใช้ผลชิ้นทดสอบ S2G หรือการผ่านสมดุลเปิด Step3/4 อัตโนมัติ

## ไฟล์

- [รายงาน6runsแรก](../../output/tsc-step2h-r00/quadratic_bay_results.json) / [รายงานรวม8runsและH4](../../output/tsc-step2h-r00/quadratic_bay_followup.json)
- [Solver script](../../tools/tsc-study/quadratic_bay_study.py) / [Follow-up script](../../tools/tsc-study/quadratic_bay_followup.py) / [Evidence tests](../../tools/tsc-study/quadratic-bay-results.test.mjs)
- [FBD PNG](../../output/tsc-step2h-r00/TS-C-QBAY-FBD-S2H-R00.png) / [Stress/QA PNG](../../output/tsc-step2h-r00/TS-C-QBAY-QA-S2H-R00.png)
- [OpenSees3.8.0 element source](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/element/brick/Twenty_Node_Brick.cpp) / [eleForce documentation](https://openseespydoc.readthedocs.io/en/latest/src/eleForce.html)

Raw8ไฟล์เก็บ geometry,displacement,loads,reactions,elementforces,Gauss และsamples; มีSHA-256 ต้นทาง/helper/runtime. Solverใช้เฉพาะinternal study ไม่แจกจ่ายsolverหรือPDFมาตรฐานผ่านเว็บ ภาพสร้างจากข้อมูลคำนวณ ไม่ใช้ภาพAIแทนผลวิเคราะห์
