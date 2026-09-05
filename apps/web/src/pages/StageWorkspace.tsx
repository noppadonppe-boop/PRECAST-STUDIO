import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, EmptyState, StatusBadge, Surface } from '@precast/ui';
import { gateLabels, gates, type Gate, type PermissionContext } from '@precast/domain';
import { activeOrganization, projects } from '../fixtures/workspace';
import { useAuth } from '../auth/AuthContext';
import { submitDesignBasis, watchDesignBasis, type DesignBasisState } from '../data/workflowRepository';
import { Can } from '../permissions/guards';

const stageDescriptions: Record<Gate, string> = {
  G0: 'BIM intake, source validation and immutable revision acceptance are planned for M2.',
  G1: 'M1 provides transactional submission and approval; complete Design Basis authoring and locking continue in M2.',
  G2: 'Panelization, loads, supports and neutral analytical model authoring are outside M1.',
  G3: 'M1 retains a deterministic NOT CHECKED fixture; no FEM solver is implemented.',
  G4: 'Engineering design checks require a verified backend calculation service.',
  G5: 'Traceable quantity takeoff and preliminary estimate workflow follows approved design checks.',
  G6: 'Drawing register, DXF/PDF generation and preflight are not implemented in M1.',
  G7: 'No production release can be issued from this local fixture workspace.',
};

export function StageWorkspace() {
  const { projectId, gateId } = useParams();
  const { mode, organizationMembership, projectMemberships, user } = useAuth();
  const [artifact, setArtifact] = useState<DesignBasisState | null>(null);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const project = projects.find((item) => item.id === projectId);
  const gate = gates.find((item) => item.toLowerCase() === gateId);
  const membership = projectMemberships.find((item) => item.projectId === projectId);
  const permissionContext = useMemo<PermissionContext | null>(() => artifact === null || membership === undefined ? null : {
    userId: user.uid,
    orgId: membership.orgId,
    projectId: membership.projectId,
    roles: membership.roles,
    capabilities: membership.capabilities,
    membershipStatus: membership.status,
    ...(membership.expiresAt === undefined ? {} : { expiresAt: membership.expiresAt }),
    artifactStatus: artifact.status,
    artifactCreatedBy: artifact.createdBy,
    isCurrentRevision: true,
  }, [artifact, membership, user.uid]);

  useEffect(() => {
    if (mode !== 'emulator' || projectId === undefined || gate !== 'G1') return;
    return watchDesignBasis(organizationMembership.orgId, projectId, 'db-r02', setArtifact, (reason) => setNotice(reason.message));
  }, [gate, mode, organizationMembership.orgId, projectId]);

  async function submit() {
    if (artifact === null || projectId === undefined) return;
    setSaving(true);
    setNotice('');
    try {
      await submitDesignBasis({ orgId: organizationMembership.orgId, projectId, artifact, assignedTo: 'checker-narin' });
      setNotice(`${artifact.revision} submitted to an independent checker.`);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Submit command failed.');
    } finally {
      setSaving(false);
    }
  }

  if (project === undefined || gate === undefined) return null;

  return <>
    <div className="project-heading"><div><Link to={`/org/${activeOrganization.id}/projects/${project.id}/overview`}>← Project overview</Link><p className="eyebrow">{project.code} · {gate}</p><h1>{gateLabels[gate]}</h1></div><StatusBadge tone={project.gate === gate ? 'info' : 'neutral'}>{project.gate === gate ? 'Current gate' : 'Read-only scaffold'}</StatusBadge></div>
    <Surface className="revision-context" ariaLabel="Current revision context"><div><small>SOURCE</small><strong>{project.sourceRevision}</strong><span>Immutable reference</span></div><i>→</i><div><small>DESIGN BASIS</small><strong>{project.designBasisRevision}</strong><span>Project context</span></div><i>→</i><div><small>MODEL</small><strong>{project.modelRevision}</strong><span>Version reference</span></div><i>→</i><div><small>ANALYSIS</small><strong>{project.analysisRevision}</strong><span>Version reference</span></div></Surface>
    {notice !== '' && <div className="toast" role="status">{notice}</div>}
    {gate === 'G1' && mode === 'emulator' && artifact !== null && permissionContext !== null && <Surface className="submission-panel">
      <div><p className="eyebrow">AUTHORITATIVE DESIGN BASIS COMMAND</p><h2>{artifact.revision}</h2><p>Snapshot hash and upstream currency are revalidated inside a Firestore transaction.</p></div>
      <StatusBadge tone={artifact.status === 'draft' ? 'neutral' : artifact.status === 'submitted' ? 'info' : 'success'}>{artifact.status}</StatusBadge>
      <Can action="submit" resource="designBasis" context={permissionContext}><Button type="button" disabled={saving || artifact.status !== 'draft'} onClick={submit}>{saving ? 'Submitting…' : 'Submit for independent approval'}</Button></Can>
    </Surface>}
    <Surface className="stage-placeholder"><EmptyState icon={gate} title={`${gate} workspace is safely scaffolded`} detail={stageDescriptions[gate]} /><div className="stage-link-row">{gates.map((item) => <Link className={item === gate ? 'active' : ''} key={item} to={`/org/${activeOrganization.id}/projects/${project.id}/stages/${item.toLowerCase()}`}>{item}</Link>)}</div></Surface>
  </>;
}
