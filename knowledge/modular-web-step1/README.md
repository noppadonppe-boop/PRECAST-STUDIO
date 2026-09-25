# คลังแบบโมดูลาร์ / WEB-16

## สถานะล่าสุด — WEB-16 / 16 กันยายน 2026

เพิ่ม **Step 2O · ผนังใกล้ฐาน** จาก [Knowledge Step2O](../modular-tsc-step2o/README.md): NBหนึ่งFEMrun เพิ่มwall27→36ต่อซีก คงarc48/roof24/Y16/t8และคอนกรีต175มม./โหลด/ฐานเดิม. เทียบM1 พร้อมแรงฐาน/6cuts/490จุดและภาพดาวน์โหลด1PNG รวม80ภาพ(52concept+28engineering)

NBผ่านtraction6/6; local3/4เฉพาะคู่M1→NB แต่ฐานยังไม่ผ่าน(point59.882%,spread9.718%). การผ่านกลุ่มอื่นไม่ปิดarc convergenceจากรอบก่อนเพราะไม่ได้เพิ่มarc. คงNOT_ESTABLISHED/ไม่อนุมัติผลิต

ตรวจnumerical79,UI41,TypeScript/build,R01snapshot162checksและPNG1ภาพ. สถานะHTTP/ส่งมอบใน [status-web16.json](status-web16.json). คงengineering capability/study/imageACL/STALEhash ไม่ส่งrawmeshหรือPDFมาตรฐาน. ไม่มีbrowser visualQA/Firebaseจริง/deployment

## บันทึกส่งมอบ WEB-15 (ประวัติ)

เพิ่ม **Step 2N · ทิศความเค้น** จาก [Knowledge Step2N](../modular-tsc-step2n/README.md): อ่านผลเดิม490พิกัด ไม่มีFEM runใหม่. แยกpoint changeจากone-sided spreadและจำแนกคู่หน้าelementเป็นprofile/Y/thickness/multiple. ไม่ถือว่าไม่มีคู่แปลว่าศูนย์หรือผ่าน

ฐานมีjumpnnข้ามชั้นmeshความหนาประมาณ3.1644kPa; ทิศjumpไม่พิสูจน์สาเหตุ. เก็บเกณฑ์เดิมครบ24รายการ ยังผ่านครบ1/4กลุ่ม ไม่อนุมัติผลิต. เพิ่มPNG1ภาพ/รวม79ภาพ(52concept+27engineering) พร้อมdownloadและengineering capability/study/imageACL/STALE. ไม่ส่งrawmeshหรือPDFมาตรฐาน

ตรวจตัวเลข74tests, UI39tests, TypeScript/buildและR01snapshot162checks; ตรวจPNG1ภาพแล้ว. HTTPและสถานะส่งมอบดู [status-web15.json](status-web15.json). ไม่มีbrowser visualQA/Firebaseจริง/deployment

## บันทึกส่งมอบ WEB-14 (ประวัติ)

เพิ่ม **Step 2M · โค้ง/กลางหลังคา** จาก [Knowledge Step2M](../modular-tsc-step2m/README.md): M1หนึ่งrun เพิ่มarc48/roof24ต่อซีก คงผนัง27/Y16/ชั้นหนา8และt175/โหลด/BCเดิม. เทียบKPTเดิม แสดงtractionทั้งสองด้าน/referenceและtrace-pairแยกกัน

M1ผ่านtraction6/6cuts แต่localpairgroups1/4 จึงยังNOT_ESTABLISHEDและไม่อนุมัติผลิต. เพิ่มPNGดาวน์โหลด1ภาพ รวม78ภาพ(52concept+26engineering); engineeringcapability/study/imageACL/STALEhashยังบังคับฝั่งserver ไม่ส่งrawmeshหรือPDFมาตรฐาน

numerical69+UI37+HTTP13=119testsผ่าน; TypeScript/buildและR01snapshot162checksผ่าน; ตรวจPNG1ภาพแล้ว. ไม่มีbrowser visualQA/Firebaseจริง/deployment. [status-web14.json](status-web14.json)

## บันทึกส่งมอบ WEB-13 (ประวัติ)

