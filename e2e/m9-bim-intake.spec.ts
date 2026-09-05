import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

test('M9 uploads the actual Revit IFC through UI and preserves quarantine with no parser claims', async ({ page, request }, testInfo) => {
  const bytes = readFileSync(resolve('Precast_Module_Test.ifc'));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  expect(sha256).toBe('46012f90f9c7b056e0c5c25cfeb5037c8d18c35a2764f23c694166e6ed19aa77');
  expect(bytes.length).toBe(388772);
  await page.goto('/org/org-siam/projects/p-rama9/stages/g0?as=bim');
  await expect(page.getByRole('heading', { name: 'BIM source intake' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SRC-R02' })).toBeVisible();
  await page.getByLabel('Upload IFC / PDF').setInputFiles({ name: 'Precast_Module_Test.ifc', mimeType: 'application/octet-stream', buffer: bytes });
  await expect(page.getByText('Upload 100% · quarantine enforced')).toBeVisible();
  const heading = page.getByRole('heading', { name: /^SRC-\d{4}-\d{2}-\d{2}-[A-F0-9]{4}$/ });
  await expect(heading).toBeVisible();
  const revision = await heading.innerText();
  await expect(page.getByText('draft · quarantined')).toBeVisible();
  await expect(page.getByText('NOT CHECKED BIM objects')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit source for review' })).toBeDisabled();

  // The same emulator role reads revision metadata, then attempts to read the quarantined binary.
  // Never use owner/admin credentials or mutate scan results in this browser test.
  const login = await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', { data: { email: 'bim@precast.local', password: 'local-emulator-only', returnSecureToken: true } });
  expect(login.ok()).toBe(true);
  const { idToken } = await login.json();
  const headers = { Authorization: `Bearer ${idToken}` };
  const list = await request.get('http://127.0.0.1:8080/v1/projects/demo-precast-m1/databases/(default)/documents/organizations/org-siam/projects/p-rama9/sourceRevisions', { headers });
  expect(list.ok()).toBe(true);
  const doc = (await list.json()).documents.find((item: { fields: { revision: { stringValue: string } } }) => item.fields.revision.stringValue === revision);
  expect(doc).toBeDefined();
  expect(doc.fields.scanState.stringValue).toBe('quarantined');
  expect(doc.fields.size.integerValue).toBe('388772');
  expect(doc.fields.contentType.stringValue).toBe('application/x-step');
  expect(doc.fields.snapshotHash).toBeUndefined();
  expect(doc.fields.status.stringValue).toBe('draft');
  expect(doc.fields.locked.booleanValue).toBe(false);
  expect(doc.fields.validation.mapValue.fields.objectCount.integerValue).toBe('0');
  const storagePath = doc.fields.storagePath.stringValue;
  const download = await request.get(`http://127.0.0.1:9199/v0/b/demo-precast-m1.appspot.com/o/${encodeURIComponent(storagePath)}?alt=media`, { headers });
  expect(download.status()).toBe(403);
  await testInfo.attach('M9 actual IFC intake evidence', { body: JSON.stringify({ environment: 'local emulator', sha256, bytes: bytes.length, revision, storagePath, scanState: 'quarantined', binaryReadStatus: download.status(), parser: 'NOT_CHECKED', geometry: 'NOT_CHECKED', staging: 'NOT_CHECKED' }, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath('actual-ifc-quarantine.png'), fullPage: true });
});
