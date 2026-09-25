# ขั้นตอนวิศวกรรมและการส่งต่อแบบ — R01

เอกสารนี้กำหนดวิธีทำงาน ไม่ใช่ผลคำนวณหรือรายละเอียดจุดต่อที่อนุมัติ
อ่าน [Design Basis](DESIGN_BASIS_R01.md) ก่อนทำanalysis/design

## 1. ชุดนำร่อง TS-C

เริ่มจากCADซีกLH/RHและF15ในหนึ่งbay1.50ม. ตรวจตำแหน่งjointและฐาน → assembled bay → I-STD15 → N90/TRและL/U
ขยายชนิดช่องเปิดและuseเมื่อยืนยันload/boundary conditions แล้ว ไม่อนุมานชิ้นมีช่องรับแรงเท่าชิ้นทึบ
เพียงแต่รูปลักษณ์เหมือนกันไม่พอสำหรับreuse calculation ต้องมีขอบเขตความเข้ากันได้ของgeometry/material/load/support/interface

## 2. Joint register ก่อน FEM

| กลุ่มรหัส | ตำแหน่ง | สิ่งที่ต้องบันทึก/ตรวจ |
|---|---|---|
| JO-CR | กลางหลังคา LH↔RH | contact/compression, shear, tension/uplift, rotationและแรงถ่างตามระบบที่เลือก |
| JO-BY | ระหว่างbayตามยาว | การเชื่อมแรง/diaphragm/รอยต่อและtolerance |
| JO-BS | ผนัง↔พื้น/ฐานรองรับ | กำหนดชัดว่าแรงลงพื้นหรือฐานใด; hold-down/แรงแนวนอน/การหมุน |
| JO-FF | ระหว่างแผ่นพื้น | shear/ระดับต่าง/diaphragmหรือtie ถ้าใช้รับแรงดังกล่าว |
| JO-ND | ปีก↔N90ผ่านTR | แรงครบ6องค์ประกอบ/การเปลี่ยนหน้าตัด/การชนและน้ำ |
| JO-NI | ภายในชุดN90 | หลังคา–ผนัง–กรอบรองรับซึ่งยังTBD |
| JO-LF / JO-TB | ยก/ค้ำชั่วคราว | แยกจากjointถาวร ตรวจอายุคอนกรีต ทิศแรงและลำดับงาน |

แต่ละinterfaceมีpartA/partB,ตำแหน่งXYZ,local axes,DOF(Ux,Uy,Uz,Rx,Ry,Rz),release/stiffness/contact,loadcase,แรงที่ต้องถ่าย,capacity checkและdetail revision
pin/rigid/semi-rigidเป็นสมมติฐานที่จะตรวจ ไม่เลือกrigidทุกจุดเพื่อให้โมเดลนิ่ง
หากยังไม่ตัดสินใจให้ทำsensitivity casesอย่างเปิดเผย; ไม่ใส่springไม่ทราบค่าเป็น0โดยอัตโนมัติ
joint layoutต้องมีเส้นทางถ่ายแรงครบและเสถียรภาพ ไม่เริ่มจากกำหนดจำนวนboltตามภาพ

## 3. FBD และการตรวจสมดุล

แสดงอาคารรวม,assembled bay,ซีกแต่ละข้าง,F15,N90และinterfaceที่สำคัญ
ให้แรงaction/reactionระหว่างสองชิ้นเป็นคู่เท่ากันตรงข้าม; ไม่รวมinternal joint forceเป็นexternal loadซ้ำเมื่อดูFBDอาคารรวม
แสดงแรง/โมเมนต์รอบแกน3Dตามความจำเป็นและsumF/sumM; gravity-onlyยังอาจเกิดhorizontal thrust/แรงยึดภายใน
ระบบstatically indeterminateต้องใช้compatibility/stiffness ไม่อ้างว่าคำนวณreactionได้จากequilibriumล้วน
ภาพFBDคำนวณใช้การวาดแบบกำหนดพิกัด/ค่าจากข้อมูล ไม่ใช้imagegenแต่งreactionตัวเลข; ภาพสถาปัตย์AIยังใช้แยกประเภทได้
ภาพexplodedไม่ใช่แผนยกหรือการรับรองว่าซีกตั้งเองได้

## 4. Plate/shell analysis และ QA

