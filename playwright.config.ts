import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for mobile E2E testing.
 * All tests run in Chromium with mobile device emulation.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    // Base URL - defaults to production, override with BASE_URL env var
    baseURL: process.env.BASE_URL || 'https://huepress.co',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Use Chromium for all tests (we only installed chromium)
    browserName: 'chromium',
  },

  projects: [
    {
      name: 'iPhone 16 Pro',
      use: {
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'iPad Pro 11',
      use: {
        viewport: { width: 834, height: 1194 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'Desktop Chrome',
      use: {
        viewport: { width: 1280, height: 720 },
        isMobile: false,
        hasTouch: false,
      },
    },
  ],
});
