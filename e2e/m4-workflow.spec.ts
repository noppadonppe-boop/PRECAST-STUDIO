import { expect, test } from '@playwright/test';

test('M4 runs a controlled benchmark with immutable evidence and no design claim', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g3?as=engineer');
  await expect(page.getByRole('heading', { name: 'Analysis verified' })).toBeVisible();
  await expect(page.getByText('LOAD-R01 · two-panel-static-v1')).toBeVisible();
  await expect(page.getByText('precast-benchmark-adapter@1.0.0')).toBeVisible();
  await page.getByLabel('Mesh size (m)').fill('0.2');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('status')).toContainText('deterministic draft hash');
  await page.getByRole('button', { name: 'Run controlled benchmark' }).click();
  await expect(page.getByRole('status')).toContainText('Controlled benchmark completed');
  await expect(page.getByText('AN-R01 · completed')).toBeVisible();
  await expect(page.getByText('0.000%')).toBeVisible();
  await expect(page.getByText('PASS · equilibrium')).toBeVisible();
  await expect(page.getByText('NOT CHECKED · engineering design')).toBeVisible();
  await expect(page.getByText('G3 is not approved in M4')).toBeVisible();

  await page.goto('/org/org-siam/audit?as=checker');
  await expect(page.getByRole('heading', { name: 'EXECUTE analysis AN-R01' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CREATE analysis AN-R01' })).toBeVisible();
});

test('M4 preserves approved and locked G2 evidence', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g2?as=checker');
  await expect(page.getByText('approved · locked')).toBeVisible();
  await expect(page.getByText('NOT CHECKED')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Product Model for G2 review' })).toBeDisabled();
});
