# P131 — ตาข่ายรายชิ้นส่วน L/U ครบ32แบบ

ต่อจาก P130-R1 ตามเป้าหมายขั้น7ครบ48แบบ ไม่เปลี่ยนแบบชิ้นงาน ไม่เริ่มขั้น8

## ส่งมอบและขอบเขตตรวจ

- L16แบบ ×31ชิ้น และ U16แบบ ×54ชิ้น รวม1,360 physical parts
- ครบ7ชนิด: SHELL, FLOOR, END, NODE_WALL, NODE_ROOF, CAP, FASCIA
- ทุกแบบมี `part-mesh.json`, `PM-…-PARTS-GEOMETRY.STD`, `mesh-quality.json`, `verification.json`
- รวมหลักฐานที่ `output/staad-p7-p131/verification-index.json` พร้อมsource/mesh/STD hashes
- STDเป็น **geometry-only รายชิ้นแยกกัน** ไม่มีmaterial/support/load/analysis/RC ไม่ใช่ไฟล์อาคารพร้อมรัน

## วิธีทำ

SHELL ใช้ตาข่ายType Iเดิมเฉพาะเมื่อtypical tag, source hash และชุดพิกัดผิวคอนกรีตในlocal coordinatesตรงกันทั้งหมด แล้วหมุน/เลื่อนด้วยtransformต้นทางจริง ไม่ใช้boundingboxหรือภาพแทนรูปทรง ช่องเปิดจึงอยู่ตามแต่ละชิ้น ไม่ใช้ค่าuseเดียวครอบทุกแบบ

ชิ้นแบนอื่นหาcapที่ขนานและระยะตั้งฉากตรงความหนาจากsolid facesต้นทาง แปลงเป็นmid-surfaceแล้วใช้constrainedtriangulation `pq25a10000Q` ตรวจboundaryและปริมาตรกับทั้งsource quantityและsolid faces ไม่เพิ่มคอนกรีตในพื้นบากมุมหรือประตู

FASCIAมีขอบบนลาดผ่านความหนา จึงตัดsolidจริงที่ครึ่งความหนา ไม่เลื่อนouter faceทั้งแผงมาเป็นmid-surface ตรวจปริมาตรที่ได้คงเดิม ในบริเวณขอบลาด plateเป็นการidealizeด้วยหน้าตัดกึ่งกลาง ไม่ใช่solid FEM ของรายละเอียดขอบ

ตัวตรวจช่องเปิดปรับจากแกนโลกตายตัวเป็นทิศจากopening corners และตรวจเฉพาะelementที่ขนานกับผิวช่องเปิด รองรับปีกหมุน90°และผนังเอียงD ทดสอบnegative regression4กรณีโดยจงใจใส่elementปิดช่องจริงแล้วต้องตรวจพบ: ผนังปีกX, ENDหมุน90°, ผนังเอียงD, ผนังปีกY ผ่านครบ

## ผลตรวจ

- ข้อบกพร่องtopology/opening0; quality screening flags0 ทั้ง32แบบ
- แต่ละphysical partมีmeshต่อเนื่องภายในชิ้น; node/element IDsไม่ซ้ำ, incidenceอยู่ในชิ้นที่ถูกต้อง
- ตรวจareaแต่ละelementจากพิกัดซ้ำ และตรวจvolumeด้วยsolid facesแยกวิธี
- ความต่างมวลmeshกับsource quantityสูงสุด0.046242kgต่อชิ้น; กับfaceted solidสูงสุด0.104623kgต่อชิ้น ต่ำกว่าเกณฑ์0.5kgเดิมของP123
- source openings/transform/มิติ/ความหนาไม่ถูกแก้
- ไม่ได้ตรวจว่าตาข่าย32ชุดnativeรันผ่าน; P130 native12แบบยังเป็นหลักฐานแยก ไม่ยกมาใช้รับรองP131

## งานที่ต้องต่อ

การต่อเนื่องภายในชิ้นไม่ใช่การต่อเนื่องระหว่างชิ้น ต้องสร้างcompatible boundaries/joint map โดยเฉพาะโหนดL/Uและพื้นบาก, เชื่อมคาน/บ่ารับตามload pathที่ระบุ และกำหนดDOF/contact/stiffnessก่อนส่งsolver

CAP/FASCIA/NRยังต้องกำหนดระบบรองรับจริงและวัสดุคั่นช่อง ไม่ให้auto nearest-nodeหรือrigid linkที่ไม่ได้ระบุสร้างการรับแรงขึ้นเอง ทะเบียนกันน้ำP34เป็นพื้นที่ประสาน ไม่ใช่แบบรอยต่อรับแรงที่อนุมัติ

ยังคงเงื่อนไขP105: material/joints/coverage/code load cases/convergence/RCไทยและAU/แรงฐานราก/รายการคำนวณยังต้องทำต่อ ไม่ให้ตาข่ายครบแทนการวิเคราะห์ครบ

งานย่อยตาข่ายรายชิ้น L/U32/32=100%; ขั้น7/8ตาม20gatesP105ยัง5%; final analysis0/48 และRC0/48; engineeringApproved=false, productionReleased=false

Scripts: `tools/modular-program/stage7-lu-part-mesh-p131.py`, `verify-lu-part-mesh-p131.mjs`; ใช้ `stage7-mesh-quality-p111.mjs` ที่เพิ่มการตรวจopeningตามทิศจริง
