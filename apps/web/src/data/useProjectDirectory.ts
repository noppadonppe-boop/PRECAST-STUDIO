import { useEffect, useState } from 'react';
import type { Gate, GateState, ProjectRecord } from '@precast/domain';
import { useAuth } from '../auth/AuthContext';
import { projects as fixtures } from '../fixtures/workspace';
import { watchProjects } from './workflowRepository';
import { gateFromStage } from './studioNavigation';
import { watchSharedCollection } from './sharedRepository';

export interface StudioProject {
  exampleProfileId?: string;
  id: string; code: string; name: string; family: string; gate: Gate; gateState: GateState;
  gateStates: Partial<Record<Gate, GateState>>; sourceRevision: string; designBasisRevision: string;
  modelRevision: string; analysisRevision: string; engineer: string; checker: string; due: string;
  updated: string; issues: number | null; assignees: string[];
}
export function toStudioProject(item: ProjectRecord): StudioProject {
  const gate = gateFromStage(item.currentStage);
  return { id: item.id, code: item.code, name: item.name, family: item.productFamilyId ?? 'ยังไม่ระบุประเภท',
    gate, gateState: item.gateStates[gate] ?? 'notStarted', gateStates: item.gateStates,
    sourceRevision: item.currentSourceRevisionId ?? '—', designBasisRevision: item.currentDesignBasisVersionId ?? '—',
    modelRevision: item.currentModelVersionId ?? '—', analysisRevision: item.currentApprovedAnalysisRunId ?? '—',
    engineer: 'ทีมโครงการ', checker: 'ดูผู้ตรวจในรายการอนุมัติ', due: item.dueAt?.slice(0, 10) ?? 'ยังไม่ระบุ',
    updated: item.updatedAt?.slice(0, 10) ?? '—', issues: null, assignees: item.assignedUserIds };
}
export function useProjectDirectory() {
  const { mode, organizationMembership, projectMemberships, accessRevision } = useAuth();
  const [records, setRecords] = useState<{ scope: string; projects: StudioProject[]; error: string } | null>(null);
  const scope = JSON.stringify([organizationMembership.orgId, projectMemberships.map((item) => item.projectId).sort(), accessRevision]);
  useEffect(() => {
    if (mode === 'shared') return watchSharedCollection<StudioProject>('projects', (items) => setRecords({ scope, projects: items.map((item) => ({ ...item.data, id: item.id })), error: '' }),
      (reason) => setRecords({ scope, projects: [], error: reason.message }));
    if (mode !== 'emulator') return;
    const [orgId, ids] = JSON.parse(scope) as [string, string[], string];
    let active = true;
    if (ids.length === 0) { setRecords({ scope, projects: [], error: '' }); return; }
    const stop = watchProjects(orgId, ids, (items) => { if (active) setRecords({ scope, projects: items.filter((item) => item.status !== 'archived').map(toStudioProject), error: '' }); },
      (reason) => { if (active) setRecords({ scope, projects: [], error: reason.message }); });
    return () => { active = false; stop(); };
  }, [mode, scope]);
  const projects: StudioProject[] = mode === 'fixture' ? fixtures.map((item) => ({ ...item, gateStates: { [item.gate]: item.gateState }, assignees: [item.engineer, item.checker] })) : records?.scope === scope ? records.projects : [];
  return { projects, loading: mode !== 'fixture' && records?.scope !== scope, error: records?.scope === scope ? records.error : '', mode };
}
