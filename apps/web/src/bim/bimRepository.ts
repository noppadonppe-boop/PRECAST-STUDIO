import { getBytes, ref, uploadBytesResumable } from 'firebase/storage';
import { firebaseAuth, storage } from '../firebase/client';
import { saveSharedRecord, sharedStorageRoot } from '../data/sharedRepository';
import { MAX_SOURCE_BYTES, type BimModel } from './types';
export interface BimRevision {
  kind: 'bim-source'; projectId: string; id: string; fileName: string; fileType: 'ifc' | 'rvt';
  size: number; sha256: string; storagePath: string; uploadedBy: string; createdAt: string;
  parentRvtId: string | null; status: 'preview-ready' | 'awaiting-ifc';
  summary: { schema: string; elements: number; triangles: number; duplicateGuids: number; missingGuids: number } | null;
}
export async function storeBimSource(projectId: string, file: File, hash: string, model: BimModel | null, parentRvtId: string | null, progress: (value: number) => void): Promise<BimRevision> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('กรุณาเชื่อมต่อ Firebase ก่อนอัปโหลด');
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) throw new Error('Project ID ไม่ถูกต้อง');
  const id = `bim-${crypto.randomUUID()}`;
  const fileType = model ? 'ifc' : 'rvt';
  const storagePath = `${sharedStorageRoot}/intake/${projectId}/${id}/source.${fileType}`;
  const task = uploadBytesResumable(ref(storage, storagePath), file, { contentType: 'application/octet-stream', customMetadata: { uploadedBy: user.uid, sha256: hash, reviewState: 'unverified' } });
  await new Promise<void>((resolve, reject) => task.on('state_changed', (snapshot) => progress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, resolve));
  const source: BimRevision = { kind: 'bim-source', projectId, id, fileName: file.name, fileType, size: file.size, sha256: hash, storagePath, uploadedBy: user.uid, createdAt: new Date().toISOString(), parentRvtId, status: model ? 'preview-ready' : 'awaiting-ifc', summary: model ? { schema: model.schema, elements: model.elements.length, triangles: model.triangleCount, duplicateGuids: model.duplicateGuids, missingGuids: model.missingGuids } : null };
  await saveSharedRecord('intake', id, source, 0);
  return source;
}
export async function loadBimSource(source: BimRevision) {
  // Do not trust a user-editable Firestore path to select another bucket/object.
  const expected = `${sharedStorageRoot}/intake/${source.projectId}/${source.id}/source.ifc`;
  if (source.fileType !== 'ifc' || source.storagePath !== expected) throw new Error('ตำแหน่งไฟล์ IFC ไม่ถูกต้อง');
  return getBytes(ref(storage, expected), MAX_SOURCE_BYTES);
}
