import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './apps/web/tests',
  use: { viewport: { width: 1360, height: 960 }, screenshot: 'only-on-failure' },
})
