# P114 — แก้การแบ่งคานนำร่องและตรวจการรักษาสมดุล

2026-09-18; ขั้น7/8 ยัง5% ตาม20gatesของP105 ไม่ใช่เปอร์เซ็นต์ความปลอดภัย

## สิ่งที่แก้จริง

P113 แบ่งคานตามทุกprojectionของshell/floorร่วมกับgrid250mm เกิดสมาชิกสั้นที่สุด1.25mm แม้ไม่มีความยาวศูนย์ จึงแก้โดยแบ่งแต่ละช่วงระหว่างจุดรองรับให้ยาวใกล้เคียงกัน ไม่เลื่อนตำแหน่งฐานหรือขอบคานเพื่อแก้mesh

- คงแกนคานP108ที่ผู้ใช้อนุญาต ความยาวรวม17m และฐาน6ตำแหน่งของI-C1
- จาก216members เป็น70members/70nodes; ยาว239.583333–250mm
- คงshell/floor/end P112 ทุกพิกัดและelement ไม่แก้ขนาดชิ้นงาน
- คง188seat-node candidates; projectionตกภายในสมาชิกคานแทนบังคับสร้างnodeทุกprojection
- จุดรับใกล้มุมที่มีหลายcandidateยังไม่เลือกการแบ่งแรง ห้ามลงแรงเต็มซ้ำทุกcandidate
- ระดับcentroidคานZ=-200mmยังเป็นtrial ไม่ใช่การอนุมัติระดับบ่ารับจริง

## การตรวจ

ตรวจclosed loop degree2, ความยาว17m, จุดรองรับครบตรงตำแหน่ง, ความยาวสมาชิก200–250mm และprojection reconstruction

ตรวจ808กรณีแรง/โมเมนต์สมมติ โดยใช้ตำแหน่งเมตรและแรงkN: ย้ายแรงจากsourceไปprojectionพร้อมเพิ่มโมเมนต์ r×F แล้วแจกresultantตามgeometric weightsสองปลาย ตรวจsumFและsumMรอบจุดกำเนิด ผลคลาดเคลื่อนสูงสุด8.89e-16kNและ1.03e-14kN·m

นี่เป็นเพียงoperatorรักษาสมดุลสำหรับเตรียมข้อมูล ไม่ใช่beam bending interpolation หรือstiffness coupling ไม่ใช้แทนcompatibilityของshell–beam ไม่ได้พิสูจน์ความแข็ง/กำลังของบ่ารับหรือconnector ค่าทดสอบไม่ใช่แรงอาคาร

## ไฟล์

- tools/modular-program/stage7-beam-discretization-p114.mjs
- output/staad-p7-p114/beam-joint-map.json
- output/staad-p7-p114/PM-I-C1-BEAM-SHELL-GEOMETRY.STD
- output/staad-p7-p114/verification.json

เก็บP113เดิมไว้ตรวจย้อนหลัง STDใหม่เป็นgeometry only ไม่มีคำสั่งวิเคราะห์/support DOF/material/load ไม่อ้างว่ารันอาคารผ่าน

## งานหลักที่ต้องทำต่อ

กำหนดและตรวจinterface coupling/DOF/contactรวมบ่ารับและEND, กำหนดtrial materialและload basisอย่างเปิดเผย, ทำpilot solveและmesh convergence จากนั้นRCdesignตามข้อจริงของมาตรฐาน ค่าความแข็งที่ยังไม่ทราบไม่ใส่ศูนย์หรือrigidแทนโดยพลการ

วิเคราะห์อาคารจริง0/48 ออกแบบRC0/48; engineering_approved=false; production_released=false ไม่เปิดขั้น8
