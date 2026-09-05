import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, EmptyState, StatusBadge, Surface } from '@precast/ui';
import { approvalRequests } from '../fixtures/workspace';
import { Icon } from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { createType2Project } from '../data/workflowRepository';
import { useProjectDirectory } from '../data/useProjectDirectory';
import { gateText, gateTone, stageFor } from '../data/studioNavigation';
import { createSharedProject } from '../data/sharedRepository';

export function Portfolio() {
  const { organizationMembership, user } = useAuth();
  const { projects, mode, loading, error } = useProjectDirectory();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [pendingProject, setPendingProject] = useState('');
  const [code, setCode] = useState('PC-26021');
  const [name, setName] = useState('Type 2 Residential Pilot');
  const base = `/org/${organizationMembership.orgId}`;
  const visible = projects.filter((item) => `${item.code} ${item.name} ${item.family}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
    && (filter === 'all' || item.gateState === filter) && (assignee === 'all' || item.assignees.includes(assignee)));
  const assignees = [...new Set(projects.flatMap((item) => item.assignees))];
  const issues = projects.every((item) => item.issues !== null) ? projects.reduce((sum, item) => sum + (item.issues ?? 0), 0) : null;
  const needsReview = mode === 'fixture' ? approvalRequests.filter((item) => item.assignedTo === user.uid && item.status === 'open' && projects.some((project) => project.id === item.projectId)).length : null;
  const approved = projects.filter((item) => item.gateState === 'approved').length;
  useEffect(() => {
    if (pendingProject && projects.some((item) => item.id === pendingProject)) {
      setPendingProject('');
      void navigate(`${base}/projects/${pendingProject}/overview`);
    }
  }, [base, navigate, pendingProject, projects]);
  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'fixture') return;
    setSaving(true);
    try {
      const projectId = mode === 'shared' ? await createSharedProject({ code, name }) : `p-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      if (mode === 'emulator') await createType2Project({ orgId: organizationMembership.orgId, projectId, code, name });
      setCreating(false); setPendingProject(projectId); setNotice('สร้างโครงการแล้ว กำลังอัปเดตสิทธิ์และรายการโครงการ…');
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'สร้างโครงการไม่สำเร็จ'); }
    finally { setSaving(false); }
  }
  return <>
    <div className="page-heading page-heading--action"><div><p className="eyebrow">PROJECT PORTFOLIO</p><h1>โครงการทั้งหมด</h1><p>ติดตามงานออกแบบ วิเคราะห์ Shop Drawing และสถานะโครงการในมุมมองเดียว</p></div><div><Button onClick={() => setCreating(true)} disabled={mode !== 'shared' && !organizationMembership.orgRoles.includes('orgAdmin')}>＋ สร้างโครงการ</Button>{mode !== 'shared' && !organizationMembership.orgRoles.includes('orgAdmin') && <small className="cell-note">เฉพาะผู้ดูแลองค์กร</small>}</div></div>
    <p className="studio-mode-note">{mode === 'fixture' ? 'ข้อมูลตัวอย่างสำหรับทดลอง UX/UI · ไม่ใช่สถานะอนุมัติหรือส่งผลิตจริง' : mode === 'shared' ? 'Firebase · ข้อมูลร่วมของผู้ใช้ทุกคน' : 'ข้อมูลจาก Local Emulator · ค่า “—” หมายถึงยังไม่มีข้อมูลยืนยัน'}</p>
    {(notice || error) && <p className="toast toast--error" role="alert">{notice || error}</p>}
    <div className="metric-grid">
      <Surface className="metric"><span className="metric__icon"><Icon name="cube" /></span><div><strong>{loading ? '…' : projects.length}</strong><small>โครงการทั้งหมด</small></div><em>โครงการที่คุณเข้าถึงได้</em></Surface>
      <Surface className="metric"><span className="metric__icon metric__icon--blue"><Icon name="review" /></span><div><strong>{needsReview ?? '—'}</strong><small>งานรอคุณตรวจ</small></div><Link to={`${base}/review`}>เปิดรายการรอตรวจ →</Link></Surface>
      <Surface className="metric"><span className="metric__icon metric__icon--amber"><Icon name="warning" /></span><div><strong>{loading ? '…' : issues ?? '—'}</strong><small>ประเด็นที่ต้องแก้ไข</small></div><em>{issues === null ? 'ยังไม่มีข้อมูลจำนวนประเด็น' : 'รวมจากทะเบียนโครงการ'}</em></Surface>
      <Surface className="metric"><span className="metric__icon metric__icon--green"><Icon name="shield" /></span><div><strong>{loading ? '…' : approved}</strong><small>Gate ปัจจุบันอนุมัติแล้ว</small></div><button className="studio-text-button" onClick={() => setFilter('approved')}>ดูโครงการที่อนุมัติ →</button></Surface>
    </div>
    <Surface className="project-register"><div className="register-toolbar"><div><h2>ทะเบียนโครงการ</h2><p role="status">แสดง {visible.length} จาก {projects.length} โครงการ</p></div><div className="toolbar-controls">
      <label className="search-field"><Icon name="search" size={17} /><input aria-label="Search projects" placeholder="ค้นหาชื่อโครงการหรือรหัส" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <select aria-label="Filter by gate" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">ทุกสถานะ</option>{Object.entries(gateText).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="ผู้รับผิดชอบ" value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="all">ผู้รับผิดชอบทั้งหมด</option>{assignees.map((value) => <option key={value}>{value}</option>)}</select>
    </div></div>
      {loading ? <EmptyState icon="…" title="กำลังโหลดโครงการ" detail="กำลังอ่านรายการตามสิทธิ์ของคุณ" /> : <div className="table-scroll"><table className="data-table project-table"><thead><tr><th>โครงการ</th><th>ขั้นตอน / สถานะ</th><th>Revision อ้างอิง</th><th>วิศวกร / ผู้ตรวจ</th><th>ประเด็น</th><th>กำหนดส่ง</th></tr></thead><tbody>{visible.map((project) => <tr key={project.id}>
        <td><Link className="project-title" to={`${base}/projects/${project.id}/overview`}><span className="project-monogram">{project.code.slice(-2)}</span><span><strong>{project.name}</strong><small>{project.code} · {project.family}</small></span></Link></td>
        <td><StatusBadge tone={gateTone[project.gateState]}>{gateText[project.gateState]}</StatusBadge><small className="cell-note">{project.gate} · {stageFor(project.gate, null).label}</small></td>
        <td><div className="revision-stack"><span>SRC <b>{project.sourceRevision}</b></span><span>DB <b>{project.designBasisRevision}</b></span><span>MODEL <b>{project.modelRevision}</b></span></div></td>
        <td><span className="people-pair">{project.engineer}</span><span className="people-pair">{project.checker}</span></td>
        <td><span className={project.issues ? 'issue-count' : 'cell-note'}>{project.issues ?? '—'}</span></td><td><strong className="date-cell">{project.due}</strong><small className="cell-note">{project.updated}</small></td>
      </tr>)}</tbody></table>{!visible.length && <EmptyState icon="⌕" title="ไม่พบโครงการ" detail="ลองเปลี่ยนคำค้นหรือเงื่อนไขตัวกรอง" />}</div>}
    </Surface>
    {creating && <div className="dialog-backdrop"><form className="approval-dialog project-dialog" role="dialog" aria-modal="true" aria-labelledby="create-project-title" onSubmit={createProject} onKeyDown={(event) => { if (event.key === 'Escape') setCreating(false); }}><div className="dialog-header"><h2 id="create-project-title">สร้างโครงการ Type 2</h2><button type="button" className="icon-button" aria-label="ปิดหน้าต่าง" onClick={() => setCreating(false)}>×</button></div>
      {mode === 'fixture' ? <><p>โหมดนี้ใช้สำรวจหน้าจอด้วยข้อมูลตัวอย่าง การสร้างโครงการและบันทึก BIM ต้องใช้ Local Emulator หรือขั้นตอน Pilot ที่เชื่อมต่อแล้ว</p><Button type="button" onClick={() => setCreating(false)}>กลับไปดูโครงการตัวอย่าง</Button></> : <><label className="form-field"><span>รหัสโครงการ</span><input autoFocus value={code} onChange={(event) => setCode(event.target.value)} required minLength={3} maxLength={24} /></label><label className="form-field"><span>ชื่อโครงการ</span><input value={name} onChange={(event) => setName(event.target.value)} required minLength={3} maxLength={120} /></label><p>เริ่มต้น G0 และบันทึกประวัติการสร้างโครงการ</p>{notice && <p role="alert">{notice}</p>}<div className="dialog-actions"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>ยกเลิก</Button><Button type="submit" disabled={saving}>{saving ? 'กำลังสร้าง…' : 'สร้างโครงการ'}</Button></div></>}
    </form></div>}
  </>;
}