1. ระบุformulation/element type, geometry midsurface/offset,thickness,openings,material E/nu/density,cracking assumption,load mapping,supportsและjoint DOF
2. เก็บsolver/version,input/model hash, mesh,units,local axes,surface normals,sign conventions
3. ตรวจตัวอย่างbenchmarkที่ทราบผล/hand checkที่เหมาะสมก่อนใช้ผลหลัก; 2Dstripใช้sanity checkแต่ไม่แทน3Dshellรอบช่องและโหนด
4. รันmesh refinementอย่างเป็นระบบ; ตั้งเกณฑ์acceptanceก่อนและเก็บผล ไม่เรียกผ่านเพราะsolverจบ
5. ตรวจsum loads/reactions/moments, rigid-body mechanisms, deformation pattern,energy/solver warningsตามความเหมาะสม
6. แยกload case/combination/envelope พร้อมค่าที่เกิดร่วมกัน; อย่านำmax Nกับmax Mจากคนละกรณีมาเป็นคู่แรงโดยไม่ระบุวิธี
7. รายงานsingularitiesที่มุมแหลม/point supportและวิธีประเมิน ไม่ออกแบบจากpeakสีเดียวหรือsmoothเพื่อซ่อนปัญหา
8. แสดงNxx,Nyy,Nxyเป็นkN/m; Mxx,Myy,Mxyเป็นkN·m/m; Qx,Qyเป็นkN/m; displacementและrotationพร้อมหน่วย
9. Force/resultantของjointหรือboltต้องแยกจากshell forceต่อหน่วยความยาว; integrals/reactionsต้องเทียบกันได้

ออกsymbolic FBDได้เมื่อไม่มีsolver; ห้ามสร้างanalysis heatmapตัวเลขขึ้นเองและเรียกผลFEM
gravity pilotยังเป็นPARTIAL_SCOPE ไม่ใช้รับรองwind/uplift/seismic/handling/assemblyที่ยังไม่ตรวจ

## 5. Design Step3

ก่อนใช้สมการอ่านข้อจริงของมาตรฐานที่ลงทะเบียนพร้อมบริบทและหน่วย ไม่ถือวสท.2564เท่ากับACIฉบับอื่นทุกประการ
Clause registerแยกข้อที่verifyแล้วกับpending พร้อมprinted/PDF page
ชุด150/175/200มม.เป็นข้อเสนอสำหรับการศึกษา ไม่ใช่คำสั่งให้รันครบทุกค่าเสมอ หากผู้ใช้ระบุcaseเฉพาะให้เริ่มตามนั้นและเพิ่มcomparisonเมื่ออยู่ในขอบเขตงาน โดยนำself-weight/stiffnessที่เปลี่ยนกลับไปStep2
ตรวจกำลัง การโก่ง/ร้าว durability/cover ระยะเหล็ก แรงยึด รอยต่อ ช่องเปิด จุดยกและสภาวะชั่วคราวตามขอบเขตที่เกี่ยวข้อง
ถ้าต้องเพิ่มความหนารายชิ้น ให้ทำexception recordและrerun dependent checks ไม่ใช้เป้าหมาย“เท่ากัน”ฝืนผล
ไม่มีการใส่ค่าcapacity/ผลPASSล่วงหน้า; null/NOT_ANALYSEDไม่ใช่0หรือผ่าน
ส่งให้ผู้รับผิดชอบตรวจตามroleเดิมก่อนApproved; AIช่วยเตรียม/ตรวจความครบได้แต่อนุมัติแทนไม่ได้

## 6. แบบผลิตและโมลด์ Step4

แยกshop drawingชิ้น / mould fabrication drawing / assembly & erection drawing
แต่ละชุดต้องผูกpart design revision,geometry,reinforcement,embeds,jointและlifting revisionเดียวกัน
mouldต้องมีparting lines,release direction,draftตามจำเป็น,block-outs,stiffening,assembly access,tolerance,casting/curing/demoulding method
ตรวจน้ำหนักจุดศูนย์ถ่วง รถ/เส้นทาง/เครน จุดรองพัก ค้ำยันชั่วคราว และลำดับต่อรอยต่อก่อนถอดค้ำ
prototypeต้องมีinspection/fit-upและกันน้ำก่อนเสนอseries production; ไม่มีการรับรองจากภาพสวย
ก่อนdrawing exportอ่านข้อกำหนด [Revit/DXFเดิม](../REVIT_DXF_INTEROP_KNOWLEDGE.md); อย่าเปลี่ยนpolicyของโครงการโดยพลการ

## 7. Revit Step5

แยกFamily Typeจากinstanceและตำแหน่ง; Tagต้องเชื่อมcatalog/BOM/analysis/designได้
แยกstructural coreและfinish layers; เพิ่มfinishที่มีน้ำหนักต้องทบทวนload ไม่ใช่เพิ่มแค่สี
ตรวจall48model mapping,assembly counts,coordinates,openings,units,dimensions,parameters,revisionและmaterial schedules
โมเดลconceptและproductionต้องแยกสถานะ; ไม่มีRVТที่ยังไม่ได้เปิดตรวจถือว่าverifiedอัตโนมัติ

## 8. สถานะและเว็บ

NOT_STARTED → DRAFT → ANALYSED/PARTIAL_SCOPE → CHECKED → APPROVED → RELEASED ตามสิทธิ์และหลักฐาน
การapproveแผนR01ไม่ข้ามสถานะengineering; legacy R00ไม่ถูกอัปเกรด
uploadรายงานไม่เท่ากับapprove; inputเปลี่ยนผลเดิมเป็นSTALE
ก่อนเผยแพร่ข้อมูลนอกทีมต้องตรวจpublicationสิทธิ์และrevisionแยกอีกครั้ง
