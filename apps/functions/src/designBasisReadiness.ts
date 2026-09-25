import { designCriteriaIssues } from '@precast/domain';
import { designBasisPayloadSchema } from '@precast/schemas';
import { AuthorizationError } from './authorization';

/** Also rejects legacy records: being readable does not make them certifiable. */
export function assertDesignBasisCriteriaReady(payload: unknown): void {
  const parsed = designBasisPayloadSchema.safeParse(payload);
  if (!parsed.success) throw new AuthorizationError('Design Basis is incomplete or contains invalid engineering values.', 'failed-precondition');
  const issues = designCriteriaIssues(parsed.data.criteria);
  if (issues.length) throw new AuthorizationError(`Design Criteria incomplete: ${issues.map((issue) => issue.message).join('; ')}`, 'failed-precondition');
  const basis = parsed.data;
  const criteria = basis.criteria!;
  const primary = criteria.standards.find((item) => item.category === 'concrete')!;
  const loading = criteria.standards.find((item) => item.category === 'loading')!;
  const v = criteria.values;
  const pairs: [number, string][] = [[basis.concrete.fc28Mpa, v.fc28], [basis.concrete.fcLiftMpa, v.fcLift], [basis.concrete.densityKgM3, v.density], [basis.concrete.stiffnessMpa, v.elasticModulus], [basis.reinforcement.fyMpa, v.fy], [basis.handling.liftingDynamicFactor, v.liftFactor], [basis.handling.transportDynamicFactor, v.transportFactor], [basis.designLifeYears, v.designLife], [basis.fireResistanceMinutes, v.fire]];
  if (basis.designCode !== primary.code.trim() || basis.designCodeEdition !== primary.edition.trim() || basis.loadingCode !== loading.code.trim() || basis.loadingCodeEdition !== loading.edition.trim() || pairs.some(([number, value]) => number !== Number(value))) throw new AuthorizationError('Design Basis values and Design Criteria disagree; synchronize the draft before review.', 'failed-precondition');
}
