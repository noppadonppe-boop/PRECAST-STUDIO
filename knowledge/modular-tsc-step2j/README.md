# TS-C Step 2J — exact gravity coupon / ตรวจแรงเฉือนและ traction

S2J-R00 / 16 กันยายน 2026 / `GRAVITY_COUPON_TRACTION_BENCHMARK_NOT_FOR_DESIGN`

ต่อจาก [Step2I](../modular-tsc-step2i/README.md) ที่แรงจากความเค้นยังไม่ตรงกับแรงหน้าตัดครบเกณฑ์ จึงทดสอบ **ฟังก์ชันรวม traction เดิมโดยไม่แก้** กับชิ้นตรงรับน้ำหนักตัวที่มีคำตอบ elasticity ตรวจได้ ก่อนเพิ่มขนาด full-bay model ต่อ

ผลสำคัญ: เพิ่มความละเอียดตามความยาวช่วยแรงรวมหน้าตัด แต่ไม่ได้ทำให้ความเค้นเฉือนแม่นขึ้นเพียงพอถ้าตามความหนายังหยาบ ชุดละเอียดผ่านเกณฑ์เฉพาะ coupon นี้ **ไม่เปลี่ยนสถานะ TS-C ทั้งโมดูล**

## ขอบเขตที่ประกาศก่อนคำนวณ

[basis.json](basis.json) ระบุ geometry, BC, meshes, cases, เกณฑ์ และข้อจำกัดก่อนรัน

- ชิ้นตรง L=1.50m, w=.25m, t=.175m; X∈[−L/2,L/2], Y∈[0,w], Z∈[−t/2,t/2]
- 20NodeBrick, OpenSees3.8.0 / SuperLU / Plain; E=28,321.786532937494MPa, ν=.20, ρ=2400kg/m³, g=9.80665m/s² เป็นค่าทดลองเดิม ไม่เลือกวัสดุผลิต
- ν=0 เป็น mathematical controlเฉพาะJ3/J7 ไม่ใช่ค่าคอนกรีตเสนอใช้จริง
- **Plane strain: Uy=0ทุกnode** ไม่ใช่free-Y bay. Ux=0ที่[0,w/2,0]; Uz=0ที่[±L/2,w/2,0] ใช้ตัด rigid translation/rotation
- ปลายทั้งสองรับprescribed exact traction, ผิวบนล่างfree. Tractionsปลายเป็นตัวรับน้ำหนัก ไม่ใช่datum restraints และไม่ใช่จุดรองรับจริงของอาคาร
- Explicit consistent gravity3×3×3 และend traction3×3; ไม่ใส่element body-forceซ้ำ ไม่มีroof LL, finishes, prestress, cracking หรือcode load factorsในโจทย์นี้
- ความหนาt175เท่ากันทุกrun; สิ่งที่เปลี่ยนคือจำนวนชั้นmesh ไม่ใช่ความหนาคอนกรีต

## ที่มาของคำตอบอ้างอิง

เป็นคำตอบพหุนามอนุมานในโครงการและตรวจสมการ elasticity แยกจากFE ไม่ใช่สูตรจาก วสท./ACI และไม่ใช่Euler–Bernoulli approximation. เอกสารOpenSeesที่อ้างด้านท้ายใช้ยืนยันวิธีอ่านresisting force/reactionsเท่านั้น ไม่ใช่แหล่งสูตรต่อไปนี้

ให้ `a=L/2`, `c=t/2`, `γ=ρg`, `K=3γ/(2c²)`, `q=γwt` โดยγใช้kN/m³และEใช้kPa:

```text
σxx = K z [x²−a² + 2c²/5 − 2z²/3]
τxz = K x (c²−z²)
σzz = K (z³−c²z)/3
σyy = ν(σxx+σzz), σxy=τyz=0
```

วิธีอนุมานโดยย่อ: เริ่มσxx=A(x)z+Bz³+Cz, ใช้สมดุลXเพื่อหาτxz; สมดุลZกับbody force−γและtraction=0บนz=±cให้A''=2KและK=3γ/(2c²). Plane-strain compatibilityสำหรับconstant body forceให้ `∇²(σxx+σzz)=0` จึงได้B=−2K/3. กำหนดmomentที่หน้าปลายเป็นศูนย์ให้C=2Kc²/5 เมื่อA=K(x²−a²)

