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
 * ชุด 1/3: Dashboard → คิวใบสั่งยา (ลึกถ้ามี) → ออเดอร์ → ลูกค้า
 */

test.use({
  launchOptions: { slowMo: slowMoMs },
});

test.describe('Admin catalog ① Dashboard · Rx · Orders · Patients', () => {
  test('สำรวจ Dashboard, คิว, ออเดอร์, ลูกค้า', async ({ page }) => {
    test.skip(!hasCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
    test.setTimeout(400_000);

    await staffLogin(page);
    const main = mainLocator(page);
    const nav = sidebarNav(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/^Dashboard$/);
    await expect(page.getByText('ภาพรวมการดำเนินงานวันนี้')).toBeVisible();
    await main.getByText('ยอดขายวันนี้', { exact: false }).first().scrollIntoViewIfNeeded();
    await micro(page);
    await main.getByText('ออเดอร์วันนี้', { exact: false }).first().scrollIntoViewIfNeeded();
    await step(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'คิวใบสั่งยา', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/คิวใบสั่งยา/);
    await expect(page.getByText('ตรวจสอบและ verify ใบสั่งยาจากลูกค้า')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'เลข Rx' })).toBeVisible();
    await page.getByRole('button', { name: 'รีเฟรช' }).click();
    await step(page, 900);
    for (const re of [/^Urgent/, /^High/, /^Medium/, /^Low/, /^ทั้งหมด/]) {
      await page.getByRole('button', { name: re }).click();
      await micro(page, 450);
    }
    const review = page.getByRole('link', { name: 'ตรวจสอบ' });
    if ((await review.count()) > 0) {
      await beforePageChange(page);
      await review.first().click();
      await page.waitForURL(/\/dashboard\/pharmacist\/[^/]+$/, { timeout: 45_000 });
      await expect(main.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await page.getByText('ภาพใบสั่งยา', { exact: false }).first().scrollIntoViewIfNeeded();
      await micro(page);
      await page.getByText('รายการยา', { exact: false }).first().scrollIntoViewIfNeeded();
      await micro(page);
      await page.getByText('Safety Alerts', { exact: false }).scrollIntoViewIfNeeded();
      await micro(page);
      await page.getByText('ข้อมูลลูกค้า', { exact: false }).first().scrollIntoViewIfNeeded();
      await step(page);
      await page.getByRole('button', { name: /Intervention/ }).click();
      await micro(page);
      await page.getByRole('button', { name: /Counseling/ }).click();
      await micro(page);
      await page.getByRole('button', { name: /ตัดสิน/ }).click();
      await step(page);
      await beforePageChange(page);
      await page.locator('main a[href="/dashboard/pharmacist"]').first().click();
      await page.waitForURL(/\/dashboard\/pharmacist$/, { timeout: 45_000 });
    }
    await step(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'ออเดอร์', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/จัดการออเดอร์/);
    await main.getByRole('button', { name: 'ทั้งหมด' }).click();
    await micro(page);
    await main.getByRole('button', { name: 'รอชำระ' }).click();
    await micro(page);
    await main.getByRole('button', { name: 'ชำระแล้ว' }).click();
    await micro(page);
    await main.getByRole('button', { name: 'กำลังจัด' }).click();
    await micro(page);
    await main.getByRole('button', { name: 'ทั้งหมด' }).click();
    await step(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'ลูกค้า', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/ข้อมูลลูกค้า/);
    const patientSearch = page.getByPlaceholder(/ค้นหาชื่อ/);
    await patientSearch.fill('test');
    await micro(page);
    await patientSearch.clear();
    await step(page);
  });
});
