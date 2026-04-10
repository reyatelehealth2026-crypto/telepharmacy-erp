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
 * ชุด 2/3: สินค้า (Sync Odoo dry) → โปรโมชั่น → บทความ → ข้อร้องเรียน → คลังสินค้า
 */

test.use({
  launchOptions: { slowMo: slowMoMs },
});

test.describe('Admin catalog ② Products · Promotions · Content · Complaints · Inventory', () => {
  test('สินค้า + โปรโมชั่น + บทความ + ข้อร้องเรียน + คลัง', async ({ page }) => {
    test.skip(!hasCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
    test.setTimeout(400_000);

    await staffLogin(page);
    const main = mainLocator(page);
    const nav = sidebarNav(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'สินค้า', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/จัดการสินค้า/);
    await expect(page.getByRole('columnheader', { name: 'SKU' })).toBeVisible();
    await page.getByPlaceholder('ค้นหาสินค้า SKU หรือชื่อ...').fill('a');
    await micro(page);
    await page.getByPlaceholder('ค้นหาสินค้า SKU หรือชื่อ...').clear();
    await main.getByRole('button', { name: 'ยาสามัญ (HHR)' }).click();
    await micro(page);
    await main.getByRole('button', { name: 'ทั้งหมด' }).first().click();
    await micro(page);
    const viewLink = main.getByRole('link', { name: 'ดู' }).first();
    if ((await viewLink.count()) > 0) {
      await beforePageChange(page);
      await viewLink.click();
      await page.waitForURL(/\/dashboard\/products\/[^/]+$/, { timeout: 45_000 });
      await expect(main.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await main.locator('h1').first().scrollIntoViewIfNeeded();
      await step(page, 700);
      await beforePageChange(page);
      await page.goto('/dashboard/products');
    }
    await page.getByRole('button', { name: /Sync จาก Odoo/ }).click();
    await expect(page.getByRole('heading', { name: 'Sync สินค้าจาก Odoo ERP' })).toBeVisible();
    await page.getByRole('button', { name: /0001 – 0200/ }).click();
    await micro(page);
    await page.getByRole('button', { name: /ระบุรหัสเอง/ }).click();
    await micro(page);
    await page.getByPlaceholder(/กรอก PRODUCT_CODE/).fill('0001');
    await page.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
    await micro(page);
    await page.getByRole('button', { name: /ล้าง/ }).click();
    await micro(page);
    await page.getByRole('button', { name: /ซิงค์ตามช่วงรหัส/ }).click();
    await micro(page);
    await page.getByRole('checkbox', { name: /กำหนดช่วงเอง/i }).check();
    await micro(page);
    await page.getByPlaceholder(/จาก \(เช่น 1\)/).fill('1');
    await page.getByPlaceholder(/ถึง \(เช่น 300\)/).fill('30');
    await micro(page);
    await page.getByRole('checkbox', { name: /กำหนดช่วงเอง/i }).uncheck();
    await page.getByRole('button', { name: 'ยกเลิก' }).click();
    await expect(page.getByRole('heading', { name: 'Sync สินค้าจาก Odoo ERP' })).not.toBeVisible();
    await step(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'โปรโมชั่น', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/จัดการโปรโมชั่น/);
    await expect(page.getByText('โปรโมชั่นและคูปอง', { exact: false })).toBeVisible();
    await step(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'บทความ', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/จัดการบทความ/);
    await step(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'ข้อร้องเรียน', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/ข้อร้องเรียน/);
    await step(page);

    await beforePageChange(page);
    await nav.getByRole('link', { name: 'คลังสินค้า', exact: true }).click();
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/^คลังสินค้า$/);
    await expect(page.getByText('Odoo ERP', { exact: false })).toBeVisible();
    await page.getByRole('link', { name: /รับสินค้าเข้า/ }).first().scrollIntoViewIfNeeded();
    await micro(page);
    await step(page);
  });
});
