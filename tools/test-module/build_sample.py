"""Reproducible TEST ONLY dataset. Geometry is IFC-derived; engineering inputs are assumptions."""
from pathlib import Path
import json, hashlib, math, csv, io, html, zipfile
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'samples/test-module'
PUBLIC = ROOT / 'apps/web/public/samples/test-module'
PUBLIC.mkdir(parents=True, exist_ok=True)
model = json.loads((OUT / 'ifc-model.json').read_text(encoding='utf-8'))
v = {
 'location': 'TEST ASSUMPTION: โมดูลจำลองในประเทศไทย ไม่มีพื้นที่ก่อสร้างจริง ไม่ใช้พิกัด Boston ที่ติดมากับ Revit',
 'occupancy': 'TEST ASSUMPTION: ห้องพักอาศัยจำลองชั้นเดียว ไม่มีหลังคาใน IFC ชุดนี้ ไม่ใช่แบบอาคารครบระบบ',
 'hierarchy': 'กฎหมายไทยที่ใช้กับพื้นที่จริง → ACI 318-25 + ACI/PCI 319-25 → วสท. และ PCI เฉพาะข้อที่ไม่ขัดกัน; TM-LD-001 เป็นโจทย์ทดสอบ ไม่ใช่มาตรฐานน้ำหนักอาคาร',
 'designLife': '50', 'riskCategory': 'TEST ASSUMPTION: อาคารพักอาศัยทั่วไป ต้องจัดระดับใหม่เมื่อทราบพื้นที่และการใช้งานจริง',
 'concreteType': 'TEST ASSUMPTION: คอนกรีตเสริมเหล็กน้ำหนักปกติ ไม่อัดแรง; IFC ไม่ยืนยันคุณสมบัติวัสดุ',
 'fc28': '35', 'fcDemould': '20', 'fcLift': '25', 'density': '2400', 'elasticModulus': '28000', 'fy': '400',
 'materialSource': 'TM-DB-001 R1 ตารางสมมติฐานทดสอบ: fc28=35, ถอดแบบ=20, ยก=25 MPa, E=28000 MPa, fy=400 MPa, rho=2400 kg/m³; ไม่มี mill/cube/cylinder certificate',
 'durability': 'TEST ASSUMPTION: ภายในแห้ง ระยะหุ้มทดลอง 30 mm ทุกชิ้น; ยังไม่จัด exposure class/ตรวจทนทานตามพื้นที่จริง',
 'fire': '60',
 'deadLoad': 'TM-LD-001 §1: self-weight จาก IFC × 2400 × 9.80665/1000; พื้น SDL=1.0 kN/m²; solver strip เพิ่ม self-weight ครั้งเดียว ไม่รวมแรงผนังบน strip',
 'liveLoad': 'TM-LD-001 §1: พื้น LL=2.0 kN/m² สม่ำเสมอสำหรับ benchmark; ไม่มีแรงจุดในโจทย์นี้ ไม่ใช่การรับรองน้ำหนักตามกฎหมาย',
 'wind': 'TM-LD-001 §2: แรงดันสมมติ ±1.0 kN/m² ผนังทั้งสองแกนเพื่อทดสอบ load case; ไม่ใช่ค่าที่คำนวณจากความเร็วลม/ภูมิประเทศ',
 'seismic': 'TM-LD-001 §2: แรงแนวนอนสมมติ ±0.10W สองแกนเพื่อทดสอบ load case; ไม่แทน response spectrum หรือชั้นดินจริง',
 'serviceCombinations': 'TM-LD-001 §3: SLS-01=D+SDL+L; linear elastic strip เพื่อตรวจ solver เท่านั้น',
 'ultimateCombinations': 'TM-LD-001 §3: ULS-TEST=1.2(D+SDL)+1.6L ใช้เป็นโจทย์ตัวเลขเท่านั้น ไม่ใช่ชุดครบตาม Code; ยังไม่ใช้ phi หรือรับรองกำลัง',
 'constructionLoads': 'TM-LD-001 §4: lift=1.5W; transport vertical=1.3W + horizontal=0.3W; demould=1.5W+1.0 kPa × face area; storage=W; erection=1.0 kPa ด้านข้าง',
 'serviceability': 'TM-DB-001 §5: benchmark uncracked EI, เปรียบเทียบ 5wL^4/(384EI); L/250 เป็นเกณฑ์ทดสอบเท่านั้น; creep/shrinkage/crack width ยังไม่คำนวณ',
 'memberType': 'IFC: TM-W01–04 ผนัง 200 mm สูง 3000 mm; TM-S01 พื้น 6200×3200×300 mm; แยกหล่อ 5 ชิ้น สมมติฐานรอยต่อยังไม่อนุมัติ',
 'prestress': 'TEST ASSUMPTION: ไม่อัดแรง; เหล็กทดลอง DB10@200 สองหน้า/สองทิศผนัง และ DB12@200 สองชั้น/สองทิศพื้น ไม่ใช่ผลออกแบบ',
 'demould': 'TM-LD-001 §4: สมมติหล่อแนวราบ ยกพร้อมกันก่อนพลิก; fc=20 MPa; แรงติดแบบสมมติ 1.0 kPa ต้องทดสอบจริงก่อนเลือกอุปกรณ์',
 'lifting': 'TM-LD-001 §4: สมมติ 4 จุด แต่รับแรงมีประสิทธิผล 2 จุด มุมสลิง 30° จากแนวดิ่ง; T=1.5W/(2cos30°); ยังไม่กำหนดตำแหน่ง/รุ่น anchor จึงห้ามยกจริง',
 'liftFactor': '1.5', 'transportFactor': '1.3',
 'handlingSource': 'TM-LD-001 R1 §4: ค่าตั้งโจทย์จำลอง ไม่ใช่ค่าผู้ผลิต; lifting insert capacity/edge distance/breakout ต้องใช้คู่มือและผลตรวจจริง',
 'transport': 'TEST ASSUMPTION: กำหนด bearing lines ที่ 0.2L และ 0.8L; ผนังขนด้วย A-frame; horizontal=0.3W; ไม่มีการตรวจรถ/สายรัด/เสถียรภาพจริง',
 'storage': 'TEST ASSUMPTION: เก็บชั้นเดียว จุดรองแนวเดียวกับตอนขนส่ง ผนังยึด A-frame; ยังไม่อนุญาตซ้อนชิ้นงาน',
 'installation': 'TEST ASSUMPTION: พื้น → ผนัง W02/W04 → W01/W03; ผนังมีค้ำยันสองชุดต่อชิ้น; ทดสอบ grout 25 MPa ก่อนถอดค้ำ แต่ต้องให้วิศวกรตรวจแรงค้ำและลำดับจริง',
 'connections': 'TEST ASSUMPTION: bearing grout + dowel/sleeve ผนัง-พื้น และรอยต่อผนัง-ผนัง; ยังไม่มีขนาด/กำลัง/ใบรับรอง จัดเป็น NOT_CHECKED และบล็อกส่งผลิต',
 'loadPath': 'Benchmark: พื้น strip 1 m รองรับสองด้านช่วง 3.0 m (เส้นกึ่งกลางผนัง); global module/load path/diaphragm/connection stiffness ยังไม่วิเคราะห์',
 'tolerances': 'TEST ASSUMPTION: ขนาด ±5 mm, ติดตั้ง ±10 mm; nominal joint 20 mm ยังไม่หักจาก geometry IFC; bearing trial 100 mm ต้องตรวจจริงและแก้โมเดลก่อนผลิต',
 'unitSource': 'TM-DB-001 §6: geometry m, drawings mm, force kN, moment kN·m, stress MPa=N/mm², density kg/m³, g=9.80665 m/s²; 1 MPa=1000 kN/m²; IFC mm → m factor 0.001',
}
def standard(category, code, edition, scope, source, clause, applicability='required', reason=''):
 return dict(category=category, code=code, edition=edition, amendment='ฉบับฐานสำหรับทะเบียนทดสอบ; ต้องตรวจ amendments ก่อนใช้จริง', scope=scope, source=source, clause=clause, applicability=applicability, reason=reason)
