"""Package the reviewed ONE-product architectural pilot; does not touch P6 originals."""
from pathlib import Path
import csv,json,hashlib,zipfile,html,re
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'deliverables/PM_ARC_P61_Pilot/PM-I-B3'
WORK=ROOT/'output/revit-p61'
def dump(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf-8')
def csvout(p,rows):
    with p.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
rows=json.loads((OUT/'ARC_ItemRegister_P103.json').read_text(encoding='utf-8'))
csvout(OUT/'ARC_ItemSchedule_P103.csv',rows)
csvout(OUT/'MEP_Locations_P103.csv',[r for r in rows if r['group']=='MEP'])
qa=json.loads((OUT/'QA_P103.json').read_text(encoding='utf-8'))
coord=json.loads((OUT/'Coordination_QA_P103.json').read_text(encoding='utf-8'))
assert qa['sourceUnchanged'] and qa['linkLoaded'] and qa['relocatedPackageTest']=='PASS'
assert not coord['arcConcreteClashes'] and not coord['furnitureClashes'] and not coord['booleanErrors'],coord
spec=[
 ('FL-01','Porcelain finish assembly','Slip-resistant cleanable porcelain; total10mm study allowance; confirm adhesive/substrate and movement joints','m2',round(coord['floorFinishAreaM2'],4),'MODELED native finish floor'),
 ('JN-01','Timber-look joinery','Moisture-resistant substrate; washable timber-look laminate; sealed edges','set',2,'MODELED counter and storage; substrate and fabrication detail provisional'),
 ('CT-01','Washable worktop','Non-porous washable surface; verify food-contact and cleaning suitability','set',2,'MODELED schematic worktops'),
 ('DK-01','Exterior decking','Durable exterior timber28mm;6mm board gaps; slip resistance/corrosion-resistant fasteners','m2',15.27,'MODELED net board top area including step; excludes gaps, wastage and support design'),
 ('MT-01','Black metal frames','Coated aluminium/steel by intended use; exposure durability and support by supplier','lot',None,'MODELED appearance; profiles not capacity-designed'),
 ('GL-01','Safety glazing','Safety glass to doors/windows; glass makeup and thickness by final performance design','opening',6,'MODELED2doors+4windows; no certified clear opening or egress design'),
 ('PC-01','Exposed precast finish','Architect to select repair/preparation/sealer; preserve structural joints','m2',None,'LINKED structure; coating build-up not modeled'),
 ('WP-ROOF','Roof waterproofing','Compatible membrane/joint treatment preserving movement; detail drainage and terminations','m2',None,'SPEC PROPOSAL ONLY; no added membrane geometry'),
 ('IN-ROOF','Thermal/acoustic roof strategy','Select insulation/vapour/condensation approach suitable for actual site','m2',None,'NOT SELECTED / NOT MODELED; no dropped ceiling in pilot'),
 ('AC-I01/O01','Air conditioning','Indoor and outdoor locations only; cooling load, efficiency, drainage and piping by mechanical designer','set',1,'MODELED spatial placeholders; NO BTU selection'),
 ('LT-01..03','Lighting','Decorative pendant positions; illuminance, power and fixing by designers','each',3,'MODELED positions; no electrical capacity'),
 ('SO-01..04','Power outlets','Location proposals; socket type, protection and circuits by electrical designer','each',4,'MODELED positions only'),
 ('DB-01','Distribution board','Access/coordination location; incoming supply and ratings TBD','each',1,'MODELED spatial reservation'),
 ('SN-01','Countertop basin','Stainless basin proposal; hygiene/faucet/trap/drainage by architect and plumbing designer','each',1,'MODELED countertop basin; no hydraulic design'),
 ('WP-01','Water/waste interface','Coordinate water and waste connection, external grease trap and maintenance; no core holes assumed','point',1,'POSITION ONLY; no pipe routing'),
 ('AW-01..02','Canopies','Timber-look canopy on coated metal support; rain slope/flashing/fixings to detail','each',2,'MODELED concept; no anchor design'),
 ('WC-EXT','External shared toilet','Provide shared external sanitary/access facilities coordinated with site','set',None,'REQUIRED BUT OUTSIDE THIS UNIT / NOT MODELED')]
csvout(OUT/'MaterialSpec_P103.csv',[dict(zip(['code','item','unbrandedProposedSpec','unit','quantity','modelStatus'],r)) for r in spec])
csvout(OUT/'MaterialGeometryVolumes_P103.csv',[{'material':k,'geometryVolumeM3':v,'basis':'Model geometry only; not procurement quantity or certified dead load'} for k,v in sorted(coord['materialGeometryVolumeM3'].items())])
pdf=PdfReader(OUT/'PM-I-B3_ARC_A1_P103.pdf')
assert len(pdf.pages)==7
for p in pdf.pages:
    assert abs(float(p.mediabox.width)*25.4/72-841)<2
    assert abs(float(p.mediabox.height)*25.4/72-594)<2
text='\n'.join(p.extract_text() or '' for p in pdf.pages)
assert all(n in text for n in ['A001','A101','A201','A301','A401','A601','A701'])
assert 'REVIT 2026 | P103' in text
images=sorted(OUT.glob('*.png'));assert len(images)==4
cards=''.join(f'<figure><a href="{html.escape(p.name)}"><img src="{html.escape(p.name)}"></a><figcaption>{html.escape(p.stem)}</figcaption></figure>' for p in images)
review=f'''<!doctype html><html lang="th"><meta charset="utf-8"><title>I-B3 Architectural Pilot</title><style>body{{font:16px system-ui;margin:40px auto;max-width:1300px;background:#eef1f4;color:#13283c}}h1{{margin-bottom:8px}}.grid{{display:grid;grid-template-columns:1fr 1fr;gap:20px}}figure{{margin:0;background:white;padding:18px;border-radius:12px}}img{{width:100%}}nav{{margin:24px 0}}a{{color:#135879;margin-right:20px}}.note{{padding:18px;background:#fff3d6;border-radius:8px}}</style><h1>I-B3 ร้านกาแฟ / Architectural Pilot P103</h1><p>ขั้น6.1 — ตัวอย่าง1แบบก่อนขยาย / Revit2026 ARC + Linked structure</p><nav><a href="PM-I-B3_ARC_R2026_P103.rvt">ARC RVT</a><a href="PM-I-B3_ARC_A1_P103.pdf">แบบ A1 / 7แผ่น</a><a href="MaterialSpec_P103.csv">Specวัสดุ</a><a href="MEP_Locations_P103.csv">ตำแหน่งMEP</a><a href="README_TH.md">วิธีเปิดและข้อจำกัด</a></nav><p class="note">ดาวน์โหลดทั้งแพ็กเกจและคงโฟลเดอร์References เพื่อใช้Link ภาพทั้งหมดส่งออกจากRevitจริง งานระบบเป็นตำแหน่งเบื้องต้น ไม่ใช่แบบก่อสร้าง</p><div class="grid">{cards}</div></html>'''
(OUT/'Review.html').write_text(review,encoding='utf-8')
qa['visualReview']='PASS - all7 final PDF pages and4 native images reviewed';qa['pilotDeliveryPercent']=100;qa['userReviewPending']=True;qa['fullProgrammeDeliveries']='1 of48; remaining47 NOT authorized';dump(OUT/'QA_P103.json',qa)
files=[p for p in OUT.rglob('*') if p.is_file() and not re.search(r'\.\d{4}\.(rfa|rvt|rte)$',p.name,re.I) and p.suffix not in ['.slog','.log','.bak'] and p.name!='DeliveryManifest_P103.json']
manifest={'productId':'PM-I-B3','stage':'6.1 pilot','files':[{'path':p.relative_to(OUT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)],'engineeringApproved':False,'productionReleased':False}
dump(OUT/'DeliveryManifest_P103.json',manifest);files.append(OUT/'DeliveryManifest_P103.json')
zip_path=OUT.parent/'PM-I-B3_ARC_P103_ReviewPackage.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,'PM-I-B3/'+p.relative_to(OUT).as_posix())
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    for row in manifest['files']:assert hashlib.sha256(z.read('PM-I-B3/'+row['path'])).hexdigest()==row['sha256']
dump(WORK/'acceptance.json',{'pilotProduct':'PM-I-B3','pilotPercent':100,'deliveredProducts':1,'remaining47Authorized':False,'files':len(files),'zip':str(zip_path),'nativeOpenReopen':True,'relativeLinkRelocation':'PASS','concreteUnchanged':14,'pdfSheets':7,'nativeImages':4,'visualReview':'PASS','engineeringApproved':False,'productionReleased':False,'nextGate':'USER_REVIEW_ONE_SAMPLE'})
print(json.dumps({'package':str(zip_path),'files':len(files),'sizeMB':round(zip_path.stat().st_size/1024/1024,2)},ensure_ascii=False))
