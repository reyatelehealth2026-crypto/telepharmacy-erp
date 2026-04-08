import { test, expect } from '@playwright/test';

test.describe('Admin app', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/REYA Pharmacy/i);
    await expect(page.getByRole('heading', { name: /REYA Pharmacy/i })).toBeVisible();
  });
});
