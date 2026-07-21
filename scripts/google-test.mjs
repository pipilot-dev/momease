import { chromium } from 'playwright';
const BASE = 'http://localhost:41234';
const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const authReqs = [];
page.on('request', (r) => { const u = r.url(); if (u.includes('supabase.co/auth') || u.includes('accounts.google.com') || u.includes('/authorize')) authReqs.push(`${r.method()} ${u.slice(0,150)}`); });
page.on('response', async (res) => { const u = res.url(); if (u.includes('supabase.co/auth/v1/authorize')) { console.log('AUTHORIZE status', res.status(), '-> loc:', (res.headers()['location']||'').slice(0,140)); if (res.status()>=400){ console.log('body:', (await res.text().catch(()=>'')).slice(0,300)); } } });
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3800);
const btn = page.getByText('Continue with Google', { exact: false });
const vis = await btn.isVisible().catch(()=>false);
console.log('Google button visible:', vis);
if (vis) {
  await btn.click().catch(e=>console.log('click err', e.message));
  await page.waitForTimeout(6000);
  console.log('FINAL URL:', page.url());
  await page.screenshot({ path: 'screens/g-after.png', fullPage: true });
  const html = await page.content();
  console.log('on accounts.google.com:', page.url().includes('accounts.google.com'));
  for (const m of ['provider is not enabled','Unsupported provider','validation_failed','redirect_uri_mismatch','invalid_client','Access blocked','Error 400','This app','continue to']) if (html.toLowerCase().includes(m.toLowerCase())) console.log('MARKER:', m);
}
console.log('=== auth reqs ==='); [...new Set(authReqs)].forEach(r=>console.log(' ',r));
await ctx.close(); await browser.close();
