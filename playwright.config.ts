import { defineConfig, devices } from '@playwright/test';

/**
 * E2E — วิดีโอคมชัด: viewport FHD + deviceScaleFactor 2 (ข้อความ/ UI คมขึ้นบนจอ HiDPI)
 *
 * - `PLAYWRIGHT_VIDEO=on` | `off` | `retain-on-failure`
 * - `PLAYWRIGHT_BASE_URL` (ดีฟอลต์ admin dev http://127.0.0.1:3001)
 * - จังหวะช้า: `PLAYWRIGHT_SLOW_MS`, `STEP_DELAY_MS`, `MICRO_PAUSE_MS`, `PAGE_CHANGE_MS` (หน่วงก่อนเปลี่ยนหน้าใน catalog)
 *
 * `pnpm exec playwright install chromium`
 */

const videoMode = (): 'on' | 'off' | 'retain-on-failure' => {
  const v = process.env.PLAYWRIGHT_VIDEO;
  if (v === 'off' || v === '0') return 'off';
  if (v === 'retain-on-failure') return 'retain-on-failure';
  if (process.env.CI) return 'retain-on-failure';
  return 'on';
};

const HD = { width: 1920, height: 1080 } as const;

function videoSetting():
  | 'off'
  | 'retain-on-failure'
  | { mode: 'on'; size: typeof HD }
  | { mode: 'retain-on-failure'; size: typeof HD } {
  const m = videoMode();
  if (m === 'off') return 'off';
  if (m === 'retain-on-failure') return { mode: 'retain-on-failure', size: HD };
  return { mode: 'on', size: HD };
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: videoSetting(),
    viewport: HD,
    deviceScaleFactor: 2,
    navigationTimeout: 45_000,
    actionTimeout: 20_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: HD,
        deviceScaleFactor: 2,
      },
    },
  ],
});
