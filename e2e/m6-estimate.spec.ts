import { expect, test } from '@playwright/test';

test('M6 creates traceable preliminary BOQ and blocks incomplete commercial outputs', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g5?as=qs');
  await expect(page.getByText('Approved G3 model is ready for quantity takeoff')).toBeVisible();
  await page.getByRole('button', { name: 'Generate engineering estimate' }).click();
  await expect(page.getByRole('status')).toContainText('Preliminary engineering estimate generated');
  await expect(page.getByText('NOT_CHECKED', { exact: true })).toBeVisible();
  await expect(page.getByText('expiredRate', { exact: true })).toBeVisible();
  await expect(page.getByText('panel-a, panel-b', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Review and export blocked')).toBeVisible();
  await expect(page.getByText('G4 design dependency is NOT_CHECKED.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit estimate for approval' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Export XLSX / PDF / audit' })).toBeDisabled();

  await page.goto('/org/org-siam/audit?as=checker');
  await expect(page.getByRole('heading', { name: 'CREATE estimate EST-R01' })).toBeVisible();
});
