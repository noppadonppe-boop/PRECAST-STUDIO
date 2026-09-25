# TS-C Step 2F — ตรวจ element ด้วยคำตอบ elasticity ที่ทราบ

สถานะ `COUPON_BENCHMARK_NOT_FOR_DESIGN` / S2F-R00 / 16 กันยายน 2026

ต่อจาก [Step 2E](../modular-tsc-step2e/README.md) ซึ่งพบว่าความเค้นเฉพาะที่ยังไม่เข้าเกณฑ์ครบ รอบนี้ทดสอบ **ชิ้นตรง** ไม่ใช่การรันโมดูล TS-C ใหม่ และไม่เปลี่ยนผล/เกณฑ์เดิมย้อนหลัง

## ฐานและขอบเขต

- L=1.50m, b=0.25m, t=0.175m; x ตามยาว, y ตามกว้าง, z วัดจากกลางความหนา
- ใช้ E=28,321.786532937494MPa, ν=0.20 จากกรณีศึกษาเดิม; linear isotropic/uncracked ไม่มี self-weight, prestress, รอยต่อ หรือเหล็ก
- กรณี M: โมเมนต์ปลาย +1kNm รอบ Y; กรณี V: แรงปลาย −1kN ตาม Z
- Uy=0 ทุก node; กรณี consistent traction มีสนามที่ไม่เปลี่ยนตาม y จึงเป็น plane strain ไม่ใช่ขอบข้างอิสระแบบ solid bay
- ที่ x=0 กำหนด ux/uz ตามคำตอบ exact รวม warping ของหน้าตัด **ไม่ใช่ฐานยึดแน่นแบบแข็ง**; ต้องใช้ BC นี้จึงเปรียบเทียบคำตอบด้านล่างได้
- เปรียบเทียบ stdBrick 8-node และ 20NodeBrick 20-node โดยไม่เพิ่ม dependency หรือแจกจ่าย solver
- [basis.json](basis.json) กำหนด geometry/mesh/BC/load/เกณฑ์ก่อนรันผล 28 กรณี (24 benchmark + 4 load-mapping sensitivity) มี affine patch อีก 2 กรณี

## คำตอบอิสระและการตรวจสมการ

คำตอบต่อไปนี้ derive สำหรับ boundary value problem นี้โดยตรง ไม่ใช่การอ้างสูตรคาน Euler–Bernoulli ให้แทน 3D elasticity

กำหนด I=bt³/12, c=t/2, a=(1−ν²)/E, d=ν(1+ν)/E, e=(1+ν)/E. หน่วย m,kN,kPa; tension บวก; shear เป็น physical stress. Uy=0, σyy=νσxx, σzz=τxy=τyz=0.

### M — pure bending

ให้ k=M/I:

```text
σxx = k z, τxz=0
ux = a k x z
uz = −a k x²/2 − d k z²/2
Uexact = a M² L/(2I)
```

สนาม displacement เป็น quadratic: 20-node สามารถ represent กรณีชิ้นตรงนี้ได้; 8-node trilinear ไม่สามารถ represent เทอม x² และ z² ได้ครบ ความเค้นเฉือนที่ไม่เป็นศูนย์ใน FE เป็น discretization error ในกรณีนี้ ไม่ใช่แรงเฉือนจริงจากสูตร exact

### V — bending + parabolic shear

ให้ k=V/I โดย V=+1kN เป็นขนาดของแรงปลายที่ชี้ −Z:

```text
σxx = k(L−x)z
τxz = k(z²−c²)/2
ux = a k(Lx−x²/2)z + k(e−d/2)z³/3
uz = −d k(L−x)z²/2 − a k(Lx²/2−x³/6) − e k c²x
Uexact = a V² L³/(6I) + e V² b L 4c⁵/(15I²)
```

∂xσxx+∂zτxz=0, ∂xτxz+∂zσzz=0; ที่ผิว z=±c traction เป็นศูนย์; ที่ x=L traction=[0,0,τxz]. ∫bτxz dz=−V. Displacement มีเทอม cubic จึงไม่คาดให้ 20-node exact ทุก mesh

สคริปต์ตรวจ displacement gradient ด้วย central difference, constitutive law เต็ม3D, divergence ของ stress, force/moment resultant, work-energy รวม reaction×prescribed displacement, positive Jacobian และทุก Gauss stress เทียบกับ displacement recovery แยกจาก solver มี affine patch ที่กระตุ้น shear ครบ3ตัวเพื่อยืนยัน stress order `[xx,yy,zz,xy,yz,zx]`

## Mesh และเกณฑ์ที่ใช้

| Mesh | nx | ny | nz | สิ่งที่เปลี่ยน |
|---|---:|---:|---:|---|
| Q1 | 6 | 1 | 2 | เริ่มต้น |
| Q2 | 12 | 1 | 2 | เพิ่มตาม x |
| Q3 | 24 | 1 | 2 | เพิ่มตาม x |
| Q4 | 24 | 1 | 4 | เพิ่มผ่านความหนา |
| Q5 | 48 | 1 | 4 | เพิ่มตาม x |
| Q6 | 48 | 1 | 8 | เพิ่มผ่านความหนา |

สอง formulation ใช้ element partition เดียวกัน แต่จำนวน node/DOF ต่างกัน **ไม่ใช่การเทียบความเร็วหรือต้นทุนเท่ากัน**. ny=1 เพียงพอสำหรับสนาม exact ที่ไม่เปลี่ยนตาม y แต่ไม่พิสูจน์ convergence ของ load-sensitivity ที่กระจายแรงไม่สม่ำเสมอ

