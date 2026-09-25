# TS-C — Step 2E / S2E-R00

16 กันยายน 2026 · **LOCAL STRESS DIAGNOSTIC / NOT FOR DESIGN**

ต่อจาก [Step 2D](../modular-tsc-step2d/README.md) ตามคำสั่งดำเนินการต่อ ตรวจผลความเค้นจาก Solid เดิมโดยไม่เปลี่ยน geometry/material/load/BC และ **ไม่มีการรัน FEM ใหม่** ไม่แก้ผล R01/S2A–S2D ย้อนหลัง ไม่อนุมัติความหนา175มม. เหล็ก จุดต่อ หรือผลิต

## 1. ผลที่ได้และความหมาย

ตรวจ 490 พิกัดกายภาพร่วมในแต่ละชุด × 6 ชุดเดิม =2,940 point evaluations ทั้ง LH/RH; D1/D2/D3 × FULL/LEFT

การอ่าน stress จาก displacement gradient ให้ค่าตรงกับ Gauss stress เดิมทั้ง **732,160 integration points** ต่างสูงสุดประมาณ1.08×10⁻¹⁰ kPa ข้อนี้ยืนยันความสอดคล้องของวิธีอ่านผล/หน่วย/ลำดับองค์ประกอบกับข้อมูล FEM เดิม ไม่ได้ยืนยันว่า FEM ใกล้คำตอบโครงสร้างจริง

**ยังไม่มีทั้ง8กลุ่ม (4บริเวณ×2โหลด) ที่เข้าเกณฑ์ครบ6องค์ประกอบ** โดยเฉพาะ σnn และ τsn มี mesh sensitivity และค่าต่างบนรอยแบ่ง element อย่างเห็นได้ชัด แม้แรงรวมและการเคลื่อนตัวใน S2D จะเข้าเกณฑ์ที่ตรวจแล้ว จึงยังไม่ใช้ local stress ชุดนี้กำหนดเหล็ก/จุดต่อหรือประกาศ Step2 ผ่าน

รอยแบ่ง element ในงานนี้คือรอยแบ่งตาข่ายของคอนกรีตเนื้อเดียว ไม่ใช่รอยต่อจริงระหว่างชิ้น precast; ความต่างของค่าแต่ละด้านไม่ใช่ contact/slip ของ JO-CR

## 2. วิธีอ่านผลและการตรวจสอบ

ใช้ stdBrick8-node trilinear isoparametric geometry และ displacement จาก S2D; คอนกรีต ElasticIsotropic E=28,321.7865329MPa, ν=.20 ตามเดิม

ที่พิกัดจริง XYZ ใช้ Newton inverse mapping หา natural coordinate ในทุก element ที่ครอบจุดนั้น จากนั้นคำนวณ

`J = Σ xi ⊗ ∂Ni/∂ξ;  ∇u = uᵀ dN/dξ J⁻¹`

`σ = μ(∇u + ∇uᵀ) + λ tr(∇u) I`

โดย μ=E/[2(1+ν)], λ=Eν/[(1+ν)(1−2ν)] ใช้Eเป็นkPaกับความยาวm จึงได้stressเป็นkPa ไม่มีfactor2ในstress shear; engineering shear strainไม่ใช่shear stress

ไม่อินเตอร์โพเลตหรือ extrapolate จาก Gauss stress ไปยังผิว; ประเมิน displacement shape-function gradient ของ element โดยตรง จุดที่อยู่บนหน้าร่วมมีหลายค่า เก็บแต่ละ element/natural coordinate/ค่าทั้ง6ตัว รวม min/max/mean โดย **ค่าเฉลี่ยมีไว้เปรียบเทียบและแสดงผล ไม่ถือว่าเป็นค่าจริงที่แก้ความไม่ต่อเนื่องแล้ว** ใช้ช่วงmax−minเป็นเกณฑ์คู่กัน ไม่ทำ smoothing field

การตรวจเชิงโปรแกรม:

- affine displacement บน skewed brick รวม shear/rotation/translation เทียบ constitutive answer ที่ทราบ
- inverse mapping residual≤10⁻⁹m; natural coordinateต้องอยู่ในelement
- คำนวณย้อนที่8Gaussทุกbrick เทียบstressเดิมครบ6องค์ประกอบ เกณฑ์absolute≤10⁻⁶kPa
- พิกัดและaxesตรงกันทุกmesh, orthonormal/right-handed, finite values และmin/max/meanตรงกับone-sided values
- FULL mirror symmetry LH/RH พร้อมเครื่องหมาย shear ตามlocalaxes
- SHA-256 input/raw/result เพื่อป้องกันผลไม่ตรงrevision

