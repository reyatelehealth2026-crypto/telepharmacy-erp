import { defineConfig, devices } from '@playwright/test';

/**
 * E2E / screen-recording style runs.
 *
 * - Video: `PLAYWRIGHT_VIDEO=on` (default) | `retain-on-failure` | `off`
 * - Target app: `PLAYWRIGHT_BASE_URL` (default admin dev http://127.0.0.1:3001)
 * - Slow motion (e.g. deep demo): `PLAYWRIGHT_SLOW_MS`, `STEP_DELAY_MS` (see `e2e/admin-deep-demo.spec.ts`)
 *
 * Run admin locally first: `pnpm dev:admin`, then `pnpm e2e`
 * Install browsers once: `pnpm exec playwright install chromium`
 */
const videoMode = (): 'on' | 'off' | 'retain-on-failure' => {
  const v = process.env.PLAYWRIGHT_VIDEO;
  if (v === 'off' || v === '0') return 'off';
  if (v === 'retain-on-failure') return 'retain-on-failure';
  if (process.env.CI) return 'retain-on-failure';
  return 'on';
};

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
    video: videoMode(),
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
