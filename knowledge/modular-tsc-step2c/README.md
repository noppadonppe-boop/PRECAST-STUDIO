# TS-C — Step 2C / S2C-R00

16 กันยายน 2026 · **DIAGNOSTIC ONLY / NOT FOR DESIGN**

ต่อจาก [Step 2B](../modular-tsc-step2b/README.md) ตามคำสั่งดำเนินการต่อ ผู้ใช้ไม่ได้เลือกวัสดุผลิต/ความหนา/เหล็กหรือจุดต่อเพิ่มเติม รอบนี้ตรวจข้อจำกัดของแบบจำลองและเก็บหลักฐานใหม่แยกจากผลเดิม ไม่เปลี่ยน R01 หรือ S2B ย้อนหลัง

## สิ่งที่ทำแล้ว

1. อ่าน raw shell เดิม 6 runs: 175 มม., P-H/F-R, FULL, M2/M3/M4 เพื่อเปรียบเทียบที่ 5 สถานีหน้าตัด × 3 ตำแหน่ง Y
2. รันชิ้นทดสอบมุมโค้ง 36 runs: ความหนา 150/175/200 มม. × ν=0/0.20 × 3 mesh × 2 formulation (solid/shell)
3. ตรวจ 3D affine patch, Jacobian, สมดุล, พลังงานเทียบคำตอบ elasticity และความเค้นในความหนา
4. ภาพ deterministic สองแผ่น, raw result/model/load/displacement, hashes, บันทึกสมมติฐาน และหน้าเว็บ Step 2C พร้อมดาวน์โหลด

## 1. Fixed-station diagnostic

ใช้ซีก LH: ผนัง Z=1.50 ม.; โค้งที่มุม22.5°,45°,67.5°จากผนัง; หลังคา X=0.80 ม. จุด Y=0.375,0.750,1.125 ม. และอินทิเกรตองค์ประกอบ local แต่ละตัวในช่วงY=0.30–1.20 ม.

ฟื้นค่าแบบ bilinear จาก Gauss4จุดภายใน element ไม่ smoothing ข้าม element; จุดบนรอยแบ่งเฉลี่ยค่าด้านที่ติดกัน กำหนดตำแหน่งตามพารามิเตอร์เรขาคณิตจริง แต่ตำแหน่งบน facet และแกนlocalยังเปลี่ยนเล็กน้อยเมื่อmeshเปลี่ยน จึงยังแยก discretization error จาก recovery/facet effects ไม่ครบ ไม่เรียกว่าพิสูจน์สาเหตุแล้ว

| องค์ประกอบ | P-H จุดเปลี่ยนสูงสุด | F-R จุดเปลี่ยนสูงสุด |
|---|---:|---:|
| Nss | 1.91% | 1.25% |
| Nyy | 15.13% | 29.71% |
| Nsy | 9.26% | 6.60% |
| Mss | 4.96% | 8.65% |
| Myy | 12.50% | 12.56% |
| Msy | 1.84% | 0.82% |
| Qs | 2.84% | 2.70% |
| Qy | 0.40% | 0.15% |

ตัวหาร=max(|ค่าละเอียด|,0.1) หน่วยkN/mสำหรับN,QและkN·m/mสำหรับM; ค่าตารางเป็นสูงสุดของการเปลี่ยน ไม่ใช่ค่าสูงสุดของแรง Qy ณจุดเหล่านี้นิ่งกว่าการเทียบpeakเดิม แต่ตำแหน่งอื่น/องค์ประกอบอื่นยังไม่ครบ5% ทั้งสองกรณี การอินทิเกรตNsy/Msy/Qyข้ามช่วงสมมาตรหักล้างใกล้ศูนย์ ไม่ใช่หลักฐานว่าlocal forceผ่าน

อินทิเกรตองค์ประกอบlocalนี้ไม่ใช่global section-cut force6องค์ประกอบ และไม่ใช่แรงต่อbolt เก็บตำแหน่ง/ค่าของQy peakภายใต้maskเดิมด้วย **ไม่แทนเกณฑ์เดิมด้วยเกณฑ์ใหม่เพื่อให้ S2B ผ่าน**

