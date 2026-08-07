import { chromium } from 'playwright';
const URL = 'https://open-sandal-z9zr.here.now/';
const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGE: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('ERR: ' + m.text().slice(0, 160)); });

console.log('=== home ==='); 
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4500);
console.log('title:', await page.title(), 'url:', page.url());
await page.screenshot({ path: 'screens/prod-signin.png', fullPage: true });

const googleBtn = page.getByText('Continue with Google', { exact: false });
console.log('google button visible:', await googleBtn.isVisible().catch(() => false));

// Sign in and go to onboarding
await page.getByText('Sign In', { exact: true }).click().catch(() => {});
await page.waitForTimeout(3000);
await page.screenshot({ path: 'screens/prod-home.png', fullPage: true });

console.log('=== SPA deep-link /onboarding ===');
await page.goto(URL + 'onboarding', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);
console.log('deep-link title:', await page.title(), 'url:', page.url());
await page.screenshot({ path: 'screens/prod-onboarding.png', fullPage: true });

console.log('\n=== errors ===');
if (!errs.length) console.log('none'); else [...new Set(errs)].slice(0, 5).forEach(e => console.log(' ', e));
await ctx.close(); await browser.close();
