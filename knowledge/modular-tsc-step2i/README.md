# TS-C Step 2I — directional mesh และ stress-traction audit

S2I-R00 / 16 กันยายน 2026 / `LOCAL_MESH_AND_TRACTION_DIAGNOSTIC_NOT_FOR_DESIGN`

ต่อจาก [Step2H](../modular-tsc-step2h/README.md) โดยคงผลเก่าและเงื่อนไขเดิมทั้งหมด เปลี่ยนเฉพาะการแบ่ง mesh ตาม [basis.json](basis.json) ที่ประกาศก่อนรัน เพื่อแยกผลความละเอียดใกล้ฐานกับขอบตามยาว ไม่ปะปนกับการเปลี่ยนรูปแบบฐานหรือรอยต่อ

## ขอบเขตและสิ่งที่คงเดิม

- TS-C ทึบ ภายนอก3×3ม. รวมพื้น, bay1.50ม., outer R.40ม., t175มม. เป็นกรณีศึกษา ไม่ใช่ความหนาผลิต
- NC320 trial: E=28,321.786532937494MPa, ν=.20, ρ=2400kg/m³; elastic isotropic uncracked; ไม่มี prestress เฉพาะกรณีศึกษานี้
- น้ำหนักตัวเต็มทั้งสองซีก + Roof LL50kgf/m² บนพื้นที่ฉายแนวราบ; ไม่คูณ load factors; พื้นแยกและไม่ meshed / LP-A
- ฐาน Ux=Uz=0 ทั้งหน้า และ Uy=0 เฉพาะ datum กึ่งกลางหนึ่งจุดต่อฐาน; ขอบY=0/1.50ม.อิสระ; crown shared nodes เต็มความหนา เป็น bonded limit ไม่ใช่ joint detail จริง
- OpenSees3.8.0 `20NodeBrick`; exact-circle midside locations แต่ผิว element เป็น quadratic approximation; consistent body load3³ และ roof projected load3² เหมือน Step2H
- ไม่มีการออกแบบเหล็ก สลักเกลียว รอยต่อ ฐานราก ช่องเปิด การร้าว ลม แรงยก ยกขนส่ง ประกอบ หรือกำลังตามมาตรฐาน

## การแบ่ง mesh แบบควบคุมทิศทาง

| ชุด | ส่วนที่ต่างจาก H4 | Elements | Nodes |
|---|---|---:|---:|
| H4 เดิม | wall25 / arc24 / flat roof11 ต่อซีก; Y16 / t6 | 11,520 | 54,573 |
| IB ใหม่ | 3ช่องแรกเหนือฐานแต่ละด้านแบ่งช่องละ4; wall34 | 13,248 | 62,709 |
| IY ใหม่ | Yช่องแรก/สุดท้ายแบ่ง4; ช่องที่2/รองสุดท้ายแบ่ง2; Y24 | 17,280 | 80,653 |
| IBY ใหม่ | รวม IB และ IY | 19,872 | 92,677 |

ส่วนตรงเหนือฐานเดิมขนาด97มม. เปลี่ยนเป็น24.25มม. ในช่วงแรก291มม. ส่วนYเดิม93.75มม. เปลี่ยนเป็น23.4375มม. และ46.875มม. ใกล้ขอบทั้งสองด้าน ส่วนอื่นคงเดิม; arc24และt6ไม่เปลี่ยน

เป็น structured grading ไม่มี hanging nodes: การแบ่งตามแนวหนึ่งเดินผ่านแถวที่เชื่อมกัน ไม่ใช่ unstructured adaptive refinement เฉพาะกล่องเล็ก และ **ไม่ใช่ลำดับ uniform convergence ทุกทิศ**

รันใหม่3ชุดเฉพาะ **FULL**; ไม่ขยายข้อสรุปของ mesh ใหม่ไปยัง LEFT หรือ t150/t200. คู่ตรวจคือ H4→IB, H4→IY, IB→IBY, IY→IBY เพื่อดูผลแต่ละทิศและผลร่วม

490พิกัดกายภาพร่วม, local s/y/n axes และ one-sided values จาก Step2E/2H คงเดิมทั้งหมด เกณฑ์ point/RMS/spread≤5%ครบ6องค์ประกอบและ normalization floor10kPa ไม่เปลี่ยน การที่คู่ทิศทางหนึ่งเข้าเกณฑ์ไม่ยืนยันความเค้นทุกจุดของโมเดล

