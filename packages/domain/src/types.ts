import type { DesignCriteria } from './designCriteria';
import type { Gate, GateState } from './workflow';
import type { RevitDraftingExportProfile } from './exportProfiles';

export const projectRoles = [
  'projectManager',
  'bimCoordinator',
  'structuralEngineer',
  'engineeringChecker',
  'costEstimator',
  'detailer',
  'productionManager',
  'commercialApprover',
  'siteQa',
  'externalReviewer',
] as const;

export type ProjectRole = (typeof projectRoles)[number];
export type OrganizationRole = 'orgAdmin';

export const permissionActions = [
  'view',
  'comment',
  'create',
  'editDraft',
  'submit',
  'review',
  'approve',
  'release',
  'admin',
] as const;

export type PermissionAction = (typeof permissionActions)[number];

export type ArtifactType =
  | 'sourceRevision'
  | 'designBasis'
  | 'productModel'
  | 'loadModel'
  | 'analysis'
  | 'estimate'
  | 'calculation'
  | 'drawingSet'
  | 'releasePackage';

export type ArtifactStatus = 'draft' | 'submitted' | 'approved' | 'accepted' | 'returned' | 'released' | 'superseded';

export type ProjectStatus = 'active' | 'onHold' | 'completed' | 'archived';

export interface ProjectRecord {
  id: string;
  orgId: string;
  code: string;
  name: string;
  productFamilyId?: string;
  status: ProjectStatus;
  currentStage: string;
  currentSourceRevisionId?: string;
  currentDesignBasisVersionId?: string;
  currentModelVersionId?: string;
  currentLoadModelVersionId?: string;
  currentApprovedAnalysisRunId?: string;
  currentCalculationReportId?: string;
  currentEstimateVersionId?: string;
  currentDrawingSetId?: string;
  currentReleasePackageId?: string;
  gateStates: Partial<Record<Gate, GateState>>;
  assignedUserIds: string[];
  dueAt?: string;
  updatedAt?: string;
}

export interface SourceValidationSummary {
  unitValid: boolean;
  coordinateValid: boolean;
  levelsValid: boolean;
  objectIdentityValid: boolean;
  objectCount: number;
  duplicateGlobalIds: number;
}

export interface DesignBasisPayload {
  criteria?: DesignCriteria;
  jurisdiction: string;
  designCode: string;
  designCodeEdition: string;
  loadingCode: string;
  loadingCodeEdition: string;
  units: 'kN-m-MPa';
  designLifeYears: number;
  riskCategory: string;
  concrete: { fc28Mpa: number; fcLiftMpa: number; densityKgM3: number; stiffnessMpa: number; durabilityClass: string; source: string };
  reinforcement: { fyMpa: number; source: string };
  handling: { liftingDynamicFactor: number; transportDynamicFactor: number; storageSupportRule: string; source: string };
  fireResistanceMinutes: number;
  inheritedFrom: string;
  overrideReasons: Record<string, string>;
}

export type ConstructionScenario = 'service' | 'demould' | 'lifting' | 'transport' | 'storage' | 'installation' | 'final';
export type RestrainedDof = 'UX' | 'UY' | 'UZ' | 'RX' | 'RY' | 'RZ';

export interface ProductModelPayload {
  schemaVersion: '1.0.0';
  units: 'kN-m-MPa';
  coordinateSystem: string;
  panels: Array<{
    id: string;
    mark: string;
    type: 'wall' | 'floor' | 'roof' | 'beam' | 'column';
    sourceObjectIds: string[];
    materialId: string;
    geometry: { widthM: number; heightM: number; thicknessM: number; offsetM: number };
    openings: Array<{ id: string; xM: number; yM: number; widthM: number; heightM: number }>;
    volumeM3: number;
    weightKn: number;
    cogM: { x: number; y: number; z: number };
  }>;
  joints: Array<{ id: string; panelIds: [string, string]; stiffnessKnM: number; loadPathConfirmed: boolean }>;
  anchors: Array<{ id: string; panelId: string; kind: 'lifting' | 'embedded'; positionM: { x: number; y: number; z: number }; capacityKn: number }>;
  supports: Array<{ id: string; panelId: string; scenario: ConstructionScenario; positionM: { x: number; y: number; z: number }; restrainedDofs: RestrainedDof[] }>;
  loadCases: Array<{ id: string; scenario: ConstructionScenario; type: 'dead' | 'live' | 'wind' | 'handling' | 'transport'; magnitude: number; unit: 'kN' | 'kN/m' | 'kN/m2' }>;
  loadCombinations: Array<{ id: string; factors: Record<string, number> }>;
  stages: ConstructionScenario[];
  validation: { unsupportedNodes: number; disconnectedElements: number; missingLoadPaths: number; geometryConflicts: number };
}