เพิ่ม **Step 2L · ผลร่วม mesh** จาก [Knowledge Step2L](../modular-tsc-step2l/README.md): KPTหนึ่งfull-bayrunรวมKPprofileกับKTชั้นหนา8 เทียบประวัติH4/KP/KT ไม่เปลี่ยนt175/โหลด/BC. คงผลเก่าและสิทธิ์เดิม

KPTtractionผ่าน2/6เท่าKP, localpairgroups2/8; ยังคงNOT_ESTABLISHED/ไม่อนุมัติผลิต. หน้าเว็บแสดง4meshes/สองคู่local/24cuts×2traces และภาพdownload1แผ่น รวม77PNG(52concept+25engineering). ใช้physical-angle cut selectorตั้งแต่raw ไม่มีการใช้selectorเก่ากับnonuniformarc

UI35+HTTP13+numerical64 รวม112testsผ่าน; TypeScript/build,R01snapshot162checksและตรวจPNGผ่าน. มีengineeringcapability/study/imageACL/STALEhashครบ ไม่ส่งrawmeshหรือprivatePDF. ไม่มีbrowser visualQA/Firebaseจริง/deployment. [status-web13.json](status-web13.json)

## บันทึกส่งมอบ WEB-12 (ประวัติ)

เพิ่ม **Step 2K · แนวหน้าตัด/ความหนา** จาก [Knowledge Step2K](../modular-tsc-step2k/README.md): 2full-bayruns KP/KTเทียบH4 คงt175/โหลด/ฐานเดิม. แสดงglobal/local/cutsครบ6องค์ประกอบและ2ภาพดาวน์โหลด รวม76PNG (concept52+engineering24)

ใช้ผล`profile_thickness_verified.json`ที่แก้selectorแนวตัดให้ตรงพิกัดมุมจริง ไม่ใช้ผลKPก่อนแก้. KPผ่านtraction2/6cuts; KT0/6; localpairgroupsผ่าน2/8 ยังไม่ยืนยันwhole-model convergenceหรืออนุมัติผลิต. ประวัติเดิมและผลก่อนแก้เก็บแยก

UI33 + HTTP13 + numerical60 =106testsผ่าน; TypeScript/buildและR01snapshot162checksผ่าน; ตรวจPNG2แผ่นแล้ว. คงbackendengineeringcapability/study/imageACLและSTALEhashรวมpostprocessor ไม่ส่งrawmesh. ไม่มีbrowservisualQA/Firebaseจริงหรือdeployment. [status-web12.json](status-web12.json)

## บันทึกส่งมอบ WEB-11 (ประวัติ)

เพิ่ม **Step 2J · อ้างอิงแรงเฉือน** จาก [Knowledge Step2J](../modular-tsc-step2j/README.md): ชิ้นตรงgravity9runs เทียบpolynomial exact plane-strain elasticity ตรวจtractionด้วยฟังก์ชันS2Iเดิม แยกการเพิ่มnx/nz; ไม่แก้ผลfullbayก่อนหน้า

ν=.20มี7meshes, ν=0controlมี2meshes เว็บแสดงเฉพาะcaseที่รันจริง เลือกmesh/cutและอ่านexact/nodal/two-sidedtraction6องค์ประกอบพร้อมRMSstressและabsoluteหน่วยจริง. ครบcouponaccuracy4/9runs และcutcriteria21/27cuts ไม่อ้างว่าTS-Cผ่าน

เพิ่มPNG2แผ่น รวม74ภาพ (concept52 + engineering22), ปุ่มดาวน์โหลดเดิมใช้protectedHTTP. คงengineeringcapability+study/imageACL และSTALEจากbasis/helper/upstream/raw9/renderer ไม่ส่งrawmesh/facecontributionsหรือPDFมาตรฐานไปclient

TypeScript/buildผ่าน; UI31 + HTTP13 + numerical55 รวม99testsผ่าน, R01snapshot162checksผ่าน. ตรวจPNG2แผ่นและแก้layoutแล้ว ไม่มีbrowservisualQA/Firebaseจริง ไม่deploy/เพิ่มสิทธิ์ทีม. [status-web11.json](status-web11.json) เป็นสถานะส่งมอบ ไม่ใช่engineeringapproval

