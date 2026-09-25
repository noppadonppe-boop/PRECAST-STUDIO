# P126 — Type I / A B D analytical shell geometry expansion

Concrete progress independent of pending code/material/site decisions: twelve Type-I products, four uses per profile, each with eight actual shell instances. Total96 wall-roof pieces, geometry-only STD and JSON per product. No supports, loads, analysis or design commands are supplied in these geometry files.

## Source and geometry

P36 product model is the positioning/opening source; P08 Typical register is the profile/thickness source. Hashes are recorded and matched. Only axis-Y Type I shells are supported in this generator; no claim of L/U support or full-building conversion.

- A: intersection of half-thickness wall and sloping roof surfaces using the actual normal-thickness vertical drop.
- B: middle circular radius3825mm from P08 outer3900/inner3750 centered at sourceXZ(1500,-900); intersect wall midplaneX75. Shoulder remains a kink, not an invented tangent/rounded corner.
- D: inclined wall midsurface derived from normal150mm thickness (horizontal thickness is not150mm), intersect roof midsurfaceZ2925.
- RH mirrored with incidence reversal; STD coordinate reflection uses reversed incidences.
- Opening Y/Z bounds read per instance from P36, including use4 differences; cut across wall surface, not assumed identical to C geometry.

## Checks completed

Each shell's area×150mm is compared to source concrete mass/2400. Maximum relative volume difference: A/D numerical roundoff, B0.000022083 (0.0022083%), below0.2% geometry-study tolerance.
Every product passed the existing topology/opening checker with zero defects and zero edge-ratio flags. Maximum edge ratio3.260. Checks cover convex planar elements, incidence orientation, nonmanifold edges, boundary hanging nodes and opening overlap; they do not prove Jacobian/convergence or capacity.
Modified checker reads mesh.sourcePath when present and retains old I-C1 default for historical meshes.

## Evidence

- `tools/modular-program/stage7-abd-shell-mesh-p126.mjs`
- `output/staad-p7-p126/index.json`
- Twelve product folders contain shell-mesh.json, geometry-only STD and mesh-quality.json.

## Still required

Floors/end panels/beam seats/supports and connection behavior must be integrated. Type L/U node geometry and other profiles/products remain in scope. No full-building analysed-product count increased: final analysis0/48, RC0/48. Stage7 remains5% on full P105 gates; this is partial progress toward analytical geometry, not a revised scope or final native model delivery.
Engineering and production release remain false. No Stage8 work.
