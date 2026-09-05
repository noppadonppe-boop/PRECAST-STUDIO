"""Export the active Revit document as an IFC2x3 Coordination View test file."""

import os

from pyrevit import DB, forms, revit


OUTPUT_DIR = r"E:\1.0 Project GPT Work\Precast-Module"
OUTPUT_NAME = "Precast_Module_Test"

doc = revit.doc
if doc is None:
    forms.alert("Open the Precast_Module_Test Revit model before exporting.", exitscript=True)

if not os.path.isdir(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

options = DB.IFCExportOptions()
options.FileVersion = DB.IFCVersion.IFC2x3CV2
options.SpaceBoundaryLevel = 1
options.AddOption("ExportBaseQuantities", "true")
options.AddOption("ExportIFCCommonPropertySets", "true")
options.AddOption("ExportInternalRevitPropertySets", "true")
options.AddOption("UseActiveViewGeometry", "false")
options.AddOption("IncludeSiteElevation", "true")
options.AddOption("StoreIFCGUID", "true")

transaction = DB.Transaction(doc, "Export IFC test model")
transaction.Start()
try:
    exported = doc.Export(OUTPUT_DIR, OUTPUT_NAME, options)
    transaction.Commit()
except Exception:
    if transaction.HasStarted():
        transaction.RollBack()
    raise

if not exported:
    raise RuntimeError("Revit reported that IFC export did not complete.")

forms.alert(
    "IFC export complete:\n{}".format(os.path.join(OUTPUT_DIR, OUTPUT_NAME + ".ifc")),
    title="Precast Module IFC Export",
)
