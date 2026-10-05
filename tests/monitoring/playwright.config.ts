import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const productionBuild = process.env.MONITORING_PRODUCTION_BUILD === '1'

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
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    command: productionBuild
      ? 'bun --no-env-file ./build'
      : 'bun run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174/about',
    reuseExistingServer: false,
    env: {
      HOST: '127.0.0.1',
      PORT: '5174',
      PUBLIC_SENTRY_DSN: 'https://public@monitoring.invalid/3',
      SENTRY_DSN: '',
      PUBLIC_SENTRY_ENVIRONMENT: 'test',
      PUBLIC_SENTRY_RELEASE: 'monitoring-test'
    }
  }
})
