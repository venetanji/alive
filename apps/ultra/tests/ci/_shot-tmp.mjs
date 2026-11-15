import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const out = resolve(process.argv[2] || process.env.ALIVE_CAPTURE_DIR || fileURLToPath(new URL('./test-results/ui-captures/', import.meta.url)));
mkdirSync(out, {recursive: true});
const baseURL = process.env.ALIVE_CAPTURE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({chromiumSandbox: true});
for (const [w,h,tag] of [[1440,900,'1440'],[1280,800,'1280']]) {
  const page = await browser.newPage({viewport:{width:w,height:h}});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  await page.goto(new URL('/alive.html', baseURL).href);
  await page.waitForTimeout(1200);
  await page.screenshot({path:`${out}/alive-${tag}-session.png`});
  // switch to arrangement
  await page.click('#view-arrangement').catch(()=>{});
  await page.waitForTimeout(600);
  await page.screenshot({path:`${out}/alive-${tag}-arrangement.png`});
  await page.click('#view-session').catch(()=>{});
  console.log(tag, 'errors:', JSON.stringify(errors));
  await page.close();
}
await browser.close();
