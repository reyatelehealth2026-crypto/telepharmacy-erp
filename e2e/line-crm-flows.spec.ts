import { test, expect } from '@playwright/test';
import { hasCredentials, staffLogin, mainLocator } from './helpers/admin-e2e';

/**
 * Audit smoke: staff can reach LINE CRM surfaces (inbox + webhook observability).
 * Requires admin dev on PLAYWRIGHT_BASE_URL (default :3001) and E2E_ADMIN_* env.
 */
test.describe('LINE CRM (admin)', () => {
  test.skip(!hasCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');

  test('login → inbox → LINE Webhook pages load', async ({ page }) => {
    await staffLogin(page);

    await page.goto('/dashboard/inbox');
    await expect(mainLocator(page).getByRole('heading', { name: 'กล่องข้อความ' })).toBeVisible();

    await page.goto('/dashboard/line-webhooks');
    await expect(mainLocator(page).getByRole('heading', { name: 'LINE Webhook' })).toBeVisible();
  });
});
