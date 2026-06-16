import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: {
    dir: './videos',
    size: { width: 1280, height: 720 }
  }
});
const page = await context.newPage();

console.log('--- Navigating to app ---');
await page.goto('http://localhost:38291', { waitUntil: 'networkidle', timeout: 30000 });

// Screenshot: Sign In page
await page.screenshot({ path: 'test-signin.png' });
console.log('Screenshot: Sign In page captured');

// Check for console errors
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

// Try clicking Sign In
const signInBtn = page.getByText('Sign In', { exact: true });
if (await signInBtn.isVisible()) {
  console.log('Found Sign In button, clicking...');
  await signInBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-after-signin.png' });
  console.log('Screenshot: After Sign In captured');
} else {
  console.log('Sign In button not found');
}

// Check page title and URL
console.log('Current URL:', page.url());
console.log('Page title:', await page.title());

// Look for navigation tabs
const tabs = ['Home', 'Tasks', 'Sounds', 'Chat', 'Profile'];
for (const tab of tabs) {
  const el = page.getByText(tab, { exact: true }).first();
  if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log(`Tab found: ${tab}`);
  }
}

// Try navigating to each tab
for (const tab of tabs) {
  const el = page.getByText(tab, { exact: true }).first();
  if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
    await el.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `test-tab-${tab.toLowerCase()}.png` });
    console.log(`Screenshot: ${tab} tab captured`);
  }
}

// Report console errors
if (consoleErrors.length > 0) {
  console.log('\n--- Console Errors ---');
  consoleErrors.forEach(e => console.log('ERROR:', e));
} else {
  console.log('\nNo console errors detected!');
}

await context.close();
await browser.close();
console.log('\n--- Browser test complete ---');