import { Link } from 'react-router-dom';
import { Button, StatusBadge, Surface } from '@precast/ui';
import { activeOrganization, approvalRequests, projects } from '../fixtures/workspace';
import { Icon } from '../components/Icon';

const toneByState = {
  approved: 'success', readyForReview: 'info', needsAttention: 'warning', notStarted: 'neutral',
  inProgress: 'info', outOfDate: 'danger', superseded: 'neutral',
} as const;

const labelByState = {
  approved: 'Approved', readyForReview: 'Ready for review', needsAttention: 'Needs attention', notStarted: 'Not started',
  inProgress: 'In progress', outOfDate: 'Out of date', superseded: 'Superseded',
} as const;

export function Portfolio() {
  return (
    <>
      <div className="page-heading page-heading--action">
        <div><p className="eyebrow">ORGANIZATION PORTFOLIO</p><h1>Engineering projects</h1><p>Gate status, revision context and review workload across active projects.</p></div>
        <Button type="button">＋ Create project</Button>
      </div>

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
    </>
  );
}

