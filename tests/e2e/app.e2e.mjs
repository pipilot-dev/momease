// End-to-end tests: the real Expo web build, in headless Chromium, talking to a
// LOCAL copy of the API Worker with a fresh local D1 database. Nothing here
// touches production data or Stripe.
//
//   1. EXPO_PUBLIC_API_BASE=http://localhost:8787 npx expo export --platform web --output-dir dist-e2e
//   2. node --test tests/e2e/
import { test as nodeTest, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(import.meta.dirname, '../..');
const API_DIR = join(ROOT, 'data-api');
const DIST = join(ROOT, 'dist-e2e');
const API = 'http://localhost:8787';
const APP_PORT = 8081; // already in the Worker's ALLOWED_ORIGINS
const APP = `http://localhost:${APP_PORT}`;
const PASSWORD = 'correct-horse-9';
const ART = join(ROOT, 'tests/e2e/.artifacts');

let worker, server, browser, fakeStripe;
const subs = new Map(); // fake Stripe: subscription id -> user id
let seq = 0;
const T0 = Date.now();
const email = (tag) => `${tag}-${Date.now()}-${seq++}@e2e.test`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

function serveStatic() {
  return createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, APP).pathname);
    let file = normalize(join(DIST, path));
    if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || !extname(file)) file = join(DIST, 'index.html'); // SPA fallback
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(APP_PORT);
}

