import type { Gate, GateState } from '@precast/domain';

export const studioStages = [
  { id: 'intake', gate: 'G0', label: 'รับแบบ BIM', title: 'รับแบบ BIM และตรวจ Revision' },
  { id: 'criteria', gate: 'G1', label: 'Design Criteria', title: 'เกณฑ์การออกแบบ' },
  { id: 'panel', gate: 'G2', label: 'แบ่งชิ้นงาน', title: 'แบ่งชิ้นงานพรีคาสท์' },
  { id: 'loads', gate: 'G3', label: 'แรงและจุดรองรับ', title: 'แรงและจุดรองรับ' },
  { id: 'analysis', gate: 'G3', label: 'วิเคราะห์ FEM', title: 'วิเคราะห์ FEM และตรวจผล' },
  { id: 'design', gate: 'G4', label: 'ออกแบบเหล็ก', title: 'ออกแบบเหล็กและตรวจชิ้นงาน' },
  { id: 'cost', gate: 'G5', label: 'BOQ & Estimate', title: 'ถอดปริมาณและประมาณราคาเบื้องต้น' },
  { id: 'report', gate: 'G6', label: 'รายการคำนวณ', title: 'รายการคำนวณและเอกสารประกอบ' },
  { id: 'shop', gate: 'G6', label: 'Drawing & Export', title: 'Shop Drawing และชุดส่งออก' },
  { id: 'release', gate: 'G7', label: 'ส่งผลิตและประวัติ', title: 'ตรวจชุดเอกสารก่อนส่งผลิต' },
] as const;
export type StudioStage = typeof studioStages[number];
export function stageFor(gate: string, view: string | null): StudioStage {
  return studioStages.find((item) => item.gate.toLowerCase() === gate.toLowerCase() && item.id === view)
    ?? studioStages.find((item) => item.gate.toLowerCase() === gate.toLowerCase() && item.id !== 'loads' && item.id !== 'report')
    ?? studioStages[0];
}
export function stageHref(base: string, stage: StudioStage) { return `${base}/stages/${stage.gate.toLowerCase()}?view=${stage.id}`; }
export const gateText: Record<GateState, string> = { approved: 'อนุมัติแล้ว', readyForReview: 'รอตรวจ', needsAttention: 'ต้องดำเนินการ', notStarted: 'ยังไม่เริ่ม', inProgress: 'กำลังดำเนินการ', outOfDate: 'ข้อมูลล้าสมัย', superseded: 'ถูกแทนที่' };
export const gateTone = { approved: 'success', readyForReview: 'info', needsAttention: 'warning', notStarted: 'neutral', inProgress: 'info', outOfDate: 'danger', superseded: 'neutral' } as const;
export function gateFromStage(stage: string): Gate {
  return ({ intake: 'G0', designBasis: 'G1', panelization: 'G2', loads: 'G3', analysis: 'G3', design: 'G4', estimate: 'G5', calculation: 'G6', drawingExport: 'G6', productionRelease: 'G7' } as Record<string, Gate>)[stage] ?? 'G0';
}
