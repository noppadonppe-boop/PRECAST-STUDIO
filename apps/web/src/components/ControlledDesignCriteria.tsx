import { useEffect, useState } from 'react';
import { can, criteriaFromDesignBasis, designCriteriaIssues, withDesignCriteria, type DesignBasisPayload, type PermissionContext } from '@precast/domain';
import { createDesignBasisRevision, saveDesignBasisDraft, submitDesignBasis, type DesignBasisState } from '../data/workflowRepository';
import { DesignCriteriaEditor } from './DesignCriteriaEditor';

export function ControlledDesignCriteria({ orgId, projectId, artifact, context }: { orgId: string; projectId: string; artifact: DesignBasisState & { payload: DesignBasisPayload }; context: PermissionContext }) {
  const [value, setValue] = useState(() => criteriaFromDesignBasis(artifact.payload));
  const [baseline, setBaseline] = useState(artifact);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState(false);
  const [checker, setChecker] = useState('');
  const editable = !artifact.locked && artifact.status === 'draft' && can('editDraft', 'designBasis', context).allowed;
  useEffect(() => { if (!dirty) { setValue(criteriaFromDesignBasis(artifact.payload)); setBaseline(artifact); } }, [artifact, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function run(action: () => Promise<unknown>, message: string) {
    setSaving(true); setFailed(false); setNotice('');
    try { await action(); setDirty(false); setNotice(message); } catch (error) { setFailed(true); setNotice(error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ'); } finally { setSaving(false); }
  }
  return <DesignCriteriaEditor value={value} status={artifact.status} disabled={!editable || saving} onChange={(next) => { setValue(next); setDirty(true); }} actions={<>
    <p>{artifact.revision} · {dirty ? 'มีการแก้ไขที่ยังไม่บันทึก' : 'ข้อมูลจาก Design Basis ของโครงการ'}</p>
    <div className="dialog-actions"><button type="button" className="button button--primary" disabled={!editable || saving || !dirty} onClick={() => void run(() => saveDesignBasisDraft({ orgId, projectId, artifact: baseline, payload: withDesignCriteria(baseline.payload, value) }), 'บันทึกร่างแล้ว')}>บันทึกร่าง Design Basis</button><button type="button" className="button button--secondary" disabled={saving || !dirty} onClick={() => { setValue(criteriaFromDesignBasis(artifact.payload)); setBaseline(artifact); setDirty(false); setNotice('โหลดข้อมูลล่าสุดแล้ว'); }}>โหลด Design Basis ล่าสุด</button>
      {artifact.status === 'approved' && can('create', 'designBasis', context).allowed && <button type="button" className="button button--secondary" disabled={saving} onClick={() => {
        const suffix = crypto.randomUUID().slice(0, 8);
        void run(() => createDesignBasisRevision({ orgId, projectId, id: `db-${suffix}`, revision: `DB-${suffix.toUpperCase()}`, payload: withDesignCriteria(artifact.payload, value), supersedesId: artifact.id }), 'สร้าง Revision ใหม่แล้ว — ผลที่เกี่ยวข้องต้องตรวจใหม่');
      }}>สร้าง Revision ใหม่เพื่อแก้ไข</button>}
    </div>
    {can('submit', 'designBasis', context).allowed && <div className="criteria-field-grid"><label className="form-field">รหัสผู้ตรวจที่รับผิดชอบ<input value={checker} onChange={(event) => setChecker(event.target.value)} disabled={saving || !editable} /></label><button type="button" className="button button--primary" disabled={!editable || saving || dirty || !checker.trim() || checker.trim() === context.userId || designCriteriaIssues(artifact.payload.criteria).length > 0} onClick={() => void run(() => submitDesignBasis({ orgId, projectId, artifact, assignedTo: checker.trim() }), 'ส่งตรวจ Design Basis แล้ว')}>ส่งตรวจ Design Basis</button></div>}
    <p role={failed ? 'alert' : 'status'}>{notice}</p>
  </>} />;
}
