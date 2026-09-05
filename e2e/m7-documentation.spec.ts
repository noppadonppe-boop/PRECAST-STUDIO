import { expect, test } from '@playwright/test';

test('M7 creates model-linked report and drawing previews while blocking unverified issue outputs', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g6?as=detailer');
  await expect(page.getByText('Model and calculation register ready for documentation preview')).toBeVisible();
  await page.getByRole('button', { name: 'Generate Documentation Set' }).click();
  await expect(page.getByRole('status')).toContainText('Documentation Set generated');
  await expect(page.getByText('Cover and document control')).toBeVisible();
  await expect(page.getByText('Conclusions and unresolved items')).toBeVisible();
  await expect(page.getByRole('button', { name: /PC-W1-01-001/ })).toBeVisible();
  await page.getByRole('button', { name: /PC-W1-02-002/ }).click();
  await expect(page.getByRole('img', { name: 'Shop drawing preview for W1-02' })).toBeVisible();
  await expect(page.getByText('lift-b1 · 25 kN')).toBeVisible();
  await expect(page.getByText('COG', { exact: true })).toBeVisible();
  await expect(page.getByText(/V 1\.260 m³/)).toBeVisible();
  await expect(page.getByText('NOT FOR PRODUCTION')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Revit-ready CAD import' })).toBeVisible();
  await expect(page.getByText(/REVIT-DRAFTING-01/)).toBeVisible();
  await expect(page.getByText('Not Native Revit.')).toBeVisible();
  await expect(page.getByText('notRun')).toBeVisible();
  await expect(page.getByText('G6 review and document rendering blocked')).toBeVisible();
  await expect(page.getByText('reinforcement: NOT_CHECKED.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Documentation Set' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Render DOCX / PDF/A / schedules' })).toBeDisabled();

  await page.goto('/org/org-siam/audit?as=checker');
  await expect(page.getByRole('heading', { name: 'CREATE drawingSet DS-R01' })).toBeVisible();
});
