import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LARGE_SCREEN_MIN_DP, isLargeScreen } from "../../lib/orientation-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const app = JSON.parse(readFileSync(join(root, "app.json"), "utf8")).expo;
const plugin = createRequire(import.meta.url)(join(root, "plugins", "with-edge-to-edge-theme.js")) as {
  stripDeprecatedItems: (s: any) => any;
};

describe("Play Console release warnings", () => {
  it("does not restrict orientation in the manifest (Android 16 ignores it on large screens)", () => {
    expect(app.orientation).toBe("default");
  });

  it("phones stay portrait (runtime lock), tablets / foldables / resizable windows rotate", () => {
    expect(LARGE_SCREEN_MIN_DP).toBe(600);
    expect(isLargeScreen(390, 844)).toBe(false); // phone portrait
    expect(isLargeScreen(844, 390)).toBe(false); // phone landscape: still a phone
    expect(isLargeScreen(800, 1280)).toBe(true); // tablet
    expect(isLargeScreen(1280, 800)).toBe(true);
    expect(isLargeScreen(600, 900)).toBe(true); // exactly the breakpoint
    expect(isLargeScreen(599, 1200)).toBe(false);
  });

  it("turns on code shrinking, obfuscation and resource shrinking for release builds", () => {
    const entry = app.plugins.find((p: any) => Array.isArray(p) && p[0] === "expo-build-properties");
    expect(entry?.[1].android).toMatchObject({ enableMinifyInReleaseBuilds: true, enableShrinkResourcesInReleaseBuilds: true });
  });

  it("stays edge-to-edge and strips the deprecated system-bar theme items", () => {
    expect(app.android.edgeToEdgeEnabled).toBe(true);
    expect(app.plugins).toContain("./plugins/with-edge-to-edge-theme.js");
    const styles = {
      resources: {
        style: [
          {
            $: { name: "AppTheme" },
            item: [
              { $: { name: "android:statusBarColor" }, _: "#FDE5EC" },
              { $: { name: "android:navigationBarColor" }, _: "#FFFFFF" },
              { $: { name: "android:navigationBarDividerColor" }, _: "#000000" },
              { $: { name: "colorPrimary" }, _: "@color/colorPrimary" },
              { $: { name: "android:enforceNavigationBarContrast" }, _: "true" },
            ],
          },
          { $: { name: "Other" } }, // a style with no items at all
        ],
      },
    };
    const out = plugin.stripDeprecatedItems(styles);
    expect(out.resources.style[0].item.map((i: any) => i.$.name)).toEqual(["colorPrimary", "android:enforceNavigationBarContrast"]);
    expect(out.resources.style[1].item).toEqual([]);
  });
});
