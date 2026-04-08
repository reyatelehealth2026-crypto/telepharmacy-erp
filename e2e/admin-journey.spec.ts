import { test, expect } from '@playwright/test';

/**
 * Deep navigation smoke: requires real staff credentials.
 * Do not commit secrets — pass via environment:
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 * Optional: PLAYWRIGHT_BASE_URL (default http://127.0.0.1:3001)
 *
 * Against local admin you usually need API up too (staff-login).
 */

const SECTIONS: { nav: string; heading: RegExp }[] = [
  { nav: 'Dashboard', heading: /^Dashboard$/ },
  { nav: 'คิวใบสั่งยา', heading: /คิวใบสั่งยา/ },
  { nav: 'ออเดอร์', heading: /จัดการออเดอร์/ },
  { nav: 'ลูกค้า', heading: /ข้อมูลลูกค้า/ },
  { nav: 'สินค้า', heading: /จัดการสินค้า/ },
  { nav: 'โปรโมชั่น', heading: /จัดการโปรโมชั่น/ },
  { nav: 'บทความ', heading: /จัดการบทความ/ },
  { nav: 'ข้อร้องเรียน', heading: /ข้อร้องเรียน/ },
  { nav: 'คลังสินค้า', heading: /คลังสินค้า/ },
  { nav: 'ADR Reports', heading: /ADR Reports/ },
  { nav: 'Clinical', heading: /Clinical Services/ },
  { nav: 'Telemedicine', heading: /Telemedicine/ },
  { nav: 'KYC Review', heading: /KYC Review/ },
  { nav: 'กล่องข้อความ', heading: /กล่องข้อความ/ },
  { nav: 'LINE Messaging', heading: /LINE Messaging/ },
  { nav: 'รายงาน', heading: /^รายงาน$/ },
  { nav: 'ตั้งค่า', heading: /^ตั้งค่า$/ },
];

const hasCredentials =
  Boolean(process.env.E2E_ADMIN_EMAIL?.trim()) && Boolean(process.env.E2E_ADMIN_PASSWORD);

test.describe('Admin journey (authenticated)', () => {
  test.describe.configure({ mode: 'serial' });

  test('login, traverse sidebar, logout', async ({ page }) => {
    test.skip(!hasCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this test');
    test.setTimeout(240_000);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /REYA Pharmacy/i })).toBeVisible();

    await page.getByLabel('อีเมล').fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel('รหัสผ่าน').fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    await expect(page).toHaveTitle(/REYA Pharmacy/i);

    const sideNav = page.locator('aside').locator('nav').first();

    for (const { nav, heading } of SECTIONS) {
      await sideNav.getByRole('link', { name: nav, exact: true }).click();
      await expect(page.locator('main').getByRole('heading', { level: 1 }).first()).toHaveText(
        heading,
      );
      await expect(page.locator('main')).toBeVisible();
    }

    await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await page.waitForURL(/\/login/, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeVisible();
  });
});
