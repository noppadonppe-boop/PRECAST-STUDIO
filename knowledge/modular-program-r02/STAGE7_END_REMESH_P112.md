# P112 — แก้sliverของแผงปิดปลาย I-C1

2026-09-18. รอบก่อนprogress: qualityauditพบปัญหาและแก้shell เหลือEND94flags
เปลี่ยนจากgridclipเป็นconstrained quality triangulation บนเส้นขอบsourceเดิม ไม่ปรับช่องประตูหรือขนาดคอนกรีต
ติดตั้งtriangle20250106และnumpy2.5.3เฉพาะ .local-engineering-runtime/mesh-p112 ผ่านexecution approval ไม่แก้systempackages
เอกสารวิธี: https://rufat.be/triangle/API.html และ https://www.cs.cmu.edu/~quake/triangle.quality.html
นำcapfaces3ส่วนมารวมboundary โดยsplitsegmentsที่vertexและตัดedgeภายในซ้ำก่อนmeshทั้งENDเป็นชิ้นเดียว
options pq25a10000Q: คุมมุมและพื้นที่; ไม่ใช่ข้อกำหนดACIหรือเกณฑ์convergence

ผลจริง ENDแต่ละแผง minimumangle25.0773deg,maxedge ratio2.30182. ทั้งอาคาร14ชิ้น6788nodes6964elements
ตรวจซ้ำ0topologydefects/0qualityflags (edge ratio>10), polygonไม่ทับช่องเปิด, connectedgraph14ชิ้น และvolumeเทียบsourceผ่าน
ไฟล์output/staad-p7-p112/pilot-mesh.json, PM-I-C1-GEOMETRY-ONLY.STD, mesh-quality.json, geometry-check.json
เครื่องมือtools/modular-program/remesh-ends-p112.py และqualitycheckerP111. เก็บP110/P111เดิมเป็นhistory
geometry-check.jsonระบุข้อที่ตัวตรวจนั้นไม่ได้ตรวจ; สำหรับhangingnodes/edgeratioให้ดูmesh-quality.jsonแยก ไม่อ้างJacobian/convergenceจากสองรายงานนี้

ยังไม่มีmaterial/joint/support/loadcase. ไม่ถือmeshgeometryผ่านเป็นRCหรืออาคารปลอดภัย
ถัดไปทำbeam-seatและjointmappingให้ตรงกับgeometry โดยกำหนดanalysiscasesตามbasisที่ตรวจ/ยืนยันก่อนsolve
ขั้น7/8ยัง5%; gate8ยังขาดbeam/jointcouplingและQAครบชุด. อาคารวิเคราะห์0/48 RC0/48