async function waitFor(url, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timed out waiting for ${url}`);
}

const j = async (path, { token, body, method } = {}) => {
  const r = await fetch(API + path, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => null) };
};

/** Create an account through the API; onboarding done so the UI lands on home. */
async function makeUser(tag, { onboarded = true, name = tag } = {}) {
  const e = email(tag);
  const r = await j('/auth/signup', { body: { email: e, password: PASSWORD, name } });
  assert.equal(r.status, 200, 'API signup');
  if (onboarded) await j('/auth/update', { token: r.json.token, body: { onboardingCompleted: true } });
  return { email: e, id: r.json.user.id, token: r.json.token };
}

/** What Stripe does after a successful checkout: tell the Worker (signed) and answer its follow-up lookup. */
async function stripeSubscribes(userId, status = 'trialing') {
  const subId = `sub_e2e_${seq++}`;
  subs.set(subId, { userId, status });
  const body = JSON.stringify({ id: `evt_e2e_${seq++}`, type: 'customer.subscription.created', data: { object: { id: subId } } });
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', 'whsec_e2e').update(`${ts}.${body}`).digest('hex');
  const r = await fetch(`${API}/billing/webhook`, { method: 'POST', headers: { 'stripe-signature': `t=${ts},v1=${sig}` }, body });
  assert.equal(r.status, 200, `webhook rejected: ${await r.text()}`);
}

function test(name, fn) {
  return nodeTest(name, async (t) => {
    live.length = 0;
    try { await fn(t); } catch (e) {
      for (const p of live) {
        try {
          const text = (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 700);
          const ls = await p.evaluate(() => Object.keys(localStorage));
          console.log(`--- DIAGNOSTICS for "${name}"\n url: ${p.url()}\n localStorage: ${ls.join(', ')}\n visible: ${text}\n api:\n  ${p.net.join('\n  ')}`);
          mkdirSync(ART, { recursive: true });
          await p.screenshot({ path: join(ART, `${name.replace(/\W+/g, '_').slice(0, 60)}.png`) });
        } catch { /* page already closed */ }
      }
      throw e;
    }
  });
}

const live = []; // pages of the scenario currently running (for failure diagnostics)

async function newPage(t) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.net = [];
  page.on('pageerror', (e) => { errors.push(String(e)); page.net.push(`${((Date.now() - T0) / 1000).toFixed(1)}s PAGEERROR ${String(e).slice(0, 160)}`); });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/notifications|useNativeDriver|form/.test(m.text())) page.net.push(`${((Date.now() - T0) / 1000).toFixed(1)}s console.${m.type()} ${m.text().slice(0, 160)}`); });
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) page.net.push(`${((Date.now() - T0) / 1000).toFixed(1)}s NAVIGATED ${f.url().replace(APP, '')}`); });
  page.on('load', () => page.net.push(`${((Date.now() - T0) / 1000).toFixed(1)}s LOAD`));
  page.on('response', (r) => { if (r.url().startsWith(API)) page.net.push(`${((Date.now() - T0) / 1000).toFixed(1)}s ${r.status()} ${r.request().method()} ${r.url().replace(API, '')}`); });
  page.on('requestfailed', (r) => { if (r.url().startsWith(API)) page.net.push(`${((Date.now() - T0) / 1000).toFixed(1)}s FAILED ${r.request?.().method?.() ?? r.method()} ${r.url().replace(API, '')} ${r.failure()?.errorText}`); });
  if (process.env.E2E_CPU_THROTTLE) { // mimic slow CI runners to surface timing races
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.E2E_CPU_THROTTLE) });
  }
  live.push(page);
  t?.after?.(async () => { await ctx.close(); });
  return { page, ctx, errors };
}

const token = (page) => page.evaluate(() => localStorage.getItem('momease.auth.token.v1'));

async function signInViaUI(page, e) {
  await page.goto(`${APP}/sign-in`);
  await page.getByPlaceholder('Email address').fill(e);
  await page.getByPlaceholder('Password').fill(PASSWORD);
  await page.getByText('Sign In', { exact: true }).click();
}

before(async () => {
  assert.ok(existsSync(join(DIST, 'index.html')), 'dist-e2e missing: run the EXPO_PUBLIC_API_BASE export first');
  rmSync(join(API_DIR, '.wrangler/state'), { recursive: true, force: true });
  writeFileSync(join(API_DIR, '.dev.vars'), [
    'JWT_SIGNING_KEY=e2e-signing-key-e2e-signing-key-0123456789',
    'GOOGLE_CLIENT_ID=e2e.apps.googleusercontent.com',
    'GOOGLE_CLIENT_SECRET=e2e-secret',
    'STRIPE_SECRET_KEY=sk_test_e2e',
    'STRIPE_WEBHOOK_SECRET=whsec_e2e',
    'STRIPE_PRICE_ID=price_e2e',
    'STRIPE_API_BASE=http://127.0.0.1:8799/v1',
  ].join('\n'));
  const mig = spawnSync('npx', ['wrangler', 'd1', 'migrations', 'apply', 'momease-prod', '--local'], { cwd: API_DIR, encoding: 'utf8' });
  assert.equal(mig.status, 0, mig.stderr || mig.stdout);
  worker = spawn('npx', ['wrangler', 'dev', '--port', '8787', '--ip', '127.0.0.1', '--local'], { cwd: API_DIR, stdio: 'ignore', detached: true });
  await waitFor(`${API}/health`);
  fakeStripe = createServer((req, res) => {
    const m = /^\/v1\/subscriptions\/(sub_e2e_\d+)$/.exec(req.url ?? '');
    const sub = m && subs.get(m[1]);
    res.writeHead(sub ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify(sub ? { id: m[1], status: sub.status, customer: `cus_${m[1]}`, current_period_end: 1893456000, cancel_at_period_end: false, metadata: { user_id: sub.userId } } : { error: { message: 'No such subscription' } }));
  }).listen(8799, '127.0.0.1');
  server = serveStatic();
  // Playwright 1.56 expects a different Chromium revision than the preinstalled one, so
  // prefer an explicit binary when available (CI installs the matching browser instead).
  const preinstalled = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
  browser = await chromium.launch(process.env.CI || !existsSync(preinstalled) ? {} : { executablePath: preinstalled });
});

after(async () => {
  await browser?.close();
  server?.close();
  fakeStripe?.close();
  if (worker?.pid) { try { process.kill(-worker.pid, 'SIGTERM'); } catch { /* already gone */ } } // whole process group: npx -> wrangler -> workerd
  rmSync(join(API_DIR, '.dev.vars'), { force: true });
});

// ───────────────────────────── auth ─────────────────────────────

test('anonymous visit to a protected route lands on sign-in', async (t) => {
  const { page } = await newPage(t);
  await page.goto(`${APP}/home`);
  await page.waitForURL(/sign-in/, { timeout: 15000 });
  await page.getByText('Welcome Back').waitFor();
});

test('sign-up: a too-short password is rejected locally with a clear message (no API call)', async (t) => {
  const { page } = await newPage(t);
  let signupCalls = 0;
  page.on('request', (r) => { if (r.url().endsWith('/auth/signup')) signupCalls++; });
  await page.goto(`${APP}/sign-up`);
  await page.getByPlaceholder('Full name').fill('Short Pw');
  await page.getByPlaceholder('Email address').fill(email('short'));
  await page.getByPlaceholder(/Password/).fill('1234567');
  await page.getByText('Create Account', { exact: true }).click();
  await page.getByText('Password must be at least 8 characters.').waitFor();
  assert.equal(signupCalls, 0);
});

test('sign-up creates an account, stores a session, lands on onboarding, and survives a reload', async (t) => {
  const { page, errors } = await newPage(t);
  const e = email('signup');
  await page.goto(`${APP}/sign-up`);
  await page.getByPlaceholder('Full name').fill('E2E Mama');
  await page.getByPlaceholder('Email address').fill(e);
  await page.getByPlaceholder(/Password/).fill(PASSWORD);
  await page.getByText('Create Account', { exact: true }).click();
  await page.waitForURL(/onboarding/, { timeout: 15000 });
  const tok = await token(page);
  assert.ok(tok, 'token stored');
  const me = await j('/session', { token: tok });
  assert.equal(me.json.user.email, e);
  assert.equal(me.json.user.role, 'free');
  await page.reload();
  await page.waitForTimeout(3500); // splash (2s) + session restore
  assert.match(page.url(), /onboarding|home/);
  assert.doesNotMatch(page.url(), /sign-in/);
  assert.deepEqual(errors, []);
});

test('sign-up with an existing email shows a friendly error', async (t) => {
  const u = await makeUser('dupe');
  const { page } = await newPage(t);
  await page.goto(`${APP}/sign-up`);
  await page.getByPlaceholder('Full name').fill('Dupe');
  await page.getByPlaceholder('Email address').fill(u.email);
  await page.getByPlaceholder(/Password/).fill(PASSWORD);
  await page.getByText('Create Account', { exact: true }).click();
  await page.getByText(/already exists/i).waitFor();
});

test('sign-in: wrong password shows a friendly error; right password enters the app and persists', async (t) => {
  const u = await makeUser('signin');
  const { page, errors } = await newPage(t);
  await page.goto(`${APP}/sign-in`);
  await page.getByPlaceholder('Email address').fill(u.email);
  await page.getByPlaceholder('Password').fill('definitely-wrong-1');
  await page.getByText('Sign In', { exact: true }).click();
  await page.getByText("That email and password don't match.").waitFor();
  assert.equal(await token(page), null);

  await page.getByPlaceholder('Password').fill(PASSWORD);
  await page.getByText('Sign In', { exact: true }).click();
  await page.waitForURL(/home/, { timeout: 15000 });
  assert.ok(await token(page));
  await page.reload();
  await page.waitForTimeout(3500);
  assert.match(page.url(), /home/);
  assert.deepEqual(errors, []);
});

test('pre-migration installs (looks signed-in, but no token) are signed out instead of stuck', async (t) => {
  const { page } = await newPage(t);
  await page.goto(`${APP}/sign-in`);
  await page.evaluate(() => {
    localStorage.setItem('momease-auth', JSON.stringify({ isAuthenticated: true, user: { id: 'old-supabase-id', email: 'old@x.co', name: 'Old', role: 'free', onboardingCompleted: true } }));
    localStorage.removeItem('momease.auth.token.v1');
  });
  await page.goto(`${APP}/`);
  await page.waitForURL(/sign-in/, { timeout: 15000 });
});

test('a revoked/expired token signs the user out of the UI', async (t) => {
  const u = await makeUser('revoked');
  const { page } = await newPage(t);
  await signInViaUI(page, u.email);
  await page.waitForURL(/home/, { timeout: 15000 });
  const tok = await token(page);
  await j('/auth/signout', { token: tok, method: 'POST' }); // revoke server-side, behind the app's back
  await page.reload();
  await page.waitForURL(/sign-in/, { timeout: 15000 });
  assert.equal(await token(page), null);
});

test('forgot password: request succeeds and the API response never contains a token', async (t) => {
  const u = await makeUser('forgot');
  const { page } = await newPage(t);
  await page.goto(`${APP}/sign-in`);
  await page.getByText('Forgot password?').click();
  const resp = page.waitForResponse((r) => r.url().endsWith('/auth/reset/request'));
  await page.getByPlaceholder('Email address').last().fill(u.email);
  await page.getByText('Send reset link').click();
  const r = await resp;
  assert.equal(r.status(), 200);
  assert.deepEqual(await r.json(), { ok: true });
});

// ──────────────────────── google sign-in return ────────────────────────

test('google return: /auth-callback#token=… signs in, clears the URL, and enters the app', async (t) => {
  const u = await makeUser('google');
  const { page, errors } = await newPage(t);
  await page.route('**/auth/google/start**', (route) =>
    route.fulfill({ status: 302, headers: { location: `${APP}/auth-callback#token=${u.token}&user_id=${u.id}&email=${encodeURIComponent(u.email)}` } }));
  await page.goto(`${APP}/sign-in`);
  await page.getByText('Continue with Google').click();
  await page.waitForURL(/home/, { timeout: 20000 });
  assert.equal(await token(page), u.token);
  assert.equal(await page.evaluate(() => location.hash), '');
  assert.deepEqual(errors, []);
});

