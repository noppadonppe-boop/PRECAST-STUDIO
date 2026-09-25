# P117 — ตรวจเอกสาร AU ที่มีจริงและทางไปสู่การออกแบบ

ขั้น7/8 =5%; gate2และgate4ยังไม่ครบ ไม่เพิ่มคะแนนจากทะเบียนฉบับมาตรฐาน

ใช้Skill precast-modular-workflow และpdf อ่านNCC2025VolumeTwoฉบับผู้ใช้ ไม่สรุปจากชื่อไฟล์อย่างเดียว ตรวจภาพตารางหน้า208/215เทียบข้อความแล้ว รายละเอียด/hash/page/clauseอยู่ในSTAGE7_CODE_BASIS_P117.json

## ผลที่เปลี่ยนแนวทางถัดไป

1. กลุ่มOffice12แบบต้องพิจารณาClass5 และCafe12แบบClass6เป็นฐานเบื้องต้น ตามA6G6/A6G7 หน้า63 ต้องมีVolumeOneประกอบ; ไม่ใช้Housingเป็นทางออกแบบร่วม48แบบ
2. HomeเสนอClass1aได้เฉพาะเงื่อนไขsingle dwelling ส่วนResortยังสรุปclassจากชื่อไม่ได้ ต้องดูจำนวนที่พัก/ผู้พัก/การใช้งานและการจัดวางจริง A6G2-A6G4 หน้า58–63; ไม่รวมงานสถาปัตย์/fireใหม่เข้าขั้น7 เพียงกำหนดbasisที่มีผลต่อโครงสร้าง
3. ตารางหน้า208ระบุAS/NZS1170.0:2002(Amd1,3,4),1170.1:2002(Amd1,2),1170.2:2021(Amd1,2),1170.3:2003(Amd1,2),และAS1170.4:2024 ไม่ใช้earthquake editionเก่าโดยอัตโนมัติ
4. หน้า215ระบุAS3600:2018(Amd1,2) ต้องตรวจการรองรับamendmentsของRCDCด้วย ไม่ถือชื่อAS3600-2018ในเมนูเป็นหลักฐานว่ารองรับครบ
5. ข้อมูลนี้คือฉบับที่NCCไฟล์ผู้ใช้อ้าง ไม่ใช่ยืนยันการบังคับใช้ปี2025ในทุกState/Territory วันยื่นจริงยังต้องตรวจ

## สิ่งที่ยังขาดอย่างมีนัยสำคัญ

ค้นรายการไฟล์ในโครงการที่เกี่ยวกับมาตรฐานแล้ว มีNCCสามเล่มและวสท. แต่ยังไม่พบACI318-19ฉบับเต็ม,AS3600/1170ฉบับเต็มหรือNCCVolumeOneในชุดมาตรฐาน ไม่ถือPDFตัวอย่างACIหรือonlinecatalogเป็นข้อกำหนดออกแบบ
ได้ขอตำแหน่งเอกสารจากผู้ใช้และเสนอการส่งregionalcoverageเป็นตารางขอบเขตที่ต้องตรวจเทียบที่ตั้งจริง รอคำตอบ ไม่ลดขอบเขตไทย/AUเอง ไม่รับรองใช้ได้ทั่วประเทศแบบไม่มีข้อจำกัด

งานที่ทำต่อได้ระหว่างรอ: joint topologyและtrial sensitivityที่ติดป้ายชัด, shell-beam loadpath, ตรวจnativeanalysis ไม่ทำRCcodePASSจากสูตรจำหรือใช้codeคนละฉบับแทน

แหล่งprimaryออนไลน์ประกอบการค้นหา:
- https://ncc.abcb.gov.au/ncc-navigator/building-classifications
- https://ncc.abcb.gov.au/resources/videos/ncc-tutor-lesson-understanding-building-classifications-0
- https://www.concrete.org/Portals/0/Files/PDF/Previews/318-19_preview.pdf (preview only)

ไม่มีการซื้อเอกสาร ไม่มีการเผยแพร่PDFของผู้ใช้ ไม่แก้ไฟล์NCCต้นฉบับ ไม่มีผลRCหรือproductionrelease
