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

console.log('load', BASE);
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3500);
await page.getByText('Sign In', { exact: true }).click({ timeout: 10000 }).catch(() => console.log('signin click failed'));
await page.waitForTimeout(1500); // home should be fully visible quickly now
await page.screenshot({ path: 'screens/v-home.png', fullPage: true });
console.log('home captured');

// Breathe screen
await page.goto(BASE + '/breathe', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'screens/v-breathe-idle.png', fullPage: true });
console.log('breathe idle captured');

// Tap the play button (largest control) — click center-bottom play
const playBtn = page.locator('text=Box Breathing');
// Start by clicking the big play button: find by role/position — click near center play
await page.mouse.click(207, 560).catch(() => {});
await page.waitForTimeout(2500);
await page.screenshot({ path: 'screens/v-breathe-running.png', fullPage: true });
console.log('breathe running captured');

// Switch pattern to Calming Breath
await page.getByText('Calming Breath', { exact: true }).click({ timeout: 5000 }).catch(() => console.log('pattern click failed'));
await page.waitForTimeout(1200);
await page.screenshot({ path: 'screens/v-breathe-calm.png', fullPage: true });
console.log('breathe calm captured');

console.log('\n=== ERRORS ===');
if (!errors.length) console.log('  none');
else [...new Set(errors)].forEach((e) => console.log(' ', e.slice(0, 200)));

await ctx.close();
await browser.close();
console.log('done');