test('google return with a bad token shows an error and falls back to sign-in', async (t) => {
  const { page } = await newPage(t);
  await page.goto(`${APP}/auth-callback#token=not-a-real-token&user_id=x&email=x%40y.co`);
  await page.getByTestId('auth-callback-error').waitFor({ timeout: 15000 });
  await page.waitForURL(/sign-in/, { timeout: 15000 });
  assert.equal(await token(page), null);
});

test('the Worker refuses to hand sessions to a foreign redirect (open-redirect guard, via the real UI base)', async () => {
  const r = await fetch(`${API}/auth/google/start?redirect=${encodeURIComponent('https://evil.example/auth-callback')}`, { redirect: 'manual' });
  assert.equal(r.status, 400);
});

// ───────────────────────────── social ─────────────────────────────

test('friends & messages screens show real data from the API', async (t) => {
  const a = await makeUser('socialA', { name: 'Anna Alpha' });
  const b = await makeUser('socialB', { name: 'Bea Bravo' });
  const pa = await j('/profile/me', { token: a.token, body: { display_name: 'Anna Alpha', username: 'annaalpha' } });
  const pb = await j('/profile/me', { token: b.token, body: { display_name: 'Bea Bravo', username: 'beabravo' } });
  assert.equal(pa.status, 200); assert.equal(pb.status, 200);
  await j(`/follows/${b.id}`, { token: a.token, method: 'PUT' });
  await j('/messages', { token: b.token, body: { recipient_id: a.id, body: 'hello from Bea' } });

  const { page, errors } = await newPage(t);
  await signInViaUI(page, a.email);
  await page.waitForURL(/home/, { timeout: 15000 });
  await page.goto(`${APP}/friends`);
  await page.getByText(/^Following/).first().click(); // default tab is Discover (search)
  await page.getByText(/Bea Bravo|beabravo/).first().waitFor({ timeout: 15000 });
  await page.goto(`${APP}/messages`);
  await page.getByText(/hello from Bea|Bea Bravo/).first().waitFor({ timeout: 15000 });
  assert.deepEqual(errors, []);
});

