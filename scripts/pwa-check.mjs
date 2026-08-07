import { chromium } from 'playwright';
const URL = 'https://open-sandal-z9zr.here.now/';
const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();

// Direct fetches
async function head(path) {
  const r = await page.request.get(URL + path.replace(/^\//,''));
  return { path, status: r.status(), ct: r.headers()['content-type'] || '' };
}
console.log(await head('/manifest.webmanifest'));
console.log(await head('/sw.js'));
console.log(await head('/icons/icon-192.png'));
console.log(await head('/icons/icon-512.png'));
console.log(await head('/icons/apple-touch-icon.png'));

// Load page, check tags + SW registration
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
const meta = await page.evaluate(() => ({
  themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
  manifestHref: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
  appleIcon: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
  appleCapable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content'),
  title: document.title,
  swSupport: 'serviceWorker' in navigator,
}));
console.log('meta:', meta);

// Wait a beat then poll for SW registration
await page.waitForTimeout(2500);
const swState = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return { state: 'not-supported' };
  const regs = await navigator.serviceWorker.getRegistrations();
  return { count: regs.length, active: regs.map(r => r.active?.state), scope: regs.map(r => r.scope) };
});
console.log('sw registrations:', swState);

// Fetch and parse manifest for spec compliance
const m = await (await page.request.get(URL + 'manifest.webmanifest')).json();
console.log('manifest name:', m.name, 'display:', m.display, 'start_url:', m.start_url, 'icons:', m.icons?.length);

await ctx.close(); await browser.close();
