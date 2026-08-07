// Verify the AuthGate on the live PWA:
// 1) Fresh browser (no localStorage), deep-link to protected routes → sign-in.
// 2) After sign-in, hitting /(auth)/sign-in should bounce to /home.
import { chromium } from 'playwright';
const URL = 'https://open-sandal-z9zr.here.now/';
const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });

async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  // Unregister any SW that might have been persisted and clear storage on first navigate.
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(async () => {
    localStorage.clear();
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  });
  await page.close();
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 414, height: 896 }, ignoreHTTPSErrors: true });
  return { ctx: ctx2, page: await ctx2.newPage() };
}

for (const target of ['home', 'onboarding', 'breathe', 'journal', 'mood']) {
  const { ctx, page } = await fresh();
  await page.goto(URL + target, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3500); // AuthGate needs hydration to fire
  const finalUrl = page.url();
  const hasSignIn = await page.getByText('Welcome Back', { exact: false }).isVisible().catch(() => false)
                 || await page.getByText('Continue with Google', { exact: false }).isVisible().catch(() => false);
  console.log(`deep-link /${target}  →  ${finalUrl.replace(URL, '/')}  signInVisible=${hasSignIn}  ${hasSignIn ? '✓' : '✗ LEAK'}`);
  await ctx.close();
}

// Second phase: authed user visiting sign-in should bounce.
{
  const { ctx, page } = await fresh();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.getByText('Sign In', { exact: true }).click().catch(() => {});
  await page.waitForTimeout(3000);
  console.log('after sign-in url:', page.url().replace(URL, '/'));
  await page.goto(URL + 'sign-in', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  console.log(`authed→/sign-in  →  ${page.url().replace(URL, '/')}  ${page.url().includes('home') || page.url().includes('onboarding') ? '✓' : '✗ LEAK'}`);
  await ctx.close();
}

await browser.close();
