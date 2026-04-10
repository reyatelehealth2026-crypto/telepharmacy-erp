import { test, expect } from '@playwright/test';

/** ไม่ต้องมีบัญชี — ตรวจหน้า login ว่าพร้อมใช้งาน */
test.describe('Admin — หน้าเข้าสู่ระบบ (public)', () => {
  test('แสดงฟอร์มและข้อความพนักงาน', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/REYA Pharmacy/i);
    await expect(page.getByRole('heading', { name: /REYA Pharmacy/i })).toBeVisible();
    await expect(page.getByText('เข้าสู่ระบบสำหรับพนักงาน')).toBeVisible();
    await expect(page.getByLabel('อีเมล')).toBeVisible();
    await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeEnabled();
  });
});