ตรวจได้โดยตรง:

```text
∂σxx/∂x + ∂τxz/∂z = 0
∂τxz/∂x + ∂σzz/∂z = γ
τxz(z=±c) = σzz(z=±c) = 0
```

Compatibilityยังตรวจผ่านdisplacement fieldอิสระต่อไปนี้ ให้ `A=(1−ν²)/E`, `B=ν(1+ν)/E`, `C=(1+ν)/E`, `H=Aa²+c²(2C−2A/5−B/3)` (A/B/Cในสูตรdisplacementเป็นconstantsคนละชุดกับansatzด้านบน):

```text
ux = Kxz { A[x²/3−a²+2c²/5−2z²/3] − B(z²−c²)/3 }
uy = 0
uz = K { A(z⁴/12−c²z²/6)
         − B[(x²−a²+2c²/5)z²/2−z⁴/6]
         + H(x²−a²)/2 − A(x⁴−a⁴)/12 }
```

`uz(±a,0)=0` และ`ux(0,0)=0` ตรงกับdatum. ตรวจgradientด้วยfinite differences, stressจาก3DHooke law, divergence, surface tractionsและsection resultants ก่อนใช้เป็นreference. Exactstrainenergyใช้6×6quadratureของpolynomialσ:ε/2; testsคำนวณซ้ำจากcompliance law ไม่ใช้FEenergyเป็นreference

### FBD และการรับน้ำหนักของชิ้นทดสอบ

γ=23.53596kN/m³, q=1.02969825kN/m, W=1.544547375kN. Endtractionแต่ละปลายให้แรงขึ้นW/2=.7722736875kN โดยshear tractionเป็นพาราโบลา และมีnormal tractionแบบcubicที่รวมFxและMyเป็นศูนย์. **ห้ามแทนสภาพนี้ด้วยbearingหรือrigid clampโดยไม่คำนวณใหม่**

แรงหน้าตัดบนส่วนซ้าย normal+X รอบorigin[Xcut,w/2,0]:

```text
Fz=qx
My=q(x²−a²)/2
Fx=Fy=Mx=Mz=0
```

ตรงกลางFz=0 แต่Myไม่เป็นศูนย์. หน้าตัดด้านขวามีnormal−Xและแรงตรงข้าม. รักษา6องค์ประกอบและmoment originเดียวกัน; ไม่ใช้ค่าแรงต่อเมตรเป็นแรงต่ออุปกรณ์ยึด

## ชุดเปรียบเทียบ

| Mesh | nx | ny | nz | Elements | บทบาท |
|---|---:|---:|---:|---:|---|
| J1 | 8 | 2 | 2 | 32 | เริ่มcoarse |
| J2 | 16 | 2 | 2 | 64 | เพิ่มความยาว |
| J3 | 32 | 2 | 2 | 128 | ฐานเทียบสองทิศ |
| J4 | 64 | 2 | 2 | 256 | เพิ่มความยาวต่อ แต่ไม่เพิ่มชั้นหนา |
| J5 | 32 | 2 | 4 | 256 | เพิ่มชั้นหนา |
| J6 | 32 | 2 | 8 | 512 | เพิ่มชั้นหนาต่อ |
| J7 | 64 | 2 | 8 | 1,024 | เพิ่มทั้งสอง |

ν=.20ครบ7ชุด + ν=0เฉพาะJ3/J7 รวม9runs. ตัดที่X/L=−.25,0,+.25 รวม27cuts×2traces; ตามความยาวทุกmeshมีหน้าelementตรงแนวตัดเหล่านี้

เกณฑ์ก่อนรัน: displacementและenergy error≤2%, weighted RMSstressทั้ง6องค์ประกอบ≤5%, traction/exactและtraction/nodal≤5%, trace-pair≤5%, 4×4→6×6integration change≤10⁻⁶relative. ตัวหารRMSstressอย่างน้อย10kPa; force/momentอย่างน้อย.1kN/.1kN·m. **เป็นเกณฑ์numerical coupon ไม่ใช่เกณฑ์กำลังวัสดุหรือความปลอดภัยอาคาร**

