// Record the full personalized onboarding + dashboard demo against the LIVE
// production URL. Playwright writes a .webm to ./videos/ when the context closes.
import { chromium } from 'playwright';
const URL = 'https://open-sandal-z9zr.here.now/';
const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({
  viewport: { width: 414, height: 896 },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
  recordVideo: { dir: './videos', size: { width: 414, height: 896 } },
});
const page = await ctx.newPage();

async function tap(text) {
  const el = page.getByText(text, { exact: false }).first();
  const vis = await el.isVisible().catch(() => false);
  if (!vis) { console.log('  skip (not visible):', text); return false; }
  await el.click();
  return true;
}

console.log('load'); 
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => localStorage.clear()).catch(() => {});
await page.reload({ waitUntil: 'networkidle' });
// Splash + settle — this is the demo's opening beat.
await page.waitForTimeout(4200);

console.log('sign in'); 
await tap('Sign In');
await page.waitForTimeout(2500);

console.log('go to onboarding');
await page.goto(URL + 'onboarding', { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);

console.log('welcome → start');
await tap("Let's personalize your space");
await page.waitForTimeout(1200);

console.log('life stage: toddler');
await tap('Mom to a toddler');
await page.waitForTimeout(900);
await tap('Continue');
await page.waitForTimeout(1200);

console.log('challenge: mental load');
await tap('The mental load is crushing me');
await page.waitForTimeout(900);
await tap('Continue');
await page.waitForTimeout(1200);

console.log('goals');
await tap('Reduce daily stress');
await page.waitForTimeout(450);
await tap('Sleep better');
await page.waitForTimeout(450);
await tap('More me-time');
await page.waitForTimeout(900);
await tap('Continue with 3 goals');
await page.waitForTimeout(1200);

console.log('notifications: yes');
await tap('Yes, gently nudge me');
await page.waitForTimeout(700);
await tap('Almost there');
console.log('generating (2.2s)');
await page.waitForTimeout(2400);
console.log('ready → dashboard');
await tap('Show me my dashboard');
await page.waitForTimeout(3500);

console.log('scroll to reveal weekly plan detail');
await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
await page.waitForTimeout(2000);
await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
await page.waitForTimeout(2000);

console.log('closing ctx (flushes video)');
await ctx.close();
await browser.close();
console.log('done');
