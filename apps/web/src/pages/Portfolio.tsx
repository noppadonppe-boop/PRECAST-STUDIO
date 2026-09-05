import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, StatusBadge, Surface } from '@precast/ui';
import { activeOrganization, approvalRequests, projects } from '../fixtures/workspace';
import { Icon } from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { createType2Project } from '../data/workflowRepository';

const toneByState = {
  approved: 'success', readyForReview: 'info', needsAttention: 'warning', notStarted: 'neutral',
  inProgress: 'info', outOfDate: 'danger', superseded: 'neutral',
} as const;

const labelByState = {
  approved: 'Approved', readyForReview: 'Ready for review', needsAttention: 'Needs attention', notStarted: 'Not started',
  inProgress: 'In progress', outOfDate: 'Out of date', superseded: 'Superseded',
} as const;

export function Portfolio() {
  const { mode, organizationMembership } = useAuth();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [code, setCode] = useState('PC-26021');
  const [name, setName] = useState('Type 2 Residential Pilot');

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (mode === 'emulator') {
        const projectId = `p-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
        await createType2Project({ orgId: organizationMembership.orgId, projectId, code, name });
        setNotice(`${code} created from Type 2 template. Membership and audit event were committed atomically.`);
      } else {
        setNotice('Project creation preview validated in fixture mode; switch to emulator mode to persist it.');
      }
      setCreating(false);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Project creation failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading page-heading--action">
        <div><p className="eyebrow">ORGANIZATION PORTFOLIO</p><h1>Engineering projects</h1><p>Gate status, revision context and review workload across active projects.</p></div>
        <Button type="button" onClick={() => setCreating(true)} disabled={!organizationMembership.orgRoles.includes('orgAdmin')}>＋ Create project</Button>
      </div>
      {notice !== '' && <div className="toast" role="status">{notice}</div>}

      <div className="metric-grid">
        <Surface className="metric"><span className="metric__icon metric__icon--green"><Icon name="cube" /></span><div><strong>12</strong><small>Active projects</small></div><em>+2 this month</em></Surface>
        <Surface className="metric"><span className="metric__icon metric__icon--blue"><Icon name="review" /></span><div><strong>{approvalRequests.length}</strong><small>Needs my action</small></div><em>1 due soon</em></Surface>
        <Surface className="metric"><span className="metric__icon metric__icon--amber"><Icon name="warning" /></span><div><strong>7</strong><small>Open critical issues</small></div><em>Across 2 projects</em></Surface>
        <Surface className="metric"><span className="metric__icon metric__icon--gray"><Icon name="shield" /></span><div><strong>3</strong><small>Ready for release</small></div><em>Distinct actor required</em></Surface>
      </div>

      <Surface className="project-register">
        <div className="register-toolbar">
          <div><h2>Project register</h2><p>{projects.length} fixture projects · current revision status</p></div>
          <div className="toolbar-controls">
            <label className="search-field"><Icon name="search" size={17} /><input aria-label="Search projects" placeholder="Search project or code" /></label>
            <select aria-label="Filter by gate"><option>All gates</option><option>Needs attention</option><option>Ready for review</option><option>Approved</option></select>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table project-table">
            <thead><tr><th>Project</th><th>Current gate</th><th>Revision context</th><th>Engineer / Checker</th><th>Issues</th><th>Due</th><th aria-label="Open" /></tr></thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td><Link className="project-title" to={`/org/${activeOrganization.id}/projects/${project.id}/overview`}><span className="project-monogram">{project.code.slice(-2)}</span><span><strong>{project.name}</strong><small>{project.code} · {project.family}</small></span></Link></td>
                  <td><StatusBadge tone={toneByState[project.gateState]}>{labelByState[project.gateState]}</StatusBadge><small className="cell-note">{project.gate} · {project.stage}</small></td>
                  <td><div className="revision-stack"><span>SRC <b>{project.sourceRevision}</b></span><span>DB <b>{project.designBasisRevision}</b></span><span>MODEL <b>{project.modelRevision}</b></span></div></td>
                  <td><span className="people-pair"><i>SE</i>{project.engineer}</span><span className="people-pair"><i>CK</i>{project.checker}</span></td>
                  <td>{project.issues > 0 ? <span className="issue-count"><Icon name="warning" size={15} />{project.issues}</span> : <span className="clear-count">✓ 0</span>}</td>
                  <td><strong className="date-cell">{project.due}</strong><small className="cell-note">{project.updated}</small></td>
                  <td><Link className="row-action" aria-label={`Open ${project.name}`} to={`/org/${activeOrganization.id}/projects/${project.id}/overview`}><Icon name="chevron" size={18} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
      {creating && <div className="dialog-backdrop" role="presentation"><form className="approval-dialog project-dialog" role="dialog" aria-modal="true" aria-labelledby="create-project-title" onSubmit={createProject}><div className="dialog-header"><div><p className="eyebrow">APPROVED PROJECT TEMPLATE</p><h2 id="create-project-title">Create Type 2 project</h2></div><button type="button" className="icon-button" aria-label="Close create project dialog" onClick={() => setCreating(false)}><Icon name="close" /></button></div><div className="template-card"><Icon name="cube" /><div><strong>Type 2 Residential · v1.0.0</strong><p>Creates an active project at G0 with project-manager membership and append-only audit event.</p></div></div><label className="form-field"><span>Project code</span><input value={code} onChange={(event) => setCode(event.target.value)} required minLength={3} maxLength={24} /></label><label className="form-field"><span>Project name</span><input value={name} onChange={(event) => setName(event.target.value)} required minLength={3} maxLength={120} /></label><p className="mode-note">Mode: <b>{mode}</b> · No production Firebase project is configured.</p><div className="dialog-actions"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create project'}</Button></div></form></div>}
    </>
  );
}
