import type { PrecastClassification } from './precast';
export interface BimElement { id: number; guid: string; name: string; type: string; precast?: PrecastClassification }
export interface BimMesh { id: number; vertices: Float32Array; indices: Uint32Array; transform: number[]; color: number[] }
export interface BimModel {
  schema: string; elements: BimElement[]; meshes: BimMesh[];
  duplicateGuids: number; missingGuids: number; levels: string[]; lengthUnits: string[];
  warnings: string[]; triangleCount: number;
}
export const MAX_SOURCE_BYTES = 100 * 1024 * 1024;
export function sourceKind(name: string): 'ifc' | 'rvt' {
  const extension = name.toLowerCase().split('.').pop();
  if (extension !== 'ifc' && extension !== 'rvt') throw new Error('รองรับเฉพาะไฟล์ .ifc และ .rvt');
  return extension;
}
export function validateBimFile(file: Pick<File, 'name' | 'size'>) {
  const kind = sourceKind(file.name);
  if (file.size <= 0 || file.size > MAX_SOURCE_BYTES) throw new Error('ไฟล์ต้องมีขนาดมากกว่า 0 และไม่เกิน 100 MB');
  return kind;
}
export async function sha256(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (v) => v.toString(16).padStart(2, '0')).join('');
}
