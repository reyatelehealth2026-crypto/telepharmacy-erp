import { test, expect } from '@playwright/test';

/**
 * สาธิตการใช้งานแบบละเอียด + จังหวะช้า (ดูวิดีโอได้ชัด)
 *
 * ต้องการ: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 * - PLAYWRIGHT_SLOW_MS — slowMo ต่อ action (ดีฟอลต์ ~450)
 * - STEP_DELAY_MS — หยุดระหว่างเซกชัน (ดีฟอลต์ ~900)
 * - MICRO_PAUSE_MS — หยุดสั้นๆ หลังสครอล/คลิก (ดีฟอลต์ ~350)
 *
 * Sync Odoo: เปิด modal → เลือกช่วงรหัส → สลับโหมด → ทดลอง «กำหนดช่วงเอง» → ปิด «ยกเลิก» (ไม่กด «เริ่ม Sync»)
 */

const hasCredentials =
  Boolean(process.env.E2E_ADMIN_EMAIL?.trim()) && Boolean(process.env.E2E_ADMIN_PASSWORD);

const stepDelayMs = Number(process.env.STEP_DELAY_MS ?? 900);
const microPauseMs = Number(process.env.MICRO_PAUSE_MS ?? 350);
const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MS ?? 450);

async function pause(page: import('@playwright/test').Page, ms = stepDelayMs) {
  await page.waitForTimeout(ms);
}

async function microPause(page: import('@playwright/test').Page, ms = microPauseMs) {
  await page.waitForTimeout(ms);
}

test.use({
  launchOptions: {
    slowMo,
  },
});

