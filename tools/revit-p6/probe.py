# -*- coding: utf-8 -*-
import clr, os, json, traceback
clr.AddReference('RevitAPI')
from Autodesk.Revit import DB
ROOT = r'E:\1.0 Project GPT Work\Precast-Module'
out = os.path.join(ROOT, 'output', 'revit-p6')
if not os.path.isdir(out): os.makedirs(out)
try:
    app = __revit__.Application
    doc = app.NewProjectDocument(DB.UnitSystem.Metric)
    result = {'version': app.VersionNumber, 'build': app.VersionBuild, 'newDocument': doc.Title}
    opt = DB.SaveAsOptions()
    doc.SaveAs(os.path.join(out, 'probe.rvt'), opt)
    doc.Close(False)
    with open(os.path.join(out, 'probe.json'), 'w') as f: json.dump(result, f)
except:
    with open(os.path.join(out, 'probe-error.txt'), 'w') as f: f.write(traceback.format_exc())
    raise
