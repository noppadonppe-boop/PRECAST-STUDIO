# TS-C Step 2G — ชิ้นโค้งด้วย quadratic solid

S2G-R00 / 16 กันยายน 2026 / `CURVED_COUPON_BENCHMARK_NOT_FOR_DESIGN`

ต่อจาก [Step2F](../modular-tsc-step2f/README.md) โดยไม่แก้ผลเก่า ใช้ [basis.json](basis.json) ตั้งรูปทรง/โหลด/BC/mesh/เกณฑ์ก่อนรัน ผลนี้เป็น **ชิ้นโค้งรับโมเมนต์ล้วนแบบ plane strain** ไม่ใช่โมดูลจริง ไม่ใช่การทดสอบคอนกรีตร้าวหรือกำลังวัสดุ

## ขอบเขตและสิ่งที่เปรียบเทียบ

30 runs + 2 affine patches: t150/175/200mm × 3 models × 3 meshes ที่ ν=.20 =27runs และ t175/H20-CURVED/ν=0 อีก3runs เป็น control (ไม่ใช่ข้อเสนอสมบัติคอนกรีต)

Rภายนอก=.40m, มุม90°, กว้างตามY=1.50m; E=28,321.786532937494MPa ตามกรณีศึกษาเดิม ไม่มีน้ำหนักตัวหรือ roof LL ใน coupon นี้

| Model | Element | Geometry |
|---|---|---|
| H8-CHORD | stdBrick 8-node | มุมโค้งแทนด้วยคอร์ดตรง |
| H20-CHORD | 20NodeBrick | เพิ่ม midside ที่กึ่งกลางขอบคอร์ดเดิม; geometry เดียวกับ H8 |
| H20-CURVED | 20NodeBrick | midside ตามแนวโค้งอยู่บนวงกลม; geometry เป็น quadratic approximation ไม่ใช่วงกลม exact |

H8กับH20-CHORDแยกผล formulation; H20-CHORDกับH20-CURVEDแยกผล geometry interpolation. ใช้ partition เดียวกันแต่จำนวนnode/DOFต่างกัน ไม่ใช่เปรียบเทียบประสิทธิภาพที่ต้นทุนเท่ากัน

G1/G2/G3 = arc×radial×Y เท่ากับ8×2×2,16×4×2,32×8×2. Uy=0ทุกnode; θ=0 กำหนดUz=0ทั้งหน้า และUx=0เพียงdatumที่r=Rm,Y=.75. อนุญาตหน้าตัดเปลี่ยนรูปรัศมี ไม่ใช่ rigid clamp. ผิวรัศมีอิสระ; θ=90ใส่ traction จาก Airy σtt ด้วย integration radial8×Y3จุด ไม่แบ่งแรงเท่ากันทุกnode

m=1kNm/m จึงมีโมเมนต์ปลาย My=−1.50kNm และ reaction My=+1.50kNm; แรงรวมปลาย=0. เป็นโหลดทดสอบ ไม่ใช่แรงใช้ออกแบบจุดต่อ

## คำตอบอิสระ