standards = [
 standard('regulatory','กฎกระทรวงออกแบบโครงสร้างอาคารและวัสดุ','พ.ศ. 2566','อ้างอิงประเทศไทย ต้องพิจารณาการใช้กับพื้นที่จริง','https://ratchakitcha.soc.go.th/documents/140A054N0000000000400.pdf','ทะเบียนเอกสารระดับทั้งฉบับ; ยังไม่ได้รับรอง compliance รายข้อ'),
 standard('concrete','ACI CODE-318','2025','ฐานอ้างอิงคอนกรีต; solver นี้ยังไม่ verified ตาม Code','https://www.concrete.org/topicsinconcrete/topicdetail.aspx?search=318-25','บท 4–6 ข้อกำหนดโครงสร้าง แรง และการวิเคราะห์; ต้องตรวจฉบับเต็มก่อนออกแบบ'),
 standard('precast','ACI/PCI CODE-319','2025','พรีคาสท์ ใช้ร่วมกับ ACI 318-25','https://www.concrete.org/Portals/0/Files/PDF/Previews/319-25_preview.pdf','บท 4–6; ทะเบียนอ้างอิง ไม่ใช่หลักฐานผ่านทุกข้อ'),
 standard('thaiConcrete','วสท. 011008-21','2021','เอกสารเสริม รอผู้ตรวจเลือกข้อให้สอดคล้องกับ ACI หลัก','https://eit.or.th/api/public/file/book/173','ไม่ใช้สมการ วสท. ผสมกับ ACI ใน benchmark นี้'),
 standard('guidance','PCI Design Handbook','8th edition (2017)','คู่มือเสริมในทะเบียน ยังไม่ใช้ capacity table','https://www.pci.org','ไม่ได้อ้างตารางกำลังหรือรายละเอียดอุปกรณ์ในตัวอย่างนี้'),
 standard('loading','TM-LD-001 — benchmark load protocol','R1 (2026)','โจทย์น้ำหนักทดสอบเท่านั้น ไม่แทนมาตรฐานน้ำหนักของอาคารจริง','Test-Module-Report.html#loads','§1–4: gravity, lateral, combinations, lifecycle'),
 standard('wind','TM-LD-001 benchmark','R1 (2026)','ทดสอบการเก็บแรงด้านข้าง ±1.0 kPa','Test-Module-Report.html#loads','§2; ไม่มีการหาความเร็วลมออกแบบ'),
 standard('seismic','TM-LD-001 benchmark','R1 (2026)','ทดสอบ load case ±0.10W','Test-Module-Report.html#loads','§2; ไม่ใช่การวิเคราะห์แผ่นดินไหวตาม Code'),
]
criteria = dict(schemaVersion='1.0', presetId='test-module-v1', standards=standards, values=v)