test.describe('Admin deep demo (prescriptions + products sync UI)', () => {
  test.describe.configure({ mode: 'serial' });

  test('login → Dashboard → คิว Rx (ละเอียด) → สินค้า + Sync Odoo (modal)', async ({ page }) => {
    test.skip(!hasCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
    test.setTimeout(600_000);

    const sideNav = page.locator('aside').locator('nav').first();

    // ── Login ─────────────────────────────────────────────────────────────
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /REYA Pharmacy/i })).toBeVisible();
    await expect(page.getByText('เข้าสู่ระบบสำหรับพนักงาน')).toBeVisible();
    await pause(page);

    await page.getByLabel('อีเมล').fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel('รหัสผ่าน').fill(process.env.E2E_ADMIN_PASSWORD!);
    await microPause(page, 400);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 90_000 });
    await pause(page, 1200);

    // ── Dashboard (ภาพรวมสั้นๆ) ───────────────────────────────────────────
    await expect(page.locator('main').getByRole('heading', { level: 1 })).toHaveText(/Dashboard/i);
    await expect(page.getByText('ภาพรวมการดำเนินงานวันนี้')).toBeVisible();
    await page.locator('main').getByText('ยอดขายวันนี้', { exact: false }).first().scrollIntoViewIfNeeded();
    await microPause(page);
    await page.getByText('ใบสั่งยารอตรวจ', { exact: false }).first().scrollIntoViewIfNeeded();
    await pause(page, 800);

    // ── คิวใบสั่งยา ───────────────────────────────────────────────────────
    await sideNav.getByRole('link', { name: 'คิวใบสั่งยา', exact: true }).click();
    await expect(page.locator('main').getByRole('heading', { level: 1 })).toHaveText(/คิวใบสั่งยา/);
    await expect(page.getByText('ตรวจสอบและ verify ใบสั่งยาจากลูกค้า')).toBeVisible();
    await pause(page);

    await expect(page.getByText('รอตรวจสอบ', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Urgent / High', { exact: false }).first()).toBeVisible();
    await page.locator('main').locator('table').scrollIntoViewIfNeeded();
    await microPause(page);
    await expect(page.getByRole('columnheader', { name: 'เลข Rx' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Priority' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'สถานะ' })).toBeVisible();

    await page.getByRole('button', { name: 'รีเฟรช' }).click();
    await pause(page, 1500);

    const priorityTabs = [/^Urgent/, /^High/, /^Medium/, /^Low/, /^ทั้งหมด/];
    for (const nameRe of priorityTabs) {
      await page.getByRole('button', { name: nameRe }).click();
      await microPause(page, 500);
    }
    await pause(page, 600);

    const reviewLinks = page.getByRole('link', { name: 'ตรวจสอบ' });
    const n = await reviewLinks.count();
    if (n > 0) {
      await reviewLinks.first().click();
      await page.waitForURL(/\/dashboard\/pharmacist\/[^/]+$/, { timeout: 30_000 });

      await expect(page.locator('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByText('ภาพใบสั่งยา', { exact: false })).toBeVisible();
      await pause(page, 800);

      await page.getByText('ภาพใบสั่งยา', { exact: false }).first().scrollIntoViewIfNeeded();
      await microPause(page);
      await page.getByText('รายการยา', { exact: false }).first().scrollIntoViewIfNeeded();
      await pause(page, 600);

      await page.getByText('Safety Alerts', { exact: false }).scrollIntoViewIfNeeded();
      await microPause(page);
      await page.getByText('ข้อมูลลูกค้า', { exact: false }).first().scrollIntoViewIfNeeded();
      await pause(page, 700);

      await page.getByRole('button', { name: /ตัดสิน/ }).click();
      await microPause(page, 400);
      await page.getByRole('button', { name: /Intervention/ }).click();
      await microPause(page, 400);
      await page.getByRole('button', { name: /Counseling/ }).click();
      await microPause(page, 500);
      await page.getByRole('button', { name: /ตัดสิน/ }).click();
      await pause(page, 800);

      await page.locator('main a[href="/dashboard/pharmacist"]').first().click();
      await page.waitForURL(/\/dashboard\/pharmacist$/, { timeout: 30_000 });
      await expect(page.locator('main').getByRole('heading', { level: 1 })).toHaveText(/คิวใบสั่งยา/);
      await pause(page);
    } else {
      await expect(page.getByText('ไม่มีใบสั่งยารอตรวจสอบ')).toBeVisible();
      await pause(page);
    }

    // ── สินค้า (ค้นหา + แท็บประเภท + รายละเอียด) ───────────────────────────
    await sideNav.getByRole('link', { name: 'สินค้า', exact: true }).click();
    await expect(page.locator('main').getByRole('heading', { level: 1 })).toHaveText(/จัดการสินค้า/);
    await expect(page.getByText('สินค้าและยาในระบบ')).toBeVisible();
    await pause(page);

    await expect(page.getByText('สินค้าทั้งหมด', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Sync จาก Odoo', { exact: false }).first()).toBeVisible();
    await page.locator('main').locator('table').scrollIntoViewIfNeeded();
    await microPause(page);
    await expect(page.getByRole('columnheader', { name: 'SKU' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'ชื่อสินค้า' })).toBeVisible();

    const searchInput = page.getByPlaceholder('ค้นหาสินค้า SKU หรือชื่อ...');
    await searchInput.fill('para');
    await microPause(page, 600);
    await searchInput.clear();
    await microPause(page, 400);

    await page.getByRole('button', { name: 'ยาสามัญ (HHR)' }).click();
    await microPause(page, 500);
    await page.locator('main').getByRole('button', { name: 'ทั้งหมด' }).first().click();
    await microPause(page, 500);
    await pause(page, 500);

    const firstView = page.getByRole('link', { name: 'ดู' }).first();
    if ((await firstView.count()) > 0) {
      await firstView.click();
      await page.waitForURL(/\/dashboard\/products\/[^/]+$/, { timeout: 30_000 });
      await expect(page.locator('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
      await page.locator('main').scrollIntoViewIfNeeded();
      await microPause(page);
      await page.getByText('SKU', { exact: false }).first().scrollIntoViewIfNeeded().catch(() => {});
      await pause(page, 1000);
      await page.goto('/dashboard/products');
      await expect(page.locator('main').getByRole('heading', { level: 1 })).toHaveText(/จัดการสินค้า/);
      await pause(page);
    }

    // ── Sync Odoo: modal ละเอียด (ไม่เริ่ม sync จริง) ───────────────────────
    await page.getByRole('button', { name: /Sync จาก Odoo/ }).click();
    await expect(page.getByRole('heading', { name: 'Sync สินค้าจาก Odoo ERP' })).toBeVisible();
    await expect(page.getByText('ซิงค์ชื่อ, ราคา, สต็อก', { exact: false })).toBeVisible();
    await pause(page, 900);

    await page.getByRole('button', { name: /0001 – 0200/ }).click();
    await microPause(page, 500);
    await page.getByRole('button', { name: /0201 – 0400/ }).click();
    await microPause(page, 600);

    await page.getByRole('button', { name: /ระบุรหัสเอง/ }).click();
    await pause(page, 800);
    await page.getByPlaceholder(/กรอก PRODUCT_CODE/).fill('0001');
    await microPause(page, 400);
    await page.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
    await microPause(page, 600);
    await page.getByRole('button', { name: /ล้าง/ }).click();
    await microPause(page, 400);
    await page.getByRole('button', { name: /ซิงค์ตามช่วงรหัส/ }).click();
    await pause(page, 600);

    await page.getByRole('checkbox', { name: /กำหนดช่วงเอง/i }).check();
    await microPause(page, 500);
    await page.getByPlaceholder(/จาก \(เช่น 1\)/).fill('1');
    await page.getByPlaceholder(/ถึง \(เช่น 300\)/).fill('50');
    await microPause(page, 600);
    await page.getByRole('checkbox', { name: /กำหนดช่วงเอง/i }).uncheck();
    await microPause(page, 400);

    await page.getByRole('button', { name: 'ยกเลิก' }).click();
    await expect(page.getByRole('heading', { name: 'Sync สินค้าจาก Odoo ERP' })).not.toBeVisible();
    await pause(page);

    await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await page.waitForURL(/\/login/, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeVisible();
  });
});