export interface LoadAnalysisSettingsPayload {
  schemaVersion: '1.0.0';
  units: 'kN-m-MPa';
  elementIdealization: 'shell-mid-surface';
  shellFormulation: 'benchmark-shell';
  meshSizeM: number;
  refinementZoneIds: string[];
  stiffnessModifiers: { membrane: number; bending: number };
  solverTolerance: number;
  maxIterations: number;
  resultAveraging: 'nodal' | 'element';
  scenarios: Array<{ id: ConstructionScenario; activeSupportIds: string[]; activeJointIds: string[]; loadCaseIds: string[]; combinationIds: string[] }>;
}

export interface AnalysisRunRecord {
  id: string;
  revision: string;
  status: 'queued' | 'running' | 'completed' | 'submitted' | 'approved' | 'returned' | 'failed' | 'cancelled';
  designStatus: 'NOT_CHECKED';
  engine: string;
  benchmarkId: 'two-panel-static-v1';
  inputHash: string;
  outputHash?: string;
  upstreamRefs: ArtifactUpstreamRefs & { loadModelVersionId: string };
  phase: 'validate' | 'mesh' | 'solve' | 'postProcess' | 'checks' | 'artifacts' | 'complete';
  phaseHistory: Array<{ phase: string; status: 'completed' | 'failed'; message: string }>;
  result?: { appliedLoadKn: number; reactionSumKn: number; equilibriumImbalancePercent: number; maxDisplacementMm: number; governingCombinationId: string };
  verification?: { fatalWarnings: number; unsupportedNodes: number; disconnectedElements: number; equilibriumTolerancePercent: number; equilibriumPassed: boolean; convergencePassed: boolean; independentBenchmarkMatched: boolean };
  draftHash?: string;
  snapshotHash?: string;
  locked?: boolean;
  createdBy?: string;
}

export type DesignCheckStatus = 'PASS' | 'FAIL' | 'NOT_CHECKED';

export interface DesignCheckPayload {
  schemaVersion: '1.0.0';
  units: 'kN-m-MPa';
  engine: 'precast-design-check-register@1.0.0';
  analysisRunId: string;
  analysisOutputHash: string;
  overallStatus: DesignCheckStatus;
  checks: Array<{
    id: string;
    category: 'panelStrength' | 'serviceability' | 'opening' | 'joint' | 'anchor' | 'lifting' | 'transport';
    scenario: ConstructionScenario;
    entityIds: string[];
    governingCombinationId?: string | undefined;
    codeClauseRef: string;
    status: DesignCheckStatus;
    utilization?: number | undefined;
    message: string;
    disposition?: { kind: 'notApplicable' | 'acceptedException' | 'deferred'; rationale: string; evidenceRef: string } | undefined;
  }>;
}

export type EstimateUnit = 'm3' | 'm2' | 'm' | 'each' | 't';

export interface PriceBookItem {
  id: string;
  costCode: string;
  description: string;
  category: 'material' | 'manufacturing' | 'logistics' | 'installation';
  unit: EstimateUnit;
  currency: 'THB';
  baseRate: number;
  sourceType: 'supplierQuote' | 'contractRate' | 'marketSurvey' | 'internalBenchmark';
  sourceRef: string;
  effectiveFrom: string;
  effectiveTo?: string | undefined;
  taxIncluded: false;
  status: 'approved' | 'withdrawn';
}

export interface PriceBookRecord {
  id: string;
  revision: string;
  status: 'approved' | 'superseded';
  currency: 'THB';
  items: PriceBookItem[];
}

export type EstimateRateStatus = 'current' | 'missingRate' | 'expiredRate' | 'unitMismatch';