## 2. Solid–shell coupon: ขอบเขตที่จำกัดโดยตั้งใจ

- Rภายนอก0.40ม., t150/175/200มม., ส่วนโค้ง90°, กว้างY1.50ม.
- E28,321.7865MPaอ้างผลวัสดุเดิม ตรวจhashเอกสาร วสท. และclause registerเดิมก่อนรัน ไม่เพิ่มการตรวจข้อกำหนดออกแบบในรอบนี้
- ค่าคอนกรีตศึกษาν0.20; ν0ใช้ตรวจbenchmarkเท่านั้น ไม่เปลี่ยนวัสดุผลิต
- stdBrick8โหนด, ElasticIsotropic, OpenSees3.8.0; ShellMITC4/ElasticMembranePlateSection
- **Uy=0ทุกโหนด**: เป็น3Dsolid elementภายใต้plane strain ไม่ใช่3Dfree-sidedbay ความยาวYมี2elementsทุกmeshเพราะบังคับพฤติกรรมคงที่ตามY ไม่อ้างว่าmeshตามความกว้างของbayอิสระลู่เข้าแล้ว
- solidปลายθ0:Uz=0ทั้งหน้า, datumUx1จุดที่r=Rm/Yกึ่งกลาง; shellปลายθ0:Uz=Ry=0, datumUx1จุด; shellUy/Rx/Rz=0ทุกจุดเพื่อmatched plane-strain strip
- ปลายθ90ใส่pure moment1kN·m/m รวมMy=−1.50kN·m: solidใส่consistent nodal tractionจากคำตอบAiry; shellใส่nodalMy **ผลรวมแรง/โมเมนต์ตรงกันแต่shellไม่มีการกระจายtractionผ่านความหนาแบบsolid**
- ไม่มีน้ำหนักตัวเอง LL รอยต่อ cracking หรือ prestress ในcouponนี้
- C1/C2/C3: arc16/32/64, radial4/8/16; solid128/512/2048elements, shell32/64/128elements

พิกัดcouponต่างจากอาคาร: X=r cosθ,Z=r sinθ,Yตามความกว้าง; θ0→90 ไม่ใช่แกนsซีกLHของS2B; เก็บเครื่องหมายแยก ไม่รวมแรงข้ามโมเดล

### คำตอบอิสระ

ใช้รูปAiry φ=A ln r+B r²ln r+C r²; σrr=A/r²+B(2ln r+1)+2C; σθθ=−A/r²+B(2ln r+3)+2C; τrθ=0

หาA/B/Cจากσrr(ri)=σrr(ro)=0 และ∫rσθθdr=1 ต่อความกว้าง1ม. สมดุลทำให้∫σθθdr=0ด้วย ตรวจสมการขอบ/ผลรวมอิสระ ไม่ใช้ค่าที่อ่านจากFEMป้อนเป็นคำตอบอ้างอิง

ที่plane strain:σyy=ν(σrr+σθθ); พลังงานU=width×angle/(2E)×∫r[(1−ν²)(σrr²+σθθ²)−2ν(1+ν)σrrσθθ]dr

