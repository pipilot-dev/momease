import { chromium } from 'playwright';
import { readdirSync } from 'fs';

const APP = process.env.APP_URL || 'http://localhost:41162';
const log = (...a) => console.log(...a);
const pause = (p, ms) => p.waitForTimeout(ms);

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({
  viewport: { width: 412, height: 880 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true,
  recordVideo: { dir: './videos-dark', size: { width: 412, height: 880 } },
});
const page = await ctx.newPage();

// Launch -> sign-in
log('launch');
await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.getByText('Continue with Google', { exact: true }).waitFor({ state: 'visible', timeout: 120000 });
await pause(page, 1500);

// Real email login
log('login');
const inputs = page.locator('input');
await inputs.nth(0).fill('sarah@momease.app');
await inputs.nth(1).fill('password123');
await page.getByText('Sign In', { exact: true }).last().click();
await page.waitForURL(/\/home/, { timeout: 30000 }).catch(() => {});
await pause(page, 2500); // Home in LIGHT mode

// Go to Profile
log('profile');
await page.getByText('Profile', { exact: true }).last().click();
await pause(page, 2500);

// Flip the Dark Mode switch (click the checkbox/switch inside the "Dark Mode" row)
log('toggle dark');
const flipped = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('*')].filter(
    el => el.children.length === 0 && el.textContent && el.textContent.trim() === 'Dark Mode'
  );
  if (!labels.length) return false;
  let row = labels[0];
  for (let i = 0; i < 6 && row; i++) {
    const sw = row.querySelector('input[type="checkbox"], [role="switch"]');
    if (sw) { sw.click(); return true; }
    row = row.parentElement;
  }
  return false;
});
log('  switch clicked:', flipped);
await pause(page, 2500); // Profile now DARK

// Tour in dark mode
for (const tab of ['Home', 'Tasks', 'Sounds', 'Chat']) {
  const el = page.getByText(tab, { exact: true }).last();
  if (await el.isVisible({ timeout: 2500 }).catch(() => false)) {
    log('  -> tab', tab);
    await el.click().catch(() => {});
    await pause(page, 3000);
  }
}
await pause(page, 1500);

await ctx.close();
await browser.close();
const vids = readdirSync('./videos-dark').filter(f => f.endsWith('.webm'));
log('VIDEO:', vids[vids.length - 1]);