Nodalcutใช้ `eleForce − consistent loads ของelementที่หน้าcut` ไม่ลบgravityซ้ำจากcontinuumσ·n. Stressintegralใช้`traction_audit.integrate`ของS2Iเดิม ไม่smoothหรือเฉลี่ยสองtraceให้ศูนย์; เก็บfacecontributionsทั้ง4×4และ6×6

## ผลจริง

| ν=.20 | displacement error | τxz RMS error | Max traction/exact errorทั้งcuts/6องค์ประกอบ | Fz lowerกลางช่วง (kN), exact=0 | ครบcoupon criteria |
|---|---:|---:|---:|---:|---|
| J1 | .133443% | 19.415957% | 52.818852% | −.040809064 | ไม่ครบ |
| J2 | .036352% | 10.217072% | 12.641210% | −.005424095 | ไม่ครบ |
| J3 | .031815% | 9.150229% | 3.032945% | −.000688901 | ไม่ครบ |
| J4 | .034344% | 9.028537% | .738902% | −.000086460 | ไม่ครบ |
| J5 | .002412% | 2.565292% | 3.013183% | −.000684412 | ครบเฉพาะcoupon |
| J6 | .000548% | 1.282844% | 2.983904% | −.000677762 | ครบเฉพาะcoupon |
| J7 | .000173% | .642892% | .735484% | −.000086060 | ครบเฉพาะcoupon |

ν=0: J3 τxzRMS10.1580%ยังไม่ครบ; J7 τxzRMS.7329%, maxcuterror.9176%ครบ. รวม4/9runsเข้าเกณฑ์couponและ21/27cutsเข้าเกณฑ์แรงหน้าตัดทั้งหมด ไม่เลือกเฉพาะผลที่ดีมารายงาน

J3และJ4เป็นตัวอย่างชัดว่า **cut forceผ่านได้แต่localstressยังไม่ผ่าน**. เพิ่มnx32→64ที่nz2 ทำให้center |Fz|ลดประมาณ8เท่า แต่τxzRMSยัง≈9%. เพิ่มnz2→4→8ที่nx32ทำให้τxzRMSลด9.150→2.565→1.283% ส่วนแรงcenterเปลี่ยนน้อย จึงต้องแยกการตรวจทั้งสองปริมาณ

J7ν=.20: centerUzFE=−.021284592805mm เทียบexact−.021284629679mm. ค่าเหล่านี้ของชิ้นตรงยาว1.50m/กว้าง.25m/plane strain **ไม่ใช่การโก่งตัวอาคาร TS-C**

ข้ออนุมานที่หลักฐานรองรับ: วิธีรวมtractionเดิมสามารถให้ผลเข้าใกล้คำตอบอ้างอิงภายใต้gravityได้ และความไวต่อmeshสองทิศต่างกัน จึงควรตรวจprofile/thicknessแยกกันในfullbay. **ยังสรุปไม่ได้ว่าความต่างทุกจุดของS2Iมีสาเหตุเดียวกัน** เพราะcurvature/free-Y/supportของfullbayยังไม่มีในcouponนี้ ไม่ใช้ผลนี้ล้างfailedS2Iหรือปรับเกณฑ์ย้อนหลัง

## QA และสถานะส่งมอบ