งานถัดไป: กลับfullbay แยกprofile/thickness refinementพร้อม490พิกัด/6cutสองtrace โดยคงโหลดและBCเดิม ก่อนsupport/joint sensitivityและStep3

## บันทึกส่งมอบ WEB-10 (ประวัติ)

เพิ่ม **Step 2I · Mesh / แรงหน้าตัด** จาก [Knowledge Step2I](../modular-tsc-step2i/README.md): 3directional meshes FULL/t175/BCเดิม แยกใกล้ฐาน/ขอบY/ทั้งสอง ไม่ใช่all-direction convergence. ตรวจtractionจากความเค้นย้อนหลัง8runsเดิมและ3runsใหม่ รวม66cuts×2traces

หน้าเว็บเลือกคู่mesh/กลุ่มความเค้น และเลือก11run audits/6cuts เพื่อดูแรง6องค์ประกอบทั้ง2ด้านกับnodal reference แสดงabsoluteและnormalizedพร้อมกัน ไม่สร้างผลLEFTสำหรับmeshใหม่ที่ไม่ได้รัน. รูปคงที่ระบุFULLชัดเจน

ฐานone-sided spreadลดจาก42.036%ในH4เป็น8.543%ในIBY แต่ยังไม่ครบ5%; pair-specific localgroupsเข้าเกณฑ์10/16 ไม่ใช่การยืนยันทั้งโมเดล. Cuttraction0/66ครบทุกเกณฑ์ แม้surfacequadratureทุกชุดนิ่งแล้ว จึงยังไม่อนุมัติความหนา เหล็ก หรือจุดต่อ

เพิ่มPNG2แผ่น รวม72ภาพ (concept52 + engineering20). คงengineering capabilityและstudy/imageACL ตรวจSTALEถึงupstream/raw3/audit11/code/renderer; hashไฟล์ใหญ่แบบstreamเพื่อจำกัดmemory. ไม่ส่งrawmeshหรือfacecontributionsให้browser ไม่แจกsolver/PDFมาตรฐาน

TypeScript/buildผ่าน; UI29 + HTTP13 + numerical48 รวม90testsผ่าน; R01snapshot162checksผ่าน. ตรวจPNGใหม่2แผ่น ไม่ทำbrowservisualQA/Firebaseจริง; ไม่deployหรือเพิ่มสิทธิ์ทีม. [status-web10.json](status-web10.json) เป็นสถานะส่งมอบ ไม่ใช่engineeringapproval

งานถัดไป: แยกprofile/thickness refinementกับsupport sensitivity และตรวจshear/traction reconstructionที่มีreferenceชัด ก่อนใช้localstressออกแบบ

## บันทึกส่งมอบ WEB-09 (ประวัติ)

เพิ่ม **Step 2H · โมดูล 20-node** จาก [Knowledge Step2H](../modular-tsc-step2h/README.md): TS-C เต็ม bay t175/F-R limit, ขอบYอิสระ, consistent SW/roof LL, FULL/LEFT รวม8runs H1–H4. เก็บรายงาน H1–H3 เดิมและเหตุผลเพิ่มH4ไว้ ไม่ลดเกณฑ์ภายหลัง

เลือกโหลดและบริเวณความเค้นเพื่ออ่านผลจริง พร้อมแรงฐาน/แนวตัด/profile/absolute kPa และข้อจำกัด. H3→H4 ผลรวมเข้าเกณฑ์เฉพาะค่าที่ตรวจ แต่ local stress ยังไม่ครบ0/8กลุ่ม จึงไม่เลือกเหล็กหรือจุดต่อผลิต และไม่อ้างว่า Step2 ผ่านทั้งหมด

เพิ่มภาพดาวน์โหลด FBD/QA2แผ่น รวม70ภาพ (concept52 + engineering18); บอร์ดคงที่ FULL/H4/t175 ติดป้ายชัด ไม่ใช้แทน LEFT. คง engineering capability, study/image ACL และ STALE ของต้นทาง/ผลดิบ8ไฟล์ ไม่มีการเผยแพร่เว็บหรือเพิ่มสิทธิ์ทีม

