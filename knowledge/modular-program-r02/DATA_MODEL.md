# สัญญาข้อมูล local-first v1

- P104 ขั้น6.1 เพิ่ม `arcDelivery` แยกจาก `revitDelivery` ขั้น6 ผ่าน `output/revit-p61-batch/delivery-manifest.json`. ทะเบียนเลือกเฉพาะ pilot ที่ตรวจแล้วและแพ็กเกจใหม่ที่ผ่าน native/coordination/relative-link/visual/ZIP ไม่ลงทะเบียนเพียงเพราะมีไฟล์ RVT. ARC ใช้ opaque IDs `PM-...-ARC-P103/P104-...`, SHA-256 และ ACL engineering เดิม; ไฟล์อยู่ใน private deliverables สองรากที่ระบุชัด ไม่เปิด arbitrary path หรือ public storage. ภาพเดิมและ RVT slot ขั้น6ไม่ถูกแทนที่. แท็บสถาปัตย์6.1แสดงไฟล์ ARC/Spec/ตำแหน่งMEP แยกจาก STR; ไม่มี STD ใหม่หรือสถานะอนุมัติผลิตจากการเพิ่ม ARC.

- P100 `output/stage5-closure-p100/register.json` ปิดขั้น5ที่100%ตามขอบเขตแม่แบบฉบับวางแผนของผู้ใช้ ครบ44setupโดยอ้างP98/P99ด้วยhash. เก็บ `engineeringApproved=false` และ `productionReleased=false`. งานPE-01/02/03ถูกโอนไป Production Engineering ไม่ลบและไม่แปลงเป็นผลผ่าน. เว็บแสดงสถานะปิดขอบเขตและดาวน์โหลดทะเบียนผ่านACLเดิม

- P99 `output/mould-coordinated-p99/assets.json` เพิ่ม8referencesต่อ44setup ผ่าน `coordinatedFiles` รวม352referencesใหม่/คลัง2,105references. หนึ่งโมเดลต่อsetupรวมgeometryปัจจุบันโดยไม่รวมalternativeP89และไม่คัดลอกoverlayซ้ำ. `parts/seals`แยกmaterial; `nominalStockMassKg`ไม่ใช่unionfinishedmass/WLL; XYZเป็นenvelopeไม่ใช่cuttingdimensions. ทุกไฟล์/ต้นทางใช้SHA/ACLเดิม ไม่แสดงภาพที่ไม่มีสิทธิ์. P98auditเป็นnominalconcreteequivalence44/44 ไม่ใช่กำลังแม่แบบ. P99closureแยกP40-5ที่ตรวจแล้วจาก7หมวดที่ยังpartial; stageCompletionPercent=nullและapproval/release=false. P43ภาพเดิมไม่เปลี่ยน

- P97 `output/table-lock-base-p97/assets.json` เพิ่ม45referencesใน9setup/6geometryผ่านrouteและACLเดิม. `cuts`52แถวเป็นชิ้นเพิ่ม/ทดแทน ไม่ใช่BOMทั้งโต๊ะ; `welds`136แนวเป็นnominalweldgeometry. `demand`192และ`endTieCases`12ต่อขนาดเป็นassigned-load study ไม่ใช่กำลังจุดต่อ; capacityRatioคงnull. `lifting`แยกM00ฐานเปล่าและจุดรับcradleจากหูยกจริง;มวลnominalไม่ใช่WLL. ภาพP43และP94–P96คงเดิม. สถานะvisualreviewของgeneratorเป็นpendingจนมีQAแยกที่ `output/stage5-library-p97/qa/verification.json`;ไม่เขียนทับissuedassetเพียงเปลี่ยนสถานะ. stageComplete/engineeringApproved/productionReleased=false

## แยกข้อมูลออกจากไฟล์

