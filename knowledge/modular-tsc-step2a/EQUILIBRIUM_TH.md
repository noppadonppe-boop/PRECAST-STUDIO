# FBD / Equilibrium notebook — TS-C S2A-R00

**DRAFT / CONDITIONAL 2D BENCHMARK / NOT FEM / NOT DESIGN APPROVAL**

## 1. สัญลักษณ์และหน่วย

B=3m, H=3m รวมพื้น, L=1.5m, R=0.4m; t คือความหนาซีก, t_f คือความหนาพื้น (กริดศึกษารอบนี้ t=t_f แต่ไม่ได้เลือกค่าจริง)

γ=ρg/1000 หน่วย kN/m³, ρ kg/m³, g=9.80665m/s²; γ ยังไม่เลือก

แกน X ข้ามความกว้าง, Y ตามยาว, Z ขึ้น เป็น right-handed. โมเมนต์ +My ของแรงที่พิกัดสัมพันธ์ (dx,dz) คือ dz Fx−dx Fz ไม่ใช้เครื่องหมาย CCW ในภาพ X–Z โดยไม่แปลงแกน

## 2. ปริมาตรและ centroid

ให้ r=R−t, h_w=H−R−t_f, l_f=B/2−R

```text
A_wall = t h_w
A_arc  = π (R² − r²)/4
A_flat = t l_f
V_half = L (A_wall + A_arc + A_flat)
V_floor = B L t_f

k_arc = 4(R³−r³) / [3π(R²−r²)]
(x,z)_wall = (t/2, t_f + h_w/2)
(x,z)_arc  = (R−k_arc, H−R+k_arc)
(x,z)_flat = ((R+B/2)/2, H−t/2)
(x_G,z_G) = Σ A_i (x_i,z_i) / Σ A_i
```

Centroid ของวงแหวนคำนวณจากปริมาตรจริง ไม่แทน centroid ด้วยกึ่งกลางเส้นโค้งอย่างเงียบ ๆ

## 3. Loads ที่ใช้ใน benchmark เท่านั้น

Roof LL ผู้ใช้: 50kgf/m² =0.4903325kN/m² สมมติลงแนวดิ่งบนพื้นที่ฉายราบ B×L=4.5m² จึงได้ P_full=2.20649625kN; แต่ละครึ่ง P=1.103248125kN ที่ X=B/4 และ 3B/4

ถ้า final area basis เปลี่ยน ผลนี้และ reaction coefficients ต้องเปลี่ยนตาม ห้ามนำ q ของพื้นที่ฉายไปคูณพื้นที่ผิวโค้งตรง ๆ จน load resultants เพิ่ม

Floor LL ผู้ใช้: 150kgf/m² =1.4709975kN/m²; gross-area reference 4.5m² ให้ 6.61948875kN ส่วน clear strip ของแต่ละ t ให้ค่าต่างกันซึ่งแยกเก็บใน JSON ยังไม่ตัดสินใจว่าตัวใดเป็น tributary/occupancy area ตามข้อกำหนด

น้ำหนักแต่ละซีก W_L=W_R=γV_half; น้ำหนักพื้น W_F=γV_floor เมื่อใช้วัสดุเดียวกัน (ถ้าวัสดุต่างกันใช้ γ ของแต่ละชิ้น) ไม่มี SDL หรือ prestress ใน benchmark นี้เพราะยังไม่กำหนด ไม่ได้แปลว่าโหลดเหล่านั้นเป็นศูนย์ในแบบจริง

## 4. FBD ของ interface จริง — ยังไม่เลือกความแข็ง

บน LH ให้ base actions เป็น B_Lx,B_Lz,M_Ly; crown actions Cx,Cz,CMy. บน RH crown actions เป็น −Cx,−Cz,−CMy ที่ reference point เดียวกัน

ให้ a=t/2, d=B/2−a, h=H−t/2−t_f และ arm ของน้ำหนักจากฐานซ้าย x_G−a

```text
LH:
  B_Lx + Cx = 0
  B_Lz + Cz − W_L − P_L = 0
  M_Ly + CMy + h Cx − d Cz
    + (x_G−a) W_L + (B/4−a) P_L = 0

RH (about right base; mirror x_G):
  B_Rx − Cx = 0
  B_Rz − Cz − W_R − P_R = 0
  M_Ry − CMy − h Cx − d Cz
    − (x_G−a) W_R − (B/4−a) P_R = 0
```

