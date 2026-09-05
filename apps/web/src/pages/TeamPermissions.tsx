import { Button, StatusBadge, Surface } from '@precast/ui';
import { members } from '../fixtures/workspace';
import { Icon } from '../components/Icon';

const roleLabels: Record<string, string> = {
  projectManager: 'Project Manager', bimCoordinator: 'BIM Coordinator', structuralEngineer: 'Structural Engineer',
  engineeringChecker: 'Engineering Checker', costEstimator: 'QS / Cost Estimator', detailer: 'Detailer', productionManager: 'Production Manager',
};

export function TeamPermissions() {
  return (
    <>
      <div className="page-heading page-heading--action">
        <div><p className="eyebrow">ACCESS CONTROL · ROLE MATRIX V1</p><h1>Team & permissions</h1><p>Organization membership, project roles and explicit delegated capabilities.</p></div>
        <Button type="button">＋ Invite member</Button>
      </div>

      <Surface className="policy-banner">
        <span><Icon name="shield" /></span>
        <div><strong>Separation of Duties is enforced server-side</strong><p>Organization Admin does not receive technical approval rights. Artifact creators cannot approve their own revision.</p></div>
        <span className="policy-version">Approved v1 · 05 Sep 2026</span>
      </Surface>

      <Surface className="team-register">
        <div className="register-toolbar">
          <div><h2>Organization members</h2><p>{members.filter((member) => member.status === 'Active').length} active · {members.length} total</p></div>
          <div className="toolbar-controls"><label className="search-field"><Icon name="search" size={17} /><input aria-label="Search members" placeholder="Search name or email" /></label><select aria-label="Filter role"><option>All roles</option><option>Engineering Checker</option><option>Structural Engineer</option></select></div>
        </div>
        <div className="table-scroll">
          <table className="data-table team-table">
            <thead><tr><th>Member</th><th>Status</th><th>Organization role</th><th>Project roles</th><th>Projects</th><th>Access term</th><th aria-label="Actions" /></tr></thead>
            <tbody>{members.map((member) => <tr key={member.id}>
              <td><div className="member-cell"><span className="avatar">{member.initials}</span><span><strong>{member.name}</strong><small>{member.email}</small></span></div></td>
              <td><StatusBadge tone={member.status === 'Active' ? 'success' : member.status === 'Invited' ? 'info' : 'neutral'}>{member.status}</StatusBadge></td>
              <td>{member.orgRole}</td>
              <td><div className="role-chips">{member.roles.map((role) => <span key={role}>{roleLabels[role] ?? role}</span>)}</div></td>
              <td><strong>{member.projects}</strong></td>
              <td>{member.expires === undefined ? <span className="muted">No expiry</span> : <><span>{member.expires}</span><small className="cell-note warning-text">Expires soon</small></>}</td>
              <td><button className="row-action" aria-label={`Edit access for ${member.name}`}>•••</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      </Surface>

      <div className="role-summary-grid">
        <Surface><span className="summary-number">8</span><div><strong>Standard human roles</strong><p>Scoped by organization or project membership.</p></div></Surface>
        <Surface><span className="summary-number">9</span><div><strong>Approved action verbs</strong><p>Shared across UI, rules and backend authorization.</p></div></Surface>
        <Surface><span className="summary-number">0</span><div><strong>Policy overrides active</strong><p>No small-team exception is enabled in fixtures.</p></div></Surface>
      </div>
    </>
  );
}