Local JSON metadata: `data/modular-program/r02/catalogue.json` สร้างแบบ deterministic จาก R01 product IDs + R02 decisions
ไฟล์ RVT/PDF/PNG/STD เก็บใน deliverables/output ที่ไม่ใช่ public; record เก็บ artifact ID, relative object key, byte size, SHA-256 และ dependencies ไม่เก็บ binary/base64 ในฐานข้อมูล
ทะเบียนนี้ยังไม่ใช่ API หรือ security boundary และยังไม่เปิด write endpoint ให้หลายคนใช้พร้อมกัน

| Entity | ID / ความสัมพันธ์ | ย้ายภายหลังไป collection ใต้ org/project |
|---|---|---|
| products | PM-I-C1 คงเดิม / ชี้ product revision | catalogueProducts |
| productRevisions | product ID + R02 / ชี้ typical refs และ geometry revision | catalogueProductRevisions |
| segmentTypes | TS-C-H15-LH เป็นต้น / จำแนกชนิดไม่ใช่ instance | catalogueSegmentTypes |
| segmentRevisions | type ID + R02 / ความหนาพัฒนาแยกจากค่าผ่านคำนวณ | catalogueSegmentRevisions |
| assemblyInstances | physical piece ID / segment revision / transform | catalogueAssemblyInstances |
| artifacts | artifact ID / owner revision / dependencies / file reference | catalogueArtifacts |
| auditEvents | event ID / actor / action / input-output hash | ใช้ audit workflow เดิมผ่าน adapter |

โครงสร้าง cloud ที่เสนอ: organizations/{orgId}/projects/{projectId}/<collection>/{id}
ก่อน migration ต้องตรวจ collection/role/service เดิม ไม่เปิดฐาน Firebase ใหม่หรือแก้ rules อัตโนมัติ
orgId/remoteProjectId ยัง null: ห้ามใช้ LOCAL owner เป็น Firebase UID หรือสมาชิกทีมจริง

## หน่วยและสถานะ

- P96เพิ่ม `tableBackerFiles` ใน9setup/6ขนาด มี45references/25ไฟล์จริงใหม่ รวมคลัง1,708references. `BACKER_LAYOUT_CANDIDATE` เก็บแท็กชิ้นตัด/filletnominal/เส้นทางใส่ก่อนติดbackingplatesและ`installedToolObstructions`ของสถานะติดตั้งครบ. ไม่ลบสิ่งขวางจากโมเดลเพื่อให้PASS; เปลี่ยนลำดับผลิตอย่างเปิดเผยและตรวจ44ช่วงสุดท้ายใหม่. operatingCandidate0.10MPaไม่ใช่compoundqualifiedหรือcapacity; addedSteelKg/nominalWeldMetalKgเป็นdeltaไม่ใช่มวลยก. ACL/P43/P52/P91/P93/P94/P95คงเดิม

- P95เพิ่ม `tableSealFiles` แยกจากP93/P94ใน9setup/6ขนาด มี45references/25ไฟล์จริงใหม่; คลังรวม1,663references. JSON `SEAL_LAYOUT_CANDIDATE` เก็บgroove cutter/seal compressed geometry,12physical cut pieces/5assemblies,44nominal motion steps,material removal delta และsourceP94hash. ไม่ให้tessellation68cellsกลายเป็น68ชิ้นยาง. `compressionForceN=null`,supplierCompoundValidated=false; มวลตัดออกไม่ใช่มวลยก. ACLรายartifactแยกfamilyแม้ใช้F2660ไฟล์เดียวกัน. สิทธิ์engineering/production/stageCompleteไม่ถูกยกระดับ

- P94เพิ่ม `tableChannelFiles` แยกจาก `tableWeldFiles` P93 ใน9setup/6ขนาด มี45artifact references/25ไฟล์จริงใหม่; คลังรวม1,618references. ความหนาคอนกรีต/ช่องหล่อ/รูล็อกเดิมไม่เปลี่ยน. P94มี24changed cut piecesต่อขนาด ไม่ใช่full BOM; section/reactionsใหม่ไม่สืบทอดผลRHS P49/P51. การใช้ไฟล์F2660ร่วมไม่ทำให้สิทธิ์ข้ามfamily. P93เก็บเป็นประวัติของรายละเอียดnominalไม่ใช่รากเชื่อมRHSมุมมนที่ผลิตจริง. สถานะengineering/production/stageCompleteยังfalse