# Genuine Euler-Bernoulli FE benchmark, independent closed-form reference.
L, E, I = 3.0, 28e6, 1 * .3**3 / 12
q = .3 * 2400 * 9.80665 / 1000 + 1 + 2
exact = 5*q*L**4/(384*E*I)
runs=[]
for n in (2,4,8):
 le=L/n; K=np.zeros((2*(n+1),2*(n+1))); F=np.zeros(2*(n+1))
 k=E*I/le**3*np.array([[12,6*le,-12,6*le],[6*le,4*le**2,-6*le,2*le**2],[-12,-6*le,12,-6*le],[6*le,2*le**2,-6*le,4*le**2]])
 for j in range(n):
  ids=np.arange(2*j,2*j+4); K[np.ix_(ids,ids)]+=k; F[ids]+=q*le/2*np.array([1,le/6,1,-le/6])
 free=np.array([i for i in range(len(F)) if i not in (0,2*n)])
 u=np.zeros_like(F); u[free]=np.linalg.solve(K[np.ix_(free,free)],F[free]); R=K@u-F
 runs.append(dict(elements=n, deflectionMm=float(u[n]*1000), relativeError=float(abs(u[n]-exact)/exact), reactionLeftKn=float(-R[0]), reactionRightKn=float(-R[2*n]), balanceErrorKn=float(abs(-R[0]-R[2*n]-q*L))))
