import { defineConfig, devices } from '@playwright/test';

// Os testes rodam contra o build de produção (vite preview) com o base path do GitHub Pages.
export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4173/Zumbi-Bot/',
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/Zumbi-Bot/',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
