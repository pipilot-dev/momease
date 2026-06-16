import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'fs';

const PORT = readFileSync('/tmp/momease_port', 'utf8').trim();
const BASE = `http://localhost:${PORT}`;
const OUT = 'screens';
mkdirSync(OUT, { recursive: true });

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 414, height: 896 }, // mobile portrait
  deviceScaleFactor: 2,
});
const page = await context.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(err.message));

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`  shot: ${name}.png`);
}

console.log(`--- Loading ${BASE} ---`);
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3500); // splash → sign-in
await shot('01-signin');

// Sign in
console.log('--- Signing in ---');
const signInBtn = page.getByText('Sign In', { exact: true });
await signInBtn.click({ timeout: 10000 }).catch(() => console.log('  sign-in click failed'));
await page.waitForTimeout(2500);
await shot('02-home');

// Visit routes directly
const routes = [
  ['tasks', '/(tabs)/tasks'],
  ['chat', '/(tabs)/chat'],
  ['sounds', '/(tabs)/sounds'],
  ['profile', '/(tabs)/profile'],
  ['mood', '/mood'],
  ['journal', '/journal'],
  ['milestones', '/milestones'],
  ['sleep', '/sleep'],
  ['meals', '/meals'],
  ['community', '/community'],
  ['insights', '/insights'],
  ['onboarding', '/onboarding'],
];

for (const [name, path] of routes) {
  console.log(`--- ${name} (${path}) ---`);
  const url = BASE + '/' + path.replace(/^\/+/, '').replace(/[()]/g, (m) => encodeURIComponent(m));
  // expo-router web uses clean URLs without the group parens
  const clean = path.replace(/\([^)]*\)\//g, '');
  await page.goto(BASE + clean, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => console.log('  nav err', e.message));
  await page.waitForTimeout(2000);
  await shot(`${name}`);
}

console.log('\n=== CONSOLE ERRORS ===');
if (consoleErrors.length === 0) console.log('  none');
else [...new Set(consoleErrors)].forEach((e) => console.log('  ERR:', e.slice(0, 300)));

console.log('\n=== PAGE ERRORS ===');
if (pageErrors.length === 0) console.log('  none');
else [...new Set(pageErrors)].forEach((e) => console.log('  PAGEERR:', e.slice(0, 300)));

await context.close();
await browser.close();
console.log('\n--- done ---');