อิงรูป Airy stress function ใน [NPTEL §10.3.1](https://archive.nptel.ac.in/content/storage2/courses/105106049/lecnotes/mainch10.html) แล้ว derive displacement แบบ **plane strain** และ gauge ของชุดนี้แยกต่างหาก; ไม่ใช้ displacement plane stress ของเอกสารแทนโดยตรง

```text
φ = A ln r + B r² ln r + C r²
σrr = A/r² + B(2 ln r+1) + 2C
σtt = −A/r² + B(2 ln r+3) + 2C
σyy = ν(σrr+σtt); τrt=τry=τty=0
```

หาA/B/Cจากσrr(ri)=σrr(ro)=0 และ∫ri^ro rσtt dr=m. ใช้ primitive เชิงวิเคราะห์ `−A ln r+B r²(ln r+1)+C r²` ต่างจากวิธี fit ด้วย quadrature เดิม Step2C; ตรวจซ้ำด้วย96-point integration รวม∫σttdr=0

กำหนด α=(1−ν²)/E, β=ν(1+ν)/E, K=4αB, f(r)=r[ασtt−βσrr−K]. Displacement:

```text
u = f(r) er + K r θ et − f(Rm) ex
Uy=0; er=(cosθ,0,sinθ); et=(−sinθ,0,cosθ)
Uexact = width × angle /(2E) × ∫ r[(1−ν²)(σrr²+σtt²)−2ν(1+ν)σrrσtt] dr
```

ตรวจ finite-difference gradient ของuกับ Hooke law เต็ม3D, divergenceของstress, radial traction, end resultants, energy และ force/moment equilibrium. ทุก Gauss stress ของ solver เทียบกับ displacement-gradient recovery; affine patches ตรวจ stress order/shear units. เก็บsolver/DLL hash และdependenciesของ helper Step2F

## เกณฑ์และพิกัดที่ตรวจ

- energy error≤2%; G2→G3 energy change≤2%; max displacement-vector errorที่จุดตรวจ/ค่าexact-vectorสูงสุด≤2%
- ปริมาตรerror≤0.1%, Jacobianบวก และตรวจ geometry deviation ที่ผิวตามจุดสุ่มของแต่ละelement (ไม่ใช่global maximum proof)
- Gauss-volume-weighted RMS error stressทั้ง6≤5%; ตัวหารmax(RMS exact,10kPa)
- 45พิกัดกายภาพร่วมต่อrun: θ22.5/45/67.5°, Y.375/.75/1.125, f=.1/.3/.5/.7/.9 วัดจากผิวใน
- inverse-mapเข้าทุกelementที่ครอบพิกัด; เก็บone-sided values,min,max,mean ไม่สร้างsmoothed field ไม่ extrapolateถึงผิว
- fixed-point component RMS, max-point errorและone-sided spread≤5%ครบทั้ง6ตัว โดยpoint/spreadหารmax(|exact|,10kPa)

เกณฑ์เป็น numerical diagnostic ไม่ใช่ วสท./capacity check; ไม่แทนเกณฑ์ Step2B/2E. Gauss RMS ไม่ใช่exact continuum normหรือpeak envelope. จุดตรวจไม่ครอบคลุม support/load edges และไม่ได้พิสูจน์ความถูกต้องทุกตำแหน่ง

## ผลจริงที่ G3 / ν=.20

| t (mm) | Model | energy error | fixed-point errorสูงสุด 6ตัว | ช่วงone-sidedสูงสุด | เกณฑ์couponครบ |
|---:|---|---:|---:|---:|---|
| 150 | H8-CHORD | 0.61759% | 91.113% | 276.772% | ไม่ครบ |
| 150 | H20-CHORD | 0.04007% | 1.694% | 0.337% | ครบ |
| 150 | H20-CURVED | 0.000496% | 1.894% | 0.293% | ครบ |
| 175 | H8-CHORD | 0.49834% | 80.935% | 174.187% | ไม่ครบ |
| 175 | H20-CHORD | 0.03981% | 1.557% | 0.372% | ครบ |
| 175 | H20-CURVED | 0.000655% | 1.304% | 0.337% | ครบ |
| 200 | H8-CHORD | 0.44151% | 73.138% | 116.511% | ไม่ครบ |
| 200 | H20-CHORD | 0.03940% | 1.424% | 0.405% | ครบ |
| 200 | H20-CURVED | 0.001004% | 1.218% | 0.376% | ครบ |

ν=0 control H20-CURVED/t175/G3 ผ่านด้วย: energy0.000362%, max-point1.589%, spread0.227%. รวม7/10กลุ่มผ่านเกณฑ์สุดท้ายที่กำหนด; coarse G1/G2 ไม่ถูกยกระดับเป็นผ่าน

สำหรับ H20-CURVED/t175/G3: Gauss RMS errorของσtt≈0.135%,σrr≈1.334%,τrt≈0.0444% (τrt exact=0 จึงหาร10kPa). ความเค้นรัศมีจริงไม่เป็นศูนย์ในเนื้อชิ้นแม้ผิวรัศมี traction-free เช่นf=.30,θ45°,Y=.75: exact σrr=−27.8066kPa; FE≈−27.4443kPa. ค่านี้เป็นผลจากโมเมนต์ทดสอบ ไม่ใช่แรงในโมดูล

Geometry G3: sampled radial deviationคอร์ด≈0.12047mm; quadratic≈0.00000340mm. ตัวเลขเล็กนี้เป็นความคลาดเคลื่อนแบบจำลอง ไม่ใช่ toleranceการหล่อที่ต้องทำได้. Quadraticลดenergy/geometry errorชัด แต่ไม่ได้ทำให้ทุกlocal metricดีกว่า chordทุกmesh (เช่นmaxpointของt150) จึงยังต้องตรวจหลายเกณฑ์พร้อมกัน

## ข้อสรุปและงานถัดไป

หลักฐานในชิ้นทดสอบสนับสนุนการเริ่ม **TS-C quadratic-solid bay revisionใหม่** ที่t175/F-R/FULLและLEFT พร้อมgeometry/load mappingแบบconsistent ตรวจgravityและfree-side effectsที่couponไม่มี รวมทั้งlocal stationsและone-sided spreadเดิม

ยังต้องตรวจครบก่อนเลือกความหนาหรือออกแบบเหล็ก/จุดต่อ: support/crown idealization, ช่องเปิด, ร้าว, ลม/แรงยก/สภาวะยกประกอบ, code load review และผู้รับผิดชอบตรวจ. `full_bay_quadratic_validation=NOT_RUN`, `whole_model_local_stress_convergence=NOT_ESTABLISHED`. การผ่านcouponไม่เปิด Step3/4 อัตโนมัติตาม skill precast-modular-workflow

## ไฟล์ตรวจย้อนกลับ

- [ผลรวม](../../output/tsc-step2g-r00/curved_results.json), raw30ไฟล์ในโฟลเดอร์เดียวกันเก็บnodes/displacement/loads/Gaussและ45fixedpoints/ชุด
- [สคริปต์](../../tools/tsc-study/curved_study.py), [tests](../../tools/tsc-study/curved-results.test.mjs), [renderer](../../tools/tsc-study/render_curved.mjs)
- [ภาพFBD/geometry](../../output/tsc-step2g-r00/TS-C-CURVED-FBD-S2G-R00.png), [ภาพprofile/QA](../../output/tsc-step2g-r00/TS-C-CURVED-QA-S2G-R00.png)
- [OpenSees20-node source](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/element/brick/Twenty_Node_Brick.cpp), [shape/Gauss order](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/element/UP-ucsd/shp3dv.cpp)

ใช้solverเฉพาะinternal study ไม่แจกจ่ายsolverหรือPDFมาตรฐานในเว็บ ภาพเป็นdeterministicผลคำนวณ ไม่มีAIheatmap. ไม่มีการเลือกวัสดุจริงหรืออนุมัติวิศวกรรม/ปล่อยผลิต
