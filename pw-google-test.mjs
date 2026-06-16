import { chromium } from 'playwright';

const APP = process.env.APP_URL || 'http://localhost:41162';
const log = (...a) => console.log(...a);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 420, height: 880 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();

const consoleErrors = [];
const navChain = [];
const failedReqs = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
page.on('framenavigated', f => { if (f === page.mainFrame()) navChain.push(f.url()); });
page.on('requestfailed', r => {
  if (r.isNavigationRequest()) failedReqs.push(`${r.url()} :: ${r.failure()?.errorText}`);
});

log('--- goto', APP);
await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120000 });

// App shows a 2s splash then routes to /sign-in. Wait for the Google button.
log('--- waiting for sign-in screen / Google button (metro bundle may take a while)');
const googleBtn = page.getByText('Continue with Google', { exact: true });
await googleBtn.waitFor({ state: 'visible', timeout: 120000 });
log('--- sign-in screen reached. URL:', page.url());
await page.screenshot({ path: 'pw-1-signin.png' });

// Click Google and watch where the page navigates.
log('--- clicking "Continue with Google"');
let navigatedTo = null;
const navPromise = page.waitForURL(/accounts\.google\.com|supabase\.co|oauth\.lovable\.app/, { timeout: 45000 })
  .then(() => { navigatedTo = page.url(); })
  .catch(() => {});

await googleBtn.click();
await navPromise;
// settle
await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2500);

const finalUrl = page.url();
log('--- URL after click:', finalUrl);
await page.screenshot({ path: 'pw-2-after-google.png' });

// Verdict
const onGoogle = /accounts\.google\.com/.test(finalUrl);
const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 600) : '').catch(() => '');
const hasMismatch = /redirect_uri_mismatch|doesn't comply with Google/i.test(bodyText);

const reachedGoogleInChain = navChain.some(u => /accounts\.google\.com/.test(u));
log('\n===== VERDICT =====');
log('Reached Google OAuth (final URL):', onGoogle);
log('Reached Google OAuth (any hop):', reachedGoogleInChain);
log('redirect_uri_mismatch error visible:', hasMismatch);
log('Final URL:', finalUrl);
log('\nMain-frame navigation chain:');
navChain.forEach((u, i) => log(`  ${i + 1}. ${u.slice(0, 160)}`));
if (failedReqs.length) {
  log('\nFailed navigation requests:');
  failedReqs.forEach(r => log('  X ' + r.slice(0, 200)));
}
if (bodyText) log('\nPage text (first 300 chars):', bodyText.replace(/\s+/g, ' ').slice(0, 300));
log('\nConsole errors:', consoleErrors.length);
consoleErrors.slice(0, 8).forEach(e => log('  ERR:', e.slice(0, 160)));

await ctx.close();
await browser.close();
log('\n--- done ---');
