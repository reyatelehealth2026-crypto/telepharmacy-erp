import { expect, type Page } from '@playwright/test';

export const hasCredentials =
  Boolean(process.env.E2E_ADMIN_EMAIL?.trim()) && Boolean(process.env.E2E_ADMIN_PASSWORD);

export const stepMs = Number(process.env.STEP_DELAY_MS ?? 550);
export const microMs = Number(process.env.MICRO_PAUSE_MS ?? 280);
export const slowMoMs = Number(process.env.PLAYWRIGHT_SLOW_MS ?? 220);
export const pageChangeMs = Number(process.env.PAGE_CHANGE_MS ?? 1000);

export async function step(page: Page, ms = stepMs) {
  await page.waitForTimeout(ms);
}

export async function micro(page: Page, ms = microMs) {
  await page.waitForTimeout(ms);
}

export async function beforePageChange(page: Page, ms = pageChangeMs) {
  if (ms > 0) await page.waitForTimeout(ms);
}

export function mainLocator(page: Page) {
  return page.locator('main');
}

export function sidebarNav(page: Page) {
  return page.locator('aside nav').first();
}

/** ล็อกอินพนักงานแล้วรออยู่ที่ /dashboard */
export async function staffLogin(page: Page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /REYA Pharmacy/i })).toBeVisible();
  await page.getByLabel('อีเมล').fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel('รหัสผ่าน').fill(process.env.E2E_ADMIN_PASSWORD!);
  const loginResponse = page.waitForResponse(
    (r) => r.url().includes('/v1/auth/staff-login') && r.request().method() === 'POST',
    { timeout: 120_000 },
  );
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  const res = await loginResponse;
  expect(res.ok(), `staff-login failed: HTTP ${res.status()}`).toBeTruthy();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });
  await step(page, 800);
}