- ตรวจanalyticfieldสองν: maxconstitutive mismatch≈3.908×10⁻¹⁴kPa; maxdivergenceFDresidual≈2.065×10⁻⁸kPa/m; analyticcut error≈1.11×10⁻¹⁶kN/kN·m
- Affinepatchสองνผ่าน; solverDLLและhelper hashesตรงชุดเดิม
- Gauss92,448จุดใน9runs; reproductionmax≈1.022×10⁻¹⁰kPa; global equilibriummax≈2.101×10⁻¹⁴relative
- Nodalcut/exactสูงสุด≈1.268×10⁻¹¹kN/kN·m; surfacequadraturechangeสูงสุด≈1.248×10⁻¹²relative
- Testsตรวจexactpolynomialด้วยfinite differences/Hooke/divergence, loadresultantsและdatum, rawGauss/RMS/energy, nodalcuts และ independentFD surfaceintegrationบางfacesของทุกcase; เก็บ6องค์ประกอบและfailedflags
- Numerical/evidence55tests (ใหม่7), UI31 (ใหม่2), HTTP/security13 รวม99testsผ่าน; TypeScript/buildผ่าน; R01snapshot162checksผ่าน; ตรวจPNG2แผ่นและแก้layoutแล้ว
- ไม่ทำbrowservisualQAหรือFirebase identity integrationจริง; buildมีwarningเดิมlazyJoint3DViewer>500kB แต่buildผ่าน

ตาม skill `precast-modular-workflow` คง`whole_model_local_stress_convergence=NOT_ESTABLISHED`, `engineering_approval=false`, `manufacturing_release=false` ไม่เริ่มเลือกเหล็ก/boltหรือปล่อยแม่แบบผลิตจากการผ่านcoupon

## ขั้นถัดไป

1. กลับTS-Cfullbayด้วยrevisionใหม่ คงNC320/t175/F-R/โหลดเดิม เพิ่มprofileใกล้wall–curve/curve–roof/crownแยกจากthrough-thickness และคง490พิกัดตรวจ/6cutสองtrace
2. เลือกขนาดmeshจากการเปรียบเทียบจริง ไม่ยกnx/nzของcouponไปใช้ตรงๆ เพราะgeometryและBCต่างกัน ไม่เพิ่มทุกทิศแบบไม่มีสมมติฐานควบคุม
3. เมื่อแยกdiscretizationได้แล้ว ตรวจsupport/contact/joint idealizationพร้อมข้อมูลที่มีที่มา; จากนั้นจึงขยายthickness/loadpatterns/openingsและออกแบบตามมาตรฐานโดยผู้รับผิดชอบตรวจ

## ไฟล์และแหล่งอ้างอิง

- [ผลคำนวณ9ชุด](../../output/tsc-step2j-r00/gravity_coupon_results.json) / [Solverและanalytic field](../../tools/tsc-study/gravity_coupon.py) / [Independent evidence tests](../../tools/tsc-study/gravity-coupon-results.test.mjs)
- [ภาพFBD/สูตร](../../output/tsc-step2j-r00/TS-C-GRAVITY-FBD-S2J-R00.png) / [ภาพผลQA](../../output/tsc-step2j-r00/TS-C-GRAVITY-QA-S2J-R00.png)
- [OpenSees eleForce — resisting force](https://openseespydoc.readthedocs.io/en/latest/src/eleForce.html) / [nodeReaction — ต้องเรียกreactionsก่อน](https://openseespydoc.readthedocs.io/en/latest/src/nodeReaction.html) / [Twenty_Node_Brick v3.8.0](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/element/brick/Twenty_Node_Brick.cpp)

อ่านofficial API docsครั้งนี้; runtimeจริง3.8.0ใช้hash/patchที่ตรวจแล้ว ไม่อนุมานstressorderingจากเลขversionเอกสาร. Solverใช้internal studyตามlicense ไม่แจกsolverหรือPDFมาตรฐานผ่านเว็บ. สูตรพหุนามเป็นderivationของโครงการ ไม่อ้างว่าเอกสารAPIให้สูตรนี้

ทำซ้ำด้วยPython runtimeเดิม: `tools/tsc-study/gravity_coupon.py` แล้ว`node tools/tsc-study/render_gravity_coupon.mjs` โดยตั้งPM_SHARP_PATHเหมือนrendererก่อนหน้า. Raw9ไฟล์เก็บloads/bodyloads/endloads/reactions/displacements/elements/Gauss/cutcontributions; web_summaryตัดrawmeshและfacecontributionsออก. ทุกภาพเป็นdeterministic renderingจากผลคำนวณ ไม่ใช่ภาพAI
