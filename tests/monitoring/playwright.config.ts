import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'browser.spec.ts',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    ...devices['Desktop Chrome'],
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL,
    trace: 'off'
  },
  webServer: {
    command: 'bun run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174/about',
    reuseExistingServer: false,
    env: {
      PUBLIC_SENTRY_DSN: 'https://public@monitoring.invalid/3',
      SENTRY_DSN: '',
      PUBLIC_SENTRY_ENVIRONMENT: 'test',
      PUBLIC_SENTRY_RELEASE: 'monitoring-test'
    }
  }
})
