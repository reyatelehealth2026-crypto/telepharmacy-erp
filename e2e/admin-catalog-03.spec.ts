import { test, expect } from '@playwright/test';
import {
  hasCredentials,
  slowMoMs,
  step,
  micro,
  beforePageChange,
  staffLogin,
  mainLocator,
  sidebarNav,
} from './helpers/admin-e2e';

/**
 * ชุด 3/3: ADR · Clinical · Telemedicine · KYC → ข้อความ · LINE → รายงาน → ตั้งค่า → ออกจากระบบ
 */

test.use({
  launchOptions: { slowMo: slowMoMs },
});

test.describe('Admin catalog ③ Clinical stack · Comms · Reports · Settings · Logout', () => {
  test('ADR→KYC, กล่องข้อความ, LINE, รายงาน, ตั้งค่า, logout', async ({ page }) => {
    test.skip(!hasCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
    test.setTimeout(400_000);

    await staffLogin(page);
    const main = mainLocator(page);
    const nav = sidebarNav(page);

    for (const [linkName, h1] of [
      ['ADR Reports', /ADR Reports/],
      ['Clinical', /Clinical Services/],
      ['Telemedicine', /^Telemedicine$/],
      ['KYC Review', /^KYC Review$/],
    ] as const) {
      await beforePageChange(page);
      await nav.getByRole('link', { name: linkName, exact: true }).click();
      await expect(main.getByRole('heading', { level: 1 })).toHaveText(h1);
      await main.scrollIntoViewIfNeeded();
      await step(page, 400);
    }

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'กล่องข้อความ', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/^กล่องข้อความ$/);
    await step(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'LINE Messaging', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/LINE Messaging/);
    await step(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'รายงาน', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/^รายงาน$/);
    await main.getByRole('combobox').first().click();
    await micro(page);
    await page.keyboard.press('Escape');
    await main.getByRole('button', { name: 'ยอดขาย', exact: true }).click();
    await micro(page);
    await main.getByRole('button', { name: 'โปรโมชั่น & Loyalty', exact: true }).click();
    await micro(page);
    await main.getByRole('button', { name: 'ยอดขาย', exact: true }).click();
    await step(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'ตั้งค่า', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/^ตั้งค่า$/);
    const settingsNav = main.locator('nav').first();
    for (const label of ['LINE', 'ชำระเงิน', 'จัดส่ง', 'แจ้งเตือน', 'ทั่วไป', 'Staff', 'Integrations', 'ระบบ']) {
      await settingsNav.getByRole('button', { name: label }).click();
      await micro(page, 320);
    }
    await settingsNav.getByRole('button', { name: 'LINE' }).click();
    await step(page);

    await beforePageChange(page);
    await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await page.waitForURL(/\/login/, { timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeVisible();
  });
});
