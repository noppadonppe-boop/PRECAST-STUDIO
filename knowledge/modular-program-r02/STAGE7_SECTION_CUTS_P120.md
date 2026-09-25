# P120 — แรงรวมหน้าตัดบริเวณช่องหน้าต่างจาก native corner forces

ขั้น7/8ยัง5%; ต่อP118/P119 โดยเพิ่มการดึงแรงรวมหน้าตัดจริง ไม่ใช้peakstressที่ไม่คงที่จัดเหล็ก

## วิธีตรวจ

อ่านSTAAD2023 Help STD_PRINT.html: PRINT ELEMENT FORCES เป็นglobalcornerforces ต่างจากPRINT ELEMENT STRESSESที่เป็นstress/momentต่อความกว้าง
รันโมเดลเดิม3mesh ×2crowncasesเพิ่มcorner output เก็บinputs/ANLในrunfolderใหม่ ไม่แก้ผลsolverP118/P119
ดึงforce/momentทั้ง6componentsที่ทุกcorner ตรวจid/memberครบ4cornersต่อquad ไม่มีnodeซ้ำ
ตรวจnativecornerforceทุกelementรวมกับselfweight/centroidของelementนั้น สมดุลก่อนรวมหน้าตัด พบว่าผลnativeชุดนี้รวมผลselfweightแล้ว จึง **ห้ามหักequivalentbodyloadซ้ำ** จากcorneroutput แม้Helpย่อเขียนFp=KpDp; วิธีนี้ยืนยันจากelementequilibriumจริง ไม่อนุมานจากชื่อคำสั่งอย่างเดียว

หน้าตัดตามsource Z=1075และ2275mmตรงmeshboundaries ระดับท้อง/หัวช่องหน้าต่าง
เลือกรวมแรงบนcutnodesของelementsฝั่งเหนือcutเท่านั้น ไม่รวมทั้งสองฝั่งซึ่งจะหักล้างกัน ใช้regionทั้งLH+RHเพื่อให้crowninternalactionsหักล้างกัน
ตรวจFและMของcutเทียบกับน้ำหนัก+CGของregionเหนือcutที่คำนวณแยกจากsourcegeometry;เกณฑ์5N/5Nm และelement1N/1Nm
ครบ6กรณีผ่านเกณฑ์;เก็บทุกองค์ประกอบที่เกิดพร้อมกันแต่ละcase ไม่ทำmixedenvelope

## ผลใช้อธิบายเส้นทางแรง (ไม่ใช่ RC design)

น้ำหนักเหนือท้องหน้าต่างรวมประมาณ28.95844kN; เหนือหัวหน้าต่างประมาณ20.18894kN
ที่หัวหน้าต่างซีกLH ตาข่ายละเอียด:

| crown study | Fx / Fy (kN, STAAD global) | Mz (kNm รอบแกนที่หน้าตัดผนังเอง) |
|---|---|---:|
| Translation-coupled |1.92291 /10.09454|4.03794|
| Rigid |0.71505 /10.09449|1.50167|

แรงแสดงเป็น**resultantของทั้งหน้าตัดซีกนั้น** ไม่ใช่kN/m,ไม่ใช่แรงต่อbarหรือbolt และยังเป็นselfweight/idealrigidlinebase/materialtrialเดิมเท่านั้น
จุดอ้างอิงmomentของLHคือSTAAD(0.075,cutHeight/1000,0.75)m; เก็บmomentรอบcommonorigin(1.5,cutHeight/1000,0.75)mแยกไว้ด้วย ห้ามใช้แทนกันเพราะมีeccentricforceleverarm
เปรียบเทียบ3meshแล้วแรงรวมที่ไม่ใกล้ศูนย์เปลี่ยนรอบท้ายต่ำกว่า0.06% เป็นหลักฐานความคงที่ของsectionresultantsเหล่านี้ ไม่ใช่localstress/RCcapacityconvergence

## เหตุการณ์การรัน

รอบr1 c9e2f76871fb483690199786dad440f9: CROWN_RIGIDถูกยกเลิก nativeรายงานUSER HAS INITIATED ABORT/ErrorCount2 ไม่ถือผ่าน ไม่ลบ ไม่ตีความว่าโครงสร้างunstable
ยืนยันไม่มีSProStaadprocessค้างแล้วรันใหม่หนึ่งครั้ง ได้r1successfulrunด้านล่าง warnings0/errors0 ทั้งสองcases ไม่แก้ระบบlicenseหรือสิทธิ์

## หลักฐานปัจจุบัน

- output/staad-p7-p120/comparison.json
- r0: output/staad-p7-p120/r0/runs/c5c892f6c245475aad6b8083d0d27c23
- r1: output/staad-p7-p120/r1/runs/8e181c7cd2c4479d959f4fa153d25c75
- r2: output/staad-p7-p120/r2/runs/ea36ae9488bf484587cea1fe9c3c202a
- แต่ละfolderมีsection-cuts.json,study-spec.json,STD/ANL/logสองcases
- tools/modular-program/verify-bay-cuts-p120.mjs
- tools/modular-program/compare-bay-cuts-p120.mjs

comparisonตรวจrawANL/input/spec/meshhashก่อนเทียบทุกcase

## ที่ยังไม่พิสูจน์

Localwindowcornerpeakยังไม่คงที่ตามP119 ไม่ถูกลบหรือsmoothทิ้ง ต้องออกแบบการรับแรงและเหล็กรอบช่องด้วยcodeและรายละเอียดจริง
ยังไม่มีbeam/foundation/end/floor/longitudinaljointของfullI,ไม่มีwind/seismic/LL/finishes/handling/RC/connectioncapacity ไม่ส่งsectionactionsนี้เป็นfoundationreactions
stage7fullobjective48products2codetracksยังคงเดิม วิเคราะห์ทั้งอาคาร0/48RC0/48;engineering/productionfalse
