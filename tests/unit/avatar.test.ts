import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { avatarColor, initialsOf } from "../../lib/avatar-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("default avatars", () => {
  it("make initials from a name or @username", () => {
    expect(initialsOf("Anna Lee")).toBe("AL");
    expect(initialsOf("anna")).toBe("A");
    expect(initialsOf("@sam.rivera")).toBe("SR");
    expect(initialsOf("  ")).toBe("M");
    expect(initialsOf(null)).toBe("M");
  });
  it("give the same name the same colour every time", () => {
    expect(avatarColor("Anna")).toBe(avatarColor("Anna"));
    expect(avatarColor("Anna")).toMatch(/^#[0-9A-F]{6}$/i);
  });
  it("no screen downloads placeholder pictures from a third-party service", () => {
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(join(root, d))) {
        const rel = `${d}/${f}`;
        if (statSync(join(root, rel)).isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(f) && /uri:\s*["'`]https:\/\/api\.a0\.dev\/(assets|illustrations)/.test(readFileSync(join(root, rel), "utf8"))) hits.push(rel);
      }
    };
    for (const d of ["app", "components"]) walk(d);
    expect(hits).toEqual([]);
  });
});
