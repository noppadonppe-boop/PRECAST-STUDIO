from pathlib import Path
import sys,subprocess,json,wave
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/video/python-packages'))
import imageio_ffmpeg
from PIL import Image,ImageDraw,ImageFont
import numpy as np
FF=imageio_ffmpeg.get_ffmpeg_exe()
OUT=ROOT/'deliverables/PPE_Cafe/video-realistic'; QA=OUT/'qa'; QA.mkdir(exist_ok=True)
W,H=1280,720; FPS=30

def run(args,name):
    print(name,flush=True)
    with open(QA/(name+'.log'),'w') as f:
        subprocess.run([FF,'-y','-hide_banner','-loglevel','warning']+args,stderr=f,check=True)

# Only real generated motion is used. Time interpolation is local postproduction.
shots=[('01-exterior.mp4',1.5,5.34),('entry.mp4',1.5,7.59),('barista.mp4',1.5,5.34),('01-exterior.mp4',1.25,4.45)]
segments=[]
for i,(name,speed,dur) in enumerate(shots):
    dest=QA/f'segment-{i+1}.mp4'
    vf=f'setpts={speed}*(PTS-STARTPTS),minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,crop=1280:720,setsar=1,tpad=stop_mode=clone:stop_duration=0.2'
    if '--reuse' not in sys.argv or not dest.exists():
        run(['-i',str(OUT/'clips'/name),'-vf',vf,'-t',str(dur),'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(dest)],f'prepare-{i+1}')
    segments.append(dest)

# Discreet typography over moving footage, with no architectural drawing slides.
font='C:/Windows/Fonts/segoeui.ttf';bold='C:/Windows/Fonts/segoeuib.ttf'
brand=Image.new('RGBA',(W,H));d=ImageDraw.Draw(brand)
d.rounded_rectangle((28,25,302,73),radius=6,fill=(18,36,31,140))
d.text((44,33),'PPE Engineering',font=ImageFont.truetype(bold,25),fill=(249,247,240,245))
brand.save(QA/'brand.png')
title=Image.new('RGBA',(W,H));d=ImageDraw.Draw(title)
for y in range(490,720):d.line((0,y,W,y),fill=(8,23,18,round(150*(y-490)/230)))
d.text((43,590),'PRECAST MODULE CAFE',font=ImageFont.truetype(bold,37),fill=(250,248,239,255))
d.text((46,645),'A warm place for coffee',font=ImageFont.truetype(font,23),fill=(226,211,181,255))
title.save(QA/'opening.png')
ending=Image.new('RGBA',(W,H));d=ImageDraw.Draw(ending)
for y in range(470,720):d.line((0,y,W,y),fill=(8,23,18,round(175*(y-470)/250)))
d.text((43,570),'PPE Engineering',font=ImageFont.truetype(bold,40),fill=(250,248,239,255))
d.text((46,630),'PRECAST MODULE CAFE  |  DESIGN VISUALIZATION',font=ImageFont.truetype(font,20),fill=(226,211,181,255))
ending.save(QA/'ending.png')

durations=[x[2] for x in shots]; transition=.35
duration=sum(durations)-transition*(len(shots)-1)
# Reuse the original score composed locally for this same project.
with wave.open(str(ROOT/'deliverables/PPE_Cafe/video/assets/original-ambient.wav'),'rb') as f:
    sr=f.getframerate(); a=np.frombuffer(f.readframes(round(duration*sr)),np.int16).reshape(-1,2).astype(np.float32)/32768
a*=.60
# Restrained original foley: faint cup clinks and a soft espresso-steam texture.
rng=np.random.default_rng(260906)
def clink(at,level=.018):
    n=int(sr*.75);t=np.arange(n)/sr
    v=(np.sin(2*np.pi*2380*t)+.3*np.sin(2*np.pi*3650*t))*np.exp(-t*13)*(1-np.exp(-t*800))*level
    j=int(at*sr);k=min(n,len(a)-j)
    if k>0:a[j:j+k]+=v[:k,None]*np.array([[.8,1.]])
for at in [2.3,8.4,14.9]:clink(at)
j=int(13.8*sr);n=min(int(1.4*sr),len(a)-j)
t=np.arange(n)/sr;noise=rng.normal(0,1,n)
noise=np.convolve(noise,np.ones(5)/5,mode='same')
envelope=np.minimum(1,t/.2)*np.minimum(1,(n/sr-t)/.25)
a[j:j+n]+=noise[:,None]*envelope[:,None]*.008
N=len(a);envelope=np.minimum(1,np.arange(N)/sr/.8)*np.minimum(1,(N-np.arange(N))/sr/1.5);a*=envelope[:,None]
audio=QA/'soundtrack.wav'
with wave.open(str(audio),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes(np.int16(np.clip(a,-1,1)*32767).tobytes())

args=[]
for p in segments:args+=['-i',str(p)]
for p in ['brand.png','opening.png','ending.png']:args+=['-loop','1','-i',str(QA/p)]
args+=['-i',str(audio)]
offset=durations[0]-transition
filters=[f'[0:v][1:v]xfade=transition=fade:duration={transition}:offset={offset:.3f}[x1]']
offset+=durations[1]-transition
filters.append(f'[x1][2:v]xfade=transition=fade:duration={transition}:offset={offset:.3f}[x2]')
offset+=durations[2]-transition
filters.append(f'[x2][3:v]xfade=transition=fade:duration={transition}:offset={offset:.3f}[x3]')
filters += [f'[x3][4:v]overlay=shortest=1[b]',
            r'[b][5:v]overlay=shortest=1:enable=between(t\,0.5\,4.3)[t]',
            rf'[t][6:v]overlay=shortest=1:enable=gte(t\,{duration-3.5:.3f})[e]',
            f'[e]fade=t=in:d=0.35,fade=t=out:st={duration-.8:.3f}:d=0.8,format=yuv420p[v]']
output=OUT/'PPE_Engineering_Cafe_Realistic_Video_720p.mp4'
run(args+['-filter_complex',';'.join(filters),'-map','[v]','-map','7:a','-t',f'{duration:.3f}','-r','30','-c:v','libx264','-crf','18','-preset','fast','-c:a','aac','-b:a','192k','-movflags','+faststart','-metadata','title=PPE Engineering - Precast Module Cafe - Realistic AI Video','-metadata','comment=AI architectural concept visualization. Native Wan source 832x480/16fps, upscaled to 1280x720 with motion interpolation. Exterior arc, walkthrough and barista. Not a complete 360-degree orbit.',str(output)],'assemble')
run(['-i',str(output),'-f','null','-'],'decode-check')
run(['-i',str(output),'-vf','fps=1/3,scale=480:270,tile=4x2','-frames:v','1','-update','1',str(QA/'final-contact.jpg')],'contact-sheet')
run(['-ss','2','-i',str(output),'-frames:v','1','-update','1',str(OUT/'PPE_Cafe_Realistic_Video_Cover.jpg')],'cover')
audit={'file':str(output),'durationSeconds':round(duration,3),'resolution':[W,H],'fps':FPS,'sourceResolution':[832,480],'sourceFps':16,'sourceMotionClips':3,'editSegments':4,'interpolation':'motion compensated','audio':'original locally composed score and synthesized foley','decodeCheck':'passed','bytes':output.stat().st_size,'limitations':['AI visualization, not a surveyed/built cafe or dimensionally verified Revit render.','Exterior camera arc only; complete 360-degree orbit remains unavailable after public service run quota reached.','Output is upscaled from 480p source footage.']}
(QA/'video-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
print(json.dumps(audit,indent=2),flush=True)
