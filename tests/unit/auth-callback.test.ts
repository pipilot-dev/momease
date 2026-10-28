import { describe, expect, it } from "vitest";
import { parseCallbackUrl } from "../../lib/auth-callback";

describe("parseCallbackUrl", () => {
  it("reads the session from the URL fragment (native deep link)", () => {
    expect(parseCallbackUrl("momease://auth-callback#token=abc.def.ghi&user_id=u1&email=a%40b.co")).toEqual({
      token: "abc.def.ghi", userId: "u1", email: "a@b.co",
    });
  });
  it("reads the session from the fragment on a web URL", () => {
    expect(parseCallbackUrl("https://app.mease.mom/auth-callback#token=t&user_id=u&email=x%40y.z").token).toBe("t");
  });
  it("still accepts a query string, and the fragment wins over it", () => {
    expect(parseCallbackUrl("momease://auth-callback?token=q&email=a%40b.co").token).toBe("q");
    expect(parseCallbackUrl("momease://auth-callback?token=q#token=h").token).toBe("h");
  });
  it("returns nulls for empty / garbage input without throwing", () => {
    for (const bad of ["", "momease://auth-callback", "not a url", "#", "?", "momease://x#token", "%E0%A4%A"]) {
      expect(() => parseCallbackUrl(bad)).not.toThrow();
    }
    expect(parseCallbackUrl("")).toEqual({ token: null, userId: null, email: null });
    expect(parseCallbackUrl("momease://auth-callback#token=")).toEqual({ token: null, userId: null, email: null });
  });
  it("decodes plus and percent escapes, tolerates malformed escapes", () => {
    expect(parseCallbackUrl("x://y#email=a+b%40c.d").email).toBe("a b@c.d");
    expect(parseCallbackUrl("x://y#token=%E0%A4%A").token).toBe("%E0%A4%A");
  });
});