สมการนี้ยังไม่พอระบุ force sharing ของระบบ rigid/semi-rigid ต้องใช้ compatibility และ stiffness/contact. ค่าโมเมนต์ไม่ถูกตั้งศูนย์ใน joint register จริง

FBD ของ LH+RH รวมกันตัด crown actions ออก เนื่องจากเป็นแรงภายใน ส่วน base actions ยังคงมีทั้งแนวดิ่ง แนวนอน และโมเมนต์ตามระบบจริง

FBD ของพื้น: ถ้า LP-B ให้แรงจากผนังเป็น −B_L,−B_R และคู่โมเมนต์ตรงข้าม โดยเพิ่มน้ำหนักพื้น/LL แล้วส่งไป foundation; ถ้า LP-A ให้แยกเส้นทางเปลือกกับพื้นแต่ตรวจความเข้ากันได้และ stability ของระบบรวม ยังไม่กำหนดตำแหน่ง supports ตามลูกศร schematic ของพื้น

## 5. แบบจำลองสามบานพับ P3 เพื่อเช็กสมดุล

**ข้อสมมติพิเศษเฉพาะ benchmark**: ฐานซ้าย/ขวาเป็น pin ที่ยึด X/Z; crown เป็น hinge ปล่อย My; M_Ly=M_Ry=CMy=0. ไม่ครอบคลุมการเคลื่อนที่ Y/torsion/out-of-plane หรือ connection capacity

ให้ S=B−2a, loads_j เป็นน้ำหนัก/แรงดิ่งลงที่พิกัด x_j

```text
R_Rz = Σ[(x_j−a) load_j] / S
R_Lz = Σload_j − R_Rz
Cz   = W_L + P_L − R_Lz
H_thrust = [(x_G−a) W_L + (B/4−a) P_L − d Cz] / h
R_Lx = +H_thrust
R_Rx = −H_thrust
Cx on LH = −H_thrust
```

ฐานต้องมีเส้นทางรับแรงแนวนอนตามสมมติฐานนี้ การเปลี่ยนฐานเป็น roller/ปล่อย X โดยไม่มี tie ที่ออกแบบอาจเปลี่ยนระบบเป็น mechanism จึงห้ามใช้ผลนี้กับฐานจริงโดยไม่ตรวจ

### ตัวอย่างกริด t=t_f=175mm (ยังไม่เลือก)

โหลดสมมาตรบนหลังคาเต็มพื้นที่ฉาย:

```text
R_Lz = R_Rz = 1.054166886 γ + 1.103248125       kN
R_Lx = −R_Rx = 0.096076414 γ + 0.266996122     kN
Cx(LH) = −R_Lx
Cz(LH) = 0  (เพราะสมมาตรใน benchmark นี้เท่านั้น)
```

ลง Roof LL เฉพาะครึ่งซ้ายโดยคง self-weight ทั้งสองข้าง:

```text
R_Lz = 1.054166886 γ + 0.844521795             kN
R_Rz = 1.054166886 γ + 0.258726330             kN
R_Lx = −R_Rx = 0.096076414 γ + 0.133498061     kN
Cz(LH) = +0.258726330                        kN
```

นี่แสดงว่า crown shear ไม่เป็นศูนย์ทั่วไปแม้รูปทรงสมมาตร จึงห้ามถอดบทบาท shear ของ joint จากกรณี full uniform load กรณีเดียว ค่าสัมประสิทธิ์อื่นและทุกกริดเก็บใน `study_results.json`

ยังไม่มี N/M/Q ของ shell และไม่แปลงแรงรวม benchmark นี้เป็นแรง bolt โดยหารจำนวนที่ยังไม่ออกแบบ ไม่มี load factor หรือ capacity check ในสมการชุดนี้

## 6. การตรวจผล

ตรวจแรงและโมเมนต์ residual ของ LH, RH และระบบรวมแยกกัน รวมทั้ง numeric quadrature ของ centroid. ผ่านการตรวจสมการในชุดทดสอบ ไม่ใช่การตรวจแรงภายในตามมาตรฐาน วสท.

ก่อนวิเคราะห์ 3D ให้กำหนด local axes/normal อย่างต่อเนื่อง, ใช้ mesh refinement, ตรวจ singularities และเปรียบเทียบ shoulder/joint กับ solid formulation ตามประเด็น t/R_m ใน README; รัน gravity-only ไม่ใช่การรับรองลม แผ่นดินไหว การยก หรือการประกอบ
