import type { BimModel } from './types';
export function readIfc(bytes: ArrayBuffer, signal: AbortSignal): Promise<BimModel> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./ifc.worker.ts', import.meta.url), { type: 'module' });
    const finish = () => { clearTimeout(timeout); signal.removeEventListener('abort', abort); worker.terminate(); };
    const abort = () => { finish(); reject(new Error('ยกเลิกการอ่านโมเดล')); };
    const timeout = setTimeout(() => { finish(); reject(new Error('อ่านโมเดลเกิน 2 นาที กรุณาแบ่งไฟล์ให้เล็กลง')); }, 120000);
    worker.onmessage = (event: MessageEvent<{ model?: BimModel; error?: string }>) => {
      finish();
      if (event.data.model) resolve(event.data.model); else reject(new Error(event.data.error ?? 'อ่าน IFC ไม่สำเร็จ'));
    };
    worker.onerror = () => { finish(); reject(new Error('ตัวอ่าน IFC ทำงานไม่สำเร็จ กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง')); };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) { abort(); return; }
    worker.postMessage(bytes, [bytes]);
  });
}
