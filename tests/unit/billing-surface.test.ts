import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MANAGE_ON_WEB_LABEL, WEB_ACCOUNT_URL, sellsInApp } from "../../lib/billing-surface-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const upgrade = readFileSync(join(root, "app/upgrade.tsx"), "utf8");
const profile = readFileSync(join(root, "app/(tabs)/profile.tsx"), "utf8");

describe("what the iPhone app sells", () => {
  it("sells nothing on iPhone; Android and the web keep checkout", () => {
    expect(sellsInApp("ios")).toBe(false);
    expect(sellsInApp("android")).toBe(true);
    expect(sellsInApp("web")).toBe(true);
  });

  it("the single iPhone link points at the website account page", () => {
    expect(WEB_ACCOUNT_URL).toBe("https://app.mease.mom/upgrade");
    expect(MANAGE_ON_WEB_LABEL).toBe("Manage your subscription at mease.mom");
  });

  it("the free-iPhone screen has no price, trial, checkout call or Stripe wording", () => {
    const start = upgrade.indexOf("if (!sellsInApp(Platform.OS) && !isPremium)");
    expect(start).toBeGreaterThan(0);
    const end = upgrade.indexOf("\n  return (", start + 10);
    const block = upgrade.slice(start, end);
    expect(block.length).toBeGreaterThan(200);
    for (const banned of ["PREMIUM_PRICE_LABEL", "handleUpgrade", "checkoutSession", "Stripe", "free trial", "DAYS FREE", "Continue in your browser", "Start free"]) {
      expect(block).not.toContain(banned);
    }
    expect(block).toContain("openLink(WEB_ACCOUNT_URL)");
  });

  it("the profile menu drops the Upgrade wording and PRO badge on iPhone", () => {
    expect(profile).toContain('sellsInApp(Platform.OS) ? "Upgrade to Premium" : "Subscription"');
    expect(profile).toContain('sellsInApp(Platform.OS) ? { badge: "PRO" } : {}');
  });
});

describe("Apple token revocation needs the authorization code", () => {
  const service = readFileSync(join(root, "lib/auth-service.ts"), "utf8");
  it("both Apple sign-in and Connect Apple send it to the server", () => {
    expect(service.match(/authorizationCode: cred\.authorizationCode \?\? undefined/g)).toHaveLength(2);
  });
});
