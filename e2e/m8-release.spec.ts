import { expect, test } from '@playwright/test';

test('M8 exposes G7 readiness while refusing release without approved verified artifacts', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g7?as=production');
  await expect(page.getByText('M8 release controls')).toBeVisible();
  await expect(page.getByText('CONTROLLED PRODUCTION RELEASE')).toBeVisible();
  await expect(page.getByText('Production Release blocked')).toBeVisible();
  await expect(page.getByText('G6 Documentation Set must be approved and locked with PASS design and drawing preflight.')).toBeVisible();
  await expect(page.getByText('Export worker files and actual Revit Drafting View import/PDF comparison evidence are not available.')).toBeVisible();
  await expect(page.getByText('No manifest, checksum register or production archive has been issued.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compose immutable Release Package' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Release to Production' })).toHaveCount(0);
});
