import { expect, test } from '@playwright/test';

test('Portfolio to submit, self-approval denial, independent approval, forbidden route and audit', async ({ page }) => {
  await page.goto('/org/org-siam/projects?as=engineer');
  await expect(page.getByRole('heading', { name: 'Engineering projects' })).toBeVisible();
  await page.getByRole('link', { name: /Rama IX Modular Residence/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Rama IX Modular Residence' })).toBeVisible();
  await page.getByRole('link', { name: /Design Basis/ }).click();
  await expect(page.getByRole('button', { name: 'Submit for independent approval' })).toBeEnabled();
  await page.getByRole('button', { name: 'Submit for independent approval' }).click();
  await expect(page.getByRole('status')).toContainText('submitted to an independent checker');

  await page.goto('/org/org-siam/review?as=engineer');
  await page.getByRole('button', { name: /DB-SELF/ }).click();
  await expect(page.getByText('Blocked: the approver created this artifact.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve snapshot' })).toBeDisabled();

  await page.goto('/org/org-siam/projects/not-assigned/overview?as=engineer');
  await expect(page.getByRole('heading', { name: 'Project access denied' })).toBeVisible();

  await page.goto('/org/org-siam/review?as=checker');
  await page.getByRole('button', { name: /DB-R02/ }).click();
  await expect(page.getByText('Passed: author and approver are distinct active members.')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Approve snapshot' }).click();
  await expect(page.getByRole('status')).toContainText('approved by an idempotent emulator command');

  await page.goto('/org/org-siam/audit?as=checker');
  await expect(page.getByRole('heading', { name: 'APPROVE designBasis DB-R02' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SUBMIT designBasis DB-R02' })).toBeVisible();
});
