# P110 — I-C1 concrete midsurface extraction

ขั้น7ยังดำเนินการ; รอบก่อนprogress: bearingaudit320ชิ้นและระดับsource. ไม่ปิดscopeด้วยgeometry
ต้นทางoutput/stage3-designs-p36/I-C1/model.json พร้อมhashในpilot-mesh.json
สร้างshell8, floor4, end2 รวม14ชิ้น. 3820nodes/3216plateelements. ใช้TS-Cกึ่งกลางRo400/Ri250=R325 และt150; พื้นt175; ช่องเปิด4หน้าต่างและ2ประตูคงเดิม
nodeแชร์ภายในชิ้น ไม่แชร์ข้ามรอยต่อ. baygap15/crowngap20จากsourceคงเดิม. STDแปลงXYZsourceเป็นX,Z,YของSTAADพร้อมกลับลำดับnodeเพื่อรักษาorientation

หลักฐาน:
- tools/modular-program/stage7-pilot-mesh-p110.mjs
- tools/modular-program/stage7-pilot-mesh-p110.test.mjs
- output/staad-p7-p110/pilot-mesh.json
- output/staad-p7-p110/PM-I-C1-GEOMETRY-ONLY.STD
- output/staad-p7-p110/geometry-check.json

ปริมาตรผิวกลางxความหนาเทียบsourceconcreteMass/2400 เพื่อตรวจgeometryเท่านั้น ไม่ได้เลือกdensityออกแบบ2400แทนผู้ใช้
relativevolumeerrorสูงสุด0.000026144677=0.00261447%. ตรวจconnectedgraphภายใน14ชิ้น, positivearea, openingcentroidexclusion6ช่อง และไม่มีคำสั่งanalysis/designผ่าน
ยังต้องตรวจhangingnodes/Jacobian/aspectratio/localaxes, meshconvergence. centroidexclusionไม่ใช่หลักฐานเพียงพอว่าelementทุกขอบไม่พาดข้ามช่อง ต้องตรวจpolygonintersectionเพิ่มเติม
ยังไม่มีbeam-seat coupling/jointDOF/materials/loadcases/supports จึงไม่สั่งรันโมเดลที่แยกชิ้นนี้เพื่อให้เกิดผลที่ไม่จริง
งานออกแบบjointรับแรงทั้งสามแกน/หมุนต้องกำหนดก่อน. ไม่แอบเลือกrigidทุกจุดหรือdummy restraint
ขั้น7/8คง5%, gate8ยังไม่ครบshell+beamและQAทั้งหมด; อาคารวิเคราะห์0/48 RC0/48