- P93เพิ่ม `tableWeldFiles` ใน9setup (6รูปทรงโต๊ะ; F2660ใช้4family slots) รวม45artifact references/25ไฟล์จริงใหม่. คลังแม่แบบรวม1,573references. ทะเบียนเสริมA/B/Dยังเป็นP92/738references ไม่รวม45รายการซ้ำ. JSON/SVG/PNG/CSV/MDใช้สิทธิ์รายartifactเดิม; ให้สิทธิ์F2660ในfamilyหนึ่งไม่เปิดfamilyอื่นอัตโนมัติ. Geometry P47/P51และภาพP43คงเดิม; candidateP93ตัดwebเฉพาะ12สถานี/ขนาด ไม่เปลี่ยนช่องหล่อ. ค่าratioเป็นconditional weld-metal resultเท่านั้น; capacity/engineeringApproval/productionReleaseไม่ถูกยกระดับ

- P92เพิ่ม30artifact references (25ไฟล์จริงไม่ซ้ำ) ใน6setupW01 สำหรับconditional component check/washer detail/ใบตรวจรับ. Supplement P92รวม738referencesใน12setup/1,285pins; คลังแม่แบบรวม1,528references/44setup. การเพิ่ม.mdใช้MIME text/markdownและACL/hash/attachmentเหมือนไฟล์อื่น ไม่เปิดอ่านpathทั่วไป. รูปP43/P90และข้อมูลP52/P91คงเดิม. ตัวเลขP90/P91และก่อนหน้าด้านล่างเป็นประวัติ; P92ไม่อนุมัติทางเลือกP89หรือความสามารถใช้ซ้ำของจุดต่อ

- P90เพิ่ม88artifact referencesของผลแรงใน6setup W01 และclosure JSON44setup; P91เพิ่ม27referencesใน9setupครอบ รวมคลังแม่แบบ1,498references. ไม่ใช่1,498ชิ้นผลิต. ทะเบียนเสริมA/B/Dเป็นP90มี708references/12setup ส่วนแผนยกP91ใช้ `currentLiftingFiles` แยกจากประวัติP52 `liftingFiles`. การเพิ่มสิทธิ์ไฟล์หนึ่งไม่เปิดไฟล์หรือclosure metadataอื่น
- `output/stage5-closure-p90/register.json` เป็นsnapshotข้อกำหนด8หมวดต่อ44setupก่อนแก้พิกัดยกP91. coverage100%หมายถึงการทบทวนรายการครบ ไม่ใช่ขั้น5ครบ; `stageCompletionPercent=null`. แสดงผลแก้P91ควบคู่ ไม่เปลี่ยนประวัติหรือปิดหมวดระบบยกทั้งหมดจากการแก้พิกัดอย่างเดียว. P90native64กรณี/24กลุ่มไม่ใช่64แม่แบบหรือการตรวจS00
- ตรวจhashของdependencyที่เป็นpathเดียวกันครั้งเดียวต่อrequestด้วย `uniqueIntegrityPins` และปฏิเสธหากpathเดียวมีhashขัดกัน ไม่ใช้timestamp cacheหรือข้ามการตรวจbytesใหม่. P91pin geometryP56/Typical/P52 algorithm/decisionตามรุ่น; verified lifting/connection capacities ยังคงnullและไม่เปิดFirebase/public deployment

- P89เพิ่ม48artifact referencesใน12setup A/B/D ทำให้ทะเบียนเสริม620และคลังแม่แบบรวม1,339references/44setup. role `UNADOPTED_CANDIDATE` แยกจาก `CURRENT_BASE` P85: เปลี่ยนโบลต์/แหวน/เกลียวฐานต้องตรวจแรงP86/P88ใหม่ก่อนนำไปใช้ ไม่สืบทอดcapacity. ระยะฝังรวมแยกจากeffective full-thread length; toleranceที่เสนอแยกจากมาตรฐานสินค้าที่ตรวจจริง. คำแก้pitchP88คือM01=250/M03=240มม.โดยพิกัดรูไม่เปลี่ยน ไม่แก้archiveย้อนหลัง

