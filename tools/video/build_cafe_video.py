"""Create a narrated-by-titles client film from the delivered cafe BIM assets.
Thai shaping: HarfBuzz + FreeType. Music: original procedural ambient score.
"""
from pathlib import Path
import sys, math, json, subprocess, wave
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/video/python-packages'))
import numpy as np
import uharfbuzz as hb
import freetype
from PIL import Image, ImageDraw, ImageFont, ImageOps
import imageio_ffmpeg

OUT=ROOT/'deliverables/PPE_Cafe/video'; AS=OUT/'assets'; QA=OUT/'qa'
for p in [OUT,AS,QA]: p.mkdir(parents=True,exist_ok=True)
W,H=1920,1080; FPS=30
CREAM='#F3F0E9'; INK='#19332E'; MUTED='#59706A'; GOLD='#BA9564'; WHITE='#FFFFFF'
TH='C:/Windows/Fonts/LeelawUI.ttf'; THB='C:/Windows/Fonts/LeelaUIb.ttf'
EN='C:/Windows/Fonts/segoeui.ttf'; ENB='C:/Windows/Fonts/segoeuib.ttf'
FF=imageio_ffmpeg.get_ffmpeg_exe()

def text(im,xy,s,size=36,color=INK,bold=False):
    # Render complete runs with proper Thai above/below-base positioning.
    path=THB if bold else TH
    data=Path(path).read_bytes(); face=hb.Face(data); font=hb.Font(face); font.scale=(size*64,size*64)
    hb.ot_font_set_funcs(font); buf=hb.Buffer(); buf.add_str(s); buf.guess_segment_properties(); hb.shape(font,buf)
    ft=freetype.Face(path); ft.set_pixel_sizes(0,size)
    x,y=xy; baseline=y+size; pen=0
    for info,pos in zip(buf.glyph_infos,buf.glyph_positions):
        ft.load_glyph(info.codepoint,freetype.FT_LOAD_RENDER)
        g=ft.glyph; b=g.bitmap
        if b.width and b.rows:
            a=np.array(b.buffer,dtype=np.uint8).reshape(b.rows,b.pitch)[:,:b.width]
            mask=Image.fromarray(a,'L')
            gx=round(x+pen+pos.x_offset/64+g.bitmap_left)
            gy=round(baseline-pos.y_offset/64-g.bitmap_top)
            im.paste(color,(gx,gy,gx+b.width,gy+b.rows),mask)
        pen+=pos.x_advance/64
    return pen

def latin(im,xy,s,size=36,color=INK,bold=False):
    ImageDraw.Draw(im).text(xy,s,font=ImageFont.truetype(ENB if bold else EN,size),fill=color)