TypeScript/build ผ่าน; UI27 (รวม joint library เดิม2) + HTTP13 + numerical/evidence41 รวม81tests ผ่าน และ R01snapshot162checks ผ่าน. ตรวจPNGใหม่2แผ่น ไม่ทำ browser QA หรือ Firebaseจริง. Software tests ไม่ใช่การรับรองทางวิศวกรรม สถานะส่งมอบ: [status-web09.json](status-web09.json)

งานถัดไป: mesh เฉพาะฐาน/ขอบ/ช่วงเปลี่ยนโค้ง, stress-traction cut checks และ support/edge sensitivity ก่อนออกแบบตามมาตรฐาน

## บันทึกส่งมอบ WEB-08 (ประวัติ)

เพิ่ม **Step 2G · โค้ง 20-node** จาก [Knowledge Step2G](../modular-tsc-step2g/README.md): ชิ้นโค้ง 30 runs + 2 affine patches เทียบ independent exact elasticity แยกผล 8/20-node และ chord/quadratic geometry; t150/175/200mm, 3 meshes และ ν=0 control

หน้าเว็บเลือกความหนาและแบบจำลองเพื่ออ่านผลจริง แสดง error ครบ 6 stress พร้อม one-sided spread และ profile ไม่อ้างว่าผ่านจากพลังงานอย่างเดียว กลุ่ม 20-node ที่ mesh ละเอียดสุดครบเกณฑ์เฉพาะ coupon ทั้ง 7 กลุ่ม ส่วน 8-node ยังไม่ครบทั้ง 3 กลุ่ม ไม่เปลี่ยนสถานะ local-stress convergence ของโมดูลเดิม และยังไม่เลือกความหนาผลิต

เพิ่ม FBD/QA PNG 2 แผ่น รวม 68 ภาพ (concept 52 + engineering 16) บอร์ดตัวอย่างคงที่ติดป้าย t175 ชัดเจน คงสิทธิ์ engineering/study/image และตรวจ STALE รวม raw 30 ไฟล์ ไม่มีการ deploy หรือเพิ่มสิทธิ์สมาชิก

TypeScript/build ผ่าน; UI25 (รวม joint library เดิม2) + HTTP13 + numerical/evidence35 รวม73 tests ผ่าน และ R01 snapshot162 checks ผ่าน ตรวจ PNG ใหม่2แผ่นแล้ว ไม่ทำ browser QA/Firebase จริง การผ่าน tests ไม่ใช่การอนุมัติวิศวกรรมหรือผลิต สถานะส่งมอบ: [status-web08.json](status-web08.json)

งานถัดไป: TS-C quadratic-solid full-bay revision ใหม่ ตรวจ gravity / ขอบข้างอิสระ / พิกัดตรวจร่วมและผลของจุดรองรับ ก่อนนำแรงไปออกแบบตามมาตรฐาน

## บันทึกส่งมอบ WEB-07 (ประวัติ)

เพิ่ม **Step 2F · ดัด–เฉือน** จาก [Knowledge Step2F](../modular-tsc-step2f/README.md): ชิ้นตรง24benchmark +4loadmapping เทียบ8-node/20-nodeกับ independent exact elasticity พร้อม2affinepatchchecks ผลสนับสนุนให้ตรวจquadratic solidในcurved couponต่อ ไม่ใช่การรับรองโมดูลจริง

หน้าเว็บเลือกM/Vเพื่ออ่านผลจริง แสดงerrorครบ6stress, absolute kPa และแยกload sensitivityจากexact accuracy เพิ่มFBD/QA PNG2แผ่น รวม66ภาพ (concept52+engineering14) คงสิทธิ์engineering/study/image และSTALEรวมraw28files ไม่มีการdeployหรือเพิ่มสิทธิ์สมาชิก

TypeScript/buildผ่าน; UI23 (รวมjointlibraryเดิม2) + HTTP13 + numerical/evidence30 รวม66testsผ่าน และR01snapshot162checksผ่าน ตรวจPNGใหม่2แผ่นแล้ว ไม่ทำbrowserQA/Firebaseจริง การผ่านtestsไม่ใช่การอนุมัติวิศวกรรมหรือผลิต สถานะส่งมอบ: [status-web07.json](status-web07.json)

