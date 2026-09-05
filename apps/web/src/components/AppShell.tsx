import { useState } from 'react';
import '../studio.css';
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { activeOrganization } from '../fixtures/workspace';
import { useAuth } from '../auth/AuthContext';
import { Icon } from './Icon';
import { useProjectDirectory } from '../data/useProjectDirectory';
import { gateText, stageFor, stageHref, studioStages } from '../data/studioNavigation';

export function AppShell() {
  const { user, mode, organizationMembership } = useAuth();
  const { orgId, projectId, gateId } = useParams();
  const { projects } = useProjectDirectory();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const project = projects.find((item) => item.id === projectId);
  const base = `/org/${orgId ?? organizationMembership.orgId}`;
  const stage = gateId ? stageFor(gateId, new URLSearchParams(location.search).get('view')) : null;
  const links = [
    { to: 'projects', label: 'ทุกโครงการ', icon: 'portfolio' as const },
    { to: 'review', label: 'งานรอตรวจ', icon: 'review' as const },
    { to: 'team', label: 'ทีมและสิทธิ์', icon: 'team' as const },
    { to: 'audit', label: 'ประวัติการดำเนินงาน', icon: 'audit' as const },
    ...(mode === 'shared' ? [{ to: 'libraries', label: 'คลังข้อมูลวิศวกรรม', icon: 'portfolio' as const }, { to: 'settings', label: 'ตั้งค่า', icon: 'team' as const }] : []),
  ];
  return <div className={`app-shell studio-shell ${menuOpen ? 'studio-menu-open' : ''}`}>
    <a className="studio-skip" href="#studio-main">ข้ามไปเนื้อหาหลัก</a>
    <aside className="sidebar" id="studio-navigation">
      <NavLink to={`${base}/projects`} className="brand" onClick={() => setMenuOpen(false)}><span className="brand__mark"><Icon name="cube" size={24} /></span><span><strong>PRECAST STUDIO</strong><small>Engineering Platform</small></span></NavLink>
      <nav className="primary-nav" aria-label="เมนูหลัก">
        {links.map((item) => <NavLink key={item.to} end={item.to === 'projects'} to={`${base}/${item.to}`} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}><Icon name={item.icon} size={18} />{item.label}</NavLink>)}
        {project ? <>
          <NavLink to={`${base}/projects/${project.id}/overview`} className="studio-project-context" onClick={() => setMenuOpen(false)}><small>โครงการปัจจุบัน</small><strong>{project.name}</strong><span>{project.code} · {project.sourceRevision}</span></NavLink>
          <p className="nav-label">ขั้นตอนการออกแบบ</p>
          <ol className="studio-stage-nav" aria-label="ขั้นตอนการออกแบบพรีคาสท์">{studioStages.map((item, index) => {
            const state = project.gateStates[item.gate];
            return <li key={item.id}><NavLink to={stageHref(`${base}/projects/${project.id}`, item)} onClick={() => setMenuOpen(false)} className={stage?.id === item.id ? 'studio-stage-active' : ''} aria-current={stage?.id === item.id ? 'step' : undefined}><span>{index + 1}</span><strong>{item.label}</strong><small title={`${item.gate} · ${state ? gateText[state] : 'ยังไม่มีข้อมูลสถานะ'}`}>{state === 'approved' ? '✓' : state === 'needsAttention' || state === 'outOfDate' ? '!' : '○'}</small></NavLink></li>;
          })}</ol>
        </> : <><p className="nav-label nav-label--spaced">โครงการที่เข้าถึงได้</p>{projects.map((item) => <NavLink key={item.id} to={`${base}/projects/${item.id}/overview`} className="project-link" onClick={() => setMenuOpen(false)}><span className={`project-dot project-dot--${item.gateState}`} /><span><strong>{item.code}</strong><small>{item.name}</small></span></NavLink>)}</>}
      </nav>
      <div className="sidebar__footer"><div className="fixture-mode"><span />{mode === 'fixture' ? 'โหมดตัวอย่าง · ไม่ใช่งานอนุมัติ' : mode === 'shared' ? 'Firebase · พื้นที่ข้อมูลร่วม' : 'Local Emulator · ข้อมูลทดสอบ'}</div></div>
    </aside>
    <main className="workspace" id="studio-main">
      <header className="topbar">
        <button className="studio-menu-toggle button button--secondary" type="button" aria-expanded={menuOpen} aria-controls="studio-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'ปิดเมนู' : 'เมนู'}</button>
        <div className="breadcrumbs"><span>{project?.code ?? (organizationMembership.orgId === activeOrganization.id ? activeOrganization.shortName : organizationMembership.orgId)}</span><b>/</b><strong>{stage?.label ?? (project ? 'ภาพรวมโครงการ' : links.find((item) => location.pathname.endsWith(`/${item.to}`))?.label ?? 'พื้นที่ทำงาน')}</strong></div>
        <div className="topbar__actions"><NavLink className="studio-header-link" to={`${base}/review`}>งานรอตรวจ</NavLink><div className="user-menu"><span className="avatar">{user.initials}</span><span><strong>{user.name}</strong><small>{mode === 'fixture' ? 'ผู้ตรวจ · ตัวอย่าง' : 'สมาชิกโครงการ'}</small></span></div></div>
      </header>
      <div className="page"><Outlet /></div>
    </main>
  </div>;
}
