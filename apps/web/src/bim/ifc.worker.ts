import wasmUrl from 'web-ifc/web-ifc.wasm?url';
import { parseIfc } from './parseIfc';
self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    const model = await parseIfc(new Uint8Array(event.data), wasmUrl);
    self.postMessage({ model }, { transfer: model.meshes.flatMap((mesh) => [mesh.vertices.buffer, mesh.indices.buffer]) });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'อ่าน IFC ไม่สำเร็จ' }); }
};
