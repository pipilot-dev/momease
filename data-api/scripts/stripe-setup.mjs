#!/usr/bin/env node
// Point MomEase billing at ANY Stripe account in one command.
//
//   STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup.mjs            # create + install
//   STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup.mjs --dry-run  # only show what exists
//
// What lives in Stripe-account-specific config (nothing else in the app or code):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID, STRIPE_PORTAL_CONFIG_ID  (Worker secrets)
// The app never sends a price or a Stripe id, so switching accounts needs NO app rebuild.
// Existing subscribers' stored customer ids that belong to the old account are forgotten
// automatically on their next checkout.
//
// Safe to re-run: products/prices/portal configs are reused; a webhook that already exists
// can't have its secret re-read from Stripe, so pass --rotate-webhook to recreate it.
//
// Options: --api <worker base url>  --amount 500  --currency usd  --interval month
//          --name "MomEase Premium"  --trial-days is fixed in the Worker (7)  --print (don't set secrets)
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY?.startsWith('sk_') && !KEY?.startsWith('rk_')) { console.error('Set STRIPE_SECRET_KEY (sk_live_… or sk_test_…)'); process.exit(1); }

const API = arg('api', 'https://momease-data-api.pipilot-rpc.workers.dev');
const amount = arg('amount', '500'), currency = arg('currency', 'usd'), interval = arg('interval', 'month');
const name = arg('name', 'MomEase Premium');
const dry = flag('dry-run');

async function stripe(path, form, idem) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: form ? 'POST' : 'GET',
    headers: { Authorization: `Basic ${Buffer.from(`${KEY}:`).toString('base64')}`, ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idem } : {}) },
    body: form ? new URLSearchParams(form) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path}: ${j.error?.message}`);
  return j;
}

const acct = await stripe('account');
const tag = createHash('sha256').update(acct.id + KEY.slice(0, 12)).digest('hex').slice(0, 10); // idempotency scope per account
console.log(`Stripe account: ${acct.id} (${acct.business_profile?.name ?? 'unnamed'}) — ${KEY.startsWith('sk_live') ? 'LIVE' : 'test'} mode`);

const lookup = `momease_premium_${interval}ly_${amount}`; // month -> momease_premium_monthly_500
let price = (await stripe(`prices?lookup_keys[]=${lookup}&active=true`)).data[0];
let product = price ? { id: price.product } : (await stripe('products?active=true&limit=100')).data.find((p) => p.metadata?.app === 'momease');
const hook = (await stripe('webhook_endpoints?limit=100')).data.find((w) => w.url === `${API}/billing/webhook`);
const portal = (await stripe('billing_portal/configurations?limit=100')).data.find((c) => c.metadata?.app === 'momease');
console.log({ product: product?.id ?? '(will create)', price: price?.id ?? '(will create)', webhook: hook?.id ?? '(will create)', portalConfig: portal?.id ?? '(will create)' });
if (dry) process.exit(0);

product ??= await stripe('products', { name, 'metadata[app]': 'momease' }, `momease-product-${tag}`);
price ??= await stripe('prices', { product: product.id, currency, unit_amount: amount, 'recurring[interval]': interval, lookup_key: lookup, nickname: `${name} ${interval}ly`, 'metadata[app]': 'momease' }, `momease-price-${tag}-${amount}-${currency}-${interval}`);

const events = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_failed', 'invoice.paid'];
let whsec;
if (hook && !flag('rotate-webhook')) console.log('Webhook already exists; keeping it. Its secret cannot be read back — if the Worker lacks it, re-run with --rotate-webhook.');
else {
  if (hook) await fetch(`https://api.stripe.com/v1/webhook_endpoints/${hook.id}`, { method: 'DELETE', headers: { Authorization: `Basic ${Buffer.from(`${KEY}:`).toString('base64')}` } });
  const created = await stripe('webhook_endpoints', { url: `${API}/billing/webhook`, description: 'MomEase billing', 'metadata[app]': 'momease', ...Object.fromEntries(events.map((e, i) => [`enabled_events[${i}]`, e])) }, `momease-webhook-${tag}-${Date.now()}`);
  whsec = created.secret;
}
const cfg = portal ?? (await stripe('billing_portal/configurations', { name: 'MomEase', 'business_profile[headline]': 'Manage your MomEase Premium subscription', 'features[customer_update][enabled]': 'true', 'features[customer_update][allowed_updates][0]': 'email', 'features[invoice_history][enabled]': 'true', 'features[payment_method_update][enabled]': 'true', 'features[subscription_cancel][enabled]': 'true', 'features[subscription_cancel][mode]': 'at_period_end', 'metadata[app]': 'momease' }, `momease-portal-${tag}`));

const secrets = { STRIPE_SECRET_KEY: KEY, STRIPE_PRICE_ID: price.id, STRIPE_PORTAL_CONFIG_ID: cfg.id, ...(whsec ? { STRIPE_WEBHOOK_SECRET: whsec } : {}) };
for (const [k, v] of Object.entries(secrets)) {
  if (flag('print')) { console.log(`${k}=${k === 'STRIPE_PRICE_ID' || k === 'STRIPE_PORTAL_CONFIG_ID' ? v : '(hidden; use without --print to install)'}`); continue; }
  const r = spawnSync('npx', ['wrangler', 'secret', 'put', k], { input: v, encoding: 'utf8' });
  console.log(r.status === 0 ? `set ${k}` : `FAILED ${k}: ${r.stderr}`);
}
console.log('Done. No redeploy of the app is needed; the Worker reads these on its next request.');
