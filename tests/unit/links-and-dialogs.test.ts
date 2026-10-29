import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { normalizeDialog } from "../../lib/dialog-core";
import { useDialogStore } from "../../lib/dialog-store";
import { ANDROID_PACKAGE, SITE, SITE_PAGES, SUPPORT_EMAIL, FEEDBACK_FORM_URL, feedbackFormUrl, pageUrl, playStoreUrl } from "../../lib/links-core";

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

  it("feedback opens the beta form with platform and app version pre-filled", () => {
    const u = new URL(feedbackFormUrl("android", "1.2.3"));
    expect(`${u.origin}${u.pathname}`).toBe(FEEDBACK_FORM_URL);
    expect(u.searchParams.get("usp")).toBe("pp_url");
    expect(u.searchParams.get("entry.1792733158")).toBe("Android");
    expect(u.searchParams.get("entry.232678679")).toBe("1.2.3");
    expect(new URL(feedbackFormUrl("web", "1.0.0")).searchParams.get("entry.1792733158")).toBe("Web");
    expect(new URL(feedbackFormUrl("ios")).searchParams.has("entry.232678679")).toBe(false);
    expect(new URL(feedbackFormUrl()).searchParams.has("entry.1792733158")).toBe(false);
  });

  it("the form link is the one shared with testers", () => {
    expect(FEEDBACK_FORM_URL).toBe("https://docs.google.com/forms/d/e/1FAIpQLSeuHAmAGfXrxjVNi9KFeKs8cTdWtIRkCfeq0Xuf163AjGbCWQ/viewform");
    expect(read("landing/help.html")).toContain("https://tinyurl.com/2226ps48");
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

describe("in-app dialogs (react-native-web has no Alert and the browser's confirm() can be blocked)", () => {
  const reset = () => useDialogStore.setState({ current: null });

  it("always offers a button, and puts cancel first", () => {
    expect(normalizeDialog("Hi").buttons).toEqual([{ text: "OK" }]);
    expect(normalizeDialog("Hi", "x", []).buttons).toEqual([{ text: "OK" }]);
    const d = normalizeDialog("Sign out", "Sure?", [
      { text: "Sign out", style: "destructive" },
      { text: "Cancel", style: "cancel" },
    ]);
    expect(d.buttons.map((b) => b.text)).toEqual(["Cancel", "Sign out"]);
    expect(d.title).toBe("Sign out");
    expect(d.message).toBe("Sure?");
  });

  it("choosing a button closes the dialog and runs only that button's action", () => {
    reset();
    const out = vi.fn();
    const cancel = vi.fn();
    useDialogStore.getState().open("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel", onPress: cancel },
      { text: "Sign out", style: "destructive", onPress: out },
    ]);
    const shown = useDialogStore.getState().current!;
    expect(shown.title).toBe("Sign out");
    useDialogStore.getState().choose(shown.buttons[1]);
    expect(useDialogStore.getState().current).toBeNull();
    expect(out).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("dismissing (tap outside / back) acts like Cancel", () => {
    reset();
    const out = vi.fn();
    const cancel = vi.fn();
    useDialogStore.getState().open("Delete", undefined, [{ text: "Delete", style: "destructive", onPress: out }, { text: "Cancel", style: "cancel", onPress: cancel }]);
    useDialogStore.getState().dismiss();
    expect(useDialogStore.getState().current).toBeNull();
    expect(cancel).toHaveBeenCalledOnce();
    expect(out).not.toHaveBeenCalled();
  });

  it("dismissing a plain message just closes it", () => {
    reset();
    useDialogStore.getState().open("Saved");
    useDialogStore.getState().dismiss();
    expect(useDialogStore.getState().current).toBeNull();
  });

  it("choosing twice (double tap) runs the action once", () => {
    reset();
    const out = vi.fn();
    useDialogStore.getState().open("Sign out", undefined, [{ text: "Sign out", onPress: out }]);
    const b = useDialogStore.getState().current!.buttons[0];
    useDialogStore.getState().choose(b);
    useDialogStore.getState().choose(b);
    expect(out).toHaveBeenCalledOnce();
  });
});
