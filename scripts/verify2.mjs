import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'fs';

const PORT = readFileSync('/tmp/momease_port', 'utf8').trim();
const BASE = `http://localhost:${PORT}`;
mkdirSync('screens', { recursive: true });

const errors = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('ERR: ' + m.text()); });

async function go(path, wait = 1800) {
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => console.log('nav', e.message));
  await page.waitForTimeout(wait);
}
async function shot(n) { await page.screenshot({ path: `screens/${n}.png`, fullPage: true }); console.log('shot', n); }

// 1. Sign-in (Google button)
await go('/', 3500);
await shot('w-signin');

// set dark theme + a checkin streak seed in localStorage, then reload
await page.evaluate(() => {
  localStorage.setItem('momease-theme-mode', 'dark');
});

// 2. Dark profile
await go('/(tabs)/profile'.replace('(tabs)/', ''));
await shot('w-profile-dark');

// 3. Dark home (with check-in card)
await go('/home');
await shot('w-home-dark');

// 4. Check-in flow
await go('/checkin');
await shot('w-checkin-step1');
// pick a mood (tap "Great")
await page.getByText('Great', { exact: true }).click({ timeout: 4000 }).catch(() => console.log('mood click failed'));
await page.waitForTimeout(400);
await page.getByText('Continue', { exact: true }).click({ timeout: 4000 }).catch(() => console.log('continue1 failed'));
await page.waitForTimeout(600);
await page.getByPlaceholder("I'm grateful for...").fill('My morning coffee in peace').catch(() => console.log('grat fill failed'));
await page.getByText('Continue', { exact: true }).click({ timeout: 4000 }).catch(() => console.log('continue2 failed'));
await page.waitForTimeout(600);
await page.getByPlaceholder('Today, I will...').fill('Be patient with myself').catch(() => console.log('int fill failed'));
await shot('w-checkin-step3');
await page.getByText('Complete Check-in', { exact: true }).click({ timeout: 4000 }).catch(() => console.log('complete failed'));
await page.waitForTimeout(1200);
await shot('w-checkin-done');

// 5. Light breathe (switch back to light)
await page.evaluate(() => localStorage.setItem('momease-theme-mode', 'light'));
await go('/breathe');
await shot('w-breathe-light');

console.log('\n=== ERRORS (filtered) ===');
const filtered = [...new Set(errors)].filter((e) => !/CERT_AUTHORITY|a0\.dev|net::ERR|supabase|Failed to load resource/i.test(e));
if (!filtered.length) console.log('  none (excluding external cert/network)');
else filtered.forEach((e) => console.log(' ', e.slice(0, 200)));

await ctx.close();
await browser.close();
console.log('done');
