import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { approveArtifactCommandSchema, archiveProjectCommandSchema, cancelAnalysisRunCommandSchema, createDesignBasisRevisionCommandSchema, createDesignCheckRevisionCommandSchema, createDocumentationSetRevisionCommandSchema, createEstimateRevisionCommandSchema, createLoadModelRevisionCommandSchema, createProductModelRevisionCommandSchema, createProjectCommandSchema, createReleasePackageRevisionCommandSchema, freezeSourceRevisionCommandSchema, queueAnalysisRunCommandSchema, releaseProductionPackageCommandSchema, returnArtifactCommandSchema, submitArtifactCommandSchema, updateProjectCommandSchema } from '@precast/schemas';
import { AuthorizationError } from './authorization';
import { assertCommandEnvironment } from './runtimeBoundary';
import { cancelAnalysisRun, createLoadModelRevision, queueAnalysisRun } from './analysisCommands';
import { createDesignCheckRevision } from './designCheckCommands';
import { createEstimateRevision } from './estimateCommands';
import { createDocumentationSetRevision } from './documentationCommands';
import { createReleasePackageRevision, releaseProductionPackage } from './releaseCommands';
import { approveArtifact, archiveProject, createDesignBasisRevision, createProductModelRevision, createType2Project, freezeSourceRevision, returnArtifact, submitArtifact, updateProject } from './workflowCommands';

if (getApps().length === 0) initializeApp();

export { authorizeApproval } from './authorization';
export { runDeterministicMockAnalysis } from './mockAnalysis';
export { cancelAnalysisRun, canonicalizeLoadSettings, createLoadModelRevision, queueAnalysisRun, runTwoPanelStaticBenchmark } from './analysisCommands';
export { buildDesignCheckRegister, createDesignCheckRevision } from './designCheckCommands';
export { buildEngineeringEstimate, buildEstimateExportManifest, createEstimateRevision, estimateBlockingConditions } from './estimateCommands';
export { buildDocumentationExportManifest, buildDocumentationSet, createDocumentationSetRevision, documentationBlockingConditions } from './documentationCommands';
export { buildReleasePackagePayload, buildRevitDraftingDxf, createReleasePackageRevision, inspectRevitDraftingDxf, releaseProductionPackage } from './releaseCommands';
export { approveArtifact, archiveProject, canonicalizeProductModel, computeArtifactSnapshotHash, createDesignBasisRevision, createProductModelRevision, createType2Project, freezeSourceRevision, returnArtifact, submitArtifact, updateProject } from './workflowCommands';

function callable<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, handler: (uid: string, command: T) => Promise<unknown>) {
  const enforceAppCheck = process.env.FUNCTIONS_EMULATOR !== 'true';
  return onCall({ region: 'asia-southeast1', enforceAppCheck }, async (request) => {
    if (request.auth === undefined) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const parsed = schema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Command payload is invalid.');
    try {
      assertCommandEnvironment(process.env);
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
export const createDesignBasisRevisionCommand = callable(createDesignBasisRevisionCommandSchema, (uid, command) => createDesignBasisRevision(getFirestore(), uid, command));
export const createProductModelRevisionCommand = callable(createProductModelRevisionCommandSchema, (uid, command) => createProductModelRevision(getFirestore(), uid, command));
export const createLoadModelRevisionCommand = callable(createLoadModelRevisionCommandSchema, (uid, command) => createLoadModelRevision(getFirestore(), uid, command));
export const queueAnalysisRunCommand = callable(queueAnalysisRunCommandSchema, (uid, command) => queueAnalysisRun(getFirestore(), uid, command));
export const cancelAnalysisRunCommand = callable(cancelAnalysisRunCommandSchema, (uid, command) => cancelAnalysisRun(getFirestore(), uid, command));
export const createDesignCheckRevisionCommand = callable(createDesignCheckRevisionCommandSchema, (uid, command) => createDesignCheckRevision(getFirestore(), uid, command));
export const createEstimateRevisionCommand = callable(createEstimateRevisionCommandSchema, (uid, command) => createEstimateRevision(getFirestore(), uid, command));
export const createDocumentationSetRevisionCommand = callable(createDocumentationSetRevisionCommandSchema, (uid, command) => createDocumentationSetRevision(getFirestore(), uid, command));
export const createReleasePackageRevisionCommand = callable(createReleasePackageRevisionCommandSchema, (uid, command) => createReleasePackageRevision(getFirestore(), uid, command));
export const releaseProductionPackageCommand = callable(releaseProductionPackageCommandSchema, (uid, command) => {
  if (process.env.FUNCTIONS_EMULATOR !== 'true') throw new AuthorizationError('M9 technical rehearsal has no Production Release authority.', 'failed-precondition');
  return releaseProductionPackage(getFirestore(), uid, command);
});
export const freezeSourceRevisionCommand = callable(freezeSourceRevisionCommandSchema, (uid, command) => freezeSourceRevision(getFirestore(), uid, command));
export const updateProjectCommand = callable(updateProjectCommandSchema, (uid, command) => updateProject(getFirestore(), uid, command));
export const archiveProjectCommand = callable(archiveProjectCommandSchema, (uid, command) => archiveProject(getFirestore(), uid, command));
