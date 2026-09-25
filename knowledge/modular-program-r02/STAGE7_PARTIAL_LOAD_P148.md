# P148 — ตรวจการส่งโหลดที่ขอบพื้นที่ไม่ตรงกับเส้น mesh

วันที่ 2026-09-21 | ขั้น 7/8 | `PASS_DOMINANT_PARTIAL_BOUNDARY_ONLY`

## ที่มาและกรณีตรวจ

ต่อจาก P147 ซึ่งผ่านเฉพาะ plate ที่รับแรงเต็มช่อง รอบนี้ใช้พิกัดจริงของ finish บน `PM-I-C1-I-S01-F` จาก P145 โดยแนวขอบหลักของ finish อยู่ห่างขอบพื้น 152.5 มม. สร้างแผ่นทดสอบ 2.660 × 1.485 ม. หนา 175 มม. และเปรียบเทียบ:

1. mesh ปกติที่แนวโหลดตัดผ่านกลาง plate ใช้ exact bilinear nodal integration;
2. reference mesh ที่แบ่งตรงแนวโหลด ใช้ native STAAD plate pressure.

ทั้งสองเป็นแผ่นแยกรองรับแนวดิ่งตามขอบสี่ด้าน ใช้ E=30 GPa และ Poisson=0.2 ตาม benchmark เดิม ไม่ใช่ load path หรือ material design value ของอาคารจริง ใช้ amplitude 1,000 kN/m² เพื่อความละเอียดของผลพิมพ์แล้วหารกลับเป็นผลต่อ 1 kN/m²; ไม่ใช่โหลดก่อสร้างหรือการตรวจ nonlinear/capacity

## การแก้ปัญหา mesh 3 มม.

การทดลองแรกบังคับ reference mesh ให้ตรงขอบ finish ทุกด้าน รวมระยะเยื้อง 3 มม. ทำให้เกิด plate แถบแคบอัตราส่วนด้านสูง STAAD รายงาน `badly shaped` และหยุดรับผล จึงไม่ฝืนผ่าน warning

P148 ที่ยอมรับตรวจเฉพาะแนวขอบจริงหลัก 152.5 มม. โดยให้โหลดเต็มความกว้างและถึงขอบตรงข้าม ส่วนแนวเยื้อง 3 มม. สามด้านของ patch จริงยังอยู่ใน P146 exact mapping แต่ **ยังไม่ผ่าน aligned-reference validation** และต้องใช้ refinement ที่ไม่สร้าง element ผิดรูปในงานถัดไป

## เกณฑ์และผล

เกณฑ์กำหนดก่อนรัน: residual แรง <1 N, โมเมนต์ <2 N·m; ความต่างสองวิธีที่ mesh ละเอียดสุด <2%; การเปลี่ยนค่าจาก mesh รอบก่อน <2%; warning/error ต้องเป็นศูนย์

รัน native STAAD 8 โมเดล: unaligned/aligned ที่ 8, 16, 32 และ 64 divisions ทุกโมเดลจบด้วย warnings 0 / errors 0 และสมดุลผ่าน

| รายการที่รอบ 64 | ผลต่าง exact nodal เทียบ aligned native |
|---|---:|
| การโก่งกลาง | 0.0873% |
| โมเมนต์ใกล้กลางทิศที่ 1 | 0.1621% |
| โมเมนต์ใกล้กลางทิศที่ 2 | 0.1141% |

การเปลี่ยน mesh รอบ 32→64 สูงสุด 0.654% (aligned-native moment) ต่ำกว่าเกณฑ์ 2% ค่าต่อโหลดหน่วยรอบ 64: exact nodal โก่ง 0.003438 มม., โมเมนต์ใกล้กลาง 0.086978 และ 0.208840 kN·m/m; aligned-native 0.003435 มม., 0.086837 และ 0.208602 kN·m/m ค่า moment เป็น local plate axes และค่าเฉลี่ยสี่ element รอบกลาง ไม่ใช่ peak ที่แนวโหลดขาดช่วง

## หลักฐานและข้อจำกัด

- สรุปที่เก็บในโครงการ: `output/staad-p7-p148/spec.json` และ `output/staad-p7-p148/verification.json`
- generator/verifier/run scripts: `stage7-partial-load-p148.mjs`, `verify-partial-load-p148.mjs`, `run-partial-load-p148.ps1`
- STD/ANL/log ขนาดใหญ่รันที่ `C:/Users/Administrator/AppData/Local/Temp/Precast-P148-Runs/0a74857d2151434d8cbecb6a89932920/` เพราะไดรฟ์ E ไม่มีพื้นที่ว่าง; verification เก็บ hash ของ STD/ANL ทุกโมเดล แต่ temp path ไม่ถือเป็นที่เก็บถาวร
- ไม่มีการเลือกน้ำหนัก finish จริง, load combinations, joint stiffness, local peak acceptance หรือ RC design

ขั้น 7/8 ยัง 5% (1/20 acceptance gates); final analysis 0/48 และ RC design 0/48 งานนี้เป็น QA ย่อย ไม่ปิด gate ของ pilot หรือทั้ง 48 แบบ