ที่มาแนวทาง: [NPTEL §10.3.1 สมการ10.34–10.41](https://archive.nptel.ac.in/content/storage2/courses/105106049/lecnotes/mainch10.html); API/formulation [stdBrick](https://openseespydoc.readthedocs.io/en/latest/src/stdBrick.html), [ElasticIsotropic](https://openseespydoc.readthedocs.io/en/latest/src/elasticIsotropic.html); ลำดับGauss/stressตรวจจาก [OpenSees v3.8.0 Brick.cpp](https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/element/brick/Brick.cpp)

### ผล C3 ที่ν0.20

| t (มม.) | solid errorพลังงานเทียบทฤษฎี | shell/solidพลังงาน−1 | ความเค้นผิวใน / (6M/t²) | ผิวนอก / (6M/t²) |
|---|---:|---:|---:|---:|
|150|0.156%|−0.572%|1.184|0.867|
|175|0.126%|−0.954%|1.234|0.844|
|200|0.112%|−1.436%|1.293|0.820|

ตัวคูณผิวเป็นขนาดความเค้นจาก**คำตอบelasticity**หารสูตรเชิงเส้นหน้าตัดตรง ไม่ใช่surface stressที่extrapolateจากGauss และไม่ใช่capacity/reduction factorตามโค้ด ชิ้นทดสอบsolidยืนยันแนวโน้มที่Gaussภายใน ตัวเลขผิวในสูงขึ้น18–29%ไม่ใช่คำสั่งเพิ่มเหล็ก18–29% และห้ามนำไปคูณแรงS2Bแล้วออกแบบ

มุมที่หนากว่ามีt/Rmสูงกว่า จึงมีสัดส่วนความแตกต่างจากสูตรตรงมากขึ้น ไม่ได้หมายความว่าความเค้นสัมบูรณ์มากกว่าชิ้นบางเมื่อรับMเท่ากัน

## 3. QA และสถานะ

3D affine patch8elementsให้ความเค้นคงที่ตามHooke law รวมshearเพื่อยืนยันลำดับstress/หน่วย; couponสมดุลnormalizedสูงสุดประมาณ5.02×10⁻¹⁵, Jacobianบวกทุกจุด; solidC3เทียบenergy/rmsstressและlast-pairเข้าเกณฑ์diagnosticทั้ง6คู่t/ν เกณฑ์อยู่ใน [basis.json](basis.json) เป็นเป้าหมายเชิงตัวเลข ไม่ใช่เกณฑ์ วสท.

**Step 2B ยัง QA INCOMPLETE; Step 3 ไม่เริ่มออกแบบ; full-bay solid validation ยัง NOT_RUN.** ไม่มีeigen/mechanismหรือเสถียรภาพ3Dครบ ไม่มีcapacity/deflection/crack-limit check ไม่ยกระดับ48conceptproducts

## 4. ไฟล์และการทำซ้ำ

- [ผลรวมพร้อมraw hashes](../../output/tsc-step2c-r00/diagnostic_results.json)
- [ภาพชิ้นทดสอบ](../../output/tsc-step2c-r00/TS-C-COUPON-S2C-R00.png)
- [ภาพfixed-station](../../output/tsc-step2c-r00/TS-C-STATIONS-S2C-R00.png)
- `tools/tsc-study/diagnostic_study.py` →36rawJSONและผลรวม; `render_diagnostics.mjs` →2SVG/PNGและweb_summary
- ใช้Python/runtimeแยกโครงการและrequirementsเดิมเท่านั้น; OpenSeesใช้ภายใน ไม่แพ็กขึ้นเว็บหรือredistribute
- เก็บhashของ6rawS2B,36rawcoupon,script,basisและupstream; เว็บตรวจdependenciesและ6rawS2Bตามallowlistทุกmetadatarequest แจ้งSTALE
- ไม่ให้HTTPเข้าถึงrawJSON/เอกสารมาตรฐาน; รูปและsummaryต้องผ่านengineering capability+artifact ACL

## ขั้นต่อไปที่เหมาะสม

1. ตรวจshell section-cutจากelement nodal forcesบนหน้าตัดเดียวกัน เทียบFBDของส่วนย่อย เพื่อแยกGauss recovery/facet effectsและแรงที่เกิดร่วมกัน
2. full-bay3Dsolidหรือsubmodelที่จับคู่แรง/การเคลื่อนตัวและมีfree edgesจริง ตรวจผ่านความหนาและความกว้าง ไม่ใช้couponนี้แทน
3. หลังnumericalQAเพียงพอ ค่อยสำรวจsemi-rigid/contactของJO-CR/JO-BSและload registerครบก่อนStep3; ไม่เลือกbolt/เหล็ก/ความหนาอัตโนมัติ
