import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { webAlert } from "../../lib/dialog-core";
import { ANDROID_PACKAGE, SITE, SITE_PAGES, SUPPORT_EMAIL, feedbackMailto, pageUrl, playStoreUrl } from "../../lib/links-core";

const here = dirname(fileURLToPath(import.meta.url));
const file = (rel: string) => join(here, "..", "..", rel);
const read = (rel: string) => readFileSync(file(rel), "utf8");

describe("support links", () => {
  it("every page the app links to exists on the website", () => {
    for (const [name, path] of Object.entries(SITE_PAGES)) {
      expect(existsSync(file(`landing${path}`)), `${name}: landing${path}`).toBe(true);
    }
  });

  it("builds absolute https URLs on the real domain", () => {
    expect(pageUrl("help")).toBe(`${SITE}/help.html`);
    expect(SITE).toBe("https://mease.mom");
    for (const k of Object.keys(SITE_PAGES) as (keyof typeof SITE_PAGES)[]) expect(pageUrl(k)).toMatch(/^https:\/\/mease\.mom\/[a-z-]+\.html$/);
  });

  it("feedback opens a pre-addressed email with the app version", () => {
    const m = feedbackMailto("1.2.3");
    expect(m.startsWith(`mailto:${SUPPORT_EMAIL}?subject=`)).toBe(true);
    expect(decodeURIComponent(m)).toContain("App version: 1.2.3");
    expect(feedbackMailto()).toContain("unknown");
  });

  it("the Play Store link uses the package the app is built with", () => {
    const app = JSON.parse(read("app.json"));
    expect(app.expo.android.package).toBe(ANDROID_PACKAGE);
    expect(playStoreUrl).toBe(`https://play.google.com/store/apps/details?id=${app.expo.android.package}`);
  });

  it("the contact address is the one the legal pages publish", () => {
    for (const f of ["privacy", "terms", "help", "delete-account", "cancellation"]) {
      expect(read(`landing/${f}.html`)).toContain(`mailto:${SUPPORT_EMAIL}`);
    }
  });

  it("every landing page links to Help from its footer", () => {
    for (const f of ["index", "privacy", "terms", "help", "delete-account", "cancellation"]) {
      expect(read(`landing/${f}.html`), f).toContain('href="/help.html"');
    }
  });
});

describe("browser alerts (react-native-web's Alert.alert does nothing)", () => {
  const dialogs = (confirmAnswer = true) => ({ alert: vi.fn(), confirm: vi.fn(() => confirmAnswer) });

  it("a confirmation runs the destructive action when accepted", () => {
    const win = dialogs(true);
    const out = vi.fn();
    const cancel = vi.fn();
    webAlert(win, "Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel", onPress: cancel },
      { text: "Sign out", style: "destructive", onPress: out },
    ]);
    expect(win.confirm).toHaveBeenCalledWith("Sign out\n\nAre you sure?");
    expect(out).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("a confirmation runs only cancel when declined", () => {
    const win = dialogs(false);
    const out = vi.fn();
    const cancel = vi.fn();
    webAlert(win, "Delete", undefined, [{ text: "Cancel", style: "cancel", onPress: cancel }, { text: "Delete", style: "destructive", onPress: out }]);
    expect(out).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("a plain message is shown and its single button still runs", () => {
    const win = dialogs();
    const ok = vi.fn();
    webAlert(win, "Saved", "All good", [{ text: "OK", onPress: ok }]);
    expect(win.alert).toHaveBeenCalledWith("Saved\n\nAll good");
    expect(win.confirm).not.toHaveBeenCalled();
    expect(ok).toHaveBeenCalledOnce();
  });

  it("works with no buttons and no message", () => {
    const win = dialogs();
    webAlert(win, "Heads up");
    expect(win.alert).toHaveBeenCalledWith("Heads up");
  });

  it("with several non-cancel buttons, accepting runs the last (primary) one", () => {
    const win = dialogs(true);
    const a = vi.fn();
    const b = vi.fn();
    webAlert(win, "Pick", "x", [{ text: "A", onPress: a }, { text: "B", onPress: b }, { text: "Cancel", style: "cancel" }]);
    expect(b).toHaveBeenCalledOnce();
    expect(a).not.toHaveBeenCalled();
  });
});