## บันทึกส่งมอบ WEB-06 (ประวัติ)

เพิ่ม **Step 2E · ความเค้น** จาก [Knowledge Step2E](../modular-tsc-step2e/README.md): อ่านผลSolidเดิม6ชุดที่490พิกัดร่วม/ชุด รวม2,940จุด ไม่มีFEMsolveใหม่ การอ่านผลตรงกับGaussเดิมทุกจุด แต่ไม่มีทั้ง8กลุ่มที่เข้าเกณฑ์localstressครบ6องค์ประกอบ จึงยังไม่ใช้ผลเลือกเหล็กหรือจุดต่อ

เลือกFULL/LEFTและ4บริเวณเพื่ออ่านผลจริง พร้อมค่าที่ตำแหน่งคุมและตัวอย่างผ่านความหนา เพิ่ม2PNGรวม64ภาพ กราฟคงที่ติดป้ายFULL ไม่แสดงแทนLEFT ไม่มีsurfaceextrapolationหรือAIheatmap รอยแบ่งelementไม่ใช่รอยต่อจริงของprecast

คงสิทธิ์engineering/study/imageACLและตรวจSTALEรวมrawsolid6ไฟล์ รักษาเมนูรอยต่อที่มีอยู่โดยไม่เปลี่ยนเป็นแบบที่อนุมัติ ไม่มีdeploy/เพิ่มสิทธิ์ทีม สถานะส่งมอบ: [status-web06.json](status-web06.json)

TypeScript/buildผ่าน; UI21 (รวมjointlibraryเดิม2) + HTTP13 + numerical/evidence25 รวม59testsผ่าน และR01snapshot162checksผ่าน ตรวจPNGใหม่2แผ่นแล้ว ไม่ทำbrowserQAหรือFirebaseจริง การผ่านtestsรวมการตรวจว่าlocalQAยังไม่ผ่าน ไม่ใช่ผลรับรองโครงสร้าง

## บันทึกส่งมอบ WEB-05 (ประวัติ)

เพิ่ม **Step 2D · Solid bay** จาก [Knowledge Step2D](../modular-tsc-step2d/README.md): solidทั้งbayขอบข้างอิสระ6runs, shell section-cut audit6runs และ72subbodyFBD โดยศึกษาความหนา175มม./F-R limitเท่านั้น ไม่ใช่การเลือกผลิต

เลือก FULL/LEFT เพื่อเปลี่ยนตารางผลจริง; บอร์ดภาพคงที่มีป้ายระบุกรณีชัดเจน เพิ่ม2ภาพดาวน์โหลดรวม62ภาพ ผ่านเกณฑ์ตัวเลขของผลรวมที่ตรวจ แต่ยังไม่รับรองlocal-stress convergence/กำลัง/เสถียรภาพหรือจุดต่อจริง และไม่เปลี่ยนสถานะQA incompleteของS2B

แยกสิทธิ์engineeringและartifact ACLเหมือนเดิม ตรวจSTALEของdependencies ไม่มีการdeployหรือเพิ่มสิทธิ์ทีม สถานะส่งมอบ: [status-web05.json](status-web05.json)

ตรวจ TypeScript/build ผ่าน; UI/model17 + HTTP/security13 + S2A6 + S2B5 + S2C4 + S2D5 รวม50testsผ่าน และ R01 snapshot162checks ผ่าน ตรวจPNGใหม่2แผ่นแล้ว ไม่ทำbrowser visual QAหรือFirebase integrationจริง การผ่านtestsไม่ใช่การรับรองโครงสร้าง

## บันทึกส่งมอบ WEB-04 (ประวัติ)

เพิ่ม **Step 2C · มุมโค้ง** จาก [Knowledge Step2C](../modular-tsc-step2c/README.md): solid–shell plane-strain coupon36runs, fixed-station diagnosticจากผลเดิม6runs และภาพดาวน์โหลดเพิ่ม2แผ่น รวม60ภาพ ไม่ใช่full-bay solid validation และไม่เปลี่ยนสถานะQA incompleteของS2B

