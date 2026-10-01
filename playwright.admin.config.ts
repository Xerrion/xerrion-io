import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'admin-mobile.spec.ts',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://localhost:5181',
    trace: 'retain-on-failure',
    reducedMotion: 'reduce'
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        hasTouch: true,
        channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL
      }
    }
  ],
  webServer: {
    command: 'bunx vite --port 5181 --strictPort',
    cwd: 'tests/fixtures/admin-mobile',
    url: 'http://localhost:5181/admin',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
})
