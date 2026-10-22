import { defineConfig, devices } from '@playwright/test'
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.VITE_BASE_PATH ?? (repo ? `/${repo}/` : '/')
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  workers: 2,
  use: {
    baseURL: `http://127.0.0.1:4173${base}`,
    trace: 'retain-on-failure',
    // Optional full Chromium channel when a platform's separate headless shell is unusable.
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'pnpm preview --port 4173 --strictPort',
    url: `http://127.0.0.1:4173${base}`,
    reuseExistingServer: !process.env.CI,
  },
  snapshotPathTemplate: '{testDir}/snapshots/{projectName}/{platform}/{arg}{ext}',
})
