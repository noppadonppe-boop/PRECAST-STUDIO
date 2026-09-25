# -*- coding: utf-8 -*-
import json,pathlib,hashlib,subprocess,sys,re
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'deliverables/PPE_Senior_Home/video'
shots=json.loads((OUT/'shots.json').read_text(encoding='utf8'))
def stamp(sec):
    h=int(sec)//3600;m=int(sec)%3600//60;s=int(sec)%60
    return f'{h:02}:{m:02}:{s:02},000'
srt='\n\n'.join(f'{i+1}\n{stamp(s[0])} --> {stamp(s[1])}\n{s[2]}\n{s[3]}' for i,s in enumerate(shots))
(OUT/'PPE_Senior_Home_TH.srt').write_text(srt,encoding='utf-8-sig')
chapters=';FFMETADATA1\ntitle=PPE Engineering - Senior Home Tour and Construction\nartist=PPE Engineering\ncomment=BIM concept visualization. Temporary works and lifting are schematic, not an approved erection design.\n'
for s in shots:chapters+=f'\n[CHAPTER]\nTIMEBASE=1/1000\nSTART={s[0]*1000}\nEND={s[1]*1000}\ntitle={s[2]}\n'
(OUT/'chapters.ffmeta').write_text(chapters,encoding='utf8')
toc='\n'.join(f'- {s[0]//60:02}:{s[0]%60:02} — {s[2]}' for s in shots)
(OUT/'README_VIDEO_TH.md').write_text('''# PPE Engineering — บ้านพักผู้สูงวัยพรีคาสท์

วิดีโอแอนิเมชันจากโมเดล Revit: ชมภายนอกและภายใน ตามด้วยลำดับก่อสร้างจากฐานรากถึงงานเสร็จ

- ไฟล์หลัก: `PPE_Senior_Home_Tour_and_Construction.mp4`
- ความยาว 2 นาที 34 วินาที / 1920 × 1080 / 24 fps / H.264
- คำบรรยายไทยอยู่ในภาพ พร้อมไฟล์ SRT แยก ไม่มีเสียงบรรยาย
- ช่วงชมบ้าน 00:00–00:52 / ก่อสร้าง 00:52–02:24 / ภาพเสร็จ 02:24–02:34
- มีบท (chapters) ในไฟล์ MP4 สำหรับโปรแกรมเล่นที่รองรับ

## ที่มาของภาพ

ส่งออก geometry และสีวัสดุจาก `PPE_Engineering_Senior_Home_R2026.rvt` โดยตรง 439 elements; แสดง 435 elements หลังตัด Room volumes ที่ใช้เป็นข้อมูลออก ภาพใช้แสงและผิววัสดุสำหรับนำเสนอ รวมทั้งต้นไม้บริบทรอบอาคารที่เพิ่มในฉาก จึงเป็นภาพ BIM แบบจำลอง ไม่ใช่ภาพถ่ายหรือการจำลองแสงที่ผ่านการคำนวณรับรอง

กล้องในห้องนั่งเล่น ห้องนอน และห้องน้ำอยู่ภายในอาคารจริง ส่วนภาพผังใช้การตัดเปิดหลังคาและผนังเพื่ออธิบายความสัมพันธ์ของพื้นที่

## ขอบเขตลำดับติดตั้ง

ลำดับเสนอ: สำรวจและวางผัง → ขุดและรองพื้น → เหล็ก/แบบ/เท/บ่มฐานราก → ตอม่อและโครงรองพื้น → แผ่นพื้น → ผนังพร้อมค้ำยัน → หลังคาพร้อมรองรับชั่วคราว → รอยต่อและกันน้ำ → ช่องเปิด → ระบบและตกแต่ง → ทางลาด ระเบียง ภูมิทัศน์ และตรวจรับ

การเคลื่อนไหวเร่งเวลาเพื่ออธิบายลำดับ ไม่ใช่ระยะเวลาก่อสร้างจริง ก่อนยกต้องตรวจว่าชิ้นส่วน ฐานรองรับ และจุดยึดได้กำลังที่กำหนด วิดีโอแสดงค้ำยันผนังก่อนปลดอุปกรณ์ยก และคงงานรองรับหลังคาไว้จนถึงช่วงตรวจจุดต่อ/อนุมัติถอดค้ำ

ฐานรากใน RVT ยังเป็นขนาดเบื้องต้น เหล็กเสริม แบบหล่อ หลุมขุด เครน สลิง ค้ำยัน นั่งร้านรองรับ และแนวท่อใต้พื้นในวิดีโอเป็น geometry เสริมเพื่ออธิบายแนวคิด ไม่ใช่ shop drawing และไม่ได้เพิ่มกลับเข้า RVT เส้นทางสลิงและตำแหน่งค้ำในภาพไม่ใช่ผลคำนวณกำลังรับน้ำหนัก

หลังคาแสดงขนาดและจำนวนชิ้นตาม BIM (โค้ง 4 ช่วง และหลังคาแบน 1 ชิ้น) ต้องตรวจขนาดขนส่ง น้ำหนักจริง จุดศูนย์ถ่วง จุดยก ลำดับการยก เสถียรภาพระหว่างติดตั้ง และแบบรอยต่อกับผู้ผลิต/วิศวกรก่อนผลิต อาจต้องแบ่งชิ้นใหม่ตามข้อจำกัดการขนส่งและเครน

งานระบบในภาพใช้สัญลักษณ์และแนวท่อเบื้องต้น ยังไม่มีแบบ MEP ที่ประสานงานครบ งานทดสอบน้ำรั่ว ระบบ และตรวจรับกล่าวไว้ในคำบรรยาย ไม่ได้เป็นผลการทดสอบจริง

## แนวทางอ้างอิงสำหรับการจัดลำดับ

- Safe Work Australia, *Guide to managing risk in construction: Prefabricated concrete*: https://www.safeworkaustralia.gov.au/doc/guide-managing-risk-construction-prefabricated-concrete
- Australian National Training Register, *CPCPRE2001 — Brace and prop prefabricated concrete elements*: https://training.gov.au/training/details/CPCPRE2001/unitdetails

ใช้ประกอบแนวคิดเรื่องกำลังคอนกรีต การค้ำยันก่อนปลดเครน และการออกแบบงานชั่วคราว ไม่ใช่การรับรองว่าตรงข้อกฎหมายไทยหรือข้อกำหนดเฉพาะโครงการ

## สารบัญวิดีโอ

'''+toc+'\n',encoding='utf8')
print('Video captions, chapters and notes written')
if '--final' in sys.argv:
    video=OUT/'PPE_Senior_Home_Tour_and_Construction.mp4'
    ff=next((ROOT/'tools/senior-home/video-python/imageio_ffmpeg/binaries').glob('ffmpeg*.exe'))
    tmp=OUT/'PPE_Senior_Home_chaptered.mp4'
    subprocess.run([str(ff),'-y','-hide_banner','-loglevel','warning','-i',str(video),'-i',str(OUT/'chapters.ffmeta'),'-map_metadata','1','-map_chapters','1','-c','copy','-movflags','+faststart',str(tmp)],check=True)
    tmp.replace(video)
    probe=subprocess.run([str(ff),'-hide_banner','-i',str(video)],capture_output=True,text=True,encoding='utf8',errors='replace').stderr
    assert '1920x1080' in probe and '24 fps' in probe,probe
    assert 'Duration: 00:02:34.00' in probe,probe
    (OUT/'video-probe.txt').write_text(probe,encoding='utf8')
    decode=subprocess.run([str(ff),'-hide_banner','-loglevel','error','-i',str(video),'-progress','pipe:1','-nostats','-f','null','-'],capture_output=True,text=True,check=True)
    frames=int(re.findall(r'frame=(\d+)',decode.stdout)[-1]);assert frames==3696,frames
    assert not decode.stderr.strip(),decode.stderr
    subprocess.run([str(ff),'-y','-hide_banner','-loglevel','error','-ss','5','-i',str(video),'-frames:v','1',str(OUT/'PPE_Senior_Home_Video_Poster.png')],check=True)
    audit={'video':video.name,'bytes':video.stat().st_size,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'durationSeconds':154,'frames':frames,'width':1920,'height':1080,'fps':24,'decodedWithoutErrors':True,'chapters':len(shots),'sourceRvt':'PPE_Engineering_Senior_Home_R2026.rvt','exportedModelElements':439,'displayedModelElements':435}
    (OUT/'video-delivery-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
    print(json.dumps(audit))