analysis=dict(method='Euler–Bernoulli 1D linear elastic beam FE; simply supported slab strip, not global shell FEM', spanM=L, stripWidthM=1, thicknessM=.3, elasticModulusMpa=28000, inertiaM4=I, serviceLineLoadKnM=q, exactDeflectionMm=exact*1000, exactMomentKnm=q*L**2/8, exactReactionKn=q*L/2, runs=runs, status='BENCHMARK_ONLY', globalModuleStatus='NOT_CHECKED', exclusions=['รอยต่อและแรงผนังลงพื้น','ผนังมีช่องเปิดและเสถียรภาพรวม','cracked EI / creep / shrinkage','แรงลม แผ่นดินไหว และช่วงยกใน solver'])
panels=[]
for el in model['elements']:
 weight=el['volumeM3']*2400*9.80665/1000
 panels.append(dict(id=el['id'], volumeM3=el['volumeM3'], massKg=el['volumeM3']*2400, weightKn=weight, liftSlingDemandKn=1.5*weight/(2*math.cos(math.pi/6)), transportVerticalKn=1.3*weight, transportHorizontalKn=.3*weight, anchorCapacityStatus='NOT_CHECKED'))
total=model['totalVolumeM3']
boq=[dict(item='คอนกรีตสุทธิ + เผื่อ 3%', basis='IFC net volume × 1.03', quantity=total*1.03, unit='m³', rate=3450, kind='IFC + TEST allowance'),
 dict(item='เหล็กเสริมสำรองประมาณราคา',basis='สมมติ 80 kg/m³ ไม่ใช่ BBS',quantity=total*80,unit='kg',rate=28,kind='TEST ASSUMPTION'),
 dict(item='อุปกรณ์ยกสำรองประมาณราคา',basis='สมมติ 4 จุด × 5 ชิ้น ยังไม่ได้เลือกผลิตภัณฑ์',quantity=20,unit='จุด',rate=650,kind='TEST ASSUMPTION'),
 dict(item='ขนส่งและติดตั้งสำรองประมาณราคา',basis='สมมติ 1 โมดูล ยังไม่มีใบเสนอราคา',quantity=1,unit='ชุด',rate=18000,kind='TEST ASSUMPTION')]
