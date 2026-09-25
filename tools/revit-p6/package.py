"""Validate and package native Revit outputs. Does not invent native validation."""
import argparse, concurrent.futures, hashlib, json, pathlib, subprocess, zipfile
from pypdf import PdfReader
from PIL import Image, ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'deliverables/PM_Revit_48_P6'
WORK=ROOT/'output/revit-p6'
POPPLER=pathlib.Path(r'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
parser=argparse.ArgumentParser();parser.add_argument('--render',action='store_true');parser.add_argument('--publish-manifest',action='store_true');args=parser.parse_args()
data=json.loads((WORK/'input.json').read_text(encoding='utf-8'))
results=[];errors=[]
for model in data['models']:
    pid=model['id'];folder=OUT/pid;qa_path=folder/(pid+'_QA_P01.json')
    if not qa_path.exists():continue
    qa=json.loads(qa_path.read_text(encoding='utf-8'))
    if qa.get('status')!='PASS' or not qa.get('nativeReopened'):errors.append(pid+': native checks missing');continue
    if qa['sourceSha256']!=sha(ROOT/model['sourcePath']):errors.append(pid+': source hash mismatch');continue
    pdf=folder/(pid+'_A1_Drawings_P01.pdf');rvt=folder/(pid+'_R2026_P01.rvt')
    reader=PdfReader(pdf)
    pages=[]
    for n,page in enumerate(reader.pages):
        w,h=float(page.mediabox.width)*25.4/72,float(page.mediabox.height)*25.4/72
        text=page.extract_text() or ''
        pages.append({'number':n+1,'sizeMm':[w,h],'textChars':len(text),'titlePresent':qa['sheets'][n] in text})
    if len(pages)!=7 or any(abs(p['sizeMm'][0]-841)>2 or abs(p['sizeMm'][1]-594)>2 or not p['titlePresent'] for p in pages):errors.append(pid+': PDF sheets invalid');continue
    if rvt.read_bytes()[:8]!=bytes.fromhex('d0cf11e0a1b11ae1'):errors.append(pid+': invalid RVT header');continue
    pngs=[]
    for suffix in ['3D_Exterior','3D_Segments','Plan','Section']:
        found=list(folder.glob(pid+'_'+suffix+'_P01*.png'))
        if len(found)!=1:errors.append(pid+': missing/ambiguous PNG '+suffix);continue
        with Image.open(found[0]) as img:img.verify()
        pngs.append((suffix,found[0]))
    if len(pngs)!=4:continue
    qa['pdfPageAudit']=pages
    # Keep visual acceptance explicit; native geometry PASS does not imply sheet acceptance.
    qa['visualReview']='PENDING_CONTACT_AND_FULL_SIZE_REVIEW'
    write(qa_path,qa)
    readme=folder/'README_TH.md'
    readme.write_text(f'''# {pid} — Revit 2026 / P01

แบบพัฒนาและประสานงานจาก Geometry P36; {model['useLabel']} / {model['profileLabel']}

- เปิดไฟล์ `{rvt.name}` ด้วย Autodesk Revit 2026 หรือใหม่กว่า
- PDF A1 จำนวน 7 แผ่น ส่งออกหลังเปิดไฟล์ RVT ที่บันทึกแล้ว
- ภาพ 4 มุมมองส่งออกจากโมเดล Revit จริง
- คอนกรีต {len(model['instances'])} ชิ้น มี Instance ID และ Typical Tag ตรง P36
- พื้นเป็น Native Floor; คอนกรีตอื่นเป็น Shared Loadable Families พร้อมหน้าตัด Extrusion ที่แก้ได้
- Family แต่ละรูปทรงมีพารามิเตอร์ Depth_N; แก้หน้าตัดใน Edit Family และตรวจมิติใหม่เมื่อแก้
- Fitout/กระจกเป็น DirectShape เพื่อประสานพื้นที่; เปลี่ยนรูปทรงด้วยการสร้าง/แทนที่
- SharedLibrary มี Family/กรอบแบบ/Shared Parameters/Template ใช้ร่วมกัน

## ปริมาณและข้อจำกัด

กรอบอ้างอิง {' × '.join(str(v) for v in model['externalDimensionsMm'])} มม. กริด 1,500 มม.
คอนกรีตอ้างอิง {model['mass']['knownConcreteKg']:,.3f} กก. ที่ 2,400 กก./ลบ.ม.
CSV รายงานปริมาตรที่อ่านจาก Revit และน้ำหนักอ้างอิงคู่กัน; ไม่รวมเหล็ก อุปกรณ์ และงานตกแต่ง
Schedule ใน Revit เก็บค่าปริมาณต้นทางเพื่อเทียบ; ต้องสร้าง Schedule/QA ใหม่หลังแก้ geometry
Dimensions เป็น native dimensions อ้างเส้น witness ตามพิกัดต้นทาง ต้องตรวจ witness หลังแก้แบบ
วัสดุ/กำลังคอนกรีต เหล็กเสริม prestress และจุดต่อรับแรงยังไม่เลือกหรือคำนวณ
โซนยกเป็นแนวศึกษา P52 และไม่มีขนาดเหล็กหรือค่ากำลังที่รับรอง
PE-01/PE-02/PE-03 อยู่ในขอบเขต Production Engineering แยกต่างหาก
engineeringApproved=false; productionReleased=false

ต้นทาง: `{model['sourcePath']}`
SHA-256 ต้นทาง: `{model['sourceSha256']}`
ผลตรวจรายชิ้นและ Revit build อยู่ใน QA JSON
''',encoding='utf-8')
    files=[('RVT',rvt),('PDF',pdf),('CSV',folder/(pid+'_SegmentSchedule_P01.csv')),('QA',qa_path),('README',readme)]+[('PNG_'+s.upper(),p) for s,p in pngs]
    results.append({'productId':pid,'folder':folder,'sourcePath':model['sourcePath'],'sourceSha256':model['sourceSha256'],'files':files,'nativeValidated':True})
if args.render:
    def render(r):
        dest=WORK/'qa'/r['productId'];dest.mkdir(parents=True,exist_ok=True)
        pdf=next(p for k,p in r['files'] if k=='PDF')
        subprocess.run([str(POPPLER),'-scale-to','1200','-png',str(pdf),str(dest/'sheet')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        ims=[]
        for n in range(1,8):
            im=Image.open(dest/('sheet-'+str(n)+'.png')).convert('RGB');im.thumbnail((600,425));ims.append(im)
        board=Image.new('RGB',(2400,920),'#eef1f4');draw=ImageDraw.Draw(board);draw.text((15,10),r['productId']+' | 7 A1 sheets from saved RVT',fill='#102344')
        for n,im in enumerate(ims):board.paste(im,((n%4)*600,35+(n//4)*440))
        board.save(dest/'contact.png')
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(render,results))
    for plan in ['I','L','U']:
        rows=[r for r in results if r['productId'].startswith('PM-'+plan+'-')]
        for sheet in range(1,8):
            if not rows:continue
            board=Image.new('RGB',(2400,1760),'#eef1f4');draw=ImageDraw.Draw(board)
            for n,r in enumerate(rows):
                im=Image.open(WORK/'qa'/r['productId']/('sheet-'+str(sheet)+'.png')).convert('RGB');im.thumbnail((600,425));x=(n%4)*600;y=(n//4)*440
                board.paste(im,(x,y+15));draw.text((x+5,y),r['productId'],fill='#102344')
            board.save(WORK/'qa'/('CONTACT-'+plan+'-'+str(sheet)+'.png'))
if args.publish_manifest:
    review_path=WORK/'visual-review.json'
    review=json.loads(review_path.read_text(encoding='utf-8'))
    accepted=set(review['acceptedProducts'])
    delivered=[]
    for r in results:
        if r['productId'] not in accepted:continue
        pid=r['productId'];qa_path=next(p for k,p in r['files'] if k=='QA');qa=json.loads(qa_path.read_text(encoding='utf-8'));qa['visualReview']='REVIEWED';write(qa_path,qa)
        archive=r['folder']/(pid+'_R2026_P01.zip')
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            for k,p in r['files']:z.write(p,p.name)
        with zipfile.ZipFile(archive) as z:
            for k,p in r['files']:
                if hashlib.sha256(z.read(p.name)).hexdigest()!=sha(p):raise ValueError('Archive mismatch '+str(p))
        r['files'].append(('ZIP',archive))
        delivered.append({'productId':pid,'status':'NATIVE_AND_DRAWINGS_VERIFIED','nativeValidated':True,'sourcePath':r['sourcePath'],'sourceSha256':r['sourceSha256'],'files':[{'id':pid+'-P6-'+k.replace('_','-'),'kind':k,'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size} for k,p in r['files']]})
    write(WORK/'delivery-manifest.json',{'id':'PM-P6-P102-DELIVERIES','geometryRevision':'P36','softwareVersion':'2026','products':delivered,'engineeringApproved':False,'productionReleased':False})
    library=OUT/'SharedLibrary'
    (library/'README_TH.md').write_text('''# PM Shared Segment Library — Revit 2026

44 Typical Tags มีรูปทรงจัดวางย่อยตาม input-manifest.json
ไฟล์ RFA เป็น Shared Families มี native Extrusion sketches; โค้งที่กู้คืนเป็น Arc จากพิกัดต้นทาง
Depth_N เป็นพารามิเตอร์ชนิดสำหรับแก้ระยะ Extrusion ของแต่ละส่วน
ชื่อไฟล์ต่อท้ายด้วย hash รูปทรงจัดวาง; ไม่เท่ากับจำนวนแม่แบบผลิต
พื้นในโมเดลอาคารใช้ Native Floor; RFA พื้นเก็บไว้สำหรับอ้างอิงคลังชิ้นงาน
PM_Coordination_R2026.rte เป็น Template จาก Pilot ซึ่งมี Views/Sheets/Parameters และต้องแก้ข้อมูลชื่อโครงการเมื่อเริ่มงานใหม่
PM_PPE_A1.rfa เป็นกรอบ A1 ใช้ร่วมกัน
PM_SharedParameters.txt ใช้ GUID คงที่ในทั้ง 48 แบบ
แก้ Family/Depth แล้วต้องตรวจ geometry/ปริมาตร/ช่องเปิด/การประกอบใหม่ก่อนออก revision
''',encoding='utf-8')
    libfiles=[library/(i['key']+ext) for i in data['library'] for ext in ['.rfa','.rfa.json']]+[library/n for n in ['PM_PPE_A1.rfa','PM_Coordination_R2026.rte','PM_SharedParameters.txt','family-library.json','README_TH.md']]
    libzip=OUT/'PM-P6-SharedLibrary-R2026.zip'
    with zipfile.ZipFile(libzip,'w',zipfile.ZIP_DEFLATED) as z:
        for p in libfiles:z.write(p,p.relative_to(OUT).as_posix())
        for p in (ROOT/'tools/revit-p6').glob('*'):
            if p.suffix in ['.py','.mjs','.txt']:z.write(p,'SourceTools/'+p.name)
        z.write(WORK/'input.json','SourceData/input.json')
        z.write(WORK/'input-manifest.json','SourceData/input-manifest.json')
    with zipfile.ZipFile(libzip) as z:
        if z.testzip():raise ValueError('Shared library ZIP corrupt')
    manifest=json.loads((WORK/'delivery-manifest.json').read_text(encoding='utf-8'))
    manifest['sharedLibrary']={'id':'PM-P6-SHARED-LIBRARY-ZIP','path':libzip.relative_to(ROOT).as_posix(),'bytes':libzip.stat().st_size,'sha256':sha(libzip)}
    write(WORK/'delivery-manifest.json',manifest)
    rows=['# ขั้นที่ 6 — Revit 2026 ครบ 48 แบบ','','แบบพัฒนาและประสานงาน | Geometry P36 | Engineering/Production release ยังไม่อนุมัติ','','[ดาวน์โหลด Shared Library](PM-P6-SharedLibrary-R2026.zip)','','| แบบ | RVT | แบบ A1 | ชุด ZIP |','|---|---|---|---|']
    for r in delivered:
        links={f['kind']:pathlib.Path(f['path']).relative_to(OUT.relative_to(ROOT)).as_posix() for f in r['files']}
        rows.append('| '+r['productId']+' | [RVT]('+links['RVT']+') | [PDF]('+links['PDF']+') | [ZIP]('+links['ZIP']+') |')
    (OUT/'README_TH.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
write(WORK/'package-check.json',{'nativePackages':len(results),'errors':errors,'products':[r['productId'] for r in results]})
print(json.dumps({'nativePackages':len(results),'errors':errors},ensure_ascii=False))
if errors:raise SystemExit(1)