เกณฑ์ coupon: error ของปลาย uz ≤2%, strain energy ≤2%, และ Gauss-volume-weighted RMS error ของ stress ทั้ง6ตัว ≤5%, ตัวหาร `max(RMS(exact component),10kPa)`. ใช้ integration points ของแต่ละ formulation ไม่ใช่ peak envelope หรือ exact continuum L2 norm; ห้ามอ่านค่าเปอร์เซ็นต์สูงใกล้ศูนย์เป็น capacity exceedance. เกณฑ์นี้ไม่แทนเกณฑ์ local point/spread ใน Step2E

## ผลจริง

Q6 / consistent traction:

| กรณี | element | error ปลาย uz | RMS error τxz | ผ่านเกณฑ์ coupon ครบ |
|---|---|---:|---:|---|
| M | 8-node | 1.3591% | 31.864kPa / ตัวหาร10kPa | ไม่ครบ |
| M | 20-node | ใกล้ precision เชิงตัวเลข | ใกล้ศูนย์ | ครบเฉพาะ coupon นี้ |
| V | 8-node | 1.3522% | 110.73% ของค่า RMS exact | ไม่ครบ |
| V | 20-node | 0.0000329% | 0.7715% ของค่า RMS exact | ครบเฉพาะ coupon นี้ |

24 consistent benchmarks: 8-node ไม่ครบทั้ง12; 20-node ผ่าน M ทั้ง6 และ V ที่ Q4/Q5/Q6 รวม9/12. นี่แสดงว่าการโก่งตัวใกล้ exact ไม่ได้รับประกัน local stress accuracy และการ refine เฉพาะ x ไม่เพียงพอในกรณีทดสอบนี้ ไม่ใช่หลักฐานว่าความผิดพลาดของ full curved bay มาจากสาเหตุเดียว

## Load mapping sensitivity — อย่าสับสนกับ exact benchmark

เพิ่ม V ที่ Q2/Q6 โดยแบ่งแรง −1kN เท่ากันให้ทุก end node: resultant และ first moment เท่าเดิม แต่ **traction distribution เปลี่ยน** จึงไม่ใช่ boundary value problem เดิม ไม่ให้คะแนน exact error/ผ่านเกณฑ์ และไม่ถือว่า equal-node คือการ integrate traction ที่ถูกต้อง

โดยเฉพาะ 20-node จำนวน/ตำแหน่ง node ตาม y ไม่เท่ากัน การแบ่งเท่ากันทำให้สนามเปลี่ยนตาม y และอาจมี τxy/τyz แม้ Uy=0. ชุดนี้จึงเป็น constrained-3D sensitivity ไม่ใช่ plane-strain exact validation; ny convergence ไม่ได้ตรวจ

Q6 20-node: tip เปลี่ยนเพียง0.0254% แต่ RMS difference τxz ใกล้ปลาย (x/L≥0.9) =10.309kPa, กลางช่วง (0.25≤x/L≤0.75) =0.000364kPa. Force equilibrium ที่ปิดได้จึงไม่พิสูจน์ว่า load distribution เหมาะกับ local stress; ตัวเลขนี้ไม่ใช่ correction factor ของ roof LL หรือ joint ในโมดูล

## การนำไปใช้และขั้นถัดไปที่ถูกต้อง

1. ทดลอง quadratic solid บน **curved coupon** ที่มี exact answer จาก Step2C ตรวจ orientation/Jacobian, curved geometry และ consistent load integration ใหม่
2. เมื่อผ่านแล้วจึงสร้าง TS-C bay revisionใหม่ เปรียบเทียบกับ stdBrick เดิมที่ตำแหน่งกายภาพร่วม พร้อม free-side/support/crown sensitivity; ไม่แทนผลเก่าด้วยการ relabel
3. ต้องปิด local QA, รอยต่อจริง/ช่องเปิด, แรงด้านข้าง/ยกประกอบ และ design basis/code load review ก่อน Step3 capacity/rebar/connection checks

ยังไม่เลือกความหนา/วัสดุ/เหล็ก/prestress ไม่อนุมัติวิศวกรรมและไม่ปล่อยผลิต ภายใต้ skill precast-modular-workflow แยก coupon verification ออกจาก module design approval อย่างชัดเจน

## แหล่งข้อมูลและไฟล์

- [stdBrick ทางการ](https://opensees.github.io/OpenSeesDocumentation/user/manual/model/elements/stdBrick.html)
- [20-node implementation v3.8.0](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/element/brick/Twenty_Node_Brick.cpp) และ [shape/Gauss order](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/element/UP-ucsd/shp3dv.cpp): อ่าน source จริงและยืนยันกับ affine patch; ไม่ใช้ stress-order จากคู่มือ Brick20N เก่าที่อาจเป็นคนละimplementation
- [ผลทั้งหมด](../../output/tsc-step2f-r00/benchmark_results.json): 28 summary, raw file hashes, basis, solver/DLL identity; rawแต่ละrunเก็บ nodes/displacements/loads/Gauss results
- [สคริปต์](../../tools/tsc-study/benchmark_study.py) และ [renderer](../../tools/tsc-study/render_benchmark.mjs)
- [ภาพคำตอบ/FBD](../../output/tsc-step2f-r00/TS-C-BENCHMARK-FBD-S2F-R00.png), [ภาพผลเทียบ](../../output/tsc-step2f-r00/TS-C-BENCHMARK-QA-S2F-R00.png)

OpenSees ใช้เฉพาะการศึกษา/ภายใน ตาม license ที่ตรวจใน runtime; ไม่บรรจุ solver ลงเว็บ/ผลิตภัณฑ์เพื่อแจกจ่าย ข้อความ/ภาพเป็น deterministic calculation output ไม่ใช่ภาพสร้างจำลองผลวิศวกรรม
