import { useState } from 'react';
import { StatusBadge, Surface } from '@precast/ui';
import { members } from '../fixtures/workspace';
import { useAuth } from '../auth/AuthContext';

const roleLabels: Record<string, string> = { projectManager: 'Project Manager', bimCoordinator: 'BIM Coordinator', structuralEngineer: 'Structural Engineer', engineeringChecker: 'Engineering Checker', costEstimator: 'QS / Cost Estimator', detailer: 'Detailer', productionManager: 'Production Manager' };
const statusLabels = { Active: 'ใช้งาน', Invited: 'รอตอบรับ', Suspended: 'ระงับสิทธิ์' };
export function TeamPermissions() {
  const { mode } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState(members[0]!.id);
  const selected = members.find((item) => item.id === selectedId)!;
  const visible = members.filter((item) => `${item.name} ${item.email} ${item.roles.map((value) => roleLabels[value]).join(' ')}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) && (role === 'all' || item.roles.some((value) => value === role)) && (status === 'all' || item.status === status));
  return <>
    <div className="page-heading"><p className="eyebrow">TEAM & PERMISSIONS</p><h1>ทีมและสิทธิ์การเข้าถึง</h1><p>ดูบทบาทรายโครงการและข้อจำกัดการอนุมัติก่อนมอบหมายงาน</p></div>
    <p className="studio-mode-note">{mode === 'fixture' ? 'รายชื่อและสิทธิ์ตัวอย่าง · การดูข้อมูลไม่เปลี่ยนสิทธิ์จริง' : 'ตัวอย่าง Role Matrix · การจัดการสมาชิกจริงใช้ขั้นตอน Pilot provisioning'}</p>
    <div className="studio-engineering-grid"><Surface className="team-register"><div className="register-toolbar"><div><h2>สมาชิกตัวอย่าง</h2><p role="status">แสดง {visible.length} จาก {members.length} คน</p></div><div className="toolbar-controls"><label className="search-field"><input aria-label="Search members" placeholder="ค้นหาชื่อ อีเมล หรือ Role" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label="Filter role" value={role} onChange={(event) => setRole(event.target.value)}><option value="all">ทุกบทบาท</option>{Object.entries(roleLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><select aria-label="สถานะสมาชิก" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">ทุกสถานะ</option>{Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div></div>
    <div className="table-scroll"><table className="data-table studio-team-table"><thead><tr><th>ผู้ใช้</th><th>บทบาทโครงการ</th><th>สถานะ</th><th>สิทธิ์ถึง</th></tr></thead><tbody>{visible.map((member) => <tr key={member.id} className={selectedId === member.id ? 'studio-selected-row' : ''}><td><button type="button" className="studio-member-select" onClick={() => setSelectedId(member.id)}><span className="avatar">{member.initials}</span><span><strong>{member.name}</strong><small>{member.email}</small></span></button></td><td><div className="role-chips">{member.roles.map((value) => <span key={value}>{roleLabels[value]}</span>)}</div></td><td><StatusBadge tone={member.status === 'Active' ? 'success' : member.status === 'Invited' ? 'info' : 'neutral'}>{statusLabels[member.status]}</StatusBadge></td><td>{member.expires ?? 'ไม่มีกำหนด'}</td></tr>)}</tbody></table>{!visible.length && <p className="studio-form-surface">ไม่พบสมาชิกตามเงื่อนไข</p>}</div></Surface>
    <aside className="studio-inspector" aria-label="สิทธิ์ของสมาชิกที่เลือก"><header><h2>{selected.name}</h2><p>{selected.email}</p></header><div className="studio-inspector-body"><dl className="studio-facts"><div><dt>สถานะ</dt><dd>{statusLabels[selected.status]}</dd></div><div><dt>Organization role</dt><dd>{selected.orgRole}</dd></div><div><dt>จำนวนโครงการ</dt><dd>{selected.projects}</dd></div><div><dt>สิทธิ์ถึง</dt><dd>{selected.expires ?? 'ไม่มีกำหนด'}</dd></div></dl><strong>PROJECT ROLES</strong>{Object.entries(roleLabels).map(([id, label]) => <div className="studio-role-detail" key={id}><span aria-hidden="true">{selected.roles.some((item) => item === id) ? '✓' : '—'}</span>{label}</div>)}<div className="studio-validation-note"><strong>Separation of Duties</strong><p>ผู้จัดทำไม่สามารถอนุมัติ Revision ของตนเอง สิทธิ์ Admin ไม่เท่ากับสิทธิ์อนุมัติงานวิศวกรรม</p></div><p className="studio-help">การเชิญ ระงับ หรือแก้สิทธิ์จริงต้องผ่านการจัดการสมาชิกที่เชื่อมต่อแล้ว หน้านี้แสดงข้อมูลตัวอย่างแบบอ่านอย่างเดียว</p></div></aside></div>
  </>;
}
