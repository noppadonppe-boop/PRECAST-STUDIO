import type { ApprovalRequest, Gate, GateState, OrganizationMembership, ProjectMembership, ProjectRole } from '@precast/domain';

export const activeOrganization = { id: 'org-siam', name: 'Siam Precast Engineering', shortName: 'SPE' };

export const currentUser = {
  uid: 'checker-narin',
  name: 'นรินทร์ วัฒนกิจ',
  initials: 'นว',
  email: 'narin.checker@example.local',
};

export const organizationMembership: OrganizationMembership = {
  uid: currentUser.uid,
  orgId: activeOrganization.id,
  orgRoles: ['orgAdmin'],
  status: 'active',
};

export const projects = [
  {
    id: 'p-rama9', code: 'PC-26014', name: 'Rama IX Modular Residence', family: 'Type 2 Residential',
    stage: 'Analysis', gate: 'G3' as Gate, gateState: 'inProgress' as GateState,
    sourceRevision: 'SRC-R02', designBasisRevision: 'DB-R02', modelRevision: 'PM-R01', analysisRevision: 'AN-R01',
    engineer: 'ศุภชัย ก.', checker: 'นรินทร์ ว.', due: '09 Sep 2026', issues: 0, updated: '18 นาทีที่แล้ว', progress: 3,
  },
  {
    id: 'p-bangna', code: 'PC-26011', name: 'Bangna Logistics Hub', family: 'Type 4 Industrial',
    stage: 'Analysis', gate: 'G3' as Gate, gateState: 'needsAttention' as GateState,
    sourceRevision: 'SRC-R04', designBasisRevision: 'DB-R03', modelRevision: 'PM-R06', analysisRevision: 'AN-R08',
    engineer: 'กานต์ พ.', checker: 'วิภา ส.', due: '12 Sep 2026', issues: 5, updated: '1 ชั่วโมงที่แล้ว', progress: 4,
  },
  {
    id: 'p-rayong', code: 'PC-26008', name: 'Rayong Workforce Campus', family: 'Type 2 Residential',
    stage: 'Drawing & Export', gate: 'G6' as Gate, gateState: 'approved' as GateState,
    sourceRevision: 'SRC-R03', designBasisRevision: 'DB-R02', modelRevision: 'PM-R09', analysisRevision: 'AN-R11',
    engineer: 'ปวีณา ช.', checker: 'นรินทร์ ว.', due: '18 Sep 2026', issues: 0, updated: 'เมื่อวาน', progress: 7,
  },
] as const;

export const projectMemberships: ProjectMembership[] = projects.map((project) => ({
  uid: currentUser.uid,
  orgId: activeOrganization.id,
  projectId: project.id,
  roles: project.id === 'p-rayong' ? ['engineeringChecker', 'productionManager'] : ['engineeringChecker'],
  capabilities: project.id === 'p-rayong' ? ['productionRelease'] : [],
  status: 'active',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
}));

export const members: Array<{
  id: string; name: string; initials: string; email: string; status: 'Active' | 'Invited' | 'Suspended';
  orgRole: string; roles: ProjectRole[]; projects: number; expires?: string;
}> = [
  { id: 'admin-malee', name: 'มาลี รัตนวงศ์', initials: 'มร', email: 'malee.admin@example.local', status: 'Active', orgRole: 'Organization Admin', roles: ['projectManager'], projects: 8 },
  { id: 'engineer-supachai', name: 'ศุภชัย กิตติวร', initials: 'ศก', email: 'supachai.engineer@example.local', status: 'Active', orgRole: '—', roles: ['structuralEngineer'], projects: 3 },
  { id: 'checker-narin', name: 'นรินทร์ วัฒนกิจ', initials: 'นว', email: 'narin.checker@example.local', status: 'Active', orgRole: 'Organization Admin', roles: ['engineeringChecker'], projects: 5 },
  { id: 'bim-arin', name: 'อรินทร์ ศรีสวัสดิ์', initials: 'อส', email: 'arin.bim@example.local', status: 'Active', orgRole: '—', roles: ['bimCoordinator'], projects: 4 },
  { id: 'qs-siriporn', name: 'ศิริพร ตั้งมั่น', initials: 'ศต', email: 'siriporn.qs@example.local', status: 'Invited', orgRole: '—', roles: ['costEstimator'], projects: 2, expires: '30 Sep 2026' },
  { id: 'detailer-kawin', name: 'กวิน พงษ์ศักดิ์', initials: 'กพ', email: 'kawin.detailer@example.local', status: 'Suspended', orgRole: '—', roles: ['detailer'], projects: 1 },
];

export const approvalRequests: ApprovalRequest[] = [
  {
    id: 'apr-db-r02', orgId: activeOrganization.id, projectId: 'p-rama9', artifactType: 'designBasis', artifactId: 'db-r02',
    artifactRevision: 'DB-R02', snapshotHash: `sha256:${'a4'.repeat(32)}`, requestedAction: 'approve', requiredRole: 'engineeringChecker',
    assignedTo: currentUser.uid, status: 'open', requestedBy: 'engineer-supachai', requestedAt: '2026-09-05T02:10:00.000Z',
    dueAt: '2026-09-09T10:00:00.000Z', blockingConditions: [],
  },
  {
    id: 'apr-analysis-r08', orgId: activeOrganization.id, projectId: 'p-bangna', artifactType: 'analysis', artifactId: 'an-r08',
    artifactRevision: 'AN-R08', snapshotHash: `sha256:${'b7'.repeat(32)}`, requestedAction: 'approve', requiredRole: 'engineeringChecker',
    assignedTo: currentUser.uid, status: 'open', requestedBy: 'engineer-karn', requestedAt: '2026-09-04T08:30:00.000Z',
    dueAt: '2026-09-08T10:00:00.000Z', blockingConditions: ['Equilibrium warning requires disposition', '1 NOT CHECKED item'],
  },
];

export const deterministicMockAnalysis = {
  schemaVersion: '0.1.0-mock',
  engine: 'precast-mock-fixture@0.1.0',
  inputHash: `sha256:${'2d'.repeat(32)}`,
  outputHash: `sha256:${'91'.repeat(32)}`,
  status: 'NOT CHECKED',
  disclaimer: 'This local fixture is not authoritative and is not suitable for design or production.',
};
