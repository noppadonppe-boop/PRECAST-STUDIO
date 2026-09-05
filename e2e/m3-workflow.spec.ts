import { expect, test } from '@playwright/test';

test('M3 submits a deterministic Product Model and locks G2 by independent review', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g2?as=engineer');
  await expect(page.getByRole('heading', { name: 'Analytical model ready' })).toBeVisible();
  await expect(page.getByText('W1-01')).toBeVisible();
  await expect(page.getByText('2 / 1')).toBeVisible();
  await expect(page.getByText('Joint load paths confirmed')).toBeVisible();
  await expect(page.getByText('NOT CHECKED')).toBeVisible();
  await page.getByRole('button', { name: /W1-02/ }).click();
  await page.getByRole('button', { name: 'Split panel' }).click();
  await expect(page.getByRole('status')).toContainText('Panel split saved');
  await expect(page.getByRole('button', { name: /W1-02-A/ })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm load paths' }).click();
  await expect(page.getByRole('status')).toContainText('load paths confirmed');
  await page.getByRole('button', { name: 'Submit Product Model for G2 review' }).click();
  await expect(page.getByRole('status')).toContainText('submitted for independent G2 review');

  await page.goto('/org/org-siam/review?as=checker');
  await page.getByRole('button', { name: /PM-R01/ }).click();
  await expect(page.getByText('Passed: author and approver are distinct active members.')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Approve snapshot' }).click();
  await expect(page.getByRole('status')).toContainText('PM-R01 approved');

  await page.goto('/org/org-siam/projects/p-rama9/stages/g2?as=checker');
  await expect(page.getByText('approved · locked')).toBeVisible();
  await page.goto('/org/org-siam/audit?as=checker');
  await expect(page.getByRole('heading', { name: 'APPROVE productModel PM-R01' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SUBMIT productModel PM-R01' })).toBeVisible();
});

test('M3 preserves upstream G0 and G1 evidence as read-only context', async ({ page }) => {
  await page.goto('/org/org-siam/projects/p-rama9/stages/g0?as=engineer');
  await expect(page.getByText('accepted', { exact: true })).toBeVisible();
  await page.goto('/org/org-siam/projects/p-rama9/stages/g1?as=engineer');
  await expect(page.getByText('approved · locked')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit Design Basis for approval' })).toBeDisabled();
});