def fit(im,source,box,cover=False):
    x,y,w,h=box
    pic=ImageOps.fit(source,(w,h),method=Image.Resampling.LANCZOS) if cover else ImageOps.contain(source,(w,h),method=Image.Resampling.LANCZOS)
    im.paste(pic,(x+(w-pic.width)//2,y+(h-pic.height)//2))

def crop(im,b):
    return im.crop(tuple(round(v*(im.width if i%2==0 else im.height)) for i,v in enumerate(b)))

def base(n,tag,dark=False):
    im=Image.new('RGB',(W,H),INK if dark else CREAM); d=ImageDraw.Draw(im)
    c=CREAM if dark else INK
    latin(im,(76,50),'PPE Engineering',29,c,True)
    latin(im,(1320,58),'PRECAST MODULE CAFE',24,c)
    d.line((76,106,1844,106),fill=GOLD,width=2)
    latin(im,(76,1008),f'{n:02d}   /   {tag}',20,c)
    latin(im,(1400,1008),'CONCEPT DESIGN  /  2026',20,c)
    return im

def label(im,xy,s,dark=False):
    text(im,xy,s,25,CREAM if dark else MUTED)

def heading(im,a,b=None):
    text(im,(78,151),a,63,INK,True)
    if b:text(im,(80,243),b,32,MUTED)

ref=Image.open(ROOT/'Picture Stock/Codex Image Sep 4, 2026, 08_41_56 AM.png').convert('RGB')
hero=crop(ref,(.105,.088,.433,.519))
interior=crop(ref,(.629,.802,.807,.994))
interior2=crop(ref,(.812,.802,.996,.994))
model=Image.open(ROOT/'deliverables/PPE_Cafe/PPE_Cafe_3D.png').convert('RGB')
sheets={i:Image.open(AS/f'sheet-{i}.png').convert('RGB') for i in range(1,7)}
plan=crop(sheets[2],(.053,.158,.499,.573))
cutaway=crop(sheets[6],(.381,.159,.945,.658))
section=crop(sheets[4],(.17,.25,.958,.577))
elevations=crop(sheets[3],(.055,.12,.957,.79))
scenes=[]

# 1. Architectural invitation.
im=base(1,'THE IDEA',True);fit(im,hero,(865,108,1055,865),True)
d=ImageDraw.Draw(im);d.rectangle((0,108,865,977),fill=INK)
latin(im,(78,203),'SMALL SPACE.',58,CREAM,True)
latin(im,(78,280),'WARM EXPERIENCE.',54,CREAM,True)
text(im,(80,424),'ร้านกาแฟโมดูลาร์',62,CREAM,True)
text(im,(80,510),'เส้นโค้งคอนกรีต × ความอบอุ่นของไม้',35,CREAM)
text(im,(80,635),'จากภาพแนวคิด สู่โมเดล BIM',34,GOLD)
latin(im,(80,803),'3.20 × 6.00 m',49,CREAM)
label(im,(895,914),'ภาพแนวคิดจากภาพอ้างอิง',True)
scenes.append((im,8,'เปิดตัวร้านกาแฟโมดูลาร์ หลังคาโค้งคอนกรีตและงานไม้โทนอุ่น'))

# 2. Clearly separate the actual model from the reference.
im=base(2,'BIM MODEL');heading(im,'จากแนวคิด สู่โมเดล Revit','อาคารหลังคาโค้ง ช่องขายด้านข้าง และระเบียงรูปตัว L')
fit(im,model,(620,315,1220,630));d=ImageDraw.Draw(im)
for y,num,desc in [(351,'19.20','ตร.ม. พื้นที่กรอบอาคาร'),(531,'4 + 4','ที่นั่งภายใน + ภายนอก'),(711,'3.20 m','สูงจากพื้นสำเร็จถึงยอดหลังคา')]:
    latin(im,(83,y),num,63,INK,True);text(im,(86,y+86),desc,29,MUTED)
    d.line((85,y+140,535,y+140),fill='#D4D8D0',width=2)
label(im,(1260,943),'ภาพจากโมเดล Revit ที่ส่งมอบ')
scenes.append((im,9,'โมเดล Revit ขนาด 3.20 คูณ 6.00 เมตร พื้นที่อาคาร 19.20 ตารางเมตร พร้อมระเบียงภายนอก'))

# 3. Plan occupies a large clean field.
im=base(3,'SPACE PLANNING');heading(im,'พื้นที่กะทัดรัด จัดฟังก์ชันครบ','โซนลูกค้า บาร์กาแฟ ห้องน้ำ และพื้นที่เก็บของ')
fit(im,plan,(65,340,1140,610));d=ImageDraw.Draw(im)
for y,no,title,sub in [(374,'01','ด้านหน้า','ที่นั่งและทางเข้ากระจก'),(541,'02','พื้นที่บริการ','เคาน์เตอร์ชง + ช่องขายด้านข้าง'),(708,'03','ส่วนสนับสนุน','ห้องน้ำและห้องเก็บของด้านหลัง')]:
    latin(im,(1290,y),no,36,GOLD,True);text(im,(1360,y-3),title,37,INK,True);text(im,(1290,y+69),sub,28,MUTED)
label(im,(98,945),'แปลนจาก Revit  /  A101')
scenes.append((im,10,'ด้านหน้าเป็นโซนลูกค้า เชื่อมบาร์และช่องขายด้านข้าง ส่วนห้องน้ำและเก็บของอยู่ด้านหลัง'))

# 4. Interior cutaway.
im=base(4,'INTERIOR');heading(im,'มองเห็นการใช้งานภายใน','เปิดหลังคาและผนังในภาพ BIM เพื่อสื่อสารการจัดพื้นที่')
fit(im,cutaway,(465,333,1380,610))
text(im,(82,403),'บาร์กาแฟ',44,INK,True);text(im,(82,469),'เคาน์เตอร์และชั้นวาง',30,MUTED)
text(im,(82,595),'บรรยากาศโทนอุ่น',42,INK,True);text(im,(82,663),'งานไม้ กระจก และโคมแขวน',28,MUTED)
label(im,(1110,946),'ภาพตัดเปิดจากโมเดล Revit  /  A601')
scenes.append((im,9,'ภาพตัดเปิดแสดงเคาน์เตอร์ อุปกรณ์ และที่นั่งภายใน ในบรรยากาศไม้โทนอุ่น'))

# 5. Mood references, short and plainly attributed.
im=base(5,'ATMOSPHERE',True)
text(im,(80,150),'แสงอุ่น ไม้ และจังหวะของเส้นโค้ง',60,CREAM,True)
fit(im,interior,(80,296,850,605),True);fit(im,interior2,(964,296,875,605),True)
text(im,(86,923),'ภาพแนวคิดภายในจากภาพอ้างอิง ใช้สื่อสารบรรยากาศและโทนวัสดุ',29,CREAM)
scenes.append((im,7,'ภาพอ้างอิงภายในสื่อสารแสงอุ่น งานไม้ และเส้นโค้งของหลังคา'))

# 6. Proposed material specification, with no certification implication.
im=base(6,'PROPOSED MATERIALS');heading(im,'วัสดุที่เสนอในโมเดล','ชุดวัสดุเบื้องต้นสำหรับพัฒนารายละเอียดร่วมกับผู้ผลิต')
d=ImageDraw.Draw(im)
cards=[(80,'#AAA89F','PRECAST','คอนกรีตพรีคาสท์','35 MPa / 1,800 กก./ลบ.ม.','ผนัง 150 มม. / พื้น 180 มม.'),
       (685,'#A77745','WARM TIMBER','ไม้โทนอุ่น','พื้น ฝ้า และเคาน์เตอร์','ระเบียงไม้ภายนอก 28 มม.'),
       (1290,'#425958','GLASS + FRAME','กระจกและกรอบดำ','กระจกลามิเนตเสนอ 6+6 มม.','กรอบอลูมิเนียมสีดำ')]
for x,col,en,th,l1,l2 in cards:
    d.rectangle((x,355,x+550,545),fill=col)
    latin(im,(x+24,563),en,26,GOLD,True);text(im,(x+24,624),th,39,INK,True)
    text(im,(x+24,710),l1,29,MUTED);text(im,(x+24,771),l2,28,MUTED)
d.rectangle((80,888,1840,967),fill='#E7E1D5')
text(im,(109,904),'สเปกเสนอใช้ ต้องยืนยันกับผู้ผลิตและวิศวกรก่อนพัฒนาแบบก่อสร้าง',31,INK)
scenes.append((im,10,'วัสดุในโมเดลเป็นสเปกเสนอใช้ ทั้งคอนกรีตพรีคาสท์ งานไม้ และกระจกลามิเนต ต้องยืนยันร่วมกับผู้ผลิตและวิศวกร'))

# 7. Sections, legible architectural linework.
im=base(7,'BUILDING SECTIONS');heading(im,'เข้าใจอาคารผ่านรูปตัด','รูปตัดตามยาวและตามขวางจากโมเดลเดียวกัน')
fit(im,section,(83,344,1755,560))
text(im,(93,926),'พื้นสำเร็จ +0.450 ม.',29,MUTED);text(im,(715,926),'ยอดหลังคา ≈ +3.650 ม.',29,MUTED)
label(im,(1500,926),'แบบรูปตัด  /  A301')
scenes.append((im,8,'รูปตัดแสดงสัดส่วนหลังคาโค้ง ระดับพื้น และความสัมพันธ์ของพื้นที่ภายใน'))

# 8. Real issued drawings as thumbnails, not invented sheets.
im=base(8,'DRAWING PACKAGE');heading(im,'โมเดลพร้อมชุดแบบนำเสนอ','แปลน รูปด้าน รูปตัด รายละเอียดแนวคิด และตารางวัสดุ')
for idx,i in enumerate([2,3,4]):
    x=80+idx*598
    ImageDraw.Draw(im).rectangle((x+9,352,x+568,768),fill='#D9DCD4')
    fit(im,sheets[i],(x,340,560,414))
    text(im,(x+14,794),['A101  แปลน','A201  รูปด้าน 4 ด้าน','A301  รูปตัด'][idx],30,INK,True)
latin(im,(85,897),'REVIT 2026',34,INK,True);latin(im,(562,897),'6 × A1 DRAWING SHEETS',32,INK,True)
text(im,(1275,895),'Title block: PPE Engineering',29,MUTED)
scenes.append((im,8,'ส่งมอบไฟล์ Revit 2026 พร้อมแบบ A1 หกแผ่น และไตเติลบล็อก PPE Engineering'))

# 9. Close with a restrained design-review note.
im=base(9,'NEXT STEP',True);fit(im,hero,(1130,108,790,865),True)
latin(im,(79,211),'PPE Engineering',63,CREAM,True)
text(im,(80,340),'PRECAST MODULE CAFE',45,CREAM,True)
text(im,(81,450),'พื้นที่เล็ก สำหรับประสบการณ์ที่อบอุ่น',43,CREAM)
text(im,(80,634),'พร้อมนำเสนอและพัฒนารายละเอียดขั้นต่อไป',32,GOLD)
text(im,(81,812),'แบบแนวคิดเพื่อทบทวน',29,CREAM)
text(im,(81,864),'ต้องออกแบบโครงสร้าง รอยต่อ และระบบอาคารเพิ่มเติม',26,CREAM)
label(im,(1161,923),'ภาพแนวคิดจากภาพอ้างอิง',True)
scenes.append((im,7,'PPE Engineering ร้านกาแฟโมดูลาร์ พร้อมนำเสนอและพัฒนารายละเอียดขั้นต่อไป'))

manifest=[]; total=sum(x[1] for x in scenes); start=0
for i,(im,dur,caption) in enumerate(scenes):
    im.save(AS/f'scene-{i+1:02d}.png')
    manifest.append({'scene':i+1,'start':start,'duration':dur,'caption':caption})
    start+=dur
(OUT/'storyboard.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
contact=Image.new('RGB',(1440,810),'#D2D5CD')
for i,(im,_,_) in enumerate(scenes):contact.paste(im.resize((480,270),Image.Resampling.LANCZOS),((i%3)*480,(i//3)*270))
contact.save(QA/'storyboard.jpg',quality=95)

def music():
    sr=48000; N=int(total*sr); a=np.zeros((N,2),np.float32)
    # Original warm ambient progression. No sampled or third-party recording.
    chords=[[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,59]]
    def tone(at,dur,midi,amp,pan,pluck=False):
        j=int(at*sr); n=min(int(dur*sr),N-j)
        if n<=0:return
        t=np.arange(n,dtype=np.float32)/sr; f=440*2**((midi-69)/12)
        v=(np.sin(2*np.pi*f*t)+.20*np.sin(2*np.pi*f*2*t)+.07*np.sin(2*np.pi*f*3*t))
        if pluck: env=(1-np.exp(-t*60))*np.exp(-t*1.5)*np.minimum(1,(dur-t)/.4)
        else:env=np.minimum(1,t/1.6)*np.minimum(1,(dur-t)/2.0)
        v=v*env*amp
        a[j:j+n,0]+=v*math.sqrt((1-pan)/2);a[j:j+n,1]+=v*math.sqrt((1+pan)/2)
    for k,at in enumerate(np.arange(0,total,4)):
        chord=chords[k%4]
        for j,m in enumerate(chord):tone(at,6,m,.040,(j-1.5)/3)
        for j,m in enumerate([chord[1]+12,chord[2]+12,chord[3]+12,chord[2]+12]):tone(at+j,2.6,m,.050,(-.4 if j%2 else .4),True)
    # Gentle diffuse stereo echoes, then clean fade at both ends.
    for delay,gain in [(0.21,.13),(.43,.08)]:
        n=int(delay*sr);a[n:]+=a[:-n,::-1]*gain
    env=np.minimum(1,np.arange(N)/sr/2)*np.minimum(1,(N-np.arange(N))/sr/3)
    a*=env[:,None];a*=.48/max(float(np.abs(a).max()),.01)
    pcm=np.int16(np.clip(a,-1,1)*32767)
    with wave.open(str(AS/'original-ambient.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes(pcm.tobytes())
    return {'sampleRate':sr,'channels':2,'peak':float(np.abs(a).max()),'rms':float(np.sqrt((a*a).mean()))}

if '--stills' in sys.argv:
    print('Storyboard prepared:',QA/'storyboard.jpg',flush=True);sys.exit(0)

audioqa=music()
output=OUT/'PPE_Engineering_Cafe_Presentation_1080p.mp4'
cmd=[FF,'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(AS/'original-ambient.wav'),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-metadata','title=PPE Engineering | Precast Module Cafe','-metadata','comment=Concept design presentation; reference images and delivered Revit model. Original procedural music.','-shortest',str(output)]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=open(QA/'encode.log','w'))
prev=None
for i,(im,dur,_) in enumerate(scenes):
    print(f'Encoding scene {i+1}/{len(scenes)} ({dur}s)',flush=True)
    frames=dur*FPS
    for k in range(frames):
        # Subtle optical push; text stays within a generous title-safe region.
        u=k/max(frames-1,1); zoom=1+.018*(u*u*(3-2*u)); cw=round(W/zoom); ch=round(H/zoom)
        frame=im.crop(((W-cw)//2,(H-ch)//2,(W+cw)//2,(H+ch)//2)).resize((W,H),Image.Resampling.BICUBIC)
        if k<21 and prev is not None:
            a=k/21;a=a*a*(3-2*a);frame=Image.blend(prev,frame,a)
        if i==0 and k<24:frame=Image.blend(Image.new('RGB',(W,H),INK),frame,k/24)
        if i==len(scenes)-1 and k>frames-25:frame=Image.blend(frame,Image.new('RGB',(W,H),INK),(k-(frames-25))/24)
        proc.stdin.write(frame.tobytes())
    prev=frame
proc.stdin.close(); rc=proc.wait()
if rc:raise RuntimeError('ffmpeg encode failed: '+str(rc))
subprocess.run([FF,'-hide_banner','-v','error','-i',str(output),'-f','null','-'],check=True,stderr=open(QA/'decode-check.log','w'))
audit={'file':str(output),'durationSeconds':total,'width':W,'height':H,'fps':FPS,'frames':total*FPS,'audio':audioqa,'decodeCheck':'passed','sceneCount':len(scenes),'bytes':output.stat().st_size}
(QA/'video-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
print(json.dumps(audit,indent=2),flush=True)
