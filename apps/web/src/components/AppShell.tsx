import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { activeOrganization, projects } from '../fixtures/workspace';
import { useAuth } from '../auth/AuthContext';
import { Icon } from './Icon';

const organizationLinks = [
  { to: 'projects', label: 'Portfolio', icon: 'portfolio' as const },
  { to: 'review', label: 'Approval inbox', icon: 'review' as const, count: 2 },
  { to: 'team', label: 'Team & permissions', icon: 'team' as const },
  { to: 'audit', label: 'Audit timeline', icon: 'audit' as const },
  { to: 'libraries', label: 'Libraries', icon: 'library' as const },
];

export function AppShell() {
  const { user } = useAuth();
  const { orgId, projectId } = useParams();
  const location = useLocation();
  const currentProject = projects.find((project) => project.id === projectId);
  const base = `/org/${orgId ?? activeOrganization.id}`;
  const pageName = currentProject?.name ?? organizationLinks.find((item) => location.pathname.includes(`/${item.to}`))?.label ?? 'Workspace';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark"><Icon name="cube" size={22} /></span>
          <span><strong>PRECAST</strong><small>ENGINEERING</small></span>
        </div>
        <button className="org-switcher" type="button">
          <span className="avatar avatar--org">{activeOrganization.shortName}</span>
          <span><strong>{activeOrganization.name}</strong><small>Organization workspace</small></span>
          <span aria-hidden="true">⌄</span>
        </button>
        <nav className="primary-nav" aria-label="Organization navigation">
          <p className="nav-label">WORKSPACE</p>
          {organizationLinks.map((item) => (
            <NavLink key={item.to} to={`${base}/${item.to}`} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>{item.count !== undefined && <em>{item.count}</em>}
            </NavLink>
          ))}
          <p className="nav-label nav-label--spaced">ACTIVE PROJECTS</p>
          {projects.slice(0, 3).map((project) => (
            <NavLink key={project.id} to={`${base}/projects/${project.id}/overview`} className={({ isActive }) => `project-link ${isActive ? 'project-link--active' : ''}`}>
              <span className={`project-dot project-dot--${project.gateState}`} />
              <span><strong>{project.code}</strong><small>{project.name}</small></span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <NavLink to={`${base}/settings`} className="nav-item"><Icon name="settings" size={19} />Settings</NavLink>
          <div className="fixture-mode"><span /> Local fixture mode</div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><Icon name="cube" /> PRECAST</div>
          <div className="breadcrumbs"><span>{activeOrganization.shortName}</span><b>/</b><strong>{pageName}</strong></div>
          <div className="topbar__actions">
            <button className="icon-button" aria-label="Search"><Icon name="search" /></button>
            <button className="icon-button has-notification" aria-label="Notifications"><Icon name="bell" /></button>
            <div className="user-menu">
              <span className="avatar">{user.initials}</span>
              <span><strong>{user.name}</strong><small>Checker · Org Admin</small></span>
              <span aria-hidden="true">⌄</span>
            </div>
          </div>
        </header>
        <div className="page"><Outlet /></div>
      </main>
    </div>
  );
}

