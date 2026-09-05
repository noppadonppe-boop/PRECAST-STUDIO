import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { approveArtifactCommandSchema, createProjectCommandSchema, returnArtifactCommandSchema, submitArtifactCommandSchema } from '@precast/schemas';
import { AuthorizationError } from './authorization';
import { approveArtifact, createType2Project, returnArtifact, submitArtifact } from './workflowCommands';

if (getApps().length === 0) initializeApp();

export { authorizeApproval } from './authorization';
export { runDeterministicMockAnalysis } from './mockAnalysis';
export { approveArtifact, computeArtifactSnapshotHash, createType2Project, returnArtifact, submitArtifact } from './workflowCommands';

function callable<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, handler: (uid: string, command: T) => Promise<unknown>) {
  const enforceAppCheck = process.env.FUNCTIONS_EMULATOR !== 'true';
  return onCall({ region: 'asia-southeast1', enforceAppCheck }, async (request) => {
    if (request.auth === undefined) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const parsed = schema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Command payload is invalid.');
    try {
      return await handler(request.auth.uid, parsed.data);
    } catch (error) {
      if (error instanceof AuthorizationError) throw new HttpsError(error.code, error.message);
      throw error;
    }
  });
}

export const submitArtifactCommand = callable(submitArtifactCommandSchema, (uid, command) => submitArtifact(getFirestore(), uid, command));
export const approveArtifactCommand = callable(approveArtifactCommandSchema, (uid, command) => approveArtifact(getFirestore(), uid, command));
export const returnArtifactCommand = callable(returnArtifactCommandSchema, (uid, command) => returnArtifact(getFirestore(), uid, command));
export const createProjectCommand = callable(createProjectCommandSchema, (uid, command) => createType2Project(getFirestore(), uid, command));