- P87เชื่อม494 supplemental artifact referencesใน12setup A/B/D เข้าคลังแม่แบบเดิม44setup รวม1,213artifact references ไม่ใช่จำนวนชิ้นผลิต. GeometryปัจจุบันประกอบP85 base +P71 web +P74 seam +P80 edge stockครั้งเดียว ใช้sequenceP85. P86เฉพาะW01เป็นelastic foot/contact study24กลุ่ม/56mesh runs ไม่ใช่capacityหรือS00ผลตรวจ. ทะเบียนP68และภาพเดิมคงเป็นประวัติ; metadata/fileACL/hashยังlocal-first และไม่อนุญาตpublic/cloudจากการเพิ่มไฟล์

- P36ขั้น3มี48assembly/1,584physical instance records แยกจาก44TypicalของP35 ส่ง144drawing sheetsเป็น288PNG/SVG artifactsใน `data/modular-program/r02/stage3-p36.json` พร้อมhash/bytes/private status เป็นweb handoffไม่ใช่การอัปเดตเว็บหรือสร้างไฟล์nativeRVT/STDแล้ว
- `model.json` รายสินค้าใช้mm: facesMmเป็นclosed surface display tessellationจากต้นทาง tolerance0.15mm, massจากsourceไม่ใช่boundingbox; transformของU-N02เป็นreflectionสำหรับบางชิ้น ไม่สะท้อนผนังP31ซ้ำ ปริมาตรจากfacesตรวจเทียบต้นทางแยกอีกครั้ง
- SVGของP36มีembedded rasterสำหรับรูปด้าน/3D depth rendering ไม่ใช่vectorทั้งหมด และไม่ใช่Revitหรือsolver mesh กล่องเฟอร์นิเจอร์/ห้องน้ำ/ผนังเบาเป็นfitout proposalไม่รวมมวลคอนกรีต
- P36 source pathsเป็นproject-relative สำเนาJSONที่ใช้มีใต้referencesในแพ็กเกจ แต่ไม่ใช่standalone build และไม่ได้รวมภาพประวัติ/PDFมาตรฐานส่วนตัวทั้งหมด `wholeBuildingKg`, `usableFinishedM2`, `finishedClearMm`, `revitFile`, `staadFile`ยังnull; E01–E06ไม่ถูกปิดด้วยการส่งแบบ

- P35คือชุดส่งตรวจขั้น2เฉพาะdevelopment: `output/stage2-review-p35/typical-index.json` มี44current references และไฟล์คัดลอกพร้อมhashในassets; source pathsในJSONเป็นproject-relative โดยpackage asset rootคือassets ไม่ใช่เว็บpublic `stageStatus=AWAITING_USER_STAGE_REVIEW` ไม่ใช่engineering/production approval และไม่ให้สิทธิ์เริ่มขั้น3
- P33เพิ่ม11solidแบบlinear prismพร้อมfaces/vertices/mass/CGและreflection winding สำหรับครอบ/แผงปิด/NRสองขนาดทดแทนNR01-P31; normalThickness100ของครอบต่างจากverticalThickness100.019998มม. ห้ามใช้bounding heightเป็นความหนาตั้งฉาก ห้ามรวมNRเก่าและใหม่ซ้ำ
- P34เป็นพิกัดพื้นที่ซีล/ช่องรองรับ/ทางน้ำ วัสดุยังnull โซนรองรับไม่ใช่ชิ้นคอนกรีตและมวลnull พื้นที่P2คงฐานZ0และปรับยอด2605ให้ตรงP31 ตรวจพื้นเว้าP18/P19ร่วมแล้ว ไม่อนุมัติขนาดเสา
- `audit.json` ของP35แยกผลgeometryจากreleaseBlocksE01–E06 โดยเฉพาะความสูง/ประเภทใช้และกันน้ำยังไม่ผ่าน การจบ20deliverablesไม่ลบข้อจำกัดเหล่านี้ snapshotchecklistในassetsเป็นประวัติ; ใช้checklistที่รากแพ็กเกจสำหรับสถานะส่งตรวจปัจจุบัน

