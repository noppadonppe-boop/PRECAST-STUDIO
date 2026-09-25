# TS-C Step 2K — แยก profile / thickness ใน full bay

S2K-R00 / NUMERICAL STUDY — NOT FOR DESIGN

ต่อจาก [Step2J](../modular-tsc-step2j/README.md) นำข้อสังเกตจาก coupon กลับมาทดสอบกับ TS-C เต็มโมดูล โดย **ไม่สมมติว่าผล coupon ใช้แทน full bay ได้**

## ขอบเขตก่อนรัน

[basis.json](basis.json) ประกาศก่อนคำนวณสองชุดใหม่ เทียบ H4 เดิม:

| Mesh | Wall / arc / roof ต่อซีก | Y | ชั้นตามความหนา | Elements |
|---|---|---|---|---|
| H4 control | 25 / 24 / 11 | 16 | 6 | 11,520 |
| KP | 27 / 32 / 22 | 16 | 6 | 15,552 |
| KT | 25 / 24 / 11 | 16 | 8 | 15,360 |

KP แบ่งสองช่องบนสุดของผนัง, สี่ช่องแรกและสี่ช่องท้ายของส่วนโค้ง, และทุกช่องหลังคาตรง เป็นสองแต่ละช่อง มี symmetry LH/RH และ shared nodes ไม่มี hanging nodes. KT เปลี่ยนเฉพาะชั้นตามความหนา6→8 **ความหนาจริง175มม.ไม่เปลี่ยน**

เลือก H4 เป็นฐานควบคุมทิศทาง ไม่ใช่ประกาศว่าเหนือกว่า IBY. ไม่เพิ่ม Y หรือ base refinement รอบนี้; KP+KT รวมกันและการย้ายไป IBY ยังไม่ได้คำนวณ

คงภายนอก3×3ม.รวมพื้น, Rนอก.40, bay1.50, S00, NC320 trial E28,321.786532937494MPa/ν.2/ρ2400; 20NodeBrick OpenSees3.8.0; F-R Ux/Uz=0บนฐานและ Uy datumหนึ่งจุด/ฐาน; crown bonded shared nodes; ขอบYอิสระ. พื้นแยกไม่ meshed/LP-A. โหลด unfactored self-weight+RoofLL50kgf/m²บนพื้นที่ฉายแนวราบ FULL เท่านั้น ไม่มีprestressเฉพาะtrialนี้ ไม่ใช่การตัดสินใจผลิต

## วิธีและเกณฑ์

- ใช้ kernel `local_mesh_study.run` เดิมผ่าน Python function ที่มี globals แยกสำหรับ builder/output sink; ไม่แก้ kernel เดิม ไม่เขียนทับ output เก่า. ปรับ metadata จำนวนarcให้ตรง geometry ใหม่ก่อนบันทึก
- Explicit consistent body3³/roof3², ไม่มีbodyforceซ้ำ; เก็บloads/reactions/displacements/elementforces/Gauss27จุดต่อelementและ490พิกัดกายภาพเดิม
- Physical volumeและfirst momentsตรวจเทียบรูปวงกลมจริง; surface FE เป็น quadratic interpolation ไม่ใช่วงกลมexactทุกจุด
- คงเกณฑ์ S2H: equilibrium/FBD/energy≤10⁻⁶relative, mapping/volume≤10⁻⁵, Gauss reproduction≤10⁻⁶kPa, inverse mapping≤10⁻⁹m
- คง S2E local point/RMS/spread≤5%ครบ6องค์ประกอบ, floor10kPa; คู่เดียวที่ผ่านไม่ใช่whole-model convergence
- ตรวจ6cuts W-TOP/C22.5/C45/C67.5/R-START/CROWN×2traces โดย integrator S2Iเดิม: ∫σn dA และ∫(x−origin)×σn dA, ไม่smooth/เฉลี่ยข้ามหน้า. แรงkN/โมเมนต์kN·m ไม่ใช่แรงต่อเมตรหรือbolt
- Nodal cutหัก consistent loads ณcutแล้ว; ไม่หักbody loadซ้ำจากstress traction. Lower/upper outward normalsตรงข้ามและoriginเดียวกัน
- Trace/nodalและtrace pair≤5%ครบ6องค์ประกอบ, floor.1kN/.1kN·m; quadrature4²→6²≤10⁻⁶relative. ไม่ปรับเกณฑ์เพื่อให้ผ่าน

## การส่งมอบและข้อจำกัด

ใช้ [profile_thickness_verified.json](../../output/tsc-step2k-r00/profile_thickness_verified.json) เป็นผลส่งมอบ ไม่ใช้ `profile_thickness_results.json` ชุดแรกสำหรับแนวตัด KP

พบและแก้ในการ QA: selector เดิมเลือกมุมตามสัดส่วนจำนวนแถว ใช้ไม่ได้กับส่วนโค้งแบ่งไม่เท่ากัน ทำให้ KP/C22.5 และ C67.5 ไปอยู่15°/75°. FEM solutionและ490จุดกายภาพไม่ได้เปลี่ยน. `verify_profile_cuts.py` จึงเลือกแนวตัดจากพิกัดมุมจริง ตรวจ nodes/connectivityตรงrawเดิมทุกจุด แล้วคำนวณ nodal cuts และ traction ใหม่ รวม affine patches36traces ทั้งH4/KP/KT. เก็บผลก่อนแก้เป็นหลักฐาน ไม่เขียนทับ และมีtestพิกัดexact-angleป้องกันซ้ำ. ผลก่อนแก้3/6cutsจึงไม่ใช่ผลส่งมอบ; ผลถูกต้อง KP=2/6