แยกengineering capability/metadata study ACL/ภาพ ACL เช่นเดิม ตรวจSTALEรวมraw source6ไฟล์ ไม่มีpublic hostingหรือการให้สิทธิ์ทีมเพิ่ม สถานะตรวจส่งมอบ: [status-web04.json](status-web04.json)

ตรวจ build/TypeScript ผ่าน; UI/model15 + HTTP/security13 + Step2A6 + Step2B5 + Step2C4 รวม43testsผ่าน (รวมการยืนยันว่าQAบางส่วนยังไม่ผ่าน ไม่ใช่การรับรองโครงสร้าง) ตรวจภาพPNGสองแผ่นแล้ว ไม่ทำbrowser visual QAหรือFirebaseจริง

## บันทึกส่งมอบ WEB-03 (ประวัติ)

เพิ่ม **Step 2B · Shell** จาก [Knowledge Step2B](../modular-tsc-step2b/README.md) ให้เลือก t150/175/200, สมมติฐานจุดต่อ4กรณี และ FULL/LEFT เพื่ออ่านผลคำนวณที่มีจริง แยกแรงรวมจุดต่อจากแรงต่อเมตรของ shell พร้อมแจ้ง QA incomplete และ STALE

ภาพดาวน์โหลดรวม58ภาพ (+3ภาพ Step2B); ตัวเลือกบนหน้าเปลี่ยนตารางผล ส่วนบอร์ดภาพคงที่ติดป้าย case ชัดเจน ไม่สวมรูป175มม.ให้เป็นผลความหนาอื่น ไม่เปลี่ยนสถานะ48แบบ/R01 หรืออนุมัติผลิต

เพิ่มแบบจำลอง74 runs แต่ **ไม่ประกาศ Step2 ผ่าน**: global mesh targets เข้า24/24กลุ่ม แต่ interior resultants ทั้ง8ตัวยังไม่ครบ0/24 และ solid comparison ยังไม่ทำ คงเกณฑ์เดิมหลังตรวจ M4 เพิ่ม ไม่ลดเกณฑ์เพื่อให้ผ่าน

build/TypeScript ผ่าน, UI/model13 + server/security13 + Step2A numerical6 + Step2B evidence5 tests รวม37ผ่าน การผ่าน tests นี้รวมการตรวจว่า engineering QA ยังไม่ครบ ไม่ใช่ design pass. PNGใหม่ตรวจด้วยสายตาแล้ว; ไม่ทำ browser visual QA/Firebaseจริง/การ deploy

สถานะปัจจุบัน: [status-web03.json](status-web03.json)

## บันทึกส่งมอบ WEB-02 (ประวัติ)

- เพิ่มเมนู **ดาวน์โหลดภาพ**: ค้นหาและแยกภาพแนวคิดอาคาร / Typical / วิศวกรรม ดาวน์โหลด PNG ต้นฉบับพร้อมชื่อ Tag ผ่านสิทธิ์เดียวกับการดูภาพ มีปุ่มในหน้ารายละเอียดด้วย
- ภาพที่เจ้าของ local preview เข้าถึงได้รวม 55 ภาพ: concept เดิม 52 + engineering draft TS-C ใหม่ 3 ภาพ
- เพิ่มหน้า **Step 2A · TS-C** จาก [ฐานศึกษาและบันทึกวิศวกรรม](../modular-tsc-step2a/README.md): รูปตัด/แปลน, FBD, ตำแหน่งจุดต่อ, ปริมาตร/ช่วงว่างของกริดความหนา 150/175/200 มม.
- ผู้ใช้ยืนยัน TS-C 3.00 × 3.00 ม. โดยความสูงรวมพื้น, R ภายนอก 0.40 ม., ช่วง 1.50 ม. และเริ่ม S00 ทึบ ทั้งหมดเป็นฐานศึกษา ไม่ใช่แบบผลิต
- ผลสมดุลเป็น benchmark สามบานพับ 2D แบบมีเงื่อนไข **ยังไม่ใช่ FEM/แรงภายใน shell/ความหนาที่อนุมัติ** และยังไม่เลือกวัสดุ จุดต่อ ฐานรองรับ หรือ prestress
- มี SHA-256 ของ dependencies ของชุดศึกษา ตรวจใหม่ในแต่ละ metadata request และแจ้ง `STALE` เมื่อข้อมูลต้นทางเปลี่ยน ต้องสร้างผลใหม่ก่อนใช้อ้างอิง
- ข้อมูลและภาพวิศวกรรมต้องมี capability แยก `catalogue:engineering` ร่วมกับ `catalogue:read` และ artifact ACL; ยังไม่ได้เพิ่มสิทธิ์ให้ผู้ใช้ใดหรือ deploy บริการทีม
- ผลตรวจ: build/TypeScript ผ่าน; UI/model 11 tests, server/security 13 tests, numerical benchmark 6 tests ผ่าน ไม่มี browser visual QA หรือ real Firebase integration