// ───────────────────────────── billing ─────────────────────────────

test('upgrade: checkout request carries the session and NO price or user id; premium shows after a signed Stripe webhook', async (t) => {
  const u = await makeUser('billing');
  const { page, errors } = await newPage(t);
  await signInViaUI(page, u.email);
  await page.waitForURL(/home/, { timeout: 15000 });

  let checkoutReq;
  const cors = { 'access-control-allow-origin': APP, 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'POST,OPTIONS' };
  await page.route('**/billing/checkout', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors }); // CORS preflight
    checkoutReq = route.request();
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ url: `${APP}/upgrade?checkout=success` }) });
  });
  // Wait for the app to restore the session before clicking (a click before the
  // user is loaded would, correctly, send them to sign-in).
  await Promise.all([page.waitForResponse((r) => r.url().endsWith('/session') && r.ok()), page.goto(`${APP}/upgrade`)]);
  await page.waitForTimeout(500);
  await page.getByText('Start free trial').click();
  await page.waitForURL(/checkout=success/, { timeout: 15000 });
  const body = JSON.parse(checkoutReq.postData() ?? '{}');
  assert.deepEqual(Object.keys(body).sort(), ['return_url']);
  assert.match(checkoutReq.headers().authorization ?? '', /^Bearer /);

  // Stripe confirms the subscription: a signed webhook hits the real Worker code path.
  await stripeSubscribes(u.id);
  await page.reload();
  await page.getByText(/7-day free trial/).waitFor({ timeout: 20000 });
  assert.deepEqual(errors, []);
});

