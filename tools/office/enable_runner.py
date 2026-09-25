from pathlib import Path
root=Path(r'E:\1.0 Project GPT Work\Precast-Module')
button=root/'tools/pyrevit_extensions/PrecastModuleTools.extension/Precast Module.tab/BIM Export.panel/Build PPE Cafe.pushbutton/script.py'
backup=root/'tools/office/button-original.py'
if not backup.exists():backup.write_bytes(button.read_bytes())
prefix='''# -*- coding: utf-8 -*-
import os
_office=r'E:\\1.0 Project GPT Work\\Precast-Module\\tools\\office'
if os.path.isfile(os.path.join(_office,'run.flag')):
    _script=os.path.join(_office,'finalize_model.py' if open(os.path.join(_office,'run.flag')).read().strip()=='review' else 'build_model.py')
    exec(compile(open(_script).read(),_script,'exec'))
    raise SystemExit
'''
button.write_text(prefix+backup.read_text(encoding='utf-8-sig'),encoding='utf-8')
(root/'tools/office/run.flag').write_text('Build independent office document')
print('Office runner enabled; original button backed up.')
