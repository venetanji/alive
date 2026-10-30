import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';

const port=Number(process.env.ALIVE_TEST_PORT??4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('ALIVE_TEST_PORT must be an integer from 1024 to 65535');

export default defineConfig({
  testDir: '.',
  testMatch: ['alive-clip-regions.spec.mjs', 'alive-chain.spec.mjs', 'canvas-browser.spec.mjs', 'canvas-controls.spec.mjs', 'canvas-compat.spec.mjs', 'canvas-console.spec.mjs', 'canvas-documents.spec.mjs','canvas-hierarchy.spec.mjs','canvas-help-shell.spec.mjs','canvas-comment-entry.spec.mjs','canvas-arithmetic.spec.mjs','canvas-instrument.spec.mjs'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: {timeout: 5_000},
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {
    browserName: 'chromium',
    baseURL: `http://127.0.0.1:${port}`,
    viewport: {width: 1600, height: 1400},
    // Never use --no-sandbox, even in CI. A launch failure is a real failure.
    launchOptions: {chromiumSandbox: true},
    screenshot: process.env.ULTRA_TEST_NO_CAPTURES==='1'?'off':'only-on-failure',
    trace: process.env.ULTRA_TEST_NO_CAPTURES==='1'?'off':'retain-on-failure',
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    cwd: fileURLToPath(new URL('../../ui/', import.meta.url)),
    url: `http://127.0.0.1:${port}/canvas.html`,
    timeout: 15_000,
    reuseExistingServer: false,
  },
});