สถานะปัจจุบันแบบเครื่องอ่าน: [status-web02.json](status-web02.json) · บันทึก WEB-01 คงอยู่ใน [status.json](status.json)

## บันทึกส่งมอบเดิม — WEB-01 (ประวัติ ไม่ใช่สถานะปัจจุบัน)

วันที่: 16 กันยายน 2026

สถานะ: **LOCAL_REVIEW_READY / ยังไม่เปิดบริการทีมจริง**

ผู้ใช้สั่ง “เริ่มขั้นถัดไปได้เลยครับ” หลังล็อก R01 จึงเริ่ม Step 1 ของแผน ไม่ใช่ engineering gate ของแอปเดิม และไม่ใช่คำสั่งเผยแพร่เว็บไซต์

## สิ่งที่ทำแล้ว

- คลังภาพภาษาไทย 48 ช่องรายการ: I/L/U × A/B/C/D × ออฟฟิศ/บ้านพัก/ร้านกาแฟ/รีสอร์ต
- ค้น Tag ไทย/อังกฤษ กรองการใช้งาน รูปทรง แปลน สถานะ พร้อมกรณีไม่พบข้อมูล/ไม่มีสิทธิ์/รูปโหลดไม่สำเร็จ
- หน้าแต่ละแบบ: ภาพรวม, บอร์ดภาพเต็มแผ่น, Segments, วิศวกรรม, แบบผลิต, BIM, ประวัติและ SHA-256
- เปรียบเทียบ I/L/U ภายในรูปทรงและการใช้งานเดียวกัน
- Typical 4 ครอบครัว พร้อมทะเบียน Tag ของซีก LH/RH ช่องเปิด และชิ้นร่วม X จาก R00; TS-C มีป้ายชุดนำร่อง
- Type I คงป้าย `LEGACY20 / NOT STD15 GEOMETRY`; จำนวน STD15 เป็นสูตรเป้าหมาย ไม่เปลี่ยนภาพเก่าย้อนหลัง
- สถานะคำนวณ/แบบผลิต/BIM ยังไม่เริ่ม ไม่มีภาพผลวิเคราะห์สมมติ ไม่มีการเลือกความหนา/วัสดุ/เหล็ก/prestress

## ขอบเขตไฟล์และ revision

ต้นฉบับอ้างอิง: [R01](../modular-program-r01/README.md), [R00](../modular-segments-r00/KNOWLEDGE_TH.md)

`tools/catalogue/data.mjs` สร้าง read-only projection `WEB-01` จากทะเบียน R01 และ R00 ที่เก็บแยกกัน ไม่แก้สถานะใน snapshot เดิมและไม่เพิ่มสินค้าซ้ำเมื่อมีประวัติภาพ

รูป 52 ไฟล์อ่านจาก `output/` เดิม ตรวจ realpath ให้อยู่ในโฟลเดอร์ที่อนุญาต มี SHA-256 ต่อภาพและทะเบียน ใช้ opaque artifact ID ใน URL ไม่ส่ง absolute path ให้ client ไม่คัดลอกภาพหรือ PDF มาตรฐานเข้า public/ หรือ build

