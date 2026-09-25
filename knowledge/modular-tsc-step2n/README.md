# TS-C Step 2N — แยกทิศความต่างความเค้นก่อน refinement รอบใหม่

S2N-R00 / DIRECTIONAL_STRESS_DIAGNOSTIC_NOT_FOR_DESIGN

ต่อจาก [Step2M](../modular-tsc-step2m/README.md). รอบนี้อ่านผลเดิม KPT/M1 ที่490พิกัด ไม่ได้รัน FEM ใหม่ ไม่ปรับความหนา175มม. วัสดุ โหลด ฐาน หรือผลเก่า

## วิธีตรวจที่ทำจริง

ใช้ [basis.json](basis.json) แยกสองประเด็น: (1) การเปลี่ยนความเค้นระหว่างKPT→M1 และ (2) ความต่างค่าด้านเดียวที่จุดร่วมภายในM1. เก็บทุกคู่elementที่ครอบคลุมจุดเดียวกัน ไม่smoothข้ามหน้า. แบ่งคู่ด้วยlogical indices i/profile,j/Y,k/thickness; คู่ที่ต่างหลายทิศแสดงmultipleแยก ไม่ยัดลงทิศเดียว

คู่ติดกันทิศเดียวต้องมีindicesต่าง1, natural coordinatesอยู่หน้าตรงข้ามกัน และtestsตรวจshared face8nodes. ตรวจครบ490จุด/6องค์ประกอบ/4กลุ่มเดิม รวม24รายการกลุ่ม–องค์ประกอบ. ตัวหารmax(|fine mean|,10kPa), point/RMS/spread5%ตามS2Eเดิม; directional maximaเป็นคำอธิบายเพิ่ม ไม่ใช่เกณฑ์ใหม่หรือเกณฑ์แทน

## ผลหลัก

| กลุ่ม / องค์ประกอบ | เกณฑ์ที่ไม่ผ่าน | ค่า | ความต่างจริง |
|---|---|---:|---:|
| regular_interior / ss | point change | 8.128% | 0.812789kPa |
| side_edge / ss | point change | 8.125% | 0.812542kPa |
| base_probe / yy | one-sided spread | 7.911% | 0.791101kPa |
| base_probe / nn | one-sided spread | 31.644% | 3.164403kPa |

อีก20รายการเข้าเกณฑ์เฉพาะคู่ที่ตรวจ; กลุ่มที่ครบทุกองค์ประกอบยังมีเพียงcrown_probe1/4 ไม่ใช่whole-model convergence

ที่ฐาน RH/BASE50/Y0.75/F0.5 พิกัด[2.9125,0.75,0.225]ม. ความต่างnnระหว่างชั้นความหนาk3/k4 elements25272/25288เท่ากับ3.1644027697kPa เกือบเท่าspreadรวม3.1644027705kPa. ความต่างข้ามหน้าYสูงสุดในกลุ่มฐานคือsy0.0139372579kPa(0.1394%)ที่อีกพิกัดหนึ่ง LH/BASE50/Y0.75/F0.9; ไม่ใช่ค่าnnที่จุดเดียวกันและไม่ใช้เป็นอัตราส่วนพิสูจน์สาเหตุ

ไม่มีคู่ข้ามหน้าprofile ณชุดพิกัดฐาน และไม่มีคู่ข้ามหน้าY ณชุดside_edge เนื่องจากตำแหน่งอ่านผลไม่ได้อยู่บนหน้าร่วมทิศนั้น: บันทึกnull/ไม่มีคู่ ไม่ใช่ศูนย์และไม่ใช่ผ่าน. ชื่อside_edgeหมายถึงกลุ่มจุดใกล้ขอบ ไม่ใช่ค่าบนผิวขอบจริง

## แผนทดสอบถัดไป — ยังไม่รัน

เริ่มกรณี NB จากM1โดยแบ่ง3ช่องผนังแรกเหนือฐานแต่ละซีกเป็น4ต่อช่อง (wall27→36; arc48/roof24/Y16/t8เดิม), คาด27,648elements. วัตถุประสงค์คือทดสอบความละเอียดผนังใกล้ฐาน แม้ค่าที่ไม่ต่อเนื่องจะวัดข้ามชั้นความหนา; ทิศของjumpไม่พิสูจน์ว่าต้องrefineทิศเดียวกัน

ถัดไปเปรียบเทียบแยกกรณีเพิ่มชั้นmeshตามความหนา และเพิ่มYใกล้ขอบ โดยกำหนดจำนวน/ทรัพยากรในbasisก่อนรัน. **การเพิ่มชั้นmeshไม่ใช่การเพิ่มความหนาคอนกรีต**. บริเวณโค้งยังต้องมีคู่refinementถัดไปเพื่อยืนยันpoint change; ค่า8%จากการปรับKPT→M1ไม่บอกว่าM1ผิด8%เมื่อเทียบคำตอบexact

ทุกกรณีคง490พิกัด/6cutsสองด้าน/เกณฑ์เดิม พร้อมglobal equilibrium/energy/recovery. ไม่รวมกรณีแยกเป็นผลใหม่ที่ยังไม่รัน และไม่เปลี่ยนBCเพื่อให้ผ่าน. Actual support/contact/joint, cracking, openings, lateral/uplift/handling และมาตรฐานกำลังยังเป็นงานแยกก่อนStep3

## ไฟล์และการตรวจ

- [ผลทั้งหมด](../../output/tsc-step2n-r00/directional_results.json): ทุกจุด ทุกคู่ด้าน ค่าabsolute/normalized และhash
- [ภาพดาวน์โหลด](../../output/tsc-step2n-r00/TS-C-DIRECTIONAL-QA-S2N-R00.png): แผนภาพelementภายใน ไม่ใช่รอยต่อชิ้นคอนกรีตจริง
- [ตัวประมวลผล](../../tools/tsc-study/directional_diagnostic.mjs) / [tests](../../tools/tsc-study/directional-results.test.mjs)

ทำซ้ำ: `node tools/tsc-study/directional_diagnostic.mjs` แล้ว `node tools/tsc-study/render_directional.mjs` โดยตั้งPM_SHARP_PATHไปruntimeเดิม. ตรวจhashupstreamทั้งหมดก่อนอ่านผล และเพิ่มhashrenderer/reportสำหรับSTALE

WEB-15เพิ่มหน้าStep2Nพร้อมดาวน์โหลด1PNG รวม79ภาพ(52concept+27engineering). จำกัดengineering capabilityและstudy/image ACLตามเดิม ไม่ส่งraw meshหรือPDFมาตรฐาน. Local previewเท่านั้น; ไม่มีdeploymentหรือเพิ่มสิทธิ์ทีม

ตรวจผ่านnumerical74+UI39+HTTP13=126tests, TypeScript/build,R01snapshot162checks. ภาพPNGตรวจด้วยสายตาแล้ว; มีคำเตือนbuildเดิมJoint3DViewerเกิน500kB. ยังไม่ได้browser visualQAหรือFirebase identityจริง

Skill `precast-modular-workflow` ทำให้แยกผลวินิจฉัยออกจากการอนุมัติ: คงNOT_ESTABLISHED, engineering_approval=false, manufacturing_release=false. ไม่มีcode strength checkหรือการรับรองอาคารในรอบนี้
