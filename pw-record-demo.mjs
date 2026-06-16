import { chromium } from 'playwright';
import { readdirSync } from 'fs';

const APP = process.env.APP_URL || 'http://localhost:41162';
const log = (...a) => console.log(...a);
const pause = (p, ms) => p.waitForTimeout(ms);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 880 },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
  recordVideo: { dir: './videos', size: { width: 412, height: 880 } },
});
const page = await ctx.newPage();

// 1) Launch -> splash -> sign-in
log('1) launching app');
await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120000 });
const googleBtn = page.getByText('Continue with Google', { exact: true });
await googleBtn.waitFor({ state: 'visible', timeout: 120000 });
await pause(page, 2500);

// 2) Live Google sign-in handoff (headline feature)
log('2) Continue with Google -> real Google page');
await googleBtn.click();
await page.waitForURL(/accounts\.google\.com/, { timeout: 45000 }).catch(() => {});
await pause(page, 4000);

// 3) Back to app, real email login with the registered Supabase account
log('3) real email login');
await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 60000 });
await googleBtn.waitFor({ state: 'visible', timeout: 60000 });
await pause(page, 1200);

const inputs = page.locator('input');
const email = inputs.nth(0);
const pwd = inputs.nth(1);
await email.click();
await email.fill('');
await email.type('sarah@momease.app', { delay: 60 });
await pause(page, 500);
await pwd.click();
await pwd.fill('');
await pwd.type('password123', { delay: 60 });
await pause(page, 700);

const signInBtn = page.getByText('Sign In', { exact: true }).last();
await signInBtn.click();

// Wait until we land on the authenticated app.
const onHome = await page.waitForURL(/\/home|\/onboarding|\/\(tabs\)/, { timeout: 30000 })
  .then(() => true).catch(() => false);
log('   landed authenticated:', onHome, '->', page.url());
await pause(page, 4000); // Home: streak + daily check-in

// 4) Tour the tabs
for (const tab of ['Tasks', 'Sounds', 'Chat', 'Profile', 'Home']) {
  const el = page.getByText(tab, { exact: true }).last();
  if (await el.isVisible({ timeout: 2500 }).catch(() => false)) {
    log('   -> tab', tab);
    await el.click().catch(() => {});
    await pause(page, 3000);
  }
}
await pause(page, 1500);

await ctx.close();
await browser.close();

const vids = readdirSync('./videos').filter(f => f.endsWith('.webm'));
log('VIDEO:', vids[vids.length - 1]);
