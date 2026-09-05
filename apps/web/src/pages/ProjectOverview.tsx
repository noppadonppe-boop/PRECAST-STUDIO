import { Link, useParams } from 'react-router-dom';
import { EmptyState, StatusBadge, Surface } from '@precast/ui';
import { useAuth } from '../auth/AuthContext';
import { useProjectDirectory } from '../data/useProjectDirectory';
import { gateText, gateTone, stageFor, stageHref, studioStages } from '../data/studioNavigation';

export function ProjectOverview() {
  const { projectId } = useParams();
  const { organizationMembership } = useAuth();
  const { projects, loading, error, mode } = useProjectDirectory();
  const project = projects.find((item) => item.id === projectId);
  const base = `/org/${organizationMembership.orgId}`;
  if (loading) return <EmptyState icon="…" title="กำลังโหลดโครงการ" detail="กำลังอ่านสถานะและ Revision ปัจจุบัน" />;
  if (!project) return <><EmptyState icon="!" title="ไม่พบโครงการที่เข้าถึงได้" detail={error || 'โครงการอาจยังโหลดไม่เสร็จ หรือสิทธิ์มีการเปลี่ยนแปลง'} /><Link to={`${base}/projects`}>กลับไปทุกโครงการ</Link></>;
  const stage = stageFor(project.gate, null);
  const projectBase = `${base}/projects/${project.id}`;
  return <>
    <div className="project-heading"><div><p className="eyebrow">{project.code} · {project.family}</p><h1>{project.name}</h1><p>ภาพรวมโครงการและขั้นตอนการออกแบบ</p></div><Link className="button button--primary studio-next" to={stageHref(projectBase, stage)}>เปิดขั้นตอนปัจจุบัน →</Link></div>
    <p className="studio-mode-note">{mode === 'fixture' ? 'ข้อมูลตัวอย่าง · สถานะในหน้านี้ไม่ใช่หลักฐานการอนุมัติจริง' : 'สถานะจากโครงการ · ขั้นตอนที่ไม่มีข้อมูลไม่ถือว่าผ่าน Gate'}</p>
    <Surface className="studio-revisions" ariaLabel="Current revision context"><span>Source <b>{project.sourceRevision}</b></span><span>Design Basis <b>{project.designBasisRevision}</b></span><span>Model <b>{project.modelRevision}</b></span><span>Analysis <b>{project.analysisRevision}</b></span></Surface>
    <div className="studio-overview-summary"><Surface><small>ขั้นตอนปัจจุบัน</small><h2>{stage.label}</h2><StatusBadge tone={gateTone[project.gateState]}>{project.gate} · {gateText[project.gateState]}</StatusBadge></Surface><Surface><small>ประเด็นที่ต้องแก้ไข</small><h2>{project.issues ?? 'ยังไม่มีข้อมูล'}</h2><p>ผลออกแบบที่ยังไม่ตรวจยังคงเป็น NOT CHECKED</p></Surface><Surface><small>กำหนดส่ง</small><h2>{project.due}</h2><p>อัปเดต {project.updated}</p></Surface></div>
    <h2 className="studio-section-title">พื้นที่ออกแบบและเอกสาร</h2>
    <div className="studio-stage-cards">{studioStages.map((item, index) => {
      const state = project.gateStates[item.gate];
      return <Link className="surface studio-stage-card" key={item.id} to={stageHref(projectBase, item)}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{item.label}</h2><p>{item.title}</p><StatusBadge tone={state ? gateTone[state] : 'neutral'}>{item.gate} · {state ? gateText[state] : 'ยังไม่มีข้อมูลสถานะ'}</StatusBadge></div><b>→</b></Link>;
    })}</div>
  </>;
}
