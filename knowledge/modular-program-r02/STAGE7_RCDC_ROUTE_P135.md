# P135 — ทางออกแบบRCจากคู่มือRCDCที่ติดตั้งจริง

ตรวจเพิ่มเติมระหว่างรอข้อมูลP134 ไม่ใช่ผลnativeRCdesign และไม่ปิดgate7

## หลักฐานที่ตรวจ

- `C:/Program Files/Bentley/Engineering/RCDC 2023/RCDC.exe` version23.00.03.63
- คู่มือ `C:/Program Files/Bentley/Engineering/RCDC 2023/Lib/RCDC.chm` แตกไฟล์อ่านภายในโครงการด้วย7zที่มีอยู่แล้ว ไม่แก้โปรแกรม/license/registry ไม่เผยแพร่คู่มือ
- คู่มือSHA256 `c384ed7b8284f6b0e75965ac942a821c4de79edbf78d063520e8e27033ec9545`
- เนื้อหาที่อ่านครบ: `Getting_Started1.htm`, `Getting_Started2.htm`, `Getting_Started3.htm`, `Beams_at_Foundation_level.htm`, `Beam_Continuity_Detection.htm`, `The_Slab_Design_Window.htm`
- ตรวจข้อความHTML302ไฟล์ในคู่มือหลังตัดstyle/script/comment ไม่พบคำอธิบายAPI/command-line/automationจากคำค้นที่ใช้ **ไม่ใช่หลักฐานยืนยันว่าไม่มีAPIใดอยู่เลย** แต่ยังไม่มี documented automation route ให้ใช้อย่างตรวจสอบได้
- เครื่องมือที่มีในเซสชันไม่มีnative desktop controlที่เรียกได้สำหรับตรวจหน้าจอ/สั่งRCDC ไม่สร้างUI automationหรือเรียกprivateDLLเพื่ออ้างnative validation

## ประเด็นที่เปลี่ยนแผนส่งต่อ

1. คานระดับฐานรากที่ไม่มีเสา: คู่มือมีตัวเลือก **Consider beams at Foundation level** โปรแกรมใช้จุดรองรับระบุเสาสมมติ และระบุกรณีfixed/pinned/fixed-butว่าใส่600×600mm จึงต้องตรวจ/ปรับsupport-face dimensionsให้ตรงเงื่อนไขออกแบบจริงก่อนยอมรับclear span/end detailing ไม่เอา600mmเป็นขนาดฐานรากของโครงการหรือเพิ่มเสาในSTAAD
2. คานถูกแบ่งเป็นelementย่อยจำนวนมากเพื่อต่อplate/offset: ต้องตรวจcontinuumที่RCDCตรวจพบและanalysis referencesทุกช่วง คู่มือมีmerge/split beam groups และmerge/split beams แต่ไม่ได้พิสูจน์ว่า import โมเดลของเราได้ถูกต้องแล้ว
3. คูมือระบุACI318/318M-19และAS3600:2018ในรายการdesign codes แต่ยังไม่ตรวจlicense/native execution/amendmentsหรือผลคำนวณ ไม่ใช้รายการcodeในคู่มือเป็นcodePASS
4. Bentleyระบุงานslabทั่วไปเป็นพื้นที่ที่ตรวจพบจากbeam frameและต้องใส่dead/live loadในRCDC จึงไม่ใช้เป็นหลักฐานว่าอ่านN/M/Qของcurved shellที่มีช่องเปิดและรอยต่อครบโดยอัตโนมัติ

## เส้นทางงานที่คงตามscope

- STAAD: วิเคราะห์plate/shell/beamและส่งผลที่ตรวจสมดุล/แกน/units/loadcasesแล้ว
- คานขอบ: ส่งRCDCเมื่อมีฐานออกแบบ/โหลดครบ ตรวจimport geometry, continuum, support-face dimensions, torsion/axial assumptionsและcode settingsจริง พร้อมเทียบbenchmarkและรายการคำนวณ
- curved shell/ช่องเปิด/รอยต่อ/งานที่RCDCไม่พิสูจน์ว่ารองรับ: ต้องทำรายการคำนวณตามข้อกำหนดจริงโดยใช้ผลแรงร่วมกรณีเดียวกัน ไม่ถอยไปlegacyACI2008และไม่ใช้slab coefficient modelแทนcurved shellเงียบๆ
- เมื่อไม่มีช่องทางnativeRCDCที่ตรวจได้ ต้องให้ผู้ใช้งานโปรแกรมช่วยrun/exportผลที่กำหนด หรือจัดให้มีช่องทางควบคุมที่รองรับก่อนอ้างว่าส่วนนี้ตรวจครบ
- ทั้งสองเส้นทางยังต้องใช้มาตรฐานฉบับเต็ม/ฐานวัสดุ/coverageที่รอP134 ไม่มีการแก้standard editionหรือค่าunknownให้กลายเป็นassumed final

## แหล่งprimaryออนไลน์ที่ตรวจประกอบ

Bentley Validation Documents:
https://bentleysystems.service-now.com/community?id=kb_article&sysparm_article=KB0115379
รองรับการแยกชนิดงานและslab workflowตามข้อ4 ไม่ใช่แหล่งแทนfullcode

หน้าบทความworkflowเก่าที่ค้นพบredirectไปหน้าSTAADทั่วไป ไม่ใช้ข้อความsearchsnippetเป็นหลักฐานออกแบบเพิ่มเติม

ขั้น7/8ยัง5%; nativeRCverified0; engineeringApproved=false productionReleased=false. P134ยังรอคำตอบ ไม่ใช่verified waitของsolver ไม่มีprocessRCDCที่ยืนยันว่ากำลังคำนวณอยู่
