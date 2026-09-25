import { describe, expect, it } from 'vitest';
import { designCriteriaSchema, prestressInputSchema } from './index';
import { emptyDesignCriteria, emptyPrestressInput, prestressFields, designCriteriaIssues } from '../../domain/src/index';

describe('Prestress design criteria persistence', () => {
  it('preserves structured drafts through schema serialization and reports missing engineering data', () => {
    const criteria = { ...emptyDesignCriteria(), prestressCalculation: emptyPrestressInput() };
    const parsed = designCriteriaSchema.parse(JSON.parse(JSON.stringify(criteria)));
    expect(parsed).toEqual(criteria);
    expect(designCriteriaIssues(parsed).some((issue) => issue.message.startsWith('Prestress:'))).toBe(true);
    expect(Object.keys(parsed.prestressCalculation!.values)).toHaveLength(prestressFields.length);
  });
  it('keeps older criteria compatible and rejects unknown systems or missing parameter keys', () => {
    expect(designCriteriaSchema.parse(emptyDesignCriteria())).not.toHaveProperty('prestressCalculation');
    expect(prestressInputSchema.safeParse({ ...emptyPrestressInput(), system: 'curved' }).success).toBe(false);
    expect(prestressInputSchema.safeParse({ ...emptyPrestressInput(), values: {} }).success).toBe(false);
  });
  it('flags the old non-prestressed description when a calculation is enabled', () => {
    const criteria = { ...emptyDesignCriteria(), prestressCalculation: emptyPrestressInput() };
    criteria.values.prestress = 'ไม่อัดแรง';
    expect(designCriteriaIssues(criteria).some((issue) => issue.message.includes('ข้อมูลให้สอดคล้อง'))).toBe(true);
  });
});
