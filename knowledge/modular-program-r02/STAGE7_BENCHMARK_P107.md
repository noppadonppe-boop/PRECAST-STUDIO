# ขั้น7 P107 — Plate benchmark และขอบเขตความสามารถโปรแกรม

วันที่2026-09-18; ขั้น7ยังดำเนินการ ไม่อนุมัติวิศวกรรม/ผลิต ไม่เริ่มขั้น8
รอบก่อนหน้าเป็นprogress: แก้execution contextและbeam benchmarkผ่าน2รอบ

## Plate bending verification
ตัวสร้าง tools/modular-program/staad-plate-benchmarks.mjs
ตัวรัน tools/modular-program/run-staad-plate-benchmarks.ps1 (approved outside-sandbox execution only)
ตัวตรวจ tools/modular-program/verify-staad-plates.mjs
หลักฐาน output/staad-p7-p107/runs/e7eaffd608c64525bd9b5f4a33125caf/verification.json และ STD/ANL/log3ชุด

แผ่นทดสอบ3x3m หนา0.03m E30GPa nu0.2 รับแรง1kPa รองรับดิ่งทุกขอบ ปล่อยการหมุนดัด คุมDOFในระนาบเพื่อทดสอบpure bending ไม่ใช่boundaryของอาคาร
สมการอิสระ Navier double-sine series odd terms1..199 ให้wกลาง4.679830265mm
เกณฑ์กำหนดก่อนรัน: ผลmeshละเอียดสุดต่างทฤษฎี<2%, การเปลี่ยนจากmeshก่อนหน้า<2%, สมดุลแรงคลาดเคลื่อน<0.03kN

|Elements|Deflection mm|Total reaction kN|
|---|---|---|
|16|4.659|9.00000|
|64|4.752|8.99996|
|256|4.739|9.00000|

meshละเอียดสุดต่างทฤษฎี1.2644%, mesh64→256เปลี่ยน0.2736%; 0warnings/0errorsทุกชุด
ผลไม่ลู่เข้าแบบmonotonic ไม่อ้างว่าทดสอบmeshอื่นหรือshellcurved/openings/jointsแล้ว
รอบแรกพิมพ์แรงkNสองตำแหน่งทำให้ผลรวมที่อ่านคลาดเคลื่อนจากrounding; เพิ่มหน่วยพิมพ์เป็นNEWTONแล้วรันใหม่โดยไม่ผ่อนเกณฑ์
ตัวอ่านผลรองรับpaginationและตรวจจำนวนnodeครบ ไม่ใช้เฉพาะหน้าแรก

## Capability audit: ต้องแยกanalysisจากRCdesign
เครื่องมีSTAAD.Pro23.00.02.361 และRCDC23.00.03.63 (ตรวจfileversion; RCDCยังไม่ทดสอบnative design/license)
คู่มือติดตั้ง C:/Program Files/Bentley/Engineering/STAAD.Pro 2023/Help/:
- GUID-CE9B8200-B318-4B2A-86E1-F097C69D6790.html — D. Available Concrete Design Codes: batch ACIถึง2014, AustraliaAS3600-2001; RCDCมีACI318-2019และAS3600-2018
- GUID-7EFF3C71-5E50-4D92-8769-B723E26FC061.html — D1.F.6 Slab Design: legacyelementdesignเฉพาะACI2008และก่อนหน้า; ตรวจMx/Myกลางelement ไม่รวมmembrane/shear/twistingครบ
Bentley corroboration: https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0115379

ห้ามออกSTDแล้วอ้างCODE ACI2019/DESIGN ELEMENTว่าได้shellRCครบในbatchรุ่นนี้ ห้ามถอยไปACI2008แล้วติดป้าย2019
เส้นทางเป้าหมายคงเดิม: STAADวิเคราะห์beam/shell → RCDCสำหรับสมาชิกที่รองรับและตรวจได้ → calculationแยกตามACI318-19/AS3600สำหรับshell/joint/serviceabilityที่RCDCไม่ครอบคลุม ต้องมีข้อกำหนดมาตรฐานจริง
ยังไม่อ้างRCDCสามารถออกแบบโมเดลหลังคาโค้งโดยตรงทั้งหมด

## งานคงเหลือ/ข้อถามระหว่างทำงาน
- ยืนยันnormalweight/nonprestressedและcast-in-situ continuous edge beam (คำถามasyncส่งแล้ว; ยังไม่ถือเป็นคำตอบ)
- ขอแหล่งไฟล์ACI318-19, AS3600, ASNZS1170; NCC3เล่มไม่เท่ากับstandardฉบับเต็ม
- กำหนดjointDOF/loadpaths/แรงพื้นที่ก่อนใช้ผลเป็นdesign
- ตรวจmembrane benchmarkและการดึงresultants หน่วยN/M/Qให้ถูก แล้วสร้างpilotอาคารตามsource

ความคืบหน้าขั้น7ยัง5%: gate7เดินหน้าผ่านbeamและplatebendingแล้ว แต่RCDC/codeexecutionยังไม่verifiedจึงไม่ปิดgateทั้งหมด ไม่เปลี่ยนจำนวนอาคารวิเคราะห์0/48 หรือRC0/48
