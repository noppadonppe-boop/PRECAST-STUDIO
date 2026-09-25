# TS-C Step 2L — ผลร่วม profile + thickness mesh

S2L-R00 / COMBINED_PROFILE_THICKNESS_STUDY_NOT_FOR_DESIGN

ต่อจาก [Step2K](../modular-tsc-step2k/README.md) ปิดชุดเปรียบเทียบสองปัจจัย H4/KP/KT/KPT โดยเพิ่ม **หนึ่ง full-bay solve**. ประกาศ [basis.json](basis.json) ก่อนรัน ไม่ใช่เปลี่ยนความหนาคอนกรีตหรือเลือกแบบผลิต

| Mesh | Profile ผนัง/โค้ง/หลังคา ต่อซีก | Y cells | ชั้นความหนา | บทบาท |
|---|---|---|---|---|
| H4 | 25/24/11 | 16 | 6 | ประวัติ control |
| KP | 27/32/22 | 16 | 6 | เพิ่มprofileเฉพาะแนวที่กำหนด |
| KT | 25/24/11 | 16 | 8 | เพิ่มชั้นความหนาอย่างเดียว |
| KPT | 27/32/22 | 16 | 8 | ผลร่วมใหม่;20,736elements |

คู่ตรวจใหม่ KP→KPT แยกผลเพิ่มชั้น6→8บนprofileที่ละเอียดขึ้น; KT→KPT แยกผลเพิ่มprofileบนชั้น8. ไม่เรียกการเปรียบเทียบนี้ว่าuniform all-direction convergence และไม่ถือว่าall-arc/base/Yละเอียดขึ้นแล้ว. การเพิ่ม interior arc/base/Y หรือทดสอบสภาพรองรับจริงต้องเป็นcaseอื่น ไม่ปะปนกับการทดสอบผลร่วมนี้

## สิ่งที่คงเดิม

TS-C/S00ภายนอก3×3ม.รวมพื้น, Rนอก.40, bay1.50, ความหนา175มม.ทุกcase; floorแยกไม่meshed/LP-A. NC320trial E28,321.786532937494MPa,ν.2,ρ2400kg/m³, g9.80665. Linear isotropic uncracked; prestressไม่มีเฉพาะtrialนี้ ไม่ยกเลิกทางเลือกอนาคต

F-RฐานUx/Uz=0ทั้งหน้า, Uy datumหนึ่งจุดกลางฐานแต่ละข้าง; crown shared nodesเต็มความหนา/bonded limit; free-Y. FULL self-weightทั้งสองซีก + roofLL50kgf/m²บนouter horizontal projection; explicit consistent body3³/roof3² ไม่มีbodyforceซ้ำ ไม่มีfloorLL/finishes/lateral/handling/loadfactorsในกรณีนี้

ใช้20NodeBrick OpenSees3.8.0พร้อมตรวจDLLhash/patch. Helperเดิมไม่แก้ ใช้function globalsแยกสำหรับmesh/output/cut selector. Solverใช้localภายในตามlicense ไม่เผยแพร่solverหรือมาตรฐานPDF

## แนวตัดและเกณฑ์

แก้ตั้งแต่ก่อนบันทึกraw: เลือก0/22.5/45/67.5/90องศาจากพิกัดกายภาพและcrown ไม่ใช้สัดส่วนจำนวนช่องบนnonuniform arc. ตรวจระยะคลาดพิกัด≤10⁻¹⁰ม. และaffine traction patch12traces; testsตรวจoriginอิสระอีกครั้ง. ข้อจำกัด175/R.4/3mฝังในselectorนี้และผูกbasis/hash ไม่ใช้กับgeometryอื่นโดยไม่แก้/ตรวจ

Nodal cut=sum(element resisting forces−selected element consistent nodal loadsที่cut). Stress traction=∫σn dA และmoment=∫(x−origin)×σn dA; **ไม่ลบbodyforceจากstressซ้ำ**. Lower/upperมีoutwardnormalตรงข้ามและoriginเดียวกัน ณกึ่งกลางความหนา,Y=.75. หน่วยkN/kN·m ไม่ใช่แรงต่อเมตรหรือแรงต่อbolt. ไม่smoothหรือเฉลี่ย2tracesให้สมดุล

เกณฑ์เดิมS2H equilibrium/FBD/energy≤10⁻⁶relative, mapping/volume≤10⁻⁵, Gauss recovery≤10⁻⁶kPa, inverse residual≤10⁻⁹m. S2E490พิกัดและlocal s/y/nครบ6องค์ประกอบ: point/RMS/spread≤5%,floor10kPa. S2Itrace/nodalและtracepair≤5%,floor.1kN/.1kNm; quadrature4²→6²≤10⁻⁶relative. ทั้งหมดเป็นnumerical targets ไม่ใช่strength/serviceabilitycode checks

## หลักฐานและการทำซ้ำ

### ผลคำนวณจริง

KPTมี95,365nodes,20,736elements,559,872Gauss points; |u|max=.13623418796มม. LHฐาน Rx=1.857439317kN,Rz=25.914077712kN,My=1.696553715kN·m. ค่าเหล่านี้เป็นunfactored trial ไม่ใช่serviceability/strength acceptance

ผ่านเกณฑ์cuttractionครบ6องค์ประกอบเพียง **W-TOP และ R-START =2/6** เท่าKP. Crown lower Fz=−.00566430477kN; pair=−.01132860943kN เทียบKP pair=−.01138402857kN. เพิ่มชั้น6→8ช่วยเพียงเล็กน้อยในปริมาณนี้; normalizedpairยัง11.329%เกิน5%เพราะfloor.1kN ไม่ใช่11.329%ของน้ำหนักอาคาร

