import { criteriaFields, criteriaFromDesignBasis, type DesignBasisPayload } from '../../packages/domain/src/index';

/** Synthetic completeness evidence for automated workflow tests only. Never seed live projects. */
export function completeCriteriaFixture(basis: DesignBasisPayload) {
  const criteria = criteriaFromDesignBasis(basis);
  criteria.standards = criteria.standards.map((item) => ({ ...item, code: item.code || `TEST ONLY ${item.category}`, edition: item.edition || 'TEST ONLY 2026', amendment: 'TEST ONLY no amendments', scope: 'TEST ONLY declared scope', source: 'TEST ONLY evidence document', clause: 'TEST ONLY clause 1' }));
  for (const field of criteriaFields) if (!criteria.values[field.key]) criteria.values[field.key] = 'min' in field ? String(field.min) : 'TEST ONLY project-specific evidence';
  return criteria;
}
