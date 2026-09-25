"""Independent read-back checks of retained geometry drawings and artifact hashes."""
from pathlib import Path
import json, hashlib, math, zipfile
import ezdxf

ROOT=Path(__file__).resolve().parents[2]
PUBLIC=ROOT/'apps/web/public/samples/test-module'
sample=json.loads((PUBLIC/'sample.json').read_text(encoding='utf-8'))
manifest=json.loads((PUBLIC/'manifest.json').read_text(encoding='utf-8'))
results=[]
def check(name, passed):
 results.append(dict(test=name,passed=bool(passed)))
 if not passed: raise AssertionError(name)
check('source-ifc-sha256',hashlib.sha256((ROOT/sample['source']['ifc']).read_bytes()).hexdigest()==sample['source']['ifcSha256'])
for f in manifest['files']:
 p=PUBLIC/f['path']; check('sha256:'+f['path'],p.stat().st_size==f['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256'])
for el in sample['model']['elements']:
 path=PUBLIC/'drawings'/f'{el["id"]}.dxf'; drawing=ezdxf.readfile(path); audit=drawing.audit()
 check(el['id']+':dxf-audit',not audit.errors and not audit.fixes)
 check(el['id']+':mm-units',drawing.units==4)
 polylines=list(drawing.modelspace().query('LWPOLYLINE'))
 check(el['id']+':outline-openings-count',len(polylines)==1+len(el['openings']) and all(p.closed for p in polylines))
 areas=[]
 for p in polylines:
  pts=list(p.get_points('xy')); area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(pts,pts[1:]+pts[:1])))/2
  areas.append(area)
 area_m2=(areas[0]-sum(areas[1:]))/1e6
 check(el['id']+':net-volume-roundtrip',math.isclose(area_m2*el['thicknessM'],el['volumeM3'],abs_tol=1e-7))
 check(el['id']+':test-watermark',any('TEST ONLY' in e.dxf.text for e in drawing.modelspace().query('TEXT')))
combined=ezdxf.readfile(PUBLIC/'drawings/Test-Module-All.dxf')
check('combined-dxf-five-outlines-three-openings',len(combined.modelspace().query('LWPOLYLINE'))==8 and not combined.audit().errors)
with zipfile.ZipFile(PUBLIC/'Test-Module.zip') as z:
 for f in manifest['files']: check('zip:'+f['path'],hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256'])
check('release-remains-blocked',sample['release']['canRelease'] is False and manifest['productionRelease'] is False)
result=dict(checks=len(results),passed=sum(r['passed'] for r in results),results=results,nativeRevitImport='NOT_TESTED')
(ROOT/'samples/test-module/artifact-verification.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='results'}))
