import { collection, doc, onSnapshot, runTransaction, type DocumentData } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { firebaseAuth, firestore, storage } from '../firebase/client';
import type { StudioProject } from './useProjectDirectory';

export const sharedStorageRoot = 'PRECAST MODULE';
export const sharedRoot = `${sharedStorageRoot}/root`;
export const sharedCategories = ['projects', 'intake', 'criteria', 'panel', 'loads', 'analysis', 'design', 'cost', 'report', 'shop', 'release', 'review', 'team', 'audit', 'libraries', 'settings'] as const;
export type SharedCategory = typeof sharedCategories[number];
export interface SharedRecord<T> { data: T; revision: number; updatedAt: string; updatedBy: string }
export interface SharedAttachment { id: string; name: string; size: number; contentType: string; storagePath: string; downloadUrl: string; uploadedBy: string; uploadedAt: string }
export function sharedPath(category: SharedCategory, id: string) {
  if (!sharedCategories.includes(category) || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid shared document path.');
  return `${sharedRoot}/${category}/${id}`;
}
function safeStorageName(name: string) {
  const normalized = name.normalize('NFKC').replace(/[^a-zA-Z0-9._() -]/g, '_').replace(/\s+/g, ' ').trim();
  return normalized.slice(0, 120) || 'file';
}
export async function uploadSharedFile(input: { category: SharedCategory; documentId: string; file: File; onProgress?: (percent: number) => void }): Promise<SharedAttachment> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('กรุณาเชื่อมต่อ Firebase ก่อนอัปโหลด');
  if (!sharedCategories.includes(input.category) || !/^[a-zA-Z0-9_-]+$/.test(input.documentId)) throw new Error('Invalid shared file path.');
  if (input.file.size <= 0 || input.file.size > 100 * 1024 * 1024) throw new Error('ไฟล์ต้องมีขนาดมากกว่า 0 และไม่เกิน 100 MB');
  const id = crypto.randomUUID();
  const storagePath = `${sharedStorageRoot}/${input.category}/${input.documentId}/${id}/${safeStorageName(input.file.name)}`;
  const task = uploadBytesResumable(ref(storage, storagePath), input.file, { contentType: input.file.type || 'application/octet-stream', customMetadata: { uploadedBy: user.uid, category: input.category, documentId: input.documentId } });
  await new Promise<void>((resolve, reject) => task.on('state_changed', (snapshot) => input.onProgress?.(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, resolve));
  return { id, name: input.file.name, size: input.file.size, contentType: input.file.type || 'application/octet-stream', storagePath, downloadUrl: await getDownloadURL(task.snapshot.ref), uploadedBy: user.uid, uploadedAt: new Date().toISOString() };
}
export async function initializeSharedWorkspace() {
  const ref = doc(firestore, sharedRoot);
  await runTransaction(firestore, async (tx) => {
    if (!(await tx.get(ref)).exists()) tx.set(ref, { name: 'PRECAST MODULE', schemaVersion: 1, categories: sharedCategories, createdAt: new Date().toISOString() });
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
