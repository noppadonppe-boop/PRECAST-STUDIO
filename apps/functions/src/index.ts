import { getApps, initializeApp } from 'firebase-admin/app';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { approvalCommandSchema } from '@precast/schemas';

if (getApps().length === 0) initializeApp();

export { authorizeApproval } from './authorization';
export { runDeterministicMockAnalysis } from './mockAnalysis';

// M0 exposes the validated command boundary only. Firestore transaction wiring is deferred
// until M1 seed/auth integration; no production project or credential is referenced here.
export const validateApprovalCommand = onCall({ enforceAppCheck: true }, (request) => {
  if (request.auth === undefined) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const result = approvalCommandSchema.safeParse(request.data);
  if (!result.success) throw new HttpsError('invalid-argument', 'Approval command is invalid.');
  return { accepted: true, command: result.data, actorUid: request.auth.uid };
});

