import { expect, test } from '@playwright/test';

test('M5 independently approves verified G3 evidence and blocks incomplete G4 design checks', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g3?as=engineer');
  await expect(page.getByText('AN-R01 · completed')).toBeVisible();
  await expect(page.getByText('PASS · equilibrium')).toBeVisible();
  await expect(page.getByText('NOT CHECKED · engineering design')).toBeVisible();
  await page.getByRole('button', { name: 'Submit Analysis for G3 review' }).click();
  await expect(page.getByRole('status')).toContainText('submitted for independent G3 verification');

  await page.goto('/org/org-siam/review?as=checker');
  await page.getByRole('button', { name: /AN-R01/ }).click();
  await expect(page.getByText('Passed: author and approver are distinct active members.')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Approve snapshot' }).click();
  await expect(page.getByRole('status')).toContainText('AN-R01 approved');

  await page.goto('/org/org-siam/projects/p-rama9/stages/g4?as=engineer');
  await page.getByRole('button', { name: 'Generate Design Check register' }).click();
  await expect(page.getByRole('status')).toContainText('Design Check register generated');
  await expect(page.getByText('7 NOT CHECKED')).toBeVisible();
  await expect(page.getByText('G4 approval blocked')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Design Checks for G4 approval' })).toBeDisabled();
  await expect(page.getByText('FAIL and unresolved NOT CHECKED items are server-enforced blockers.')).toBeVisible();

  await page.goto('/org/org-siam/audit?as=checker');
  await expect(page.getByRole('heading', { name: 'CREATE calculation CALC-R01' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'APPROVE analysis AN-R01' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SUBMIT analysis AN-R01' })).toBeVisible();
});

test('M5 preserves approved and locked G2 evidence', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g2?as=checker');
  await expect(page.getByText('approved · locked')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Product Model for G2 review' })).toBeDisabled();
});
