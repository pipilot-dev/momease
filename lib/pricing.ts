// What the Upgrade screen shows. The amount actually charged is the Stripe price the Worker uses
// (STRIPE_PRICE_ID, set by data-api/scripts/stripe-setup.mjs --amount <cents>), so change both together.
export const PREMIUM_PRICE_USD = 5;
export const PREMIUM_PRICE_LABEL = `$${PREMIUM_PRICE_USD}`;
