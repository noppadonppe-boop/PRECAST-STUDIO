# -*- coding: utf-8 -*-
"""Export the active document for Precast Studio. Never overwrite or save the RVT."""
import os
import datetime
from pyrevit import DB, forms, revit

doc = revit.doc
if doc is None or doc.IsFamilyDocument:
    forms.alert('Open a Revit project (.rvt) before exporting.', exitscript=True)
folder = forms.pick_folder(title='Choose a folder for the IFC export')
if not folder:
    raise SystemExit
name = os.path.splitext(os.path.basename(doc.PathName))[0] if doc.PathName else doc.Title
name = ''.join('_' if c in '<>:"/\\|?*' else c for c in name)
name += '_' + datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f')
options = DB.IFCExportOptions()
options.FileVersion = DB.IFCVersion.IFC2x3CV2
options.SpaceBoundaryLevel = 1
options.AddOption('ExportBaseQuantities', 'true')
options.AddOption('ExportIFCCommonPropertySets', 'true')
options.AddOption('ExportInternalRevitPropertySets', 'true')
options.AddOption('UseActiveViewGeometry', 'false')
options.AddOption('IncludeSiteElevation', 'true')
transaction = DB.Transaction(doc, 'Export BIM for Precast Studio')
transaction.Start()
try:
    exported = doc.Export(folder, name, options)
finally:
    if transaction.HasStarted():
        transaction.RollBack()
if not exported:
    raise RuntimeError('Revit did not complete the IFC export.')
forms.alert('IFC exported:\n{}\n\nReturn to Precast Studio > BIM intake, select the matching RVT revision and upload this IFC.\nIf the active document has unsaved edits, the export includes those edits; save a matching RVT copy separately before pairing.'.format(os.path.join(folder, name + '.ifc')), title='Precast Studio BIM Export')
