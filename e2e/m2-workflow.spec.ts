import { expect, test } from '@playwright/test';

test('M2 completes controlled BIM acceptance and Design Basis approval', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g0?as=bim');
  await expect(page.getByRole('heading', { name: 'BIM accepted' })).toBeVisible();
  await expect(page.getByText('1842 BIM objects')).toBeVisible();
  await page.getByRole('button', { name: 'Submit source for review' }).click();
  await expect(page.getByRole('status')).toContainText('submitted for structural suitability review');

  await page.goto('/org/org-siam/review?as=engineer');
  await page.getByRole('button', { name: /SRC-R02/ }).click();
  await expect(page.getByText('Passed: author and approver are distinct active members.')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Approve snapshot' }).click();
  await expect(page.getByRole('status')).toContainText('SRC-R02 approved');

  await page.getByRole('button', { name: /DB-SELF/ }).click();
  await expect(page.getByText('Blocked: the approver created this artifact.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve snapshot' })).toBeDisabled();

  await page.goto('/org/org-siam/projects/p-rama9/stages/g0?as=pm');
  await expect(page.getByRole('button', { name: 'Freeze Gate G0' })).toBeEnabled();
  await page.getByRole('button', { name: 'Freeze Gate G0' }).click();
  await expect(page.getByRole('status')).toContainText('Gate G0 frozen');

  await page.goto('/org/org-siam/projects/p-rama9/stages/g1?as=engineer');
  await expect(page.getByText('ACI 318 · 2019')).toBeVisible();
  await page.getByRole('button', { name: 'Submit Design Basis for approval' }).click();
  await expect(page.getByRole('status')).toContainText('submitted to an independent checker');

  await page.goto('/org/org-siam/review?as=checker');
  await page.getByRole('button', { name: /DB-R02/ }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Approve snapshot' }).click();
  await expect(page.getByRole('status')).toContainText('DB-R02 approved');

  await page.goto('/org/org-siam/projects/p-rama9/stages/g1?as=checker');
  await expect(page.getByText('approved · locked')).toBeVisible();
  await page.goto('/org/org-siam/audit?as=checker');
  await expect(page.getByRole('heading', { name: 'FREEZE sourceRevision SRC-R02' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'APPROVE designBasis DB-R02' })).toBeVisible();
});

test('M2 rejects an unsupported intake file before upload', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g0?as=bim');
  await page.locator('input[type=file]').setInputFiles({ name: 'payload.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('unsafe') });
  await expect(page.getByRole('status')).toContainText('Upload rejected');
});

