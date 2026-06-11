import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run start:backend',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
      env: {
        APP_ENV: 'development',
        NODE_ENV: 'development',
        DB_HOST: 'localhost',
        DB_PORT: '3306',
        DB_USERNAME: 'root',
        DB_PASSWORD: 'root',
        DB_DATABASE: 'openoba_starter',
        JWT_SECRET: 'e2e-tes鈥ion',
      },
    },
    {
      command: 'npm run dev -w frontend',
      port: 5173,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
