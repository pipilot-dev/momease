import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isAppleCancel, nameFromCredential, offersAppleSignIn, toHex } from "../../lib/apple-auth-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const app = JSON.parse(readFileSync(join(root, "app.json"), "utf8")).expo;

describe("Sign in with Apple (app side)", () => {
  it("is offered on iPhone/iPad only", () => {
    expect(offersAppleSignIn("ios")).toBe(true);
    expect(offersAppleSignIn("android")).toBe(false);
    expect(offersAppleSignIn("web")).toBe(false);
  });

  it("passes on the name Apple gives (only the first time), trimmed, and nothing when it gives none", () => {
    expect(nameFromCredential({ givenName: " Ada ", familyName: "Lovelace" })).toEqual({ givenName: "Ada", familyName: "Lovelace" });
    expect(nameFromCredential({ givenName: "Ada", familyName: null })).toEqual({ givenName: "Ada", familyName: undefined });
    expect(nameFromCredential({ givenName: "  ", familyName: "" })).toBeUndefined();
    expect(nameFromCredential(null)).toBeUndefined();
    expect(nameFromCredential(undefined)).toBeUndefined();
  });

  it("turns random bytes into a hex nonce", () => {
    expect(toHex([0, 1, 15, 16, 255])).toBe("00010f10ff");
    expect(toHex(new Uint8Array(16)).length).toBe(32);
  });

  it("treats closing Apple's sheet as a cancel, not an error", () => {
    expect(isAppleCancel({ code: "ERR_REQUEST_CANCELED" })).toBe(true);
    expect(isAppleCancel({ code: "ERR_SOMETHING_ELSE" })).toBe(false);
    expect(isAppleCancel(new Error("x"))).toBe(false);
    expect(isAppleCancel(null)).toBe(false);
  });

  it("the iPhone build enables the capability: entitlement flag and the plugin", () => {
    expect(app.ios.usesAppleSignIn).toBe(true);
    expect(app.plugins).toContain("expo-apple-authentication");
  });

  it("the sign-in screen mounts the Apple button, which hides itself everywhere but iPhone", () => {
    const screen = readFileSync(join(root, "app/(auth)/sign-in.tsx"), "utf8");
    expect(screen).toContain("<AppleSignInButton");
    const button = readFileSync(join(root, "components/AppleSignInButton.tsx"), "utf8");
    expect(button).toContain("offersAppleSignIn(Platform.OS)");
    expect(button).toContain("if (!apple) return null");
  });
});