test('a stale cloud copy of subscription state never overwrites what the server says (slow /state race)', async (t) => {
  const u = await makeUser('stale');
  const { page, errors } = await newPage(t);
  await signInViaUI(page, u.email);
  await page.waitForURL(/home/, { timeout: 15000 });
  // Visit Upgrade while free, so a "free" snapshot of the subscription gets synced to the cloud.
  await Promise.all([page.waitForResponse((r) => r.url().endsWith('/session') && r.ok()), page.goto(`${APP}/upgrade`)]);
  await page.waitForTimeout(2000);
  await stripeSubscribes(u.id);
  // On the next start, make the cloud-state pull arrive AFTER the session check.
  await page.route('**/state', async (route) => {
    if (route.request().method() === 'GET') await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await page.reload();
  await page.getByText(/7-day free trial/).waitFor({ timeout: 20000 });
  await page.waitForTimeout(5000); // the late, stale cloud pull has landed by now
  assert.ok(await page.getByText(/7-day free trial/).isVisible(), 'premium must survive the late cloud pull');
  assert.deepEqual(errors, []);
});

// ─────────────────────────── onboarding for different people ───────────────────────────

const visibleText = (page) => page.evaluate(() => document.body.innerText);
const MOM_ONLY = /mom guilt|co-parenting|present parent|other moms/i;

async function startOnboarding(t, tag) {
  const u = await makeUser(tag, { onboarded: false, name: 'Ada Test' });
  const { page, errors } = await newPage(t);
  await signInViaUI(page, u.email);
  await page.waitForURL(/onboarding/, { timeout: 15000 });
  await page.getByText("Let's personalize your space").click();
  await page.getByText('Where are you in your journey?').waitFor();
  return { u, page, errors };
}

test('onboarding: a woman who is not a mom (yet) gets no parenting questions, a neutral plan and dashboard, and it is saved', async (t) => {
  const { u, page, errors } = await startOnboarding(t, 'notmom');
  await page.getByText('Not a mom (yet)').click();
  await page.getByText('Continue', { exact: true }).click();

  // Challenges: general ones are offered, the parenting-only ones are not.
  await page.getByText("What's the heaviest thing on your plate right now?").waitFor();
  const challenges = await visibleText(page);
  for (const wanted of ["burned out", 'self-care routine', 'planning ahead for motherhood', 'Work + life feels impossible']) {
    assert.ok(challenges.toLowerCase().includes(wanted.toLowerCase()), `missing challenge: ${wanted}`);
  }
  assert.doesNotMatch(challenges, MOM_ONLY);
  assert.doesNotMatch(challenges, /recovering physically/i);
  await page.getByText(/burned out/i).click();
  await page.getByText('Continue', { exact: true }).click();

  // Goals
  await page.getByText('What would feel like a win?').waitFor();
  const goals = await visibleText(page);
  assert.match(goals, /Prepare for motherhood/);
  assert.match(goals, /Connect with others/);
  assert.doesNotMatch(goals, MOM_ONLY);
  await page.getByText('Reduce daily stress').click();
  await page.getByText(/Continue with 1 goal/).click();

  await page.getByText('Want a daily check-in reminder?').waitFor();
  await page.getByText('Not right now').click();
  await page.getByText('Almost there').click();

  await page.getByText(/Your plan is ready/).waitFor({ timeout: 15000 });
  const ready = await visibleText(page);
  assert.match(ready, /Refill the tank/);
  assert.doesNotMatch(ready, MOM_ONLY);

  await page.getByText('Show me my dashboard').click();
  await page.waitForURL(/home/, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const home = await visibleText(page);
  assert.doesNotMatch(home, /Baby Milestones|2,400\+ moms/);
  assert.match(home, /Connect with others who get it/);
  assert.doesNotMatch(home, MOM_ONLY);

  // Saved on the account, so it follows her to other devices.
  await page.waitForTimeout(1000);
  const me = await j('/session', { token: u.token });
  assert.equal(me.json.user.personalization?.lifeStage, 'not-a-mom');
  assert.equal(me.json.user.personalization?.primaryChallenge, 'burnout');
  assert.deepEqual(me.json.user.personalization?.goals, ['reduce-stress']);

  // The companion greets her without assuming she is a working mom.
  await page.goto(`${APP}/chat`);
  await page.waitForTimeout(1500);
  const chat = await visibleText(page);
  assert.doesNotMatch(chat, /working mom/i);
  assert.deepEqual(errors, []);
});

test('onboarding: a mom still sees the parenting questions and her dashboard keeps the baby milestones', async (t) => {
  const { u, page, errors } = await startOnboarding(t, 'mom');
  await page.getByText('Mom to a toddler (1–3yr)').click();
  await page.getByText('Continue', { exact: true }).click();
  const challenges = await visibleText(page);
  assert.match(challenges, /Mom guilt eats at me/);
  assert.match(challenges, /Co-parenting is stressful/);
  assert.doesNotMatch(challenges, /burned out|planning ahead for motherhood/i);
  await page.getByText(/Mom guilt eats at me/).click();
  await page.getByText('Continue', { exact: true }).click();
  const goals = await visibleText(page);
  assert.match(goals, /Be a more present parent/);
  assert.match(goals, /Connect with other moms/);
  assert.doesNotMatch(goals, /Prepare for motherhood/);
  await page.getByText(/Be a more present parent/).click();
  await page.getByText(/Continue with 1 goal/).click();
  await page.getByText('Not right now').click();
  await page.getByText('Almost there').click();
  await page.getByText(/Your plan is ready/).waitFor({ timeout: 15000 });
  await page.getByText('Show me my dashboard').click();
  await page.waitForURL(/home/, { timeout: 15000 });
  await page.waitForTimeout(1500);
  assert.match(await visibleText(page), /Baby Milestones/);
  const me = await j('/session', { token: u.token });
  assert.equal(me.json.user.personalization?.lifeStage, 'toddler');
  assert.deepEqual(errors, []);
});

// ─────────────────────────── support links & confirmations ───────────────────────────

test('profile → Support: every link opens the right page, and Sign Out asks first (react-native-web has no Alert)', async (t) => {
  const u = await makeUser('support');
  const { page, errors } = await newPage(t);
  await page.addInitScript(() => { window.__opened = []; window.open = (url, target) => { window.__opened.push([String(url), target]); return null; }; });
  await signInViaUI(page, u.email);
  await page.waitForURL(/home/, { timeout: 15000 });
  await page.goto(`${APP}/profile`);
  await page.getByText('Help Center').waitFor({ timeout: 15000 });

  const expected = [
    ['Help Center', /^https:\/\/mease\.mom\/help\.html$/],
    ['Send Feedback', /^https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSeuHAmAGfXrxjVNi9KFeKs8cTdWtIRkCfeq0Xuf163AjGbCWQ\/viewform\?usp=pp_url&entry\.1792733158=Web&entry\.232678679=[\d.]+$/],
    ['Rate MomEase', /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.momease\.app$/],
    ['Privacy Policy', /^https:\/\/mease\.mom\/privacy\.html$/],
    ['Terms of Service', /^https:\/\/mease\.mom\/terms\.html$/],
  ];
  for (const [label, want] of expected) {
    const before = await page.evaluate(() => window.__opened.length);
    await page.getByText(label, { exact: true }).click();
    await page.waitForFunction((n) => window.__opened.length > n, before, { timeout: 5000 });
    const [url] = await page.evaluate(() => window.__opened.at(-1));
    assert.match(url, want, `${label} opened ${url}`);
  }

  // Upgrade screen: Premium questions go to the same form; legal links are real links.
  await page.goto(`${APP}/upgrade`);
  await page.getByText('Questions about Premium? Send us feedback').waitFor({ timeout: 15000 });
  for (const [label, want] of [['Questions about Premium? Send us feedback', /docs\.google\.com\/forms.*entry\.1792733158=Web/], ['privacy policy', /mease\.mom\/privacy\.html$/], ['terms', /mease\.mom\/terms\.html$/]]) {
    const before = await page.evaluate(() => window.__opened.length);
    await page.getByText(label, { exact: true }).click();
    await page.waitForFunction((n) => window.__opened.length > n, before, { timeout: 5000 });
    assert.match((await page.evaluate(() => window.__opened.at(-1)))[0], want, label);
  }
  await page.goto(`${APP}/profile`);
  await page.getByText('Sign Out', { exact: true }).waitFor({ timeout: 15000 });

  // Declining keeps her signed in; accepting signs her out.
  const dialogs = [];
  page.once('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });
  await page.getByText('Sign Out', { exact: true }).click();
  await page.waitForTimeout(800);
  assert.match(dialogs[0] ?? '', /Are you sure you want to sign out/);
  assert.ok(await token(page), 'still signed in after declining');
  page.once('dialog', (d) => d.accept());
  await page.getByText('Sign Out', { exact: true }).click();
  await page.waitForURL(/sign-in/, { timeout: 10000 });
  assert.equal(await token(page), null, 'token cleared on sign out');
  assert.deepEqual(errors, []);
});

// ─────────────────────────── every screen renders ───────────────────────────

const ROUTES = ['/home', '/chat', '/sounds', '/tasks', '/profile', '/breathe', '/checkin', '/community', '/friends', '/messages',
  '/milestones', '/mood', '/journal', '/sleep', '/meals', '/insights', '/notifications', '/settings', '/edit-profile', '/upgrade'];

test('every screen renders for a signed-in user with no crashes or unmatched routes', async (t) => {
  const u = await makeUser('smoke');
  const { page, errors } = await newPage(t);
  await signInViaUI(page, u.email);
  await page.waitForURL(/home/, { timeout: 15000 });
  const failures = [];
  for (const route of ROUTES) {
    errors.length = 0;
    await page.goto(`${APP}${route}`);
    await page.waitForTimeout(1200);
    const text = (await page.evaluate(() => document.body.innerText)).trim();
    if (/unmatched route|this screen doesn't exist|something went wrong/i.test(text)) failures.push(`${route}: error screen`);
    if (text.length < 15) failures.push(`${route}: blank (${text.length} chars)`);
    if (/sign-in$/.test(page.url())) failures.push(`${route}: bounced to sign-in`);
    if (errors.length) failures.push(`${route}: ${errors[0].slice(0, 120)}`);
  }
  assert.deepEqual(failures, []);
});
