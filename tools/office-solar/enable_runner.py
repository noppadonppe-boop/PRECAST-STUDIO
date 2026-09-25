from pathlib import Path
root=Path(r'E:\1.0 Project GPT Work\Precast-Module')
button=root/'tools/pyrevit_extensions/PrecastModuleTools.extension/Precast Module.tab/BIM Export.panel/Build PPE Cafe.pushbutton/script.py'
backup=root/'tools/office-solar/button-original.py'
if not backup.exists():backup.write_bytes(button.read_bytes())
prefix='''# -*- coding: utf-8 -*-
_solar=r'E:\\1.0 Project GPT Work\\Precast-Module\\tools\\office-solar\\build_solar.py'
exec(compile(open(_solar).read(),_solar,'exec'))
raise SystemExit
'''
button.write_text(prefix,encoding='utf-8')
print('Shed solar runner enabled')
