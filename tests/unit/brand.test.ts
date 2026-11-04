import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { brandFor } from "../../lib/brand-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const app = JSON.parse(readFileSync(join(root, "app.json"), "utf8")).expo;

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|json)$/.test(f)) out.push(p);
  }
  return out;
}

describe("brand name", () => {
  it("is MumEase on iPhone and MomEase on Android and the web", () => {
    expect(brandFor("ios")).toBe("MumEase");
    expect(brandFor("android")).toBe("MomEase");
    expect(brandFor("web")).toBe("MomEase");
  });

  it("the iPhone home-screen name and Face ID text say MumEase; Android keeps MomEase", () => {
    expect(app.ios.infoPlist.CFBundleDisplayName).toBe("MumEase");
    const faceId = app.plugins.find((p: any) => Array.isArray(p) && p[0] === "expo-local-authentication")[1].faceIDPermission;
    expect(faceId).toContain("MumEase");
    expect(app.name).toBe("MomEase");
  });

  it("no screen hard-codes the product name in text the user reads (so iPhone never shows MomEase)", () => {
    const offenders: string[] = [];
    for (const dir of ["app", "components", "lib"]) {
      for (const file of walk(join(root, dir))) {
        if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
        if (/brand(-core)?\.ts$|web-push\.ts$|kokoro-tts\.ts$|theme(-context)?\.tsx?$|types\.ts$/.test(file)) continue;
        const lines = readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (!/Mom ?Ease/.test(line)) return;
          const t = line.trim();
          if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
          if (/momease[-_.:/]|["'`]momease|@momease|support@|mease\.mom/i.test(line)) return; // ids, keys, urls, emails
          offenders.push(`${file.replace(root + "/", "")}:${i + 1}: ${t.slice(0, 90)}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
