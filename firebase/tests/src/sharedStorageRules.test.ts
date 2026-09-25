import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { getBytes, ref, uploadBytes, updateMetadata } from 'firebase/storage';
let environment: RulesTestEnvironment;
beforeAll(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-precast-shared-storage', storage: { host: '127.0.0.1', port: 9199, rules: readFileSync(new URL('../../shared.storage.rules', import.meta.url), 'utf8') } });
});
afterAll(async () => { await environment?.cleanup(); });
describe('private BIM originals', () => {
  it('accepts shared IFC/RVT and forbids overwrite and anonymous reads', async () => {
    const own = environment.authenticatedContext('uploader').storage();
    const other = environment.authenticatedContext('other').storage();
    const publicStorage = environment.unauthenticatedContext().storage();
    const meta = { contentType: 'application/octet-stream', customMetadata: { uploadedBy: 'uploader' } };
    for (const extension of ['ifc', 'rvt']) {
      const path = `PRECAST MODULE/intake/project/revision/source.${extension}`;
      await assertSucceeds(uploadBytes(ref(own, path), new Uint8Array([1, 2, 3]), meta));
      await assertSucceeds(getBytes(ref(own, path)));
      await assertSucceeds(getBytes(ref(other, path)));
      await assertFails(getBytes(ref(publicStorage, path)));
      await assertFails(uploadBytes(ref(own, path), new Uint8Array([4]), meta));
      await assertFails(updateMetadata(ref(own, path), { customMetadata: { uploadedBy: 'uploader', reviewState: 'clean' } }));
    }
    await assertFails(uploadBytes(ref(other, 'PRECAST MODULE/intake/project/new/source.ifc'), new Uint8Array([1]), { ...meta, customMetadata: { uploadedBy: 'uploader' } }));
    await assertSucceeds(uploadBytes(ref(other, 'PRECAST MODULE/intake/project/new/source.txt'), new Uint8Array([1]), { contentType: 'text/plain', customMetadata: { uploadedBy: 'other' } }));
    await assertFails(uploadBytes(ref(own, 'PRECAST MODULE/intake/project/new/source.ifc'), new Uint8Array(), meta));
  });
});
