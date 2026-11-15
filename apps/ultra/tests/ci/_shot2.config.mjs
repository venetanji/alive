import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';

const port=Number(process.env.ALIVE_CAPTURE_PORT || 4173);
if(!Number.isInteger(port) || port<1 || port>65535)throw new Error('ALIVE_CAPTURE_PORT must be a valid TCP port');
const baseURL=`http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: '.',
  testMatch: ['_shot.spec.mjs'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: {timeout: 5_000},
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {
    browserName: 'chromium',
    baseURL,
    viewport: {width: 1600, height: 1400},
    // Never use --no-sandbox, even in CI. A launch failure is a real failure.
    launchOptions: {chromiumSandbox: true},
    screenshot: process.env.ULTRA_TEST_NO_CAPTURES==='1'?'off':'only-on-failure',
    trace: process.env.ULTRA_TEST_NO_CAPTURES==='1'?'off':'retain-on-failure',
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    cwd: fileURLToPath(new URL('../../ui/', import.meta.url)),
    url: `${baseURL}/canvas.html`,
    timeout: 15_000,
    reuseExistingServer: false,
  },
});
