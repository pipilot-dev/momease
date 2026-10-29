import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PREMIUM_PRICE_LABEL, PREMIUM_PRICE_USD } from "../../lib/pricing";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("Premium price", () => {
  it("is $5 a month", () => {
    expect(PREMIUM_PRICE_USD).toBe(5);
    expect(PREMIUM_PRICE_LABEL).toBe("$5");
  });

  it("the Upgrade screen shows the shared price and no hard-coded old one", () => {
    const upgrade = read("app/upgrade.tsx");
    expect(upgrade).toContain("{PREMIUM_PRICE_LABEL}");
    expect(upgrade).not.toMatch(/\$7\.99/);
  });

  it("the Stripe setup script defaults to the same amount, so a re-run keeps the shown price", () => {
    expect(read("data-api/scripts/stripe-setup.mjs")).toContain(`arg('amount', '${PREMIUM_PRICE_USD * 100}')`);
  });
});
