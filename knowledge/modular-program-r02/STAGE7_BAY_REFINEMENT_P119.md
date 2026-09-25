# P119 — ตรวจความไวต่อตาข่ายของ TS-C subassembly

ขั้น7/8 =5%; งานจริงเพิ่มคือ4nativeSTAADrunsและcomparisonกับ2runsของP118 ไม่ใช่whole-building analysis หรือRC design

## วิธีและเกณฑ์ก่อนรัน

คงรูปทรง/ช่องหน้าต่าง/ความหนา/วัสดุทดลอง/load/support/joint assumptions P118 ทั้งหมด แบ่งแต่ละquadเป็น4และทำซ้ำอีกครั้ง
จำนวนelements1304→5216→20864; supports30→58→114nodesตามideal wall-base bearingเดิม ไม่ใช่เพิ่มจำนวนฐานรากจริง
คงfacetsโค้งเดิม32ช่วงและปริมาตร/CGเดิม เป็นdiscretization refinementบนfacetedgeometryเดียว ไม่ใช่geometrycurvatureconvergence
กำหนดก่อนnativeรันในoutput/staad-p7-p119/refinement-plan.json: changeระหว่าง2ระดับสุดท้ายไม่เกิน5% สำหรับmaxdownward,basehorizontalresultant,crownMz; crownMnearzeroใช้absolute threshold0.01kNm แทนหารด้วยใกล้ศูนย์

## ผล

| กรณี | dลง1304/5216/20864elements(mm) | เปลี่ยนรอบท้าย | BaseHรอบท้าย(kN) | CrownMzLHรอบท้าย(kNm) |
|---|---|---:|---:|---:|
| Translation-coupled |0.894 /0.898 /0.900|0.2222%|1.92282|ประมาณ0|
| Rigid crown |0.208 /0.209 /0.210|0.4762%|0.71510|3.32124|

Globalmetricsที่ระบุผ่าน5%; ทั้ง4runsใหม่warnings0/errors0และผ่านforce/moment equilibriumเกณฑ์P118
QAmeshสองระดับใหม่defects0/qualityflags0 รวมช่องเปิด/normal/planarity/boundaryhangingnode checksที่checkerรองรับ

## ข้อสำคัญ: แรงpeakยังไม่คงที่

ปรับแรงทุกelementให้ใช้แกนเปรียบเทียบเดียวกันก่อน: xตามแนวยาวbay(STAADglobalZ), y=normal×x
Subdivisionทำให้startcornerบางchildหมุน90/180/270deg จึงห้ามเทียบnativeMxหรือQxโดยไม่แปลงแกน โค้ดassertรับเฉพาะquarter-turn transformationsนี้ ไม่เดาการหมุนมุมอื่น

หลังแปลงแกนแล้ว localpeakMyyรอบท้ายยังเปลี่ยนประมาณ14.75–14.89%; Qxเปลี่ยน47.50–48.31%; peakอยู่ใกล้มุมหน้าต่างตามพิกัดที่เก็บ
ดังนั้น **ไม่รับรองlocalforceconvergenceและไม่ใช้peakเหล่านี้จัดเหล็ก** การโก่งคงที่ไม่ใช่คำตอบเรื่องshear/window-cornerdesign
ต้องตรวจstressconcentrationด้วยstrip/cut resultantsที่ตรวจสมดุลและรายละเอียดมุมจริงตามcode ไม่smoothหรือทิ้งpeakเพื่อให้ผ่าน ไม่ยืนยันsingularityจากแนวโน้มอย่างเดียว

## แก้การตรวจhash

ตรวจพบP118verifierใช้hashของข้อความANLหลังdecodeUTF8ซึ่งไม่ตรงrawbytesเมื่อมีอักขระพิเศษของnativeoutput แก้เป็นraw-file SHA256แล้วสร้างderivedverification/resultantJSONใหม่ทั้ง3runfolders ค่าแรงไม่เปลี่ยน ไม่แก้STD/ANLต้นฉบับและไม่rerunเพื่อซ่อนความต่าง

## ไฟล์/หลักฐาน

- output/staad-p7-p119/refinement-plan.json
- output/staad-p7-p119/comparison.json
- output/staad-p7-p119/r1/runs/2050e93615c145a98417dcb3828a5b3c
- output/staad-p7-p119/r2/runs/b42607935c9e40988e0a18c486321a86
- tools/modular-program/refine-bay-p119.mjs
- tools/modular-program/compare-bay-refinement-p119.mjs
- runner/generator/verifier P118รองรับinputfolderเพิ่ม โดยdefaultยังเหมือนเดิม

ตรวจrun/spec/input/ANL/sourcehashทุกระดับก่อนcomparisonและคงrawnativeforces/localaxes/concurrentLCvaluesไว้ ไม่ใช้maxcomponentsคนละelementเป็นdesignvector

ยังต้องfullpilotloadpathคาน/ฐาน/END/floor/JO-BY,site/loads,codeclauses,RC/jointdesignและ48products2tracksตามP105ทั้งหมด; gate11whole-buildingยังไม่complete
wholeBuildingAnalysed0/48,RC0/48,engineeringApproved=false,productionReleased=false