- `output/current-index-p32/typical-index.json` รวม34current development references แยก12historical/superseded referencesจากP19 ใช้EPX-P28และNW/NR-P31 มีSHA-256ต้นทาง/ภาพ ไม่ใช่physical instancesหรือจำนวนแม่แบบ/ชิ้นงานอนุมัติผลิต คำกล่าวอนุมัติของผู้ใช้แยกเก็บในdecision-scope-p32 ไม่แปลงผลunit testsเป็นengineeringApproval ชุดTR/ครอบยังขาด และwhole-assembly QAยังไม่จบ

- `output/local-transition-p30/register.json` เป็นการตรวจระดับกรณีศึกษา ไม่ใช่solidหรือTypicalสำเร็จ `heightOnlyPass` ไม่ใช่ผลผ่านกันน้ำหรือการประกอบทั้งระบบ `selectedCase`ยังnull รหัสTRเป็นkit planning IDs ไม่ใช่จำนวนแม่แบบ ผู้ใช้เลือกคงหลังคาหลักจึงรับP28เป็นแผงปลายฉบับพัฒนา; ระดับโหนดใหม่ต้องยืนยันก่อนแก้NR/NW ทั้งนี้P29เป็นประวัติก่อนเลือกแนวทาง

- `output/epx-placement-p27/register.json` แยก8pilotPlacementsของI-Officeจาก48product palettes; products.exactPlacementsยังnull รูปทรงอ้างP26ไม่แก้ประวัติ geometricGapMmฐาน0เป็นระยะวัดจริง ไม่ใช่beddingThicknessMmที่ยังnull; roof normal auditตัดช่วงช่องสันทิ้ง requiredJointWidthMmยังไม่ทราบ decision-p27อนุญาตพัฒนาEPXไม่ใช่freezeหรือเลือกweather system

- `output/end-panel-p26/register.json` เก็บ8EPXcandidateไม่ใช่revisionทดแทนที่เลือกแล้ว comparisonเทียบหนึ่งปลายอาคาร(EP+UIคู่กับEPX)ไม่ใช่BOMทั้งหลัง ช่วงX1490–1510เป็นvirtual profileข้ามช่องหลังคา ไม่ใช่contact; placementY/supportsยังnull selectedCandidateIdsว่าง

- `output/end-infill-p25/register.json` เก็บ8candidate UIแยกจากTypicalหลัก35รายการ; selectedCandidateIdsว่าง outlineXZเป็นพิกัดอาคาร ส่วนlocalYเป็นความหนาชิ้นไม่ใช่placementY ซึ่งยังnull ช่องบน20เป็นแนวดิ่งไม่ใช่normal clearance มวลและCGคอนกรีตไม่ใช่ค่าการยก P2-17IN_PROGRESS ความก้าวหน้า80%คงเดิม

- `output/opening-matrix-p24/register.json` เชื่อม48product IDsกับ16ชุดช่องเปิดและ24Typicalเดิม เป็นpaletteไม่ใช่assembly; quantities/exactPlacementsและผลตรวจข้อกำหนดยังnull ไม่เพิ่มphysical instancesหรือเปลี่ยนgeometry

- `output/closure-audit-p23/register.json` เก็บ8ผิวปิดสันและsampled corner auditไม่ใช่ชิ้นมีมวลหรือjointที่ออกแบบ ค่าdifferenceเป็นส่วนต่างพิกัดไม่ใช่toleranceที่ยอมรับ Dไม่มีsampleเพราะไม่มีdomainร่วม จึงเก็บnullไม่ใช่0 และP2-16ยังIN_PROGRESS75%