## Stress-traction audit

ตรวจ8runsเดิม FULL/LEFT H1–H4 และ3runsใหม่ FULL IB/IY/IBY รวม11runs ×6cuts =66cuts; แต่ละcutมี lower/upper trace แยกกัน

`F = ∫A σ·n dA`, `M = ∫A (x−origin)×(σ·n) dA`

- ความเค้นมาจาก `grad(u)` ของ element ด้านนั้นและ isotropic constitutive law ไม่ใช้ค่า extrapolated/smoothed จาก viewer
- lowerใช้face ξ=+1 ของแถวก่อนcut; upperใช้ξ=−1ของแถวถัดไป; area vector=`±(x,η×x,ζ)dηdζ` จึงตรวจorientationและJacobianจริง
- เส้นตัด W-TOP/C22.5/C45/C67.5/R-START/CROWN เป็น planar radial/straight sections; area=t×L=.2625m² แต่ละcut
- originกึ่งกลางความหนาของcut,Y=.75ม. ตรงกับnodal reference; หน่วยkPa×m²=kN และkN·m ไม่ใช่แรงต่อเมตร/bolt
- nodal referenceเป็น resisting forceที่ลบ consistent loads ของ selected elements ณcutไว้แล้ว; **ไม่ลบ body load ซ้ำจาก continuum traction**
- คง2traceแยกกัน ไม่เฉลี่ยให้ตรงและไม่แก้เครื่องหมายเพื่อให้ผ่าน; ที่crown upperเป็นelementแรกฝั่งRHซึ่งprofileorientationต่อเนื่อง
- 4×4เทียบ6×6 Gauss integrationบนหน้า แต่ละorderเก็บ contributionรายelementและผลรวม6องค์ประกอบ
- trace/reference≤5%, trace-pair≤5%, quadrature change≤10⁻⁶ relative; denominatorอย่างน้อย.1kNสำหรับแรง/.1kN·mสำหรับโมเมนต์ เพื่อให้กรณีค่าอ้างอิงใกล้ศูนย์ตีความได้ โดยแสดงabsoluteคู่กันเสมอ

Affine manufactured displacement ที่ให้constant stressครบ6องค์ประกอบใช้ตรวจnormal,area,unitsและmoment originผ่าน12faces; **ไม่ใช่ exact reference ของโมดูลรับgravity**. การตรวจtractionนี้เป็น independent postprocessing route แต่ใช้displacementจากFEเดิม จึงไม่ใช่independent FE formulation

## ผลจริงของรอบนี้

ผลรวมแทบไม่เปลี่ยน: ทุกคู่ directional มีΔ|u|maxไม่เกิน.00606%, Δแรงฐานที่ตรวจไม่เกิน.03999%, Δenergyไม่เกิน.007013%. IBYให้|u|max=.136239552mm, LH Rx=1.857177198kN,Rz=25.914077676kN,My=1.695934627kN·m; **ไม่ใช่การผ่านserviceabilityหรือกำลังตามโค้ด**

| คู่เปรียบเทียบ | ภายในทั่วไป: max point | ขอบY: max point | ฐาน50mm: max point | crown50mm: max point | ครบpoint/RMS/spreadทั้ง6องค์ประกอบ |
|---|---:|---:|---:|---:|---|
| H4→IB | .2464% | .2311% | 50.4896% | .0122% | 3/4กลุ่ม; ฐานยังไม่ครบ |
| H4→IY | .1775% | 15.9167% | 23.2983% | 4.0057% | 2/4กลุ่ม; ขอบและฐานยังไม่ครบ |
| IB→IBY | .1777% | 15.9163% | 15.9143% | 4.0058% | 2/4กลุ่ม; ขอบและฐานยังไม่ครบ |
| IY→IBY | .2394% | .2251% | 47.4064% | .0119% | 3/4กลุ่ม; ฐานยังไม่ครบ |

รวม10/16 **pair-specific groups**เข้าเกณฑ์ ไม่ใช่10/16บริเวณอาคารที่รับรองแล้ว; คู่เหล่านี้เปลี่ยนคนละทิศ ห้ามรวมเป็นหลักฐานว่าลู่เข้าทั้งโมเดล การคงarc/t meshเดิมทำให้จุดห่างจากบริเวณrefineเปลี่ยนน้อยได้

