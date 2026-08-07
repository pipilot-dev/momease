// Drive the personalized onboarding end-to-end and screenshot each step,
// then reload to /home to confirm the plan renders as the dashboard hero.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:41234';
mkdirSync('screens', { recursive: true });

const errors = [];
const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('PAGE: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('ERR: ' + m.text()); });

async function shot(name) {
  await page.screenshot({ path: `screens/${name}.png`, fullPage: true });
  console.log(`  → ${name}.png`);
}

async function tapByText(text) {
  const el = page.getByText(text, { exact: false }).first();
  const vis = await el.isVisible().catch(() => false);
  if (!vis) throw new Error(`not visible: ${text}`);
  await el.click();
  await page.waitForTimeout(700);
}

console.log('load', BASE);
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
// Wipe any persisted user from a prior run so we start clean.
await page.evaluate(() => localStorage.clear()).catch(() => {});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(3500);

// Sign in (prefilled).
await page.getByText('Sign In', { exact: true }).click({ timeout: 10000 });
await page.waitForTimeout(2200);

// Go directly to onboarding (skips any onboardingCompleted gate).
await page.goto(BASE + '/onboarding', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1800);
await shot('ob-1-welcome');

// Step 0 → 1
await tapByText("Let's personalize your space");
await shot('ob-2-lifestage');

// Pick "Mom to a toddler (1–3yr)"
await tapByText('Mom to a toddler');
await page.waitForTimeout(400);
await tapByText('Continue');
await shot('ob-3-challenge');

// Pick "The mental load is crushing me"
await tapByText('mental load');
await page.waitForTimeout(400);
await tapByText('Continue');
await shot('ob-4-goals');

// Toggle 3 goals
await tapByText('Reduce daily stress');
await tapByText('Sleep better');
await tapByText('More me-time');
await shot('ob-4b-goals-selected');

await tapByText('Continue with 3 goals');
await shot('ob-5-notifications');

// Yes to notifications
await tapByText('Yes, gently nudge me');
await page.waitForTimeout(400);
await tapByText('Almost there');
// Now on the generating step — capture it, then wait for auto-advance.
await page.waitForTimeout(1000);
await shot('ob-6-generating');
await page.waitForTimeout(2200);
await shot('ob-7-ready');

// Finish → dashboard
await tapByText('Show me my dashboard');
await page.waitForTimeout(2500);
await shot('ob-8-home-personalized');
// Reload to be sure hydration + personalization renders together.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(3200);
await shot('ob-9-home-after-reload');

console.log('\n=== ERRORS ==='); if (!errors.length) console.log('  none'); else [...new Set(errors)].forEach((e) => console.log(' ', e.slice(0, 200)));
await ctx.close(); await browser.close();
console.log('done');
