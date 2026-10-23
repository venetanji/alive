import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  testDir: '.',
  testMatch: ['canvas-browser.spec.mjs', 'canvas-controls.spec.mjs', 'canvas-compat.spec.mjs', 'canvas-console.spec.mjs', 'canvas-documents.spec.mjs','canvas-hierarchy.spec.mjs','canvas-help-shell.spec.mjs','canvas-comment-entry.spec.mjs','canvas-arithmetic.spec.mjs','canvas-instrument.spec.mjs'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: {timeout: 5_000},
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4173',
    viewport: {width: 1600, height: 1400},
    // Never use --no-sandbox, even in CI. A launch failure is a real failure.
    launchOptions: {chromiumSandbox: true},
    screenshot: process.env.ULTRA_TEST_NO_CAPTURES==='1'?'off':'only-on-failure',
    trace: process.env.ULTRA_TEST_NO_CAPTURES==='1'?'off':'retain-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    cwd: fileURLToPath(new URL('../../ui/', import.meta.url)),
    url: 'http://127.0.0.1:4173/canvas.html',
    timeout: 15_000,
    reuseExistingServer: false,
  },
});
