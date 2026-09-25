export type Family = 'A' | 'B' | 'C' | 'D';
export type Plan = 'I' | 'L' | 'U';
export const uses = [{ id: 1, th: 'ออฟฟิศ', en: 'Office' }, { id: 2, th: 'บ้านพัก', en: 'Home' }, { id: 3, th: 'ร้านกาแฟ', en: 'Café' }, { id: 4, th: 'รีสอร์ต', en: 'Resort' }];
export const families: Record<Family, { th: string; en: string; path: string }> = {
  A: { th: 'จั่ว', en: 'Gable', path: 'M4 27V13L20 3L36 13V27' },
  B: { th: 'หลังคาโค้ง', en: 'Vault', path: 'M4 27V18C4 -1 36 -1 36 18V27' },
  C: { th: 'มุมหลังคา–ผนังโค้ง', en: 'Rounded portal', path: 'M4 27V12Q4 4 12 4H28Q36 4 36 12V27' },
  D: { th: 'คางหมู', en: 'Trapezoid', path: 'M4 27L8 4H32L36 27' },
};
export interface Artifact { id: string; revision: string; status: string; visibility: string; bytes: number; source_hash: string; url: string }
export interface DirectionalStudy {id:string;revision:string;status:string;findings:string[];drawings:{id:string;title:string;artifact:Artifact}[]}
export interface CatalogueData {baseProfileStudy?:ProfileThicknessStudy|null}
export interface CatalogueData {directionalStudy?:DirectionalStudy|null}
export interface ReactionCoefficient { gamma_coefficient: number; LL_constant: number }
export interface CatalogueData { shellStudy?: ShellStudy | null; diagnosticStudy?: DiagnosticStudy | null; bayStudy?: BayStudy|null; stressStudy?:StressStudy|null }
export interface CatalogueData { benchmarkStudy?:BenchmarkStudy|null }
export interface CatalogueData { curvedStudy?:CurvedStudy|null }
export interface CatalogueData { quadraticBayStudy?:QuadraticBayStudy|null }
export interface CatalogueData { localMeshStudy?:LocalMeshStudy|null }
export interface CatalogueData { gravityCouponStudy?:GravityCouponStudy|null; profileThicknessStudy?:ProfileThicknessStudy|null; combinedMeshStudy?:ProfileThicknessStudy|null; arcCrownStudy?:ProfileThicknessStudy|null }
export interface ProfileThicknessStudy {id:string;revision:string;status:string;runs:{id:string;mesh:string;elements:number;nodes:number;max_displacement_mm:number;base:{LH:number[]}}[];local:{pair:string[];groups:{group:string;point:number;spread:number;met:boolean}[]}[];traction:{id:string;mesh:string;cuts:Omit<GravityCut,'exact_lower_6'>[]}[];drawings:{id:string;title:string;artifact:Artifact}[]}
export interface GravityCut {id:string;origin_m:number[];exact_lower_6:number[];nodal_lower_6:number[];nodal_upper_6:number[];trace_pair_sum_6:number[];trace_pair_relative_6:number[];targets_met:boolean;traces:Record<'lower'|'upper',{order6:{resultant_6:number[]};relative_vs_exact_6:number[];relative_vs_nodal_6:number[];quadrature_change_6:number[]}>}
export interface GravityRun {id:string;mesh:string;nu:number;nx:number;ny:number;nz:number;elements:number;nodes:number;mid_uz_mm:number;exact_mid_uz_mm:number;displacement_error_relative:number;energy_error_relative:number;stress_rms_relative:number[];stress_rms_error_kPa:number[];cuts:GravityCut[];all_cut_targets_met:boolean;accuracy_targets_met:boolean}
export interface GravityCouponStudy {id:string;revision:string;status:string;runs:GravityRun[];basis:{sources:{title:string;url:string}[]};drawings:{id:string;title:string;artifact:Artifact}[]}
export interface TractionTrace {order4:{resultant_6:number[];area_m2:number};order6:{resultant_6:number[];area_m2:number};difference_vs_nodal_6:number[];relative_vs_nodal_6:number[];quadrature_change_6:number[]}
export interface TractionCut {id:string;origin_m:number[];nodal_lower_6:number[];nodal_upper_6:number[];traces:Record<'lower'|'upper',TractionTrace>;trace_pair_sum_6:number[];trace_pair_relative_6:number[];targets_met:boolean}
export interface LocalMeshStudy {
  id:string;revision:string;status:string;
  reference_run:QuadraticBayStudy['runs'][number];runs:QuadraticBayStudy['runs'];
  local_comparisons:StressStudy['comparisons'];
  global_comparisons:{pair:string[];displacement_change:number;reaction_change:number;energy_change:number}[];
  profiles:{mesh:string;points:{fraction:number;mean_kPa:number[];min_kPa:number[];max_kPa:number[]}[]}[];
  traction:{affine_traction_patch:{max_resultant_error:number};runs:{id:string;mesh:string;pattern:string;cuts:TractionCut[];all_cut_targets_met:boolean}[]};
  drawings:{id:string;title:string;artifact:Artifact}[];basis:{sources:{title:string;url:string}[]};
}
export interface QuadraticBayStudy {
  id:string;revision:string;status:string;
  runs:(BayStudy['solid_runs'][number]&{strain_energy_kNm:number;equilibrium_relative:number;physical_load_mapping_relative:number})[];
  global_comparisons:{pattern:string;pair:string[];displacement_change:number;reaction_change:number;cut_change:number;energy_change:number;selected_global_targets_met:boolean}[];
  initial_global_comparisons:QuadraticBayStudy['global_comparisons'];
  local_comparisons:StressStudy['comparisons'];initial_local_comparisons:StressStudy['comparisons'];
  profiles:{pattern:string;points:{fraction:number;mean_kPa:number[];min_kPa:number[];max_kPa:number[]}[]}[];
  prior_model_comparisons:{pattern:string;source_id:string;quadratic_id:string;crown_uz_relative_difference:number}[];
  drawings:{id:string;title:string;artifact:Artifact}[];
  basis:{sources:{title:string;url:string}[]};
}
export interface CurvedRun {id:string;model:string;t_m:number;nu:number;mesh:string;elements:number;nodes:number;energy_error_relative:number;sample_displacement_error_relative:number;volume_error_relative:number;sampled_radial_geometry_error_mm:number;gauss_rms_relative:number[];gauss_rms_error_kPa:number[];fixed_rms_relative:number[];fixed_max_point_relative:number[];fixed_spread_relative:number[];accuracy_targets_met:boolean}
export interface CurvedStudy {id:string;revision:string;status:string;runs:CurvedRun[];comparisons:{model:string;t_m:number;nu:number;energy_change:number;all_targets_met:boolean}[];profiles:{id:string;model:string;t_m:number;nu:number;points:{fraction:number;mean_kPa:number[];exact_kPa:number[];min_kPa:number[];max_kPa:number[]}[]}[];drawings:{id:string;title:string;artifact:Artifact}[];basis:{sources:{title:string;url:string}[]}}
export interface BenchmarkRun {id:string;formulation:string;case:string;mesh:string;nx:number;nz:number;nodes:number;elements:number;mapping:string;tip_uz_mm:number;exact_tip_uz_mm:number;tip_error_relative:number|null;energy_error_relative:number|null;stress_rms_relative:number[]|null;stress_rms_error_kPa:number[]|null;accuracy_targets_met:boolean}
export interface BenchmarkStudy {id:string;revision:string;status:string;runs:BenchmarkRun[];mapping_comparisons:{formulation:string;mesh:string;tip_difference_relative:number;regions:{region:string;rms_difference_kPa:number[]}[]}[];drawings:{id:string;title:string;artifact:Artifact}[];basis:{sources:{title:string;url:string}[]}}
export interface StressStudy {
  id:string;revision:string;status:string;
  comparisons:{pattern:string;pair:string[];groups:{group:string;points:number;all_six_targets_met:boolean;fields:{component:string;max_point_change:number;rms_change:number;max_spread_relative:number;worst_point:string;coarse_kPa:number;fine_kPa:number;difference_kPa:number;spread_point:string;spread_kPa:number;targets_met:boolean}[]}[]}[];
  runs:{id:string;mesh:string;pattern:string;sample_count:number;gauss_points_checked:number;gauss_reproduction_max_error_kPa:number;profile:{key:string;fraction:number;mean_kPa:number[];min_kPa:number[];max_kPa:number[]}[]}[];
  drawings:{id:string;title:string;artifact:Artifact}[];
}
export interface CutResult {id:string;origin_m:number[];cut_on_lower_LH_6:number[];fbd_relative:number;pair_relative:number}
export interface BayStudy {
  id:string;revision:string;status:string;
  solid_runs:{id:string;pattern:string;mesh:string;elements:number;nodes:number;max_displacement_mm:number;crown_mid_uz_mm:number;base:Record<string,number[]>;cuts:CutResult[]}[];
  comparisons:{pattern:string;solid_last_pair:string[];displacement_change:number;reaction_change:number;cut_change:number;global_mesh_targets_met:boolean;shell_reference:string;solid_vs_shell_crown_uz_relative:number}[];
  drawings:{id:string;title:string;artifact:Artifact}[];
}
export interface DiagnosticStudy {
  id:string; revision:string; status:string; run_count:number;
  coupon_comparisons:{t_m:number;nu:number;solid_exact_energy_error:number;shell_vs_solid_energy_difference:number;inner_stress_to_straight_nominal:number;outer_stress_to_straight_nominal:number;solid_targets_met:boolean}[];
  fixed_stations:{comparisons:{joint:string;max_point_changes:Record<string,number>;max_integral_changes:Record<string,number>;point_targets_met:boolean;integral_targets_met:boolean}[]};
  drawings:{id:string;title:string;artifact:Artifact}[];
  basis:{sources:{title:string;url:string}[]};
}
export interface ShellRun { id: string; t_m: number; joint: string; pattern: string; mesh: string; E_MPa: number; nodes: number; elements: number; base: Record<string, number[]>; crown_on_half: Record<string, number[]>; max_displacement_mm: number; equilibrium_relative: number; all_gauss_extrema: Record<string,{min:number;max:number;abs_max:number}> }
export interface ShellStudy { id:string;revision:string;status:string;run_count:number;solver:{version:string};basis:{material:{fc_ksc:number;density_kg_m3:number;nu:number};mandatory_limitations:string[]};runs:ShellRun[];convergence:{t_m:number;joint:string;pattern:string;last_pair:string[];global_targets_met:boolean;interior_targets_met:boolean;displacement_change:number;reaction_change:number;interior_resultant_changes:Record<string,number>}[];drawings:{id:string;title:string;artifact:Artifact}[];mass_cases:{t_m:number;half_mass_kg:number;floor_mass_kg:number;total_mass_kg:number}[];sources:{title:string;url:string|null}[] }
export interface PilotStudy { id: string; revision: string; status: string; input_hash: string; cases: { t_m: number; floor_t_m: number; half_volume_m3: number; floor_volume_m3: number; clear_width_m: number; clear_flat_height_m: number; thickness_curvature_ratio: number; reaction_coefficients: Record<string, Record<string, ReactionCoefficient>> }[]; drawings: { id: string; title: string; artifact: Artifact }[]; sources: { title: string; url: string }[] }
export interface Recipe { area_m2: number; straight_bays: number; half_shells: number; floors_total: number; N90_kits: number; NR15: number; NW15: number; TR_kits: number; known_primary_panels: number }
export interface Product { product_id: string; display_code: string; type: Plan; family: Family; use: number; use_name: string; nominal_grid_area_m2: number; image_badge: string; image_role: string; engineering_status: string; design_status: string; fabrication_status: string; bim_status: string; typical_family: string; artifact: Artifact; recipe: Recipe; legacy_history: string | null }
export interface Segment { tag: string; kind: string; hand?: string; opening?: string; mold_candidate?: string; thickness_mm: number | null; approved_for_manufacture: false }
export interface Typical { id: string; family: Family; pilot: boolean; status: string; artifact: Artifact; profile: { tag: string; base_width_mm: number; total_external_height_mm: number; description: string }; segments: Segment[]; openings: { code: string; name_th: string }[] }
export interface CatalogueData { revision: string; source_revision: string; source_hash: string; products: Product[]; typical: Typical[]; pilotStudy?: PilotStudy | null; recipes: Record<Plan, Recipe>; access: { name: string; mode: string }; standardization: { segment_length_mm: number }; engineering: { code: string; status: string; thickness: { target_range: number[] }; materials: { fc_cylinder_candidates_ksc: number[]; reinforcement_candidates: string[]; prestress_decision: string }; loads: { roof_LL: { user_value: number; si_kN_m2: number }; floor_LL: { user_value: number; si_kN_m2: number } } } }
export interface Filters { use: number; family: string; plan: string; status: string; query: string }
export function filterProducts(products: Product[], filters: Filters) {
  const q = filters.query.toLocaleLowerCase().trim();
  return products.filter(p => (!filters.use || p.use === filters.use) && (!filters.family || p.family === filters.family) && (!filters.plan || p.type === filters.plan)
    && (!filters.status || (filters.status === 'LEGACY20' ? p.type === 'I' : filters.status === 'STD15' ? p.type !== 'I' : filters.status === 'NOT_ANALYSED'))
    && (!q || `${p.display_code} ${p.product_id} ${p.use_name} ${uses.find(u => u.id === p.use)?.th} ${families[p.family].th} ${families[p.family].en} ${p.typical_family} ${p.image_badge}`.toLocaleLowerCase().includes(q)));
}
