import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
await page.goto('http://localhost:41234', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4000);
const sb = await page.evaluate(() => window.__SB || null);
console.log('window.__SB =', JSON.stringify(sb, null, 2));
await ctx.close(); await browser.close();