- `output/weather-envelope-p22/register.json` เก็บcapsเป็นผิวสำรองไม่มีความหนา/มวล และspacesเป็นbounding boxes ไม่ใช่ชิ้นผลิตหรือนับมวล กล่องoutletอยู่ในgutterได้โดยตั้งใจ; ระดับoverflowInvert/pipeDiameterยังnull ภาพและcheckpointยังIN_PROGRESS75% เก็บheight/projectionเป็นผลประสาน ไม่ใช่การอนุมัติขนาดภายนอก

- `output/weather-route-p21/register.json` เก็บผิวลาดทดสอบและ8ชุดพิกัดเปรียบเทียบ ไม่ใช่geometryflashing; crown gap/D shoulderที่ไม่มีผิวหลังคาเก็บnull `buildUp.envelopeVolumeOverConcreteM3`ไม่รวมjointและไม่แปลงเป็นมวลจนเลือกวัสดุ snapshotchecklistP21เก็บP2-16IN_PROGRESSและpercent75 ไม่แก้P20ย้อนหลัง

- `output/head-interface-p20/stage2-checklist.json` เป็นsnapshotความก้าวหน้าขั้น2ตามเกณฑ์P20 จำนวนDONE/20 ไม่ใช่จำนวนภาพหรือความพร้อมผลิต; pointerปัจจุบันอยู่current index เมื่อเปลี่ยนขอบเขตต้องบันทึกฐานใหม่ `register.json` แยกheightBeforeFinishesจากfinishedClearHeightที่ยังnull ช่องรอยต่อ20เป็นข้อเสนอ ไม่ใช่physicalJointหรือbearingที่ออกแบบแล้ว

- `output/node-mirror-p19/register.json` เก็บpolygonสะท้อนU-N02และพื้นที่ผนัง/เสาในพิกัดlocalโหนด; reflectionไม่ใช่rigid placementหรือtransformของinsert/เหล็ก ดัชนี `typical-index.json` รวม35tag/revisionพร้อมsource/preview/mass แยกNF01P12เป็นประวัติ ไม่รวมจำนวนนี้เป็นจำนวนแม่แบบหรือจำนวนชิ้นในอาคาร ห้ามรวมมวลทุกtagเป็นมวลอาคาร

- `decision-p18.json` เป็นภาคผนวกการเลือกWALL_SHAREDของผู้ใช้ ไม่แก้immutable seed; `output/node-notch-p18/register.json` แยกการเลือกแนวทางจากรูปเว้า/clearance20ที่เป็นข้อเสนอ รูปหลายเหลี่ยมlocalXY+originให้มวลและCGใหม่ ใช้เฉพาะL-N01/U-N01; U-N02รอตรวจฉบับสะท้อน ห้ามใช้bounding boxเต็มคำนวณมวลแทนpolygonหรือถือช่องเว้าเป็นคำสั่งตัดแผ่นเดิม

