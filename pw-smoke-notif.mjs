import { chromium } from 'playwright';
const APP = process.env.APP_URL;
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 880 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.getByText('Continue with Google', { exact: true }).waitFor({ state: 'visible', timeout: 120000 });

// login
const inputs = page.locator('input');
await inputs.nth(0).fill('sarah@momease.app');
await inputs.nth(1).fill('password123');
await page.getByText('Sign In', { exact: true }).last().click();
await page.waitForURL(/\/home/, { timeout: 30000 });
log('logged in');

// profile
await page.getByText('Profile', { exact: true }).last().click();
await page.waitForTimeout(1500);

// toggle the Notifications switch (first switch in Account section) off then on
const clicked = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('*')].filter(
    el => el.children.length === 0 && el.textContent && el.textContent.trim() === 'Notifications'
  );
  if (!labels.length) return 'no label';
  let row = labels[0];
  for (let i = 0; i < 6 && row; i++) {
    const sw = row.querySelector('input[type="checkbox"], [role="switch"]');
    if (sw) { sw.click(); return 'toggled off'; }
    row = row.parentElement;
  }
  return 'no switch';
});
log('toggle1:', clicked);
await page.waitForTimeout(1200);
// toggle back on
await page.evaluate(() => {
  const labels = [...document.querySelectorAll('*')].filter(
    el => el.children.length === 0 && el.textContent && el.textContent.trim() === 'Notifications');
  let row = labels[0];
  for (let i = 0; i < 6 && row; i++) {
    const sw = row.querySelector('input[type="checkbox"], [role="switch"]');
    if (sw) { sw.click(); return; }
    row = row.parentElement;
  }
});
await page.waitForTimeout(1500);
await page.screenshot({ path: 'pw-notif.png' });

log('\nConsole errors:', errors.length);
errors.slice(0, 10).forEach(e => log('  ERR:', e.slice(0, 200)));
await ctx.close();
await browser.close();
log('done');