| KPT cut | max lower/nodal | max upper/nodal | max trace-pair | ผ่านทั้งหมด |
|---|---:|---:|---:|---|
| W-TOP | 4.838% | .654% | 4.777% | เฉพาะnumericalcut |
| C22.5 | 5.926% | 6.647% | .721% | ไม่ครบ |
| C45 | 9.716% | 9.801% | .183% | ไม่ครบ |
| C67.5 | 8.528% | 7.968% | .560% | ไม่ครบ |
| R-START | .767% | 3.332% | 3.424% | เฉพาะnumericalcut |
| CROWN | 5.664% | 5.664% | 11.329% | ไม่ครบ |

ข้อสำคัญ: ที่C22.5/C45/C67.5 สองtraceเกือบสมดุลกัน แต่แต่ละtraceยังต่างจากnodal referenceเกินเกณฑ์ จึงห้ามใช้เพียงผลรวมสองฝั่งใกล้ศูนย์แล้วประกาศผ่าน

คู่KP→KPT maxpointทั่วไป/ขอบ/ฐาน/crown=8.155/8.074/34.073/.436%; คู่KT→KPT=12.010/12.326/.004/1.380%. ทั้งสองคู่ผ่านครบpoint/RMS/spreadเฉพาะcrown รวม2/8pair-groups. KPTbase spread31.644%ยังไม่ผ่านและยังไม่ได้ใช้base/YgradingของIBY

Globalequilibrium9.451×10⁻¹²relative, energy/work2.539×10⁻¹¹relative, Gaussreproduction2.397×10⁻⁹kPa; quadraturechangeสูงสุด2.188×10⁻¹¹relative. Testsตรวจsampled FE gradients/tractionsด้วยfinite-difference shape derivativesแยกจากPythonanalytic derivatives ไม่ใช่ดูsolver exitเพียงอย่างเดียว

ผลที่รองรับ: การรวมKPและKTยังไม่แก้ส่วนที่ไม่ผ่านทั้งหมด จึงไม่ควรเพิ่มเฉพาะชั้นความหนาแล้วคาดว่าหน้าตัดทุกส่วนจะดีขึ้น ต้องแยกทดสอบinteriorarc/crownและbase/Yต่อโดยมีเป้าหมายชัด ไม่มีข้อสรุปว่ารูปทรงใช้ไม่ได้หรือ175มม.ปลอดภัยแล้ว

### งานที่ยังไม่ทำและลำดับถัดไป

1. Interiorarcและcrown: คงt8/Y16/BCเดิม เพิ่มprofileที่ยังหยาบ ตรวจ6cutsทั้งtrace/referenceและtrace-pair ไม่เพิ่มชั้นหนาอย่างเดียวซ้ำรอบนี้
2. Base/Y: นำgradingที่มีหลักฐานS2Iกลับมาผูกกับmeshใหม่อย่างควบคุม ตรวจ490พิกัดและone-sidedspread ไม่รวมผลจากคนละmeshเป็นcaseเดียว
3. เมื่อความแม่นยำเฉพาะที่เพียงพอจึงแยกsupport/contact/joint model sensitivity โดยใช้ข้อมูลที่มีที่มา และขยายthickness/LEFT/openings/โหลดอื่นก่อนStep3

### QAส่งมอบ

Numerical/evidence64tests (ใหม่4)+UI35+HTTP/security13 รวม112ผ่าน; TypeScript/buildและR01snapshot162checksผ่าน. [ภาพสรุปดาวน์โหลด](../../output/tsc-step2l-r00/TS-C-COMBINED-QA-S2L-R00.png) ตรวจด้วยตาแล้ว1แผ่น. เว็บWEB-13เพิ่มStep2Lและprotecteddownload รวม77PNG(52concept+25engineering)

ยังไม่ทำbrowser visual QA/Firebase identityจริงหรือdeployment; warningเดิมJoint3DViewerchunk>500kBไม่ทำให้buildล้มเหลว. Testsเป็นsoftware/numericalchecks ไม่ใช่การรับรองอาคาร

[combined_mesh_results.json](../../output/tsc-step2l-r00/combined_mesh_results.json) / [solver](../../tools/tsc-study/combined_mesh_study.py) / [independent tests](../../tools/tsc-study/combined-mesh-results.test.mjs)

Python runtimeเดิม `combined_mesh_study.py --reuse` ตรวจhashทั้งหมดก่อนreuse → `render_combined_mesh.mjs` ตั้งPM_SHARP_PATH. Rawเก็บloads/elementforces/reactions/displacements/Gauss/490samplesและcutsที่ตำแหน่งจริง. เว็บส่งเฉพาะsummary ไม่ส่งrawmesh/face contributions

อ้างอิงวิธีอ่านแรง: [OpenSees eleForce](https://openseespydoc.readthedocs.io/en/latest/src/eleForce.html) ระบุelemental resisting forces; ตรวจเอกสารในรอบนี้. Runtimeจริงตรวจ3.8.0จากsolver/hash ไม่อนุมานจากเลขversionบนเว็บ. ไม่มีการใช้สูตรกำลังตาม วสท./ACI ในงานนี้

## ขอบเขตส่งต่อ

ตาม skill `precast-modular-workflow` คง `whole_model_local_stress_convergence=NOT_ESTABLISHED`, `engineering_approval=false`, `manufacturing_release=false`. ไม่เริ่มเลือกเหล็ก/boltหรือปล่อยแม่แบบจากการที่solverจบ. ยังไม่มีexact full-bayreference, cracking/contact/actualjoint, openings, wind/uplift/seismicหรือhandling
