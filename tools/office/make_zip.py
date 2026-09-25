from pathlib import Path
import json,zipfile,hashlib
root=Path(r'E:\1.0 Project GPT Work\Precast-Module')
out=root/'deliverables/PPE_Modular_Office'
snapshot=root/'tools/office/package-snapshot.rvt'
rvtname='PPE_Engineering_Precast_Office_3x6_R2026.rvt'
data=snapshot.read_bytes()
assert data[:8]==bytes.fromhex('D0CF11E0A1B11AE1'),data[:16]
mp=out/'delivery-manifest.json'
manifest=json.loads(mp.read_text(encoding='utf-8'))
manifest['files'].insert(0,{'name':rvtname,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()})
mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
dest=out/'PPE_Engineering_Precast_Office_3x6_P01.zip'
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
    for info in manifest['files']:
        z.write(snapshot if info['name']==rvtname else out/info['name'],info['name'])
    z.write(mp,mp.name)
with zipfile.ZipFile(dest) as z:
    assert z.testzip() is None
    for info in manifest['files']:assert hashlib.sha256(z.read(info['name'])).hexdigest()==info['sha256']
    print(json.dumps({'zip':str(dest),'size':dest.stat().st_size,'files':z.namelist(),'rvtBytes':len(data)},ensure_ascii=False))
