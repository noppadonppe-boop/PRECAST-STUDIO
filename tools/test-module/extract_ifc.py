"""Extract only source-derived geometry for the retained Test Module example.

Run with IfcOpenShell 0.8.3.post2. This is a local geometry check, not a malware
scanner, Revit API integration, or a structural-code verification service.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.util.placement
import ifcopenshell.util.unit

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "Precast_Module_Test.ifc"
OUT = ROOT / "samples" / "test-module"
OUT.mkdir(parents=True, exist_ok=True)
model = ifcopenshell.open(str(SOURCE))
settings = ifcopenshell.geom.settings()
settings.set(settings.USE_WORLD_COORDS, True)
unit_scale = ifcopenshell.util.unit.calculate_unit_scale(model)

def geometry(element):
    shape = ifcopenshell.geom.create_shape(settings, element)
    verts = np.array(shape.geometry.verts).reshape(-1, 3)
    faces = np.array(shape.geometry.faces).reshape(-1, 3)
    a, b, c = verts[faces[:, 0]], verts[faces[:, 1]], verts[faces[:, 2]]
    signed = np.einsum('ij,ij->i', a, np.cross(b, c)) / 6
    signed_volume = float(signed.sum())
    center = (signed[:, None] * (a + b + c) / 4).sum(axis=0) / signed_volume
    return {"verticesM": verts.round(8).ravel().tolist(), "triangles": faces.ravel().tolist(),
            "minM": verts.min(axis=0).round(8).tolist(), "maxM": verts.max(axis=0).round(8).tolist(),
            "volumeM3": round(abs(signed_volume), 9), "centroidM": center.round(8).tolist()}

elements = []
for i, element in enumerate(sorted(model.by_type('IfcWall'), key=lambda x: x.Tag or x.GlobalId) + model.by_type('IfcSlab')):
    mesh = geometry(element)
    size = np.array(mesh['maxM']) - np.array(mesh['minM'])
    wall = element.is_a('IfcWall')
    holes = []
    for relation in getattr(element, 'HasOpenings', []):
        opening = relation.RelatedOpeningElement
        g = geometry(opening)
        fills = [r.RelatedBuildingElement for r in opening.HasFillings]
        holes.append({"globalId": opening.GlobalId, "minM": g['minM'], "maxM": g['maxM'],
                      "fillType": fills[0].is_a() if fills else 'Unfilled', "fillGlobalId": fills[0].GlobalId if fills else ''})
    elements.append({"id": f"TM-W{i+1:02d}" if wall else "TM-S01", "globalId": element.GlobalId,
                     "revitElementId": element.Tag, "ifcClass": element.is_a(), "name": element.Name,
                     "kind": 'wall' if wall else 'floor', "widthM": round(max(size[:2]), 8),
                     "heightM": round(size[2] if wall else min(size[:2]), 8),
                     "thicknessM": round(min(size[:2]) if wall else size[2], 8),
                     "openings": holes, **mesh})

guids = [x.GlobalId for x in model.by_type('IfcRoot')]
counts = {name: len(model.by_type(name)) for name in ['IfcWall', 'IfcSlab', 'IfcDoor', 'IfcWindow', 'IfcOpeningElement']}
checks = [
    {"id": 'schema', "passed": model.schema == 'IFC2X3', "actual": model.schema},
    {"id": 'units', "passed": unit_scale == .001, "actual": unit_scale},
    {"id": 'unique-globalids', "passed": len(guids) == len(set(guids)), "actual": len(guids) - len(set(guids))},
    {"id": 'element-counts', "passed": list(counts.values()) == [4, 1, 1, 2, 3], "actual": counts},
    {"id": 'positive-solid-volumes', "passed": all(x['volumeM3'] > 0 for x in elements), "actual": [x['volumeM3'] for x in elements]},
    {"id": 'floor-volume', "passed": abs(elements[-1]['volumeM3'] - 5.952) < 1e-6, "actual": elements[-1]['volumeM3']},
    {"id": 'wall-thickness', "passed": all(abs(x['thicknessM'] - .2) < 1e-6 for x in elements if x['kind'] == 'wall'), "actual": .2},
]
result = {"schemaVersion": '1.0', "sourceFile": SOURCE.name, "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
          "authoringApplication": 'Autodesk Revit 2026.4', "parser": f'IfcOpenShell {ifcopenshell.version}',
          "sourceSchema": model.schema, "sourceLengthUnit": 'mm', "geometryUnit": 'm', "counts": counts,
          "levels": [{"name": x.Name, "elevationM": x.Elevation * unit_scale} for x in model.by_type('IfcBuildingStorey')],
          "elements": elements, "totalVolumeM3": round(sum(x['volumeM3'] for x in elements), 9), "checks": checks,
          "notes": ['Geometry extracted from the supplied IFC; native RVT was not edited.', 'Revit default Boston geolocation is not adopted as a design site.', 'Generic wall/floor materials do not certify concrete properties or reinforcement.', 'Coordinates retain the IFC internal origin; no surveyed position is claimed.']}
(OUT / 'ifc-model.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({"elements": [{k: x[k] for k in ['id','widthM','heightM','thicknessM','volumeM3','centroidM']} for x in elements], "checks": checks, "totalVolumeM3": result['totalVolumeM3']}, ensure_ascii=True))
if not all(x['passed'] for x in checks):
    raise SystemExit('Source geometry verification failed')
