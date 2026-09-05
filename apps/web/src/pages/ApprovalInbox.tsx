import { useEffect, useMemo, useState } from 'react';
import { Button, StatusBadge, Surface } from '@precast/ui';
import type { ApprovalRequest, PermissionContext } from '@precast/domain';
import { approvalRequests as initialRequests, projects } from '../fixtures/workspace';
import { Can } from '../permissions/guards';
import { Icon } from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { approveRequest, returnRequest, watchApprovalInbox } from '../data/workflowRepository';

const artifactLabels = {
  sourceRevision: 'Source revision', designBasis: 'Design Basis', analysis: 'Analysis snapshot', estimate: 'Estimate',
  calculation: 'Calculation report', drawingSet: 'Drawing set', releasePackage: 'Release package',
};

export function ApprovalInbox() {
  const { user, mode, organizationMembership, projectMemberships, accessRevision } = useAuth();
  const [requests, setRequests] = useState(mode === 'fixture' ? initialRequests : []);
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [decisionComment, setDecisionComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const open = requests.filter((request) => request.status === 'open');
  const decided = requests.filter((request) => request.status === 'approved');
  const project = selected === null ? undefined : projects.find((item) => item.id === selected.projectId);
  const permissionContext = useMemo<PermissionContext | null>(() => {
    if (selected === null) return null;
    const membership = projectMemberships.find((item) => item.projectId === selected.projectId);
    if (membership === undefined) return null;
    return {
      userId: user.uid, orgId: membership.orgId, projectId: membership.projectId, roles: membership.roles,
      capabilities: membership.capabilities, membershipStatus: membership.status,
      ...(membership.expiresAt === undefined ? {} : { expiresAt: membership.expiresAt }),
      artifactStatus: 'submitted', artifactCreatedBy: selected.requestedBy, isCurrentRevision: true,
    };
  }, [projectMemberships, selected, user.uid]);

  useEffect(() => {
    if (mode !== 'emulator') return;
    const projectIds = projectMemberships.map((membership) => membership.projectId);
    if (projectIds.length === 0) {
      setRequests([]);
      return;
    }
    return watchApprovalInbox(organizationMembership.orgId, projectIds, user.uid, setRequests, (reason) => setNotice(`Unable to load approval inbox: ${reason.message}`));
  }, [accessRevision, mode, organizationMembership.orgId, projectMemberships, user.uid]);

  function openSnapshot(request: ApprovalRequest) {
    setAcknowledged(false);
    setDecisionComment('');
    setNotice('');
    setSelected(request);
  }

  async function approve() {
    if (selected === null || !acknowledged || selected.blockingConditions.length > 0) return;
    const request = selected;
    setSaving(true);
    try {
      if (mode === 'emulator') await approveRequest(request, decisionComment.trim() || undefined);
      else setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: 'approved' } : item));
      setSelected(null);
      setNotice(`${request.artifactRevision} approved${mode === 'fixture' ? ' in local fixture state' : ' by an idempotent emulator command'}.`);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Approval command failed.');
    } finally {
      setSaving(false);
    }
  }

  async function returnForCorrection() {
    if (selected === null || decisionComment.trim().length === 0) return;
    const request = selected;
    setSaving(true);
    try {
      if (mode === 'emulator') await returnRequest(request, decisionComment.trim());
      else setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: 'returned' } : item));
      setSelected(null);
      setNotice(`${request.artifactRevision} returned for correction with an auditable comment.`);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Return command failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading page-heading--action"><div><p className="eyebrow">MY WORK · IMMUTABLE REVIEW SNAPSHOTS</p><h1>Approval inbox</h1><p>Review requests assigned to your active project roles.</p></div><Button variant="secondary" type="button">Filter queue</Button></div>
      {notice !== '' && <div className="toast" role="status">✓ {notice}</div>}

      <div className="inbox-tabs" role="tablist" aria-label="Approval groups"><button className="active" role="tab" aria-selected="true">Needs my action <span>{open.length}</span></button><button role="tab" aria-selected="false">Submitted by me</button><button role="tab" aria-selected="false">Returned</button><button role="tab" aria-selected="false">Recently decided <span>{decided.length}</span></button></div>
      <Surface className="approval-list">
        <div className="approval-list__header"><span>Request</span><span>Gate / state</span><span>Due</span><span /></div>
        {open.map((request) => {
          const requestProject = projects.find((item) => item.id === request.projectId);
          return <button type="button" className="approval-row" key={request.id} onClick={() => openSnapshot(request)}>
            <span className="approval-type-icon"><Icon name={request.artifactType === 'analysis' ? 'cube' : 'shield'} /></span>
            <span className="approval-main"><small>{requestProject?.code} · {artifactLabels[request.artifactType]}</small><strong>{requestProject?.name}</strong><span>{request.artifactRevision} · submitted by {request.requestedBy.replace('engineer-', '')}</span></span>
            <span><StatusBadge tone={request.blockingConditions.length > 0 ? 'warning' : 'info'}>{request.blockingConditions.length > 0 ? `${request.blockingConditions.length} blockers` : 'Ready for review'}</StatusBadge><small className="cell-note">{requestProject?.gate}</small></span>
            <span className="approval-due"><strong>{request.dueAt?.slice(0, 10)}</strong><small>{request.blockingConditions.length > 0 ? 'Needs disposition' : 'Within SLA'}</small></span>
            <Icon name="chevron" />
          </button>;
        })}
        {open.length === 0 && <div className="queue-clear"><span>✓</span><strong>Queue clear</strong><p>No immutable snapshot is waiting for your action.</p></div>}
      </Surface>

      <Surface className="workflow-note"><Icon name="shield" /><div><strong>Server remains authoritative · {mode} mode</strong><p>Direct client approval is denied. M2 commands revalidate membership, role, artifact state, blockers, snapshot hash, upstream currency and Separation of Duties in a transaction.</p></div></Surface>

      {selected !== null && permissionContext !== null && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}>
          <div className="approval-dialog" role="dialog" aria-modal="true" aria-labelledby="approval-title">
            <div className="dialog-header"><div><p className="eyebrow">APPROVE IMMUTABLE SNAPSHOT</p><h2 id="approval-title">{artifactLabels[selected.artifactType]} · {selected.artifactRevision}</h2></div><button aria-label="Close approval dialog" className="icon-button" onClick={() => setSelected(null)}><Icon name="close" /></button></div>
            <div className="snapshot-banner"><span><Icon name="shield" /></span><div><strong>Snapshot identity verified</strong><p>Current fixture revision · content remains read-only</p></div><StatusBadge tone="success">Current</StatusBadge></div>
            <dl className="snapshot-grid">
              <div><dt>Project</dt><dd>{project?.code} · {project?.name}</dd></div>
              <div><dt>Requested action</dt><dd>{selected.requestedAction.toUpperCase()}</dd></div>
              <div><dt>Source / Design Basis</dt><dd>{project?.sourceRevision} / {project?.designBasisRevision}</dd></div>
              <div><dt>Model / Analysis</dt><dd>{project?.modelRevision} / {project?.analysisRevision}</dd></div>
              <div className="snapshot-grid__wide"><dt>SHA-256 snapshot hash</dt><dd className="hash">{selected.snapshotHash}</dd></div>
              <div><dt>Author</dt><dd>{selected.requestedBy}</dd></div>
              <div><dt>Approver</dt><dd>{user.name}</dd></div>
            </dl>
            <div className={`sod-check ${selected.requestedBy === user.uid ? 'sod-check--fail' : ''}`}><Icon name="shield" /><div><strong>Separation-of-Duties check</strong><p>{selected.requestedBy === user.uid ? 'Blocked: the approver created this artifact.' : 'Passed: author and approver are distinct active members.'}</p></div></div>
            {selected.blockingConditions.length > 0 && <div className="blocking-list"><strong><Icon name="warning" size={17} /> Approval blocked</strong>{selected.blockingConditions.map((condition) => <p key={condition}>• {condition}</p>)}</div>}
            <label className="decision-comment"><span>Decision comment <small>Required when returning</small></span><textarea value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} placeholder="Record review evidence or required correction…" /></label>
            <label className="acknowledgement"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> <span>I reviewed the exact snapshot, upstream revisions and unresolved-item summary.</span></label>
            <div className="dialog-actions"><Button variant="secondary" type="button" onClick={() => setSelected(null)}>Cancel</Button><Button variant="secondary" type="button" disabled={saving || decisionComment.trim().length === 0} onClick={returnForCorrection}>Return for correction</Button><Can action="approve" resource={selected.artifactType} context={permissionContext}><Button type="button" disabled={saving || !acknowledged || selected.blockingConditions.length > 0} onClick={approve}>{saving ? 'Saving…' : 'Approve snapshot'}</Button></Can></div>
          </div>
        </div>
      )}
    </>
  );
}