หลักฐานที่ช่วยเลือกงานถัดไป:

- เพิ่มใกล้ฐาน H4→IB ทำให้σnnจุดLH/BASE50/Y.05/F.90เปลี่ยนจาก+4.074916เป็น−.974048kPa, ต่าง5.048964kPa; normalized50.4896%จากfloor10kPa ไม่ใช่material utilization
- เพิ่มY IB→IBY ทำให้σyyใกล้ขอบLH/C22.5/Y.05/F.10ต่าง1.591629kPa และτynใกล้ฐานLH/BASE50/Y1.45/F.50ต่าง1.607665kPa แสดงว่าขอบYยังไวต่อdiscretization
- Max one-sided spreadกลุ่มฐาน: H4=42.036%, IB=15.320%, IY=42.039%, IBY=8.543%. ลดลงแต่ยังเกิน5%; จุดคุมอาจต่างกัน ไม่ใช่errorเทียบคำตอบexact
- ที่Y=.75ซึ่งห่างขอบ การเพิ่มYอย่างเดียวแทบไม่เปลี่ยนprofileσnn/τsn แต่การเพิ่มแนวเหนือฐานเปลี่ยนชัด จึงมีหลักฐานสนับสนุนการแยกทิศทาง ไม่ใช่ข้อพิสูจน์ว่าsupportจริงถูกต้องแล้ว

**Traction auditครบ66cuts แต่ไม่มีcutใดผ่านทุกเกณฑ์ครบ6องค์ประกอบ (0/66)**. ทุกcutผ่านการตรวจ4×4→6×6 integration: maxrelativeทั้งชุด≈2.8734×10⁻⁷ (<10⁻⁶), ชุดIBY≈6.274×10⁻¹¹ จึงไม่ใช่หลักฐานว่าการเพิ่มsurface quadratureอย่างเดียวจะแก้ความต่างนี้

| FULL / crown Fz (kN) | Nodal lower | Traction lower | Traction upper | ผลรวม2traces |
|---|---:|---:|---:|---:|
| H4 | ≈0 | −.043554684 | −.043554684 | −.087109369 |
| IBY | ≈0 | −.043555177 | −.043555177 | −.087110355 |

IBY trace/reference43.555% และtrace-pair87.110% เกิดจากหารfloor.1kN ไม่ใช่87%ของน้ำหนักอาคาร ไม่ใช่แรงภายนอกเพิ่ม ทั้งสองtraceคงค่าด้านนั้นไว้ ไม่กลับเครื่องหมายตามผลที่อยากได้

ที่W-TOP IBY pair imbalance [Fx,Fz,My]=[−.255900,−.481487,+.000427] หน่วยkN/kN·m; ที่R-START=[+.178785,+.886144,+.014168]. ความต่างส่วนนี้ยังใกล้H4 เพราะไม่ได้เพิ่มmeshตามprofile/ความหนาของบริเวณนั้น ไม่เรียกว่าjoint failureหรือsingularityที่ละทิ้งได้

## การตรวจที่เสร็จแล้ว

- 3newsolvesผ่าน positiveJacobian, physical circular volume/load/first moments, global equilibrium, energy/work,18subbodycuts/action-reaction, inverse mapping490points/run
- กู้คืนGaussครบ1,360,800จุดใน3runs; maxdifference≈1.407×10⁻⁹kPa; global equilibriumสูงสุด≈1.062×10⁻¹¹relative; เป็นimplementation consistencyไม่ใช่exactaccuracy
- Affine traction patch12faces maxabsolute difference≈2.387×10⁻¹² (องค์ประกอบแรงkN/โมเมนต์kN·m); expectedarea.2625m²
- Independent JS finite-difference shape derivatives ตรวจsampled stressesและsurface tractionบางfacesทั้ง6cuts/2tracesของH4และIBY แยกจากanalytic-derivativeimplementationหลัก; ตรวจcontribution sumsและเกณฑ์ทั้ง66cuts ไม่ใช่ตรวจpatchเพียงอย่างเดียว
- Numerical/evidence48tests (ใหม่7+เดิม41), UI29, protectedHTTP13 รวม90testsผ่าน; R01snapshot162checksผ่าน; TypeScript/buildผ่าน และตรวจภาพPNGใหม่2แผ่นแล้ว
- ไม่ได้ทำbrowser visual QAหรือFirebase identity integrationจริง; เว็บยังlocalpreview การผ่านtestsรวมการยืนยันว่าengineering QAยังไม่ครบ ไม่ใช่อนุมัติแบบ

