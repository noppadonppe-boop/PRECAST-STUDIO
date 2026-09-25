import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export function sectionCase(basis, t, tf = t) {
  const { width_m: B, overall_height_m: H, bay_length_m: L, outer_shoulder_radius_m: R } = basis.geometry;
  if (!(t > 0 && t < R && tf > 0 && H - R > tf && B > 2 * R)) throw new Error('Invalid section geometry.');
  const r = R - t, Rm = R - t / 2, wallHeight = H - R - tf, flatHalf = B / 2 - R;
  const arcArea = Math.PI * (R * R - r * r) / 4;
  const centroidOffset = 4 * (R ** 3 - r ** 3) / (3 * Math.PI * (R ** 2 - r ** 2));
  const parts = [
    { name: 'wall', area: t * wallHeight, x: t / 2, z: tf + wallHeight / 2 },
    { name: 'quarter_annulus', area: arcArea, x: R - centroidOffset, z: H - R + centroidOffset },
    { name: 'flat_roof_half', area: t * flatHalf, x: (R + B / 2) / 2, z: H - t / 2 },
  ];
  const area = parts.reduce((a, p) => a + p.area, 0);
  const xg = parts.reduce((a, p) => a + p.area * p.x, 0) / area;
  const zg = parts.reduce((a, p) => a + p.area * p.z, 0) / area;
  const roofQ = basis.loads.roof_LL_kgf_m2 * basis.loads.gravity_m_s2 / 1000;
  const floorQ = basis.loads.floor_LL_kgf_m2 * basis.loads.gravity_m_s2 / 1000;
  return { t_m: t, floor_t_m: tf, width_m: B, height_m: H, length_m: L, outer_radius_m: R,
    inner_radius_m: r, midsurface_radius_m: Rm, thickness_curvature_ratio: t / Rm,
    wall_straight_height_m: wallHeight, flat_half_length_m: flatHalf, half_section_area_m2: area,
    half_volume_m3: area * L, shell_volume_m3: 2 * area * L, floor_volume_m3: B * L * tf,
    total_primary_volume_m3: 2 * area * L + B * L * tf,
    half_centroid_m: [xg, L / 2, zg], parts,
    clear_width_m: B - 2 * t, clear_flat_height_m: H - t - tf,
    roof_LL_q_kN_m2: roofQ, roof_LL_full_kN: roofQ * B * L,
    floor_LL_q_kN_m2: floorQ, floor_LL_gross_kN: floorQ * B * L,
    floor_LL_clear_strip_kN: floorQ * (B - 2 * t) * L,
    gross_plan_area_m2: B * L, clear_strip_area_m2: (B - 2 * t) * L,
  };
}

export function threeHinge(c, gamma, pattern = 'SYMMETRIC_FULL') {
  const B = c.width_m, a = c.t_m / 2, zBase = c.floor_t_m, zCrown = c.height_m - c.t_m / 2;
  const span = B - 2 * a, rise = zCrown - zBase, W = gamma * c.half_volume_m3;
  const PL = c.roof_LL_full_kN / 2;
  const PR = pattern === 'SYMMETRIC_FULL' ? PL : pattern === 'LEFT_HALF_ONLY' ? 0 : NaN;
  if (!Number.isFinite(PR)) throw new Error('Unknown roof pattern');
  const loads = [
    { x: c.half_centroid_m[0], W }, { x: B - c.half_centroid_m[0], W },
    { x: B / 4, W: PL }, { x: 3 * B / 4, W: PR },
  ];
  const RRz = loads.reduce((sum, load) => sum + (load.x - a) * load.W, 0) / span;
  const RLz = 2 * W + PL + PR - RRz;
  const Cz = W + PL - RLz;
  const gravityMomentLeft = W * (c.half_centroid_m[0] - a) + PL * (B / 4 - a);
  const H = (gravityMomentLeft - (B / 2 - a) * Cz) / rise;
  const Cx = -H;
  const residuals = {
    global_Fx_kN: H - H,
    global_Fz_kN: RLz + RRz - 2 * W - PL - PR,
    global_My_kNm: -span * RRz + loads.reduce((sum, load) => sum + (load.x - a) * load.W, 0),
    LH_Fx_kN: H + Cx, LH_Fz_kN: RLz + Cz - W - PL,
    LH_My_kNm: rise * Cx - (B / 2 - a) * Cz + gravityMomentLeft,
    RH_Fx_kN: -H - Cx, RH_Fz_kN: RRz - Cz - W - PR,
    RH_My_kNm: -rise * Cx - (B / 2 - a) * Cz - W * (c.half_centroid_m[0] - a) - PR * (B / 4 - a),
  };
  return { RLx_kN: H, RLz_kN: RLz, RRx_kN: -H, RRz_kN: RRz, crown_on_LH_Cx_kN: Cx, crown_on_LH_Cz_kN: Cz, My_kNm: 0, residuals };
}

export function reactionCoefficients(c, pattern) {
  const g0 = threeHinge(c, 0, pattern), g1 = threeHinge(c, 1, pattern);
  return Object.fromEntries(Object.keys(g0).filter(k => k !== 'residuals').map(key => [key, { gamma_coefficient: g1[key] - g0[key], LL_constant: g0[key] }]));
}

export async function buildStudy(root) {
  const basisText = await readFile(resolve(root, 'knowledge/modular-tsc-step2a/study_basis.json'), 'utf8');
  const basis = JSON.parse(basisText);
  const cases = basis.geometry.common_thickness_candidates_m.map(t => {
    const geometry = sectionCase(basis, t);
    return { ...geometry, reaction_coefficients: Object.fromEntries(basis.benchmark.roof_patterns.map(pattern => [pattern, reactionCoefficients(geometry, pattern)])) };
  });
  return { id: basis.id, revision: basis.revision, input_hash: createHash('sha256').update(basisText).digest('hex'),
    status: 'DRAFT_PRE_ANALYSIS', geometry_intent: basis.geometry_intent, basis, cases,
    formula: 'reaction_kN = gamma_coefficient * gamma_kN_m3 + LL_constant; gamma is not selected',
    FEM_results: null, design_capacity: null, approval: basis.approval,
    sources: [
      { title: 'PCI — Connections', url: 'https://www.pci.org/Connections', use: 'load path, movement and stability principles only; no adopted capacity tables' },
      { title: 'COMSOL — Shell and plate theory', url: 'https://doc.comsol.com/6.3/doc/com.comsol.help.sme/sme_ug_theory.06.130.html', use: 'shell kinematics, curvature limitations and local axes; not a building code' },
      { title: 'OpenSees — ShellMITC4', url: 'https://opensees.berkeley.edu/OpenSees/manuals/usermanual/640.htm', use: 'candidate formulation only; not selected or executed' },
    ],
  };
}