การพัฒนาต่อหลัง Step 2 ต้องเพิ่ม live artifact/revision store และการตรวจ stale/dependencies ตาม [ข้อกำหนดเว็บไซต์](../modular-program-r01/WEB_CATALOG_SPEC.md) ไม่แก้ค่าใน R01 หรือ hardcode ผลใหม่ลงหน้าเว็บ ระบบรอบนี้อ่านอย่างเดียว ยังไม่มีการ upload, authoring, approval หรือ release

## การทดลองและการเปิดทีมเป็นคนละอย่าง

Local preview ผูกกับ `127.0.0.1` เท่านั้น มีลิงก์เจ้าของเครื่องแบบใช้ครั้งเดียว อายุ 10 นาที แลกเป็น HttpOnly/SameSite session อายุ 4 ชั่วโมง ไม่มีการถือว่า local owner คือสมาชิก Firebase และไม่มีการเปิดพอร์ตให้ LAN หรืออินเทอร์เน็ต

โหมดทีมมี Firebase identity adapter แยกจาก anonymous shared-mode เดิม ต้องตรวจ verified email, token revocation, สมาชิก org/project ที่ active และไม่หมดอายุ, capability `catalogue:read`, optional artifact allowlist ทุกคำขอ Metadata และไฟล์อยู่หลัง backend authorization

**ยังไม่ได้ทดสอบกับบัญชีทีมจริง/โครงการ Firebase จริง หรือเปิด TLS hosting** การผ่าน HTTP tests ด้วย identity adapter จำลองไม่ใช่การรับรอง production IAM/Firestore/โฮสต์เดิม

ไม่ได้เปลี่ยน AuthContext, shared Firebase rules, ข้อมูลสมาชิกหรือ workflow เดิม ไม่มีการ deploy หรือเพิ่มสิทธิ์ให้บุคคลใด

## ผลตรวจในรอบนี้

| รายการ | ผล / ขอบเขต |
|---|---|
| Catalogue build | ผ่าน / dedicated entry ใช้ React/Vite เดิม ไม่มี public assets |
| Web TypeScript | ผ่าน |
| UI/model tests | 5 ผ่าน: จำนวน, ค้น/กรอง, legacy, เปิดรายละเอียด/เทียบแปลน, denied state |
| Server/data/security tests | 11 ผ่าน: 48/52, ภาพทุกไฟล์, no-member/expired/revoked, artifact ACL, origin/host, direct URL, logout, preview expiry, build isolation |
| Browser visual QA | ยังไม่ได้ทำ / ไม่ได้รับคำสั่ง browser testing |
| Team Firebase integration | ยังไม่ทดสอบ / ไม่ได้รับ target และสมาชิกที่จะอนุญาต |
| Engineering / fabrication approval | ไม่ได้ทำ / ไม่ได้อนุมัติ |

ข้อทดสอบ origin/host ใช้ HTTP request จริง โดย Host override ใช้ Node HTTP เพื่อไม่ให้ fetch runtime แทนที่ header ที่ต้องการทดสอบ

## ก่อนเปิดให้ทีมจริง

1. ผู้ใช้ยืนยันให้เปิดบริการ และระบุ organization/project กับสมาชิกที่อนุญาต
2. ผู้ดูแลกำหนด Firebase identity, verified email, membership/capability/expiry โดยไม่เปิด public signup
3. ติดตั้งหลัง HTTPS reverse proxy พร้อม least-privilege service identity, rate limiting, audit/retention policy และ monitoring
4. ทดสอบกับบัญชีจริงอย่างน้อย authorized/nonmember/expired/revoked และ direct asset URL; ตรวจว่าทุกชั้นโฮสต์ไม่มี static alias ไปยัง output/knowledge/source PDF
5. ผู้ใช้ตรวจ UI บนหน้าจอจริงและอนุมัติเปิดทีม; public customer gallery ยังต้องขอแยกเป็นราย artifact

ขั้นวิศวกรรมถัดไปยังเป็น TS-C: ล็อก geometry/ช่องเปิด/material/joint/BC ก่อน FBD และ shell analysis ไม่ใช้ภาพจากคลังแทนข้อมูลแบบที่ตรวจแล้ว

คู่มือเดินระบบ: [MODULAR_CATALOGUE_STEP1_TH.md](../../docs/MODULAR_CATALOGUE_STEP1_TH.md)