เอกสารอ้างอิง formulation: [OpenSees stdBrick](https://openseespydoc.readthedocs.io/en/latest/src/stdBrick.html); ลำดับGaussและองค์ประกอบอ้าง [OpenSees3.8.0 Brick.cpp](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/element/brick/Brick.cpp) ประกอบกับall-Gauss reproduction ไม่ใช่การเพิ่มcode checkตามวสท.

## 3. พิกัดและแกน

3.00×3.00ม.รวมพื้น / Rภายนอก.40ม. / bay1.50ม. / t.175ม. / F-R limit / S00 / NC320เชิงเส้นไม่ร้าว / LP-A / SW+roofLL ไม่ใส่prestressเฉพาะstudy ตามS2Dทั้งหมด

| กลุ่ม | สถานี | Y (ม.) | จุดต่อกรณี |
|---|---|---|---:|
|regular_interior|ผนังZ1.50; C22.5/C45/C67.5; หลังคาX_LH.80|.30,.75,1.20|150|
|side_edge|สถานีเดียวกับภายใน|.05,.15,1.35,1.45|200|
|base_probe|Z.225 คือเหนือฐาน.05ม.|ทั้ง7ค่า|70|
|crown_probe|X_LH1.45 / X_RH1.55|ทั้ง7ค่า|70|

ทุกสถานีตรวจสองซีกและf=.10,.30,.50,.70,.90 จากผิวในหารt; จุดใกล้ผิวที่สุดห่าง17.5มม. ไม่ใช่surface stress ไม่มีจุดบนexactsupportedge/Uy datumหรือexactcrown

ส่วนโค้งใช้พิกัดจากวงกลมจริงตามรัศมี ri+f×t แล้ว inverse-map เข้าfacet จึงเปรียบเทียบphysicalXYZเดียวกันทุกmesh ไม่เปลี่ยนตำแหน่งตามcentroid/Gauss ของmeshแต่ละระดับ

แกน s ต่อเนื่องจากฐานLHขึ้นผ่านcrownลงฐานRH, y=global+Y, n=s×y ออกนอกคอนกรีต: ผนังLH s=+Z/n=−X; RH s=−Z/n=+X ส่วนโค้งใช้radialnormalจริง ไม่ใช่facetnormal

เวกเตอร์local `[ss,yy,nn,sy,sn,yn]` หน่วยkPa, tensionบวก แตกต่างจากrawglobalเดิม `[xx,yy,zz,xy,yz,zx]` ห้ามสลับสองลำดับนี้

## 4. เกณฑ์ก่อนอ่านผล local รอบนี้

เกณฑ์อยู่ใน [basis.json](basis.json) ตั้งก่อนpostprocessรอบนี้ แต่หลังการรันS2Dเดิมแล้ว ไม่กล่าวอ้างว่าเป็นเกณฑ์ก่อนFEMเดิม และไม่แทนเกณฑ์S2B/S2Dย้อนหลัง

เปรียบเทียบ D2→D3 แต่ละองค์ประกอบในแต่ละกลุ่มต้องผ่านทั้งหมด:

1. max point change = max(|D3mean−D2mean|/max(|D3mean|,10kPa)) ≤5%
2. RMS change = RMS(D3mean−D2mean)/max(RMS(D3mean),10kPa) ≤5%
3. max one-sided spread = max((D3max−D3min)/max(|D3mean|,10kPa)) ≤5%

เป็นเป้าหมายตรวจเชิงตัวเลข ไม่ใช่เกณฑ์กำลัง/การร้าวของวสท. แม้ผ่านจุดที่สุ่มตรวจก็ไม่ยืนยันทั้งโมเดลหรือบริเวณที่ไม่ได้สุ่ม

### ตัวอย่าง FULL / regular interior

| Stress | เปลี่ยนจุดสูงสุด | เปลี่ยนแบบRMS | ช่วงด้านติดกัน D3 สูงสุด |
|---|---:|---:|---:|
|σss|78.95%|2.32%|100.07%|
|σyy|37.61%|12.59%|80.85%|
|σnn|134.77%|55.63%|178.05%|
|τsy|5.39%|4.24%|16.70%|
|τsn|211.24%|57.43%|563.46%|
|τyn|5.63%|1.77%|83.78%|

เปอร์เซ็นต์สูงบางจุดมาจากค่าที่ใกล้ศูนย์ ต้องอ่านค่าจริงร่วมด้วย เช่น RH/W1500/Y1.2/f.9 ของτsn เปลี่ยน12.163→−8.960kPa, Δ21.124kPa จึงได้211.24% เมื่อหารfloor10kPa **ไม่ใช่ความเค้นเกินกำลัง211% และไม่ใช่เปอร์เซ็นต์errorเทียบexactsolutionที่ทราบแล้ว**

แม้σss RMSเพียง2.32% แต่เกณฑ์รายจุดและone-sidedspreadยังไม่ผ่าน จึงไม่เลือกเฉพาะตัวเลขที่ดูนิ่งมาประกาศผ่าน

ตัวอย่าง C45/LH/Y.75/f.30: σnn mean D2≈−54.16kPa, D3≈−29.55kPa; กราฟ2แผ่นแสดงค่าจริงพร้อมช่วง ไม่เติมค่าที่ผิวและไม่ใช้ภาพAIสร้างcontour

## 5. สิ่งที่ยังสรุปไม่ได้และขั้นถัดไป

วิธีอ่านผลใหม่และข้อมูลGaussเดิมตรงกัน จึงมีหลักฐานต้านข้อสงสัยเรื่องสลับcomponent/หน่วยในpostprocessorนี้ แต่ **ยังไม่แยกสาเหตุทั้งหมด** ระหว่าง low-order displacement formulation ในการดัด, mesh aspect ratio/ความหนา, faceted geometry, nodal load mapping และboundaryidealization ไม่สรุปว่าเกิดจากสาเหตุเดียวหรือว่าเพิ่มความหนาจะแก้ได้

ขั้นถัดไปที่มีประโยชน์คือ:

1. bending/shear benchmark ที่มีคำตอบอิสระ และประเมินstressที่พิกัด/tractionชัดเจน เพื่อเปรียบเทียบformulationก่อนเพิ่มขนาดfull-baymeshอีก
2. ศึกษาmeshตามความหนาและแนวหน้าตัดแยกกัน พร้อม consistent volume/face load study และเทียบพลังงาน/sectionresultants/localstress; ไม่ลดเกณฑ์หรือsmoothเพื่อซ่อนjump
3. เมื่อหลักฐานnumericalเพียงพอ จึงเลือกวิธีsubmodel/elementสำหรับjoint stiffness/contact จริงของJO-CR/JO-BS และloadregisterครบก่อนStep3

ไม่มีcracking/creep/ลม/ยกขน/ช่องเปิด/พื้น/ฐาน/หลายbay/I-L-Uทั้งอาคาร ไม่มีcapacitycheck และยังไม่มีreviewโดยผู้รับผิดชอบตามroleworkflow

## 6. ไฟล์และเว็บ

- [ผลรวมและhashes](../../output/tsc-step2e-r00/stress_results.json)
- [กราฟผ่านความหนา](../../output/tsc-step2e-r00/TS-C-STRESS-PROFILE-S2E-R00.png)
- [ตารางmesh sensitivity](../../output/tsc-step2e-r00/TS-C-STRESS-QA-S2E-R00.png)
- `tools/tsc-study/stress_study.py`: ใช้Python/NumPyอ่านผลเดิม ไม่เรียกOpenSees solver
- `render_stress.mjs`: สร้างSVG/PNGและweb_summary (ไม่ส่งrawone-sidedทั้งหมดให้browser)
- `stress-results.test.mjs`: 5 evidence tests; `stress.test.tsx`: 2 UI tests

WEB-06 เพิ่มStep2Eพร้อมเลือกFULL/LEFTและ4บริเวณ ตารางทั้ง6stressพร้อมพิกัดกรณีคุม และ2PNGดาวน์โหลด รวม64ภาพ (concept52+engineering12) ยังคงengineeringcapability/studyACL/imageACLและSTALEตรวจraw6ไฟล์ ไม่มีการdeployหรือเพิ่มสิทธิ์ทีม เก็บเมนูรอยต่อและงานอื่นที่มีอยู่แล้ว ไม่เปลี่ยนความหมายให้เป็นรายละเอียดจุดต่อที่ผ่านการออกแบบ
