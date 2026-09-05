import { useEffect, useState } from 'react';
import { StatusBadge, Surface } from '@precast/ui';
import type { AuditEvent } from '@precast/domain';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icon';
import { watchAuditEvents } from '../data/workflowRepository';

const fixtureEvents: AuditEvent[] = [
  { id: 'audit-1', orgId: 'org-siam', projectId: 'p-rama9', artifactType: 'designBasis', artifactId: 'db-r02', artifactRevision: 'DB-R02', action: 'submit', stateBefore: 'draft', stateAfter: 'submitted', actorUid: 'engineer-supachai', effectiveRoles: ['structuralEngineer'], delegatedCapabilities: [], occurredAt: '2026-09-05T02:10:00.000Z', requestId: 'apr-db-r02', idempotencyKey: 'fixture-submit', snapshotHash: `sha256:${'a4'.repeat(32)}` },
];

export function AuditTimeline() {
  const { mode, organizationMembership, projectMemberships } = useAuth();
  const projectId = projectMemberships[0]?.projectId;
  const [events, setEvents] = useState(mode === 'fixture' ? fixtureEvents : []);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'emulator' || projectId === undefined) return;
    return watchAuditEvents(organizationMembership.orgId, projectId, setEvents, (reason) => setError(reason.message));
  }, [mode, organizationMembership.orgId, projectId]);

  return <>
    <div className="page-heading"><p className="eyebrow">AUDIT TIMELINE</p><h1>ประวัติการดำเนินงาน</h1><p>ติดตามผู้ดำเนินการ Revision และหลักฐานของแต่ละรายการ{mode === 'fixture' ? ' · ข้อมูลตัวอย่าง' : ''}</p></div>
    {error !== '' && <div className="toast toast--error">{error}</div>}
    <Surface className="audit-timeline">
      {events.map((event) => <article key={event.id}><span className="audit-icon"><Icon name="shield" /></span><div><small>{new Date(event.occurredAt).toLocaleString('th-TH')} · {event.projectId}</small><h2>{event.action.toUpperCase()} {event.artifactType} {event.artifactRevision}</h2><p><b>{event.actorUid}</b> changed <code>{event.stateBefore}</code> → <code>{event.stateAfter}</code></p><details><summary>Technical trace</summary><dl><div><dt>Request</dt><dd>{event.requestId}</dd></div><div><dt>Idempotency</dt><dd>{event.idempotencyKey}</dd></div><div><dt>Snapshot</dt><dd>{event.snapshotHash}</dd></div></dl></details></div><StatusBadge tone="neutral">Immutable</StatusBadge></article>)}
      {events.length === 0 && <div className="queue-clear"><span>◇</span><strong>No audit events</strong><p>Authoritative commands will append events here.</p></div>}
    </Surface>
  </>;
}
