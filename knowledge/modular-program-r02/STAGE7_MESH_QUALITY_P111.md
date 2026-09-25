# P111 — ตรวจ topology และปรับmeshบริเวณโค้ง

2026-09-18; รอบก่อนprogress: I-C1midsurface14ชิ้น. เป้าหมายยังขั้น7ครบ ไม่ปิดด้วยgeometry
ตรวจnodeบนedgeภายในชิ้น, edgeใช้งานเกิน2, ทิศnormalระหว่างelements, convex/coplanarและpolygonintersectionกับช่องเปิดจริง ไม่ใช่centroidอย่างเดียว
ผลP110: defectsรายการดังกล่าว0 แต่edge-length-ratio>10จำนวน1374elements; มากสุด963.77ที่END
เกณฑ์10เป็นqualityscreening ไม่ใช่ข้อกำหนดโค้ดหรือผลยืนยันconvergence

ปรับshelllongitudinalspacingจากmax250เป็นmax125mmในฉบับทดลองใหม่ คงP110เดิมไม่เขียนทับ:
- output/staad-p7-p111/refined/pilot-mesh.json
- output/staad-p7-p111/refined/PM-I-C1-GEOMETRY-ONLY.STD
- output/staad-p7-p111/refined-quality.json
ได้6084nodes5416elements ปริมาตรสัมพันธ์sourceเท่าเดิม; defects0; qualityflagsเหลือ94บริเวณแผงEND ต้องแก้meshingแผงปลายก่อนใช้เป็นฐานanalysis
sourceP36ไม่แก้ geometryหลักไม่เปลี่ยน. ไม่ใช้ผลPASStopologyกลบqualityflags ไม่อ้างJacobianที่ยังไม่คำนวณ

เครื่องมือ:
- tools/modular-program/stage7-mesh-quality-p111.mjs รับinputและoutputpathเพื่อตรวจแต่ละrevision
- generatorP110เพิ่มoutputdirectoryและlongitudinalMax parameter เพื่อเก็บผลเก่า

ถัดไปแก้sliverที่เกิดจากgridclippingตามขอบโค้งEND แล้วbeam/jointcouplingภายใต้designbasisที่ยืนยัน; ข้อรอมาตรฐานและวัสดุยังไม่ถือว่ามีคำตอบ
ขั้น7/8ยัง5%; gate8ยังไม่ครบ. ไม่รันไฟล์geometryแยกชิ้นเป็นอาคาร ไม่มีผลแรง/RCแทนข้อมูลที่ขาด
