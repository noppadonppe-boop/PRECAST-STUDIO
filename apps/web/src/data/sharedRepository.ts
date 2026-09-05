import { collection, doc, onSnapshot, runTransaction, type DocumentData } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../firebase/client';
import type { StudioProject } from './useProjectDirectory';

export const sharedRoot = 'precast-studio/root';
export const sharedCategories = ['projects', 'intake', 'criteria', 'panel', 'loads', 'analysis', 'design', 'cost', 'report', 'shop', 'release', 'review', 'team', 'audit', 'libraries', 'settings'] as const;
export type SharedCategory = typeof sharedCategories[number];
export interface SharedRecord<T> { data: T; revision: number; updatedAt: string; updatedBy: string }
export function sharedPath(category: SharedCategory, id: string) {
  if (!sharedCategories.includes(category) || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid shared document path.');
  return `${sharedRoot}/${category}/${id}`;
}
export async function initializeSharedWorkspace() {
  const ref = doc(firestore, sharedRoot);
  await runTransaction(firestore, async (tx) => {
    if (!(await tx.get(ref)).exists()) tx.set(ref, { name: 'Precast Studio', schemaVersion: 1, categories: sharedCategories, createdAt: new Date().toISOString() });
  });
}
export function watchSharedCollection<T>(category: SharedCategory, receive: (items: Array<SharedRecord<T> & { id: string }>) => void, fail: (reason: Error) => void) {
  return onSnapshot(collection(firestore, `${sharedRoot}/${category}`), (snapshot) => receive(snapshot.docs.map((item) => ({ ...item.data() as SharedRecord<T>, id: item.id }))), fail);
}
export function watchSharedRecord<T>(category: SharedCategory, id: string, receive: (item: SharedRecord<T> | null) => void, fail: (reason: Error) => void) {
  return onSnapshot(doc(firestore, sharedPath(category, id)), (snapshot) => receive(snapshot.exists() ? snapshot.data() as SharedRecord<T> : null), fail);
}
export async function saveSharedRecord<T>(category: SharedCategory, id: string, data: T, expectedRevision: number) {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('กรุณาเชื่อมต่อ Firebase ก่อนบันทึก');
  const ref = doc(firestore, sharedPath(category, id));
  const auditRef = doc(collection(firestore, `${sharedRoot}/audit`));
  await runTransaction(firestore, async (tx) => {
    const snapshot = await tx.get(ref);
    const revision = snapshot.exists() ? Number(snapshot.data().revision ?? 0) : 0;
    if (revision !== expectedRevision) throw new Error('มีผู้ใช้อื่นแก้ไขข้อมูลนี้แล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก');
    const record: SharedRecord<T> = { data, revision: revision + 1, updatedBy: user.uid, updatedAt: new Date().toISOString() };
    tx.set(ref, record as DocumentData);
    tx.set(auditRef, { data: { category, documentId: id, action: snapshot.exists() ? 'update' : 'create' }, revision: 1, updatedBy: user.uid, updatedAt: record.updatedAt });
  });
}
export async function createSharedProject(input: { code: string; name: string }) {
  const id = `p-${crypto.randomUUID()}`;
  const project: StudioProject = { id, code: input.code.trim(), name: input.name.trim(), family: 'Precast', gate: 'G0', gateState: 'notStarted', gateStates: {}, sourceRevision: '—', designBasisRevision: '—', modelRevision: '—', analysisRevision: '—', engineer: 'ยังไม่ระบุ', checker: 'ยังไม่ระบุ', due: 'ยังไม่ระบุ', updated: new Date().toISOString().slice(0, 10), issues: null, assignees: [] };
  await saveSharedRecord('projects', id, project, 0);
  return id;
}