### ผลจริงหลังตรวจแก้

| ค่า | H4 เดิม | KP profile | KT thickness |
|---|---:|---:|---:|
| Max displacement (mm) | .1362271515 | .1362327028 | .1362287170 |
| Crown traction lower Fz (kN); nodal≈0 | −.0435546845 | −.0056920143 | −.0431485232 |
| Cutsครบทุกเกณฑ์/6 | 0 | 2 | 0 |

KP ผ่านเฉพาะ W-TOP และ R-START. Crown pair imbalanceลดจาก−.087109369เป็น−.011384029kN แต่normalized11.384%ยังเกิน5% (ตัวหารfloor.1kN). ไม่ใช่11.384%ของน้ำหนักอาคาร และไม่ใช่แรงภายนอกใหม่

คู่H4→KP maxpointchangeทั่วไป/ขอบ/ฐาน/crown =13.825/14.186/.004/1.409%; คู่H4→KT=8.152/8.071/34.073/.535%. ทั้งสองคู่ผ่านpoint/RMS/spreadครบ6องค์ประกอบเฉพาะกลุ่มcrown (รวม2/8pair-groups) ไม่ใช่whole-model convergence. กลุ่มฐาน spread KP42.036%,KT31.644%ยังไม่ผ่าน; รอบนี้ไม่ได้refineใกล้ฐานแบบIBY

ข้ออนุมานที่รองรับ: ในtrialนี้ crown cut traction ไวต่อprofile refinementมากกว่าการเพิ่มชั้น6→8อย่างเดียว ขณะที่localstressยังไวต่อทั้งสองทิศ ไม่แปลว่าความหนา175เหมาะสมแล้วหรือทุกปัญหาเกิดจากmeshอย่างเดียว

ตรวจGauss834,624จุดในสองruns; reproductionสูงสุด2.588×10⁻⁹kPa; equilibriumสูงสุด2.242×10⁻¹¹relative; surfacequadratureทั้ง18cutsสูงสุด6.299×10⁻¹¹relative. สมดุล/patchเป็นimplementation QAไม่ใช่code acceptance

ภาพ [Mesh comparison](../../output/tsc-step2k-r00/TS-C-PROFILE-MESH-S2K-R00.png) / [Stress and traction](../../output/tsc-step2k-r00/TS-C-PROFILE-QA-S2K-R00.png). เว็บ WEB-12 เพิ่มเมนูStep2Kและดาวน์โหลด2PNG รวม76ภาพ (52concept+24engineering) โดยคงbackendสิทธิ์และSTALE checks ไม่ส่งrawmesh/face contributionsให้browser

QAส่งมอบ: numerical60tests(ใหม่5)+UI33+HTTP13 รวม106ผ่าน; TypeScript/buildและR01snapshot162checksผ่าน; PNG2แผ่นตรวจและแก้ตำแหน่งหัวตารางแล้ว. ไม่ทำbrowser visual QA/Firebase identityจริง/deployment. WarningเดิมJoint3DViewerchunk>500kBไม่ทำให้buildล้มเหลว

ตาม skill `precast-modular-workflow` คง `whole_model_local_stress_convergence=NOT_ESTABLISHED`, `engineering_approval=false`, `manufacturing_release=false`. ไม่มี exact full-bay elasticity reference, cracking, contact/jointจริง, wind/uplift/seismic, handling, openings, strength/steel/bolt/code design ในรอบนี้ ไม่เปิดStep3/4โดยอัตโนมัติ

ทำซ้ำ: Python runtimeเดิม `tools/tsc-study/profile_thickness_study.py --reuse` ตรวจhashก่อนreuse → `verify_profile_cuts.py` → `render_profile_thickness.mjs` โดยตั้งPM_SHARP_PATH. เก็บ rawผลสองชุด+tractionชุดแรกสามไฟล์+VERIFIEDสามไฟล์, PNG/SVGสองแผ่น, web_summaryตัดface contributionsออก. Solverใช้localภายในตามlicense ไม่แจกsolverหรือPDFมาตรฐานผ่านเว็บ

ขั้นถัดไป: ประเมินการเพิ่มprofileทุกarc/roof และชั้นหนาร่วมกัน โดยรักษาexact-angle cut selector พร้อมนำbase/Yrefinementกลับมาทดสอบอย่างควบคุม; อย่านำจำนวนช่องจากcouponมาใช้ตรงๆ. หลังหลักฐานnumericalเพียงพอจึงตรวจsupport/contact/jointจริงและขยายload/thickness/openingsก่อนStep3

อ้างอิงวิธีอ่านแรง: [OpenSees eleForce](https://openseespydoc.readthedocs.io/en/latest/src/eleForce.html) คืนelemental resisting forces; ตรวจเอกสารอีกครั้งในรอบนี้. Runtimeจริง3.8.0ยืนยันด้วยDLLhash/patch ไม่อนุมานversionจากหัวเว็บไซต์ ไม่มีการใช้สูตรกำลังตามมาตรฐานในงานนี้
