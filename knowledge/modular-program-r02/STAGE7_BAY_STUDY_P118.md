# P118 — Native STAAD self-weight study ของซีก TS-C คู่แรก

ขั้น7/8ยัง5%ตาม20gatesP105; เป็นsubassembly sensitivityที่ใช้geometryจริง ไม่ใช่การปิดscopeด้วยbenchmarkหรือการวิเคราะห์ทั้งหลัง

## ฐานศึกษาและข้อจำกัด

ใช้P115 PM-I-C1-I-S01-LH/RH รวม2parts มีหน้าต่างLHจริง:1442nodes1304shell elements ความหนา150mm ไม่เปลี่ยนรูปทรงต้นแบบ
น้ำหนักคำนวณจากปริมาตรmidsurface1.63134134m3 × trial density2400kg/m3 × g9.80665 =38.3951845kN
E30GPa,nu0.2เป็นสมมติฐานlinear-elasticสำหรับศึกษา ไม่ใช่การยืนยันค่าEตามfc350kscหรือการเลือกวัสดุผลิต ไม่จำลองprestress ไม่เปลี่ยนสถานะprestressของโครงการ

ฐาน:fixtranslationทั้ง3แกน/rotationfreeที่wallbase30nodes เป็นideal rigid line bearing **ไม่ใช่คานขอบหรือฐาน6จุดของIทั้งหลัง** จึงห้ามส่งแรงเหล่านี้ให้ทีมฐานรากเป็นfinal
ปลายbayอิสระ ไม่มีfloor/END/3baysที่เหลือ/JO-BY คงcrown20mmgap
กรณี1 DEPENDENT FX FY FZ ใช้LHเป็นcontrol,รวมoffset,rotationRHอิสระ
กรณี2 DEPENDENT RIGID ที่crown เป็นทางเลือกความแข็งสำหรับศึกษา ไม่อ้างjointจริงรับmomentได้
ไม่ใช้SET SHEARในโมเดลนี้ ไม่กำหนดrotationalstiffnessหรือconnectorcapacityขึ้นมาจากภาพ

## ผลรันและตรวจจริง

NativeSTAAD23.00.02.361ผ่าน2กรณี warnings0/errors0
Independentselfweight/CGเทียบสมดุลreactions: residualแต่ละแกนforce<0.041N และmoment<0.023Nm ต่ำกว่าเกณฑ์ก่อนรัน1N/5Nm
ตรวจsupportครบ30 nodesไม่ซ้ำ,displacementครบ1442 nodes,stress/resultantsครบ1304elementsต่อกรณี,allloadsเป็นLC1selfweightอย่างเดียว

| ผลศึกษา | Crown translation-coupled / rotation-free RH | Crown rigid |
|---|---:|---:|
| Reaction verticalรวม(kN) |38.39519|38.39517|
| Reaction verticalฝั่งLH/RH(kN) |17.29118 /21.10401|17.29117 /21.10400|
| Reaction horizontalฝั่งLHขนาด(kN) |1.92283|0.71485|
| Downwarddisplacementสูงสุดจากตารางปัดเศษ(mm) |0.894|0.208|
| Crowninterface MzบนLHโดยFBDรอบจุดอ้างอิงร่วม(kNm) |ประมาณ0|3.32190|

ความต่างนี้ชี้ว่าผลขึ้นกับสมมติฐานรอยต่ออย่างมีนัยสำคัญ ไม่เลือกrigidเพราะโก่งน้อยกว่าโดยไม่มีdetail/capacitycheck
Jointresultantsคำนวณจากnegative of support+selfweight resultantของแต่ละครึ่งรอบจุดเดียว STAAD(1.5,2.925,0.75)m;ตรวจaction/reactionรวมผ่าน ไม่ใช่แรงต่อboltและยังไม่มีdistributionแรงconnectorจริง

## แรงภายในที่ส่งต่อ

เก็บNxx,Nyy,Nxy,Qx,Qyหน่วยkN/m และMxx,Myy,Mxyหน่วยkNm/mพร้อมlocalaxesจากSTDincidenceจริงและrawnativevaluesทุกelement/LC ไม่เก็บเฉพาะmaxenvelope
อ้างนิยามlocalaxesและหน่วยจากHelp GUID-777CEFB1-4F20-457A-8594-C3F8288A1AF5.html; stressคูณthicknessเป็นforce/unitwidth ส่วนplate momentมีหน่วยต่อความกว้างอยู่แล้ว
ใช้native sign convention ห้ามตีความlocalx/yเป็นแกนอาคารโดยตรง ค่าต่างcomponentที่maximumคนละelementไม่ใช่concurrentdesignvector
ยังไม่meshconvergence,cracking,serviceability/codecheck,แรงลม/ยก/แผ่นดินไหว/LL/finishes/handling,connectioncapacity หรือRCdesign ห้ามนำpeakไปจัดเหล็กทันที

## หลักฐาน

Folder: output/staad-p7-p118/runs/bce8e402c45f4bf8b5f9593f13d6700c

- study-spec.json: assumptions/sourcehash/criteriaก่อนรัน
- CROWN_TRANSLATIONS.STD/.ANL และ CROWN_RIGID.STD/.ANL
- verification.json: equilibrium,per-part FBD,displacements,hashes
- *-shell-resultants.json: concurrentelementresults+axes
- *-nodal-results.json: fullsupportreaction/displacement
- tools/modular-program/stage7-bay-study-p118.mjs
- tools/modular-program/run-staad-bay-study-p118.ps1
- tools/modular-program/verify-staad-bay-p118.mjs

ลำดับถัดไป: meshrefinementและloadpathจริงwallseat→beam→approvedfoundations, intersectionjointtopology, END/floor integration; จากนั้นpilotทั้งหลังและRCตามcodeเต็ม ไม่ข้ามงาน48แบบ/สองtrack
อาคารวิเคราะห์ครบ0/48,RC0/48,engineeringapproved=false,productionreleased=false