export interface EstimatePayload {
  schemaVersion: '1.0.0';
  maturity: 'engineering';
  currency: 'THB';
  quantityRuleVersion: 'precast-qto@1.0.0';
  priceBookId: string;
  priceBookRevision: string;
  effectiveDate: string;
  designDependencyStatus: DesignCheckStatus;
  uncertaintyPercent: number;
  lines: Array<{
    id: string;
    costCode: string;
    description: string;
    category: PriceBookItem['category'];
    sourceType: 'model' | 'projectAllowance';
    elementIds: string[];
    quantityRule: string;
    rawQuantity: number;
    wastePercent: number;
    payableQuantity: number;
    unit: EstimateUnit;
    unitRate: number | null;
    rateSourceRef: string | null;
    amount: number | null;
    rateStatus: EstimateRateStatus;
  }>;
  summary: {
    pricedDirectCost: number;
    directCost: number | null;
    indirectPercent: number;
    indirectCost: number | null;
    contingencyPercent: number;
    contingency: number | null;
    estimatedCost: number | null;
    markupMethod: 'markup';
    markupPercent: number;
    markup: number | null;
    sellingPrice: number | null;
    vatPercent: number;
    vat: number | null;
    grandTotal: number | null;
    lowRange: number | null;
    highRange: number | null;
  };
  assumptions: Array<{ id: string; classification: 'included' | 'excluded' | 'allowance'; statement: string; blocking: boolean }>;
}

export type DocumentationCheckStatus = 'PASS' | 'FAIL' | 'NOT_CHECKED';

export interface DocumentationSetPayload {
  schemaVersion: '1.0.0';
  units: 'kN-m-MPa';
  engine: 'precast-documentation-register@1.0.0';
  issuePurpose: 'internalReview';
  modelVersionId: string;
  modelSnapshotHash: string;
  calculationReportId: string;
  calculationSnapshotHash: string;
  calculationStatus: string;
  overallDesignStatus: DesignCheckStatus;
  exportProfile: RevitDraftingExportProfile;
  calculationReport: {
    id: string;
    revision: string;
    documentState: 'previewOnly';
    sections: Array<{
      id: string;
      number: number;
      title: string;
      status: DocumentationCheckStatus;
      sourceRefs: string[];
      message: string;
    }>;
  };
  drawings: Array<{
    id: string;
    drawingNumber: string;
    panelId: string;
    elementMark: string;
    panelType: ProductModelPayload['panels'][number]['type'];
    sheet: string;
    revision: string;
    status: 'draft';
    geometry: ProductModelPayload['panels'][number]['geometry'];
    openings: ProductModelPayload['panels'][number]['openings'];
    anchorIds: string[];
    anchors: ProductModelPayload['anchors'];
    materialId: string;
    volumeM3: number;
    weightKn: number;
    cogM: ProductModelPayload['panels'][number]['cogM'];
    reinforcementStatus: DocumentationCheckStatus;
    sourceRefs: { modelVersionId: string; calculationReportId: string };
  }>;
  preflight: {
    overallStatus: DocumentationCheckStatus;
    checks: Array<{
      id: string;
      category: 'modelHash' | 'drawingIdentity' | 'geometry' | 'dimensions' | 'titleBlock' | 'lifting' | 'reinforcement' | 'engineeringApproval';
      status: DocumentationCheckStatus;
      entityIds: string[];
      message: string;
    }>;
  };
}

export type ReleaseCheckStatus = 'PASS' | 'FAIL' | 'NOT_CHECKED';
export type ReleaseFileRole = 'calculationPdfa' | 'shopDrawingPdfa' | 'shopDrawingDxf' | 'schedule' | 'audit' | 'bim';

export interface ReleaseFileRecord {
  path: string;
  role: ReleaseFileRole;
  mediaType: string;
  sha256: string;
  sizeBytes: number;
  sourceSnapshotHash: string;
  drawingId?: string | undefined;
  drawingNumber?: string | undefined;
  revision: string;
}

