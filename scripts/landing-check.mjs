import { chromium } from 'playwright';
const URL = 'https://saffron-lotus-hjaf.here.now/';
const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });

// Desktop shot
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
const dpage = await dctx.newPage();
await dpage.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await dpage.waitForTimeout(3500);
await dpage.screenshot({ path: 'screens/landing-desktop.png', fullPage: false });
console.log('desktop title:', await dpage.title());
await dctx.close();

// Mobile shot
const mctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
const mpage = await mctx.newPage();
await mpage.goto(URL, { waitUntil: 'networkidle' });
await mpage.waitForTimeout(3500);
await mpage.screenshot({ path: 'screens/landing-mobile.png', fullPage: false });
await mctx.close();

// Head fetches
const r = await (await fetch(URL + 'demo.webm', { method: 'HEAD' })).status;
console.log('demo.webm HEAD:', r);
await browser.close();
