# P115 — ตาข่ายนำร่องที่จับคู่ขอบรอยต่อได้

ขั้น7/8 IN_PROGRESS 5%; วิเคราะห์อาคาร0/48 ออกแบบRC0/48

พัฒนาต่อจากP114โดยไม่แก้รูปทรงจริง ใช้breakpointsช่องเปิดจริงร่วมกันทุกซีกในbay และระดับแบ่งผนังร่วมกัน เพื่อให้ขอบที่ต้องเชื่อมมีจำนวนและตำแหน่งnodeตรงกัน ไม่ใช้nearest-node snapping ไม่เชื่อมnodeข้ามช่องว่างโดยพลการ

## ผลตรวจ

- 14parts,7616nodes,7748shell elements; ทุกpartคงvolumeตามต้นแบบภายใน0.2% โดยerrorสูงสุดประมาณ0.002615%
- ช่องเปิดทั้ง6ตรวจgeometryและpolygon overlapผ่าน ไม่ใช้เพียงcentroid
- quality checker: defects0,quality flags0,maximum edge ratio7.0525 ภายใต้เกณฑ์screeningเดิม ไม่ใช่ผลmesh convergence
- JO-CR 4interfaces/60node pairs คงgap20mm
- JO-BY 6interfaces/294node pairs คงgap15mm
- JO-FF 3interfaces/36node pairs คงgap15mm
- รวม13interfaces/390pairs ตรวจboundary membershipและพิกัดแกนขวางตรงกัน ไม่มีคู่ตกหล่น
- ไม่ใช่390bolts; DOF/stiffness/capacity/detailยังnull
- สร้างbeam mapใหม่จากmeshนี้แล้ว ไม่ใช้node IDsจากP114เก่าปะปน: คาน70members70nodes,6supports;260seat candidates; artificial resultant checks1136กรณีผ่าน

## แก้ข้อผิดพลาดระหว่างพัฒนา

รอบแรกใช้loY+300/1200ผิดเพราะloYของชิ้นงานมีjoint allowance7.5mm ขณะที่openingใช้bay grid ตรวจพบoverlap20elements จึงเปลี่ยนเป็นดึงพิกัดcornersMmต้นทางและรันใหม่จนdefects0 ไม่เลื่อนช่องหน้าต่างให้ตามmesh

## ไฟล์ปัจจุบัน

- output/staad-p7-p115/pilot-mesh.json
- output/staad-p7-p115/mesh-quality.json
- output/staad-p7-p115/geometry-check.json
- output/staad-p7-p115/joint-pairs.json
- output/staad-p7-p115/beam/beam-joint-map.json
- output/staad-p7-p115/beam/PM-I-C1-BEAM-SHELL-GEOMETRY.STD
- output/staad-p7-p115/beam/verification.json
- tools/modular-program/stage7-compatible-joints-p115.mjs

เพิ่มoptionalparametersในgeneratorsเดิมเพื่อreuseโดยไม่เขียนทับoutputsP110–P114

## ยังไม่ใช่ผลวิเคราะห์

จับคู่พิกัดครบเฉพาะสามกลุ่มข้างต้น ยังไม่ใช่สรุประบบJO-BS/END/supportหรือเลือกความแข็งรอยต่อ
joint pairsเก็บgapจริง ต้องกำหนดoffset transformationและพฤติกรรมแต่ละDOFก่อนใช้ในsolver ค่าทดสอบการกระจายresultantที่รักษาสมดุลไม่แทนbeam bending shape functions หรือelastic compatibility
ต้องกำหนดmaterial/load/code clauses และทำpilot solve, stiffness sensitivity, convergence, RC/jointsตามขอบเขตP105 ไม่เพิ่มเปอร์เซ็นต์จากจำนวนnodes

engineering_approved=false; production_released=false; ไม่เริ่มขั้น8