for row in boq: row['amountThb']=round(row['quantity']*row['rate'],2)
cost=dict(currency='THB', priceBook='TM-PB-001 R1 — ราคาจำลอง ไม่รวม VAT/แบบหล่อ/grout/ค้ำยัน/แรงงานผลิต/กำไร', rows=boq, totalThb=round(sum(r['amountThb'] for r in boq),2), status='PARTIAL_SCOPE_TEST_ESTIMATE')
issues=[
 dict(id='TM-01',subject='แหล่ง Revit',detail='อ่าน RVT/IFC และตรวจ checksum แล้ว แต่ยังไม่เปิด/นำ DXF กลับเข้า Native Revit เพื่อตรวจ acceptance',status='NOT_TESTED'),
 dict(id='TM-02',subject='สถานที่/มาตรฐานแรง/วัสดุ',detail='ค่าทดสอบไม่มีพื้นที่จริงหรือผลทดสอบวัสดุ จึงต้องจัดทำ Design Basis จริงก่อนใช้งาน',status='NOT_VERIFIED'),
 dict(id='TM-03',subject='ช่องประตูและระดับ',detail='ประตู nominal 750×2000 mm แต่ opening IFC 850×2100 mm; L2=3600 mm ขณะที่ผนังสูง3000 mm เก็บตาม source ไม่แก้เงียบ',status='REVIEW_REQUIRED'),
 dict(id='TM-04',subject='ระบบและรอยต่อ',detail='IFC ไม่มีหลังคา/รอยต่อ/anchor/rebar; ยังไม่ได้หัก joint gap 20 mm จากชิ้นงาน ต้อง detail และแก้ source ก่อนผลิต',status='NOT_CHECKED'),
 dict(id='TM-05',subject='ผลออกแบบ',detail='ทดสอบเฉพาะ FE strip; full module, strength, shear, crack, seismic, connections และ lifting capacity ยังไม่ verified',status='NOT_CHECKED'),
 dict(id='TM-06',subject='การอนุมัติ',detail='Shared draft ไม่มีบัญชีผู้ตรวจอิสระและ release authority สำหรับโครงการนี้; เก็บเป็นตัวอย่าง ห้ามส่งผลิต',status='BLOCKED'),
]
stage_specs=[
 ('intake','G0','รับ Revit / IFC','ตรวจ hash, IFC schema, units, GUID, geometry 5 ชิ้น และช่องเปิด 3 จุด','7 geometry assertions ใน ifc-model.json; RVT hash ใน source register'),
 ('criteria','G1','Design Criteria','ตรวจครบ 8 หมวดมาตรฐานและ 37 ช่อง โดยทุกค่าตัวเลขที่ไม่ได้มาจาก IFC มี assumption register','criteria.json; schema/readiness automated test'),
 ('panel','G2','แบ่งชิ้นงาน','5 element IDs จับคู่ GUID/Revit ID; ปริมาตรสุทธิรวม16.179m³','ifc-model.json; TM-W01–W04 และ TM-S01'),
 ('loads','G3','แรงและจุดรองรับ','แปลงมวล→แรง; จัด load case/lifecycle และสมมติฐานรองรับ','sample.json panels; TM-LD-001 §1–4'),
 ('analysis','G3','วิเคราะห์ FEM','แก้ FE strip 2/4/8 elements และเทียบ analytical deflection/reactions','benchmark.json; relative error <1e-9, equilibrium residual <1e-8 kN'),
 ('design','G4','ออกแบบเหล็ก','แสดง trial reinforcement และป้องกันการแสดง structural PASS โดยไม่มีวิธี verified','component test: NOT_CHECKED; issue register TM-04/TM-05'),
 ('cost','G5','BOQ & Estimate','ถอดคอนกรีตจริง ระบุ allowance/rate ทดสอบ และรวมยอดตรงกัน','Test-Module-BOQ.csv; automated sum test'),
 ('report','G6','รายการคำนวณ','รายงานย้อนถึง source/criteria/benchmark/ข้อค้างพร้อมตรา TEST ONLY','Test-Module-Report.html; manifest.json'),
 ('shop','G6','Drawing & Export','แบบ geometry 5 แผ่น SVG/DXF หน่วยmm พร้อมช่องเปิดจริง และตรวจ round-trip DXF','drawings/*.svg, *.dxf; ไม่มี rebar/anchor detail; Native Revit ยัง NOT_TESTED'),
 ('release','G7','ส่งผลิตและประวัติ','ตรวจครบ artifacts/hash และบล็อกส่งผลิตเพราะ engineering ยังไม่อนุมัติ','manifest.json; disabled release action; ไม่มี production package ที่อนุมัติ'),
]
stages=[dict(sequence=f'G{i}', menu=s[0], gate=s[1], title=s[2], procedure=s[3], evidence=s[4], engineeringStatus='BLOCKED' if i==9 else 'NOT_APPROVED') for i,s in enumerate(stage_specs)]
sample=dict(id='p-test-module', version='TM-R1', name='Test Module', purpose='โครงการตัวอย่างคงไว้เพื่อทดสอบและสอนงาน — TEST ONLY / NOT FOR CONSTRUCTION', criteria=criteria, model=model, panels=panels, analysis=analysis, cost=cost, issues=issues, stages=stages,
 source=dict(ifc=model['sourceFile'],ifcSha256=model['sourceSha256'],revit='Precast_Module_Test.rvt',revitSha256='b56c98c0c8279ca2a95d3b01f121d4d0aa63aae3b516cfb63c55c528cbcb0a7a', nativeRevitStatus='NOT_TESTED', intakeStatus='LOCAL_PARSE_VERIFIED; NOT_CONTROLLED_ACCEPTANCE'),
 assumptions=dict(document='TM-DB-001 R1', allNumericCriteriaAreTestAssumptions=True, geometryOrigin='IFC local extraction', loads='TM-LD-001 R1', priceBook='TM-PB-001 R1', criteriaApproval='NOT_APPROVED', retention='เก็บเป็นโครงการตัวอย่าง ไม่ลบหลังทดสอบ'),
 release=dict(status='BLOCKED',canRelease=False,reason='ไม่มี approved design checks / independent technical approval / Revit import verification',packageType='TEST_ARTIFACTS_ONLY'))
