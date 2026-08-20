import { defineConfig, devices } from '@playwright/test'

/**
 * E2e contra el DEMO MODE (100% en memoria, sin Firebase). `webServer.env`
 * fuerza VITE_DEMO_MODE=true — gana sobre las credenciales de `.env.local` por
 * el `||` en src/config/env.ts, sin tocar dotfiles. Puerto 3000 (vite.config.ts).
 * Viewport ancho para que el sidebar (off-canvas en mobile) esté siempre visible.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // `--mode test` carga .env.test (VITE_DEMO_MODE=true) → demo mode garantizado.
    command: 'pnpm dev:test',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