export interface ReleasePackagePayload {
  schemaVersion: '1.0.0';
  engine: 'precast-release-manifest@1.0.0';
  issuePurpose: 'productionRelease';
  packageName: string;
  exportJobId: string;
  upstream: {
    designBasisVersionId: string;
    designBasisSnapshotHash: string;
    modelVersionId: string;
    modelSnapshotHash: string;
    calculationReportId: string;
    calculationSnapshotHash: string;
    drawingSetId: string;
    drawingSetSnapshotHash: string;
  };
  exportProfileId: 'REVIT-DRAFTING-01';
  files: ReleaseFileRecord[];
  manifestSha256: string;
  checksumsSha256: string;
  revitVerification: {
    status: ReleaseCheckStatus;
    target: 'Autodesk Revit';
    targetVersion: string;
    workflow: 'DraftingViewCurrentViewOnly';
    sizeToleranceMm: number;
    visualComparison: ReleaseCheckStatus;
    dxfHashes: string[];
    verifiedAt: string;
    verifiedBy: string;
  };
  preflight: {
    overallStatus: ReleaseCheckStatus;
    checks: Array<{
      id: string;
      category: 'g6Approval' | 'upstreamAlignment' | 'fileCompleteness' | 'checksumIntegrity' | 'revitDxf' | 'immutableStorage';
      status: ReleaseCheckStatus;
      message: string;
    }>;
  };
}

export interface EngineeringIssue {
  id: string;
  orgId: string;
  projectId: string;
  artifactType: ArtifactType;
  artifactId: string;
  artifactRevision: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  comment: string;
  status: 'open' | 'resolved' | 'acceptedException';
  createdBy: string;
  createdAt: string;
  dispositionReason?: string;
  responsibleUid?: string;
}

export interface ArtifactUpstreamRefs {
  sourceRevisionId?: string;
  designBasisVersionId?: string;
  modelVersionId?: string;
  loadModelVersionId?: string;
  analysisRunId?: string;
  calculationReportId?: string;
  drawingSetId?: string;
  estimateVersionId?: string;
}

export interface OrganizationMembership {
  uid: string;
  orgId: string;
  orgRoles: OrganizationRole[];
  status: 'invited' | 'active' | 'suspended';
}

export interface ProjectMembership {
  uid: string;
  orgId: string;
  projectId: string;
  roles: ProjectRole[];
  capabilities: string[];
  status: 'active' | 'suspended';
  effectiveFrom: string;
  expiresAt?: string;
}

export interface PermissionContext {
  userId: string;
  orgId: string;
  projectId: string;
  roles: ProjectRole[];
  capabilities: string[];
  membershipStatus: ProjectMembership['status'];
  expiresAt?: string;
  artifactStatus?: string;
  artifactCreatedBy?: string;
  isCurrentRevision?: boolean;
}

export interface ApprovalRequest {
  id: string;
  orgId: string;
  projectId: string;
  artifactType: ArtifactType;
  artifactId: string;
  artifactRevision: string;
  snapshotHash: string;
  requestedAction: 'review' | 'approve' | 'issue' | 'release';
  requiredRole: ProjectRole;
  assignedTo?: string;
  status: 'open' | 'inReview' | 'approved' | 'returned' | 'cancelled' | 'superseded';
  requestedBy: string;
  requestedAt: string;
  dueAt?: string;
  blockingConditions: string[];
}

export interface ApprovalSnapshot {
  id: string;
  orgId: string;
  projectId: string;
  artifactType: ArtifactType;
  artifactId: string;
  artifactRevision: string;
  createdBy: string;
  snapshotHash: string;
  upstreamRefs: ArtifactUpstreamRefs;
  payload: Record<string, unknown>;
  capturedAt: string;
  capturedBy: string;
}

export interface CommandReceipt {
  idempotencyKey: string;
  commandName: 'createProject' | 'updateProject' | 'archiveProject' | 'createDesignBasisRevision' | 'createProductModelRevision' | 'createLoadModelRevision' | 'queueAnalysisRun' | 'cancelAnalysisRun' | 'createDesignCheckRevision' | 'createEstimateRevision' | 'createDocumentationSetRevision' | 'createReleasePackageRevision' | 'releaseProductionPackage' | 'submitArtifact' | 'approveArtifact' | 'returnArtifact' | 'freezeSourceRevision';
  actorUid: string;
  resourceId: string;
  resultState: string;
  auditEventId: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  orgId: string;
  projectId: string;
  artifactType: ArtifactType;
  artifactId: string;
  artifactRevision: string;
  action: PermissionAction | 'return' | 'issue' | 'freeze' | 'archive' | 'supersede' | 'execute' | 'cancel';
  stateBefore: string;
  stateAfter: string;
  actorUid: string;
  effectiveRoles: ProjectRole[];
  delegatedCapabilities: string[];
  occurredAt: string;
  requestId: string;
  idempotencyKey: string;
  snapshotHash: string;
  comment?: string;
}