- `output/portal-layout-p17/register.json` แยกwall zonesที่อยู่ในผนังเดิมออกจากadditionalColumnSpaces ไม่บวกปริมาตรซ้ำ มี2ทางเลือกที่selected=false; grossSpaceBetweenVerticalZonesMm/commonFloorEdgeAfterSpaceMmไม่ใช่finishedOpeningMm และยังไม่ใช่assembly revisionใหม่
- `output/portal-space-p16/register.json` เป็นspace sensitivityไม่ใช่member schedule optionsไม่ถูกเลือกและmaterial/memberSections/massKgยังnull clashesเป็นintersectionกล่องที่มีปริมาตรบวก ไม่ใช่cutting instructions ความสูงช่องก่อนตกแต่งแยกจากช่องผ่านสุทธิที่ยังไม่รับรอง
- `output/node-c-p15/register.json` เป็นlocal assembly studyโหนด8ชิ้น+ปีกตัวอย่าง6ชิ้น ไม่ใช่product revisionทั้งหลัง ใช้verticesจากP05ผ่านmapWing portsเก็บintersectionขอบพื้นและระดับที่พิกัดขวาง1000 แยกจากfinishedOpeningMm/structuralJoint/weatherJointที่ยังnull
- `output/node-roof-p14/register.json` เพิ่ม1Typical NR01 และ6ตำแหน่งใน3โหนด roofStudy.selected=false; comparisonsเป็นการฉายหน้าตัดคนละสถานี ไม่ใช่collision test/จุดต่อรับแรง drainageSlope/bearingLengthMm/transitionGeometryยังnull มวลรวมเฉพาะหลังคา2แผ่นไม่ใช่โหนดครบ
- `output/node-wall-p13/register.json` แยก2Typicalจาก12ตำแหน่งผนังใน3โหนด roofStudy.selected=false; กล่องmin/sizeเป็นพิกัดlocalโหนด ไม่ใช่transformของinsert ยอดwallConcreteSubtotalPerNodeKgรวมเฉพาะผนัง4แผง wholeNodeMassKgยังnull และรอยต่อหลังคายังไม่ได้ออกแบบ
- `output/node-floor-p12/register.json` เพิ่ม2Typicalพื้นNFเสนอและplacementsของ3โหนด แยกจากP11เดิม; dimensionsMm/มวลเป็นค่าข้อเสนอ concreteOnlyCentroidMmไม่ใช่CGงานยกที่อนุมัติ interfaceเก็บทั้งgap15และendOffset25 ไม่แสดงสถานะจุดต่อสำเร็จ; supportGeometry/bearingLengthMmและมวลN90ครบยังnull
- `output/lu-node-p11/register.json` แยก plans/bays/nodes และ24interface requirements; candidates เป็น PLANNING_SLOT_NOT_CAST_PIECE ไม่ใช่ assemblyInstances จริง NF รวมอยู่ในยอดพื้น L6/U10 แล้ว ขนาดหล่อ/มวล/พิกัดหูยกและระดับหลังคาที่เลือกยัง null; trialFloorEdgeGapMm เป็นผลตรวจระยะ ไม่ใช่จุดต่อที่รับแรงได้
- `output/iabd-office-p10/register.json` มี3assembly revisions รวม42instances อ้างP08/P09โดยexplicit typicalId; transformแปลเฉพาะแกนYจากX/Zพิกัดอาคาร ห้ามบวกbounding-box originซ้ำ totals.coreConcreteMassKgแยกwholeBuildingMassKg=null และบันทึกfurniture modifications/clearancesแยกข้อมูลชิ้นคอนกรีต
- `output/abd-floor-ends-p09/register.json` มี9family tags แต่5shapeKeyไม่ซ้ำ; shapeKeyเป็นcandidateรูปทรงร่วม ไม่ใช่mould IDหรือการรับรองเครื่องมือร่วม ฟิลด์fitเก็บช่องว่างเรขาคณิตแยกbearingLengthMmที่ยังnull และupperEndInfillแยกจากชิ้นที่มีมวลจริง
- `output/abd-typicals-p08/register.json` เป็น12Typical A/B/D เพิ่มเติมพร้อมgeometryRevision, profileXZ, opening.outerFaceCornersMm/innerFaceCornersMm, mass และ dimensionReview.pending; A/B P08เปลี่ยนชายคาจากP07 ห้ามนำมวลคนละrevisionมารวม ห้ามใช้heightVerticalMmแทนheightAlongWallFaceMmของD
- `output/ic1-piece-register-p06/register.json` เป็น supplement ของ I-C1 P04: 14 instances อ้าง7 Typical P05 พร้อม boundingBoxMm/localOriginMm/rotationZDeg และมวลรายชิ้น; seedเดิมยังคงว่างตามประวัติ ไม่ใช่ไม่มีงานsupplement
- Typical ต้องมีภาพ3D/2D และ dimension review ตาม [P05](TYPICAL_PRESENTATION_AND_MASS_P05.md); current supplement อยู่ `output/typical-review-p05/register.json` แยกจาก immutable seed
- `geometry.mass` เก็บ grossVolumeM3/voidVolumeM3/netVolumeM3/densityKgM3/concreteMassKg/basis/excluded/status/liftingDesignMassKg แยกมวลคอนกรีตประมาณออกจากมวลยกที่ตรวจแล้ว; ค่าหลังยัง null
- การเชื่อมเว็บต้องเก็บ geometry revision และ dependencies/hash ของน้ำหนักและภาพร่วมกัน แสดงสถานะ density ทดลองและส่วนที่ไม่รวม ห้ามแสดงน้ำหนักนี้เป็น lifting capacity
- หน่วย geometry/thickness เป็น mm; พื้นที่ nominal เป็น m² และไม่ใช่ usable area
- developmentThicknessMm คือค่าตั้งต้นที่ผู้ใช้ยืนยัน ไม่ใช่ engineeringThicknessMm ซึ่งยัง null
- geometryStatus, engineeringStatus, artifactStatus และ approval แยกกัน ไม่ใช้ completed ตัวเดียว
- currentRevision pointer ไม่ทำให้ historical artifact เป็น current; รูปเก่าเก็บ legacy ref ไม่แนบเป็นภาพมาตรฐานใหม่
- source hash และ dependency revision/hash ใช้ตรวจ stale; เปลี่ยน input ต้องสร้าง revision ใหม่และประเมิน downstream
- package มี 48 product slots ไม่เท่ากับมี 48 RVT; artifacts/instances ว่างจนมีของจริง