## งานถัดไปที่แนะนำ

1. คงBC/loadเดิม แยกการเพิ่มmeshตามprofileใกล้transitionและroof/crownจากการเพิ่มthrough-thickness พร้อมเกณฑ์เดิมและ6cut tractions ไม่เปลี่ยนหลายสมมติฐานพร้อมกัน
2. เลือกrefinementเพื่อดูทั้งfixed-pointσและcut resultants ไม่สรุปจาก|u|maxหรือพลังงานเพียงอย่างเดียว; พิจารณาgravity-loaded straight subproblemสำหรับตรวจshear/traction reconstruction ก่อนเพิ่มขนาดfullbayอีกมาก
3. ตรวจsupport/edge sensitivityเป็นอีกrevisionที่ระบุDOF/contact/bearing และแหล่งstiffnessชัดเจน; รอยต่อจริงต้องมีข้อมูลอุปกรณ์และการทดสอบ ไม่ตั้งspringหรือจำนวนboltจากผลรวมรอบนี้
4. เมื่อหลักฐานlocal accuracy/connection modelเพียงพอจึงขยายthickness/LEFT/openingsและStep3ตามมาตรฐาน พร้อมผู้รับผิดชอบตรวจ

## ขอบเขตของการยืนยัน

สมดุลnodalและstress-tractionต่างกันได้ในdisplacement finite elements ที่ยังมีstress discontinuity; สมดุลรวมดีไม่ยืนยันว่าlocal stressแม่นยำ การเพิ่มsurface quadratureจนผลนิ่งตรวจเฉพาะการอินทิเกรต ไม่แก้discretizationของสนามความเค้น

ตาม skill `precast-modular-workflow` คง `whole_model_local_stress_convergence=NOT_ESTABLISHED`, `engineering_approval=false`, `manufacturing_release=false`. ไม่เปิด Step3ออกแบบเหล็ก/จุดต่อหรือ Step4ผลิตอัตโนมัติ ไม่ใช่การตัดสินว่ารูปทรงใช้ไม่ได้หรือปลอดภัยแล้ว

## ไฟล์และการทำซ้ำ

- [Local mesh results](../../output/tsc-step2i-r00/local_mesh_results.json) / [Traction audit](../../output/tsc-step2i-r00/traction_results.json)
- [Mesh solver](../../tools/tsc-study/local_mesh_study.py) / [Traction integrator](../../tools/tsc-study/traction_audit.py) / [Evidence tests](../../tools/tsc-study/local-mesh-results.test.mjs)
- [Mesh PNG](../../output/tsc-step2i-r00/TS-C-LOCAL-MESH-S2I-R00.png) / [Traction PNG](../../output/tsc-step2i-r00/TS-C-TRACTION-S2I-R00.png)
- [OpenSees eleForce](https://openseespydoc.readthedocs.io/en/latest/src/eleForce.html) / [Twenty_Node_Brick source v3.8.0](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/element/brick/Twenty_Node_Brick.cpp)

ใช้Python runtimeเดิมและisolated `.local-engineering-runtime`; `local_mesh_study.py --reuse` ตรวจfingerprintsก่อนใช้cache; ตามด้วย `traction_audit.py` และ `render_local_mesh.mjs`. โหมด `--upstream-only` ใช้ตรวจ8ชุดเก่าระหว่างรอsolver เก็บรายงานนั้นแยก ไม่ใช้แทนรายงาน11ชุดสุดท้าย

Raw3ชุดใหม่เก็บnodes/loads/displacements/reactions/elements/Gauss/490samples; TRACTION11ไฟล์เก็บface contributionsทั้ง4×4และ6×6. เว็บส่งเฉพาะsummary ไม่ส่งrawmeshหรือface contributions; SHA-256ตรวจbasis/helper/runtime/upstream/raw/audit/renderer ไม่แจกsolverหรือPDFมาตรฐาน
