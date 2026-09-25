# Prestress elastic screening v1

Open **Design Criteria → พรีคาสท์และการติดตั้ง → คำนวณคอนกรีตอัดแรง** and enable the calculation. Enter the member/revision/load-combination reference, all numeric inputs (zero for unused losses), sources for materials/losses/limits, and confirm the model assumptions. Update the existing concrete/reinforcement description if it previously said non-prestressed. Save with the existing Design Basis draft button. The optional `prestressCalculation` object survives schema parsing and revision saving; legacy criteria remain compatible.

Results recalculate from current inputs. Analysis, design and report pages display the same calculation from their Design Basis data; the JSON download includes the criteria, inputs, method version, results, sources and exclusions. In fixture mode edits are temporary. In shared mode use explicit Save before leaving. The JSON export can contain unsaved edits and is labelled a draft. Retained TM-R1 results/downloads remain historical and are marked OUT OF DATE when prestress is enabled. The controlled backend benchmark and its release checks do not consume these elastic results.

## Model and equations

One solid rectangular gross section, simply supported span, straight tendon with constant eccentricity and uniform prestress, uniform downward line load. Only midspan stresses are calculated. No automatic BIM dimensions, self-weight, code limits or load combinations are supplied. User-entered total loads must already include self-weight exactly once. Both pre-tension and post-tension are available; post-tension is only a uniform-force approximation with negligible duct-area effect. Variable friction/seating force profiles are outside the model.

Internal units are N and mm. Compression, sagging moment and downward displacement are positive; eccentricity is positive below the centroid.

- A = bh; I = bh³/12; S = I/(h/2); Aps = strand count × strand area.
- Pj = Aps fpj; Pt = Aps(fpj − immediate losses); P_effective = Aps(fpj − immediate losses − later losses).
- Immediate losses: elastic shortening, friction, anchorage seating, pre-transfer relaxation. Later losses: creep, shrinkage, post-transfer relaxation. These are **supplied stress reductions in MPa**, not predicted loss magnitudes. No loss may be counted twice. Straight pre-tension friction must be zero.
- M = wL²/8; top stress = P/A − P·e/S + M/S; bottom stress = P/A + P·e/S − M/S.
- Midspan gravity displacement = 5wL⁴/(384EI); prestress displacement = −P·e·L²/(8EI). Use Eci/Pt at transfer and Ec/P_effective for the service elastic estimate.

Service displacement is a gross-section elastic estimate, **not a long-term camber prediction**. Tensile stress triggers an uncracked-stiffness warning. Comparisons use only user-entered compression/tension limits and never represent code compliance, strength verification or production approval. The calculation does not check the permissible jacking stress against a selected code; fpj < fpu is only an input sanity check.

## Sources and verification

The mechanics/sign convention is checked against [FHWA flexural stress example, Step 5.6](https://www.fhwa.dot.gov/bridge/lrfd/pscus056.cfm) (FHWA uses the opposite stress sign). Loss-stage bookkeeping is informed by [FHWA prestress losses, Step 5.4](https://www.fhwa.dot.gov/bridge/lrfd/pscus054.cfm). The bridge-specific AASHTO limits in those examples are not adopted as building design limits.

Hand benchmark: b=300 mm, h=600 mm, L=6 m, e=100 mm, Aps=1000 mm², fpj=1000 MPa, immediate loss=80 MPa, later loss=120 MPa; w_transfer=10 kN/m, w_service=20 kN/m; Eci=30000 MPa, Ec=35000 MPa. Results: Pj=1000 kN, Pt=920 kN, P_effective=800 kN; transfer top/bottom=2.5/7.722222 MPa, service=5/3.888889 MPa; elastic net transfer/service displacement=−1.513889/−0.119048 mm. Test limits and materials in this benchmark are synthetic.

Tests cover those independent numeric results, force/moment equilibrium, reversed/concentric eccentricity, zero load, post-tension friction accounting, invalid geometry/losses/non-finite input, schema round-trip, legacy records, missing-input gating, edited results, UI navigation and read-only controls.

Not checked: flexural/shear ULS, cracking/detailing, anchorage/bursting, transfer/development length, covers, end zones, other sections/combinations, ducts/composite sections, curved tendons, continuous/deep beams, second-order effects, lifting/transport or production release. Output remains `PRELIMINARY_NOT_VERIFIED`, `canRelease: false`.
