// After completing onboarding, inspect the persisted user + zustand state.
import { chromium } from 'playwright';
const BASE = 'http://localhost:41234';
const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3200);
await page.getByText('Sign In', { exact: true }).click();
await page.waitForTimeout(2200);

await page.goto(BASE + '/onboarding', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
async function tap(t) { const el = page.getByText(t, { exact: false }).first(); await el.click(); await page.waitForTimeout(500); }
await tap("Let's personalize your space");
await tap('Mom to a toddler'); await tap('Continue');
await tap('mental load'); await tap('Continue');
await tap('Reduce daily stress'); await tap('Sleep better');
await tap('Continue with 2 goals');
await tap('Yes, gently nudge me');
await tap('Almost there');
await page.waitForTimeout(3500);

// Peek at persisted state + localStorage.
const storage = await page.evaluate(async () => {
  const raw = localStorage.getItem('momease-auth');
  return { raw };
});
console.log('localStorage momease-auth:', storage.raw?.slice(0, 800));

await tap('Show me my dashboard');
await page.waitForTimeout(2000);

const homeState = await page.evaluate(async () => {
  const raw = localStorage.getItem('momease-auth');
  return { raw };
});
console.log('\nAfter dashboard nav:', homeState.raw?.slice(0, 800));

await ctx.close(); await browser.close();