## ขอบเขต local และ cloud

รอบนี้เป็น deterministic seed/read-only metadata; การแก้หลังใช้งานจริงต้องใช้ repository command ที่ตรวจ revision conflict
ห้ามให้ browser เขียน JSON ตรง/รับ arbitrary filesystem path; ดาวน์โหลดผ่าน opaque ID และ ACL ของ backend เดิม
ก่อน cloud: ตรวจจำนวน/IDs/foreign keys/hash, สำรองทั้ง metadata+ไฟล์, dry-run migration, reconcile counts/checksums, ทดสอบกู้คืนและ rollback
Firestore เก็บ metadata; Storage เก็บไฟล์; ต้องมี auth/membership/capability/object access จริง ไม่ใช้เพียงซ่อนเมนู
สถานะ public ปิด; ไม่มี token/credential/download URL ถาวรใน seed; audit ผู้ใช้จริงต้อง append-only จาก backend ไม่เชื่อค่าจาก client
Cloud sync, billing, bucket, migration และ multiuser writes ยังไม่ได้ทำ

## Revit และ STAAD

ทุก segment revision ต้องมี liftingPlan ตาม [L01](LIFTING_CONCEPT_L01.md): แยกDEM/ROT/ERECT, CG/มวล/ระบบ/พิกัด/จำนวน/กำลัง/rigging/ผู้ตรวจ และ releasedForLifting=false จนตรวจอนุมัติ ห้ามใช้สัญลักษณ์conceptเป็นตำแหน่งหล่อจริง

อ่าน [FILE_INTAKE.md](FILE_INTAKE.md) เป็นภาคผนวกที่ผู้ใช้ยืนยัน: 48 RVT + 48 STD ต้องมีช่องรายการและ Revision ในเว็บ รายการที่ยังไม่สร้างไฟล์ต้องไม่แสดงว่าพร้อมดาวน์โหลด
ทะเบียน plannedFileSlots อยู่ `data/modular-program/r02/file-slots-a01.json` แยกจาก seed เดิมที่ไม่แก้ย้อนหลัง

RVT 2026 หนึ่งไฟล์ต่อ product พร้อม sheets; พารามิเตอร์ ProductId/SegmentTypeId/SegmentRevision/InstanceId/ProgrammeRevision ต้องเชื่อมทะเบียน
Native/parametric/DirectShape ต้องรายงานจริง ไม่เหมารวมว่า native ทั้งหมด
STAAD mesh element ID เป็น analysis mapping แยกจาก physical segment ID และยังไม่มี mapping จนถึง P7