def write_json(path, data): path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
for name,data in [('sample.json',sample),('criteria.json',criteria),('benchmark.json',analysis),('ifc-model.json',model)]:
 write_json(PUBLIC/name,data)
write_json(OUT/'sample.json',sample)

def outline(el):
 axis=0 if el['maxM'][0]-el['minM'][0] > el['maxM'][1]-el['minM'][1] else 1
 yaxis=2 if el['kind']=='wall' else 1
 if el['kind']=='slab': axis=0
 width=(el['maxM'][axis]-el['minM'][axis])*1000; height=(el['maxM'][yaxis]-el['minM'][yaxis])*1000
 holes=[((o['minM'][axis]-el['minM'][axis])*1000,(o['minM'][yaxis]-el['minM'][yaxis])*1000,(o['maxM'][axis]-o['minM'][axis])*1000,(o['maxM'][yaxis]-o['minM'][yaxis])*1000) for o in el['openings']]
 return width,height,holes
def dxf_rect(x,y,w,h,layer):
 return '\n'.join(['0','LWPOLYLINE','8',layer,'100','AcDbEntity','100','AcDbPolyline','90','4','70','1']+[str(z) for px,py in [(x,y),(x+w,y),(x+w,y+h),(x,y+h)] for z in (10,round(px,4),20,round(py,4))])+'\n'
