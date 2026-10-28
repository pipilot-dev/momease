import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

// SW_SRC lets us point the same tests at an older generated sw.js to prove they catch the bug.
const SRC = readFileSync(process.env.SW_SRC ?? new URL("../../scripts/sw-template.js", import.meta.url), "utf8").replace(
  "__CACHE_VERSION__",
  "test-cache",
);

const html = () => new Response("<!doctype html><html></html>", { status: 200, headers: { "content-type": "text/html" } });
const js = () => new Response("console.log(1)", { status: 200, headers: { "content-type": "application/javascript" } });
const tick = () => new Promise((r) => setTimeout(r, 0));

function boot(fetchImpl: (url: string) => Promise<Response>, cache = new Map<string, Response>()) {
  const listeners: Record<string, (e: any) => void> = {};
  const caches = {
    match: async (req: any) => cache.get(typeof req === "string" ? req : req.url),
    open: async () => ({
      put: async (req: any, res: Response) => void cache.set(typeof req === "string" ? req : req.url, res),
      addAll: async () => {},
    }),
    keys: async () => [],
    delete: async () => true,
  };
  const self = {
    addEventListener: (type: string, fn: (e: any) => void) => (listeners[type] = fn),
    location: { origin: "https://app.test" },
    skipWaiting() {},
    clients: { claim() {}, matchAll: async () => [] },
    registration: {},
  };
  vm.runInNewContext(SRC, { self, caches, fetch: (r: any) => fetchImpl(r.url ?? r), Response, URL, Promise, console, Headers });
  const request = async (path: string, mode = "no-cors") => {
    let out: Promise<Response> | undefined;
    listeners.fetch({
      request: { method: "GET", url: `https://app.test${path}`, mode, headers: new Headers() },
      respondWith: (p: Promise<Response>) => (out = p),
    });
    const res = out ? await out : undefined;
    await tick();
    return res;
  };
  return { cache, request };
}

describe("service worker caching rules", () => {
  const BUNDLE = "/_expo/static/js/web/entry-abc123.js";

  it("caches a good script and serves it from cache without refetching", async () => {
    let fetches = 0;
    const sw = boot(async () => (fetches++, js()));
    expect((await sw.request(BUNDLE))!.headers.get("content-type")).toContain("javascript");
    await sw.request(BUNDLE);
    expect(fetches).toBe(1);
    expect(sw.cache.has(`https://app.test${BUNDLE}`)).toBe(true);
  });

  it("never caches the SPA's HTML fallback served for a script URL (deploy-propagation window)", async () => {
    const sw = boot(async () => html());
    await sw.request(BUNDLE);
    expect(sw.cache.size).toBe(0);
  });

  it("recovers by itself: a poisoned HTML entry under a script URL is ignored and refetched", async () => {
    const poisoned = new Map([[`https://app.test${BUNDLE}`, html()]]);
    const sw = boot(async () => js(), poisoned);
    const res = await sw.request(BUNDLE);
    expect(res!.headers.get("content-type")).toContain("javascript");
    expect(sw.cache.get(`https://app.test${BUNDLE}`)!.headers.get("content-type")).toContain("javascript");
  });

  it("does not cache error responses for assets", async () => {
    for (const status of [404, 500, 503]) {
      const sw = boot(async () => new Response("nope", { status, headers: { "content-type": "application/javascript" } }));
      await sw.request(BUNDLE);
      expect(sw.cache.size).toBe(0);
    }
  });

  it("does not cache failed page navigations, and serves the cached shell offline", async () => {
    const bad = boot(async () => new Response("down", { status: 502 }));
    await bad.request("/upgrade", "navigate");
    expect(bad.cache.size).toBe(0);

    const cache = new Map([["/", html()]]);
    const offline = boot(async () => Promise.reject(new Error("offline")), cache);
    const res = await offline.request("/upgrade", "navigate");
    expect(await res!.text()).toContain("<html>");
  });
});
