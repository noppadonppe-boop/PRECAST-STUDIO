# P82 — Window wall shell + rib interface study

ขั้น5/8 ยังไม่ครบ100% ตามP40. P81เป็นprogressด้านโหลดซี่ทึบ รอบนี้วิเคราะห์ผิวและซี่ร่วมกันสำหรับรุ่นหน้าต่าง ไม่ใช้ผลทึบแทน

## งานที่ทำจริง

[รายงาน12แผงพร้อมภาพผลจากsolver](../../output/window-shell-p82/index.html): A/B/D × LH/RH × M01/M03 ของW01. มี12input,36runs(h100/50/25),12PNG+SVG,ข้อมูลnode/cell/beam/rigid links/reactions/gauss resultants, auditและsource/binary hashes

ใช้OpenSees3.8.0ที่มีอยู่ใน.local-engineering-runtime ไม่ติดตั้งบริการหรือเริ่มSTAADขั้น7. รุ่นซี่และความหนาผิว6mmมาจากP66+P80 ไม่เปลี่ยนมิติคอนกรีตหรือแบบเหล็กจริง

## ข้อค้นพบด้านรูปทรง

M01มีช่องเปิดในผิวเหล็กจริง แต่M03เป็นผิวหลังเต็มแผ่น ช่องหน้าต่างของคอนกรีตจึงเป็นเพียงเขตไม่รับแรงดันบนผิวM03 ไม่ใช่ช่องเจาะเหล็ก. สร้างpatchจากการตัดsolidจริงที่midsurface ไม่สร้างรูเองจากภาพสินค้า

outer/inner planeที่u=-3/153 ในพิกัดfabricationLH; RHสะท้อนกลับก่อนดึงหน้าตัด. เก็บnormalizerและslopeD ไม่ใช้ระยะฉายในYเป็นระยะตามผิวโดยไม่แปลง

## แบบจำลองและสมมติฐานที่ยังไม่ผ่านออกแบบ

- ShellMITC4 + ElasticMembranePlateSection E200000MPa,nu0.3,t6mm ร่วมกับelasticBeamColumnของซี่ RHS100normal×50tangent×5
- เชื่อมeccentricityผิวถึงแกนซี่ด้วยrigidLink beam: สมมติkinematicsแนวเชื่อมเต็ม ไม่ใช่weld strength check. ไม่มีchained/slave-duplicate constraints
- ที่จุดตัดซี่/คานรับซี่จริงยึดทั้ง6DOFเป็น **ideal rigid waler interfaces** ไม่ใช่ข้ออ้างว่าโครง/ค้ำ/ฐานจริงแข็งเกร็งแล้ว. จึงยังไม่เป็นผลแม่แบบทั้งชุด
- ซี่สั้นรอบช่องมีrestraintการหมุนจากinterfaceดังกล่าว แก้mechanismของการสมมติรองรับการเลื่อนจุดเดียว แต่ต้องตรวจการรับโมเมนต์ของjoint/walerจริงต่อ
- JtorsionของRHSใช้thin-wall approximation เปิดเผยในผล; ยังไม่ทำtorsion/local buckling/code check
- แรงดันตามp(z)=25(1485-z)/1000kPa. ใช้2×2Gauss consistent nodal loadบนพื้นที่รับแรงจริงและลบเขตหน้าต่าง. ส่วนแรงที่อยู่นอกmidsurfaceเนื่องจากmiterส่งเป็นequivalentedgeforce+couple รักษาแรงและโมเมนต์ครบ ไม่ทิ้งโหลดปลายผิว
- recoverreactionด้วยTᵀrรวมresidualของslaveเข้าสู่retainedพร้อมlever-arm moment ไม่ใช้raw slave reactionเป็นแรงฐาน. ตรวจfree retained residualและสมดุลแรง/โมเมนต์แยก

## การตรวจ

benchmarks: cantilever shell, membrane patch และrigid-offset beamผ่าน. ก่อนรันตั้งเกณฑ์meshคู่50/25: deflection2%, reactionforce/moment vector L2 5%; สมดุล0.01N/1Nmm และfree retained residualเกณฑ์เดียวกัน

ครบ12/12แผงผ่านglobal convergenceและequilibrium; tests19รายการตรวจ36runs,source hashes,complete pressure force/moment,ชนิดช่องจริง/pressure-free rear skin,mirror. ภาพเป็นplotค่าคำนวณ ไม่ใช่AIสร้างสีแรงขึ้นเอง

การโก่งสูงสุดในcaseนี้: M01ประมาณ0.947–0.982mm, M03ประมาณ2.670–2.679mm. ขอบด้านในยังต้องแก้ด้วยการรองรับร่วม/ความหนาที่ตรวจแล้ว. **ยังไม่ผ่านlocal stress convergence, code capacity หรือwhole-mould deformation** ผลต่ำ/solverจบไม่เท่ากับออกแบบผ่าน

resultant arraysเก็บraw8componentsต่อGauss pointจากShellMITC4เพื่อใช้ตรวจขั้นต่อไป ยังไม่ออกdesign envelopeหรือเหล็กเสริมคอนกรีตจากข้อมูลนี้

## ความคืบหน้าที่รายงานได้

งานย่อยwindow-wall rigid-interface study12/12=100%; ไม่ใช่Step5ครบ100% หรือแม่แบบW01เสร็จทั้งระบบ. P81กับP82ใช้สมมติฐานต่างกัน ห้ามนำจำนวนรุ่นมาบวกแล้วกล่าวว่าผลรวมframe designครบ12/12

งานต่อ: local resultants/รอยต่อ/การโก่งขอบ, คานรับซี่และค้ำที่มีความยืดหยุ่นจริง, base/seam locks/เสถียรภาพ/handling และแบบผลิต/QCครบ44setupตามP40. ไม่เปลี่ยนเงื่อนไขP52 ไม่เริ่มขั้น6 เว็บยังP68และคลังรูปเดิมคงเดิม

อ้างอิงAPI: [ShellMITC4](https://openseespydoc.readthedocs.io/en/latest/src/ShellMITC4.html), [elasticBeamColumn](https://openseespydoc.readthedocs.io/en/latest/src/elasticBeamColumn.html), [rigidLink](https://openseespydoc.readthedocs.io/en/latest/src/rigidLink.html). ใช้ตรวจคำสั่ง ไม่ใช่โค้ดกำลังรับแรงหรือการรับรองวสท.

engineeringApproved=false / productionReleased=false / stageComplete=false