drawdir=PUBLIC/'drawings'; drawdir.mkdir(exist_ok=True)
combined='0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'
for panel_index,el in enumerate(model['elements']):
 width,height,holes=outline(el)
 rectangles=[(0,0,width,height)]+holes
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-500 -800 {width+1000} {height+1600}"><rect x="-500" y="-800" width="{width+1000}" height="{height+1600}" fill="white"/><g fill="none" stroke="#17374c" stroke-width="12">'
 for x,y,w,h in rectangles: svg+=f'<rect x="{x}" y="{height-y-h}" width="{w}" height="{h}"/>'
 svg+=f'</g><g font-family="Arial" font-size="130" fill="#17374c"><text x="0" y="-420">{el["id"]} | {"ELEVATION" if el["kind"]=="wall" else "PLAN"} | t={el["thicknessM"]*1000:.0f} mm</text><text x="0" y="-180">{width:.0f} x {height:.0f} mm | V={el["volumeM3"]:.3f} m3</text><text x="0" y="{height+300}" fill="#b33a20">TEST ONLY - NO REBAR / ANCHOR DESIGN</text><text x="0" y="{height+550}">IFC GUID {el["globalId"]}</text></g></svg>'
 (drawdir/f'{el["id"]}.svg').write_text(svg,encoding='utf-8')
 dxf='0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'
 for i,(x,y,w,h) in enumerate(rectangles): dxf+=dxf_rect(x,y,w,h,'OUTLINE' if i==0 else 'OPENING')
 for y,txt in [(-350,f'{el["id"]} | mm | t={el["thicknessM"]*1000:.0f}'),(-600,'TEST ONLY - NOT FOR PRODUCTION - NO REBAR OR ANCHOR DESIGN')]:
  dxf+=f'0\nTEXT\n100\nAcDbEntity\n8\nTEST_NOTE\n100\nAcDbText\n10\n0\n20\n{y}\n30\n0\n40\n120\n1\n{txt}\n'
 dxf+='0\nENDSEC\n0\nEOF\n'; (drawdir/f'{el["id"]}.dxf').write_text(dxf,encoding='ascii',newline='\n')
 ox=(panel_index%2)*8000; oy=-(panel_index//2)*5000
 for i,(x,y,w,h) in enumerate(rectangles): combined+=dxf_rect(x+ox,y+oy,w,h,'OUTLINE' if i==0 else 'OPENING')
 for y,txt in [(-350,f'{el["id"]} | {width:.0f} x {height:.0f} mm | t={el["thicknessM"]*1000:.0f}'),(-600,'TEST ONLY - NO REBAR / ANCHOR DESIGN')]:
  combined+=f'0\nTEXT\n100\nAcDbEntity\n8\nTEST_NOTE\n100\nAcDbText\n10\n{ox}\n20\n{oy+y}\n30\n0\n40\n120\n1\n{txt}\n'
(drawdir/'Test-Module-All.dxf').write_text(combined+'0\nENDSEC\n0\nEOF\n',encoding='ascii',newline='\n')

csvio=io.StringIO(); writer=csv.writer(csvio,lineterminator='\n'); writer.writerow(['TEST ONLY - PARTIAL SCOPE ESTIMATE - THB']); writer.writerow(['Item','Basis','Quantity','Unit','Rate THB','Amount THB','Provenance'])
for row in boq: writer.writerow([format(row[k],'.8g') if isinstance(row[k],float) else row[k] for k in ('item','basis','quantity','unit','rate','amountThb','kind')])
writer.writerow(['TOTAL (exclusions in report)','','','','',cost['totalThb']]); (PUBLIC/'Test-Module-BOQ.csv').write_text(csvio.getvalue(),encoding='utf-8-sig',newline='\n')
esc=lambda x:html.escape(format(x, '.8g') if isinstance(x,float) else str(x))
def table(headers,rows): return '<table><thead><tr>'+''.join(f'<th>{esc(h)}</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join(f'<td>{esc(c)}</td>' for c in row)+'</tr>' for row in rows)+'</tbody></table>'
report='''<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Test Module — R1</title><style>body{font:16px/1.6 Tahoma,sans-serif;color:#17374c;max-width:1100px;margin:32px auto;padding:24px}h1,h2{line-height:1.25}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border:1px solid #ccd6de;padding:10px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#edf3f5}aside{background:#fff0e9;border-left:5px solid #d75429;padding:20px}code{overflow-wrap:anywhere}img{width:100%;max-height:550px}a{color:#086794}@media print{body{font-size:10pt;margin:0}h2{break-after:avoid}tr{break-inside:avoid}img{max-height:180mm}.sheet{break-before:page}}</style><h1>Test Module</h1><p>TM-R1 · retained reference project · Source Revit 2026.4 / IFC2X3</p><aside><b>TEST ONLY — ห้ามใช้ก่อสร้างหรือส่งผลิต</b><p>ข้อมูลเรขาคณิตจาก IFC จริง; วัสดุ แรง รอยต่อ และราคาเป็นสมมติฐานทดสอบ ไม่ใช่ผลรับรองตาม Code ไม่มีการอนุมัติทางวิศวกรรม</p></aside>'''
report+='<h2>1. Source / หน่วย / ข้อสังเกต</h2>'+table(['รายการ','ค่า'],sample['source'].items())+table(['ID','GUID','ขนาด m','ปริมาตร m³','มวล kg (สมมติ rho=2400)'],[(e['id'],e['globalId'],f"{e['widthM']} × {e['heightM']} × {e['thicknessM']}",e['volumeM3'],p['massKg']) for e,p in zip(model['elements'],panels)])
report+='<h2>2. TM-DB-001 R1 / ทะเบียนมาตรฐาน</h2>'+table(['หมวด','รหัส / ฉบับ','ขอบเขต / ข้อ','แหล่งอ้างอิง'],[(s['category'],s['code']+' '+s['edition'],s['scope']+'; '+s['clause'],s['source']) for s in standards])
report+='<h2 id="loads">3. TM-LD-001 R1 / สมมติฐานและชุดน้ำหนัก</h2><p>§1 แรงถาวร/จร; §2 lateral benchmark; §3 SLS/ULS test; §4 handling; ทุกค่าทดสอบตามรายการต่อไปนี้</p>'+table(['Field','Value / provenance'],v.items())
report+='<h2>4. FE benchmark / ตรวจสมดุล</h2><p>Simply supported 1 m slab strip, L=3.0 m, h=0.3 m, E=28000 MPa, uncracked I=bh³/12; q='+f'{q:.8f} kN/m. wmax=5qL⁴/(384EI)={exact*1000:.8f} mm; Mmax=qL²/8={analysis["exactMomentKnm"]:.6f} kN·m. ไม่ได้วิเคราะห์โมดูลทั้งหลัง</p>'+table(['Elements','FE deflection mm','Relative error','R left kN','R right kN','Residual kN'],[[r[k] for k in ('elements','deflectionMm','relativeError','reactionLeftKn','reactionRightKn','balanceErrorKn')] for r in runs])
report+='<h2>5. Lifecycle demand (ไม่มีการตรวจ capacity)</h2>'+table(['ID','W kN','Sling demand kN','Transport vertical kN','Transport horizontal kN'],[[p[k] for k in ('id','weightKn','liftSlingDemandKn','transportVerticalKn','transportHorizontalKn')] for p in panels])
report+='<h2>6. TM-PB-001 R1 / BOQ ทดสอบ</h2><p>'+esc(cost['priceBook'])+'</p>'+table(['รายการ','ที่มา','ปริมาณ','หน่วย','ราคา','จำนวนเงิน THB'],[[r[k] for k in ('item','basis','quantity','unit','rate','amountThb')] for r in boq])+f'<p><b>รวมเฉพาะขอบเขตตัวอย่าง {cost["totalThb"]:,.2f} THB</b></p>'
report+='<h2>7. Test sequence G0–G9 / Gate mapping</h2><p>G0–G9 ในรายงานนี้คือลำดับทดสอบสิบเมนู; Gate ทางวิศวกรรมเดิมยังเป็น G0–G7 ผลทดสอบซอฟต์แวร์อยู่ใน TEST_RESULTS.md แยกจากการอนุมัติ</p>'+table(['ลำดับ','Gate จริง','รายการ','วิธี/หลักฐาน','Engineering'],[(s['sequence'],s['gate'],s['title'],s['procedure']+'; '+s['evidence'],s['engineeringStatus']) for s in stages])
report+='<h2>8. Issue register / Release decision</h2>'+table(['ID','เรื่อง','ข้อค้าง','สถานะ'],[[i[k] for k in ('id','subject','detail','status')] for i in issues])+'<p><b>RELEASE BLOCKED — retained test artifacts only</b></p>'
for el in model['elements']: report+=f'<div class="sheet"><h2>9. Geometry drawing {el["id"]}</h2><img src="drawings/{el["id"]}.svg" alt="{el["id"]} geometry"><p>DXF unit mm, outline/opening only; native Revit import NOT_TESTED.</p></div>'
report+='</html>'; (PUBLIC/'Test-Module-Report.html').write_text(report,encoding='utf-8')
files=[]
for p in sorted(PUBLIC.rglob('*')):
 if p.is_file() and p.name not in ('manifest.json','Test-Module.zip'):
  files.append(dict(path=p.relative_to(PUBLIC).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
write_json(PUBLIC/'manifest.json',dict(project='Test Module',version='TM-R1',packageType='TEST_ONLY',productionRelease=False,files=files))
with zipfile.ZipFile(PUBLIC/'Test-Module.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(PUBLIC.rglob('*')):
  if p.is_file() and p.suffix!='.zip': z.write(p,p.relative_to(PUBLIC))
print(json.dumps(dict(panels=len(panels),volumeM3=total,massKg=total*2400,criteriaFields=len(v),standards=len(standards),benchmarkMaxError=max(r['relativeError'] for r in runs),estimateThb=cost['totalThb'],artifacts=len(files)),indent=2))
