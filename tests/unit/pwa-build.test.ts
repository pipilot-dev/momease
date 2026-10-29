import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
let dist = "";

beforeAll(() => {
  dist = mkdtempSync(join(tmpdir(), "momease-pwa-"));
  writeFileSync(join(dist, "index.html"), "<!doctype html><html><head><title>x</title></head><body></body></html>");
  execFileSync("node", [join(root, "scripts", "pwa-ify.mjs")], { cwd: root, env: { ...process.env, PWA_DIST: dist }, stdio: "pipe" });
}, 60000);

afterAll(() => rmSync(dist, { recursive: true, force: true }));

describe("web build caching (so a release reaches users without clearing the browser)", () => {
  it("always revalidates the service worker, the page and the manifest", () => {
    const headers = readFileSync(join(dist, "_headers"), "utf8");
    for (const path of ["/sw.js", "/index.html", "/manifest.webmanifest"]) {
      expect(headers).toMatch(new RegExp(`^${path.replace(/[./]/g, "\\$&")}\\n  Cache-Control: no-cache$`, "m"));
    }
  });

  it("registers the service worker without the HTTP cache, checks for updates, and reloads once on a swap", () => {
    const html = readFileSync(join(dist, "index.html"), "utf8");
    expect(html).toContain("register('/sw.js', { updateViaCache: 'none' })");
    expect(html).toContain("reg.update()");
    expect(html).toContain("controllerchange");
    expect(html).toContain("var hadController = !!navigator.serviceWorker.controller"); // no reload on first install
    expect(html).toContain("if (!hadController || reloaded) return;"); // never loops
  });

  it("gives every build a fresh service-worker cache name", () => {
    const sw = readFileSync(join(dist, "sw.js"), "utf8");
    expect(sw).toMatch(/const CACHE = 'momease-v\d+'/);
    expect(sw).not.toContain("__CACHE_VERSION__");
  });

  it("is idempotent: running it twice does not duplicate the injected block", () => {
    execFileSync("node", [join(root, "scripts", "pwa-ify.mjs")], { cwd: root, env: { ...process.env, PWA_DIST: dist }, stdio: "pipe" });
    const html = readFileSync(join(dist, "index.html"), "utf8");
    expect(html.match(/MOMEASE_PWA_START/g)?.length ?? 0).toBeLessThanOrEqual(1);
    expect(html.match(/register\('\/sw\.js'/g)?.length).toBe(1);
  });
});
