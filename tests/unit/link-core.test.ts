import { describe, expect, it } from "vitest";
import { parseCallbackUrl } from "../../lib/auth-callback";
import { linkFailureMessage, needsReplaceConfirmation, parseLinkResult, replaceConfirmation } from "../../lib/link-core";

describe("connect another sign-in: result in the return URL", () => {
  it("reads a successful connect", () => {
    expect(parseLinkResult("momease://auth-callback#linked=google")).toEqual({ linked: "google", error: null });
    expect(parseLinkResult("https://app.mease.mom/auth-callback#linked=google")).toEqual({ linked: "google", error: null });
  });
  it("reads a refusal", () => {
    expect(parseLinkResult("momease://auth-callback#link_error=identity_in_use_mergeable")).toEqual({ linked: null, error: "identity_in_use_mergeable" });
  });
  it("ignores a normal sign-in return, a missing fragment and unknown providers", () => {
    expect(parseLinkResult("momease://auth-callback#token=abc&user_id=u1")).toEqual({ linked: null, error: null });
    expect(parseLinkResult("momease://auth-callback")).toEqual({ linked: null, error: null });
    expect(parseLinkResult("momease://auth-callback#linked=evil")).toEqual({ linked: null, error: null });
  });
  it("a link result never looks like a sign-in (no token), so it cannot start a session", () => {
    expect(parseCallbackUrl("momease://auth-callback#linked=google").token).toBeNull();
  });
});

describe("wording", () => {
  it("only the empty-profile case asks for confirmation", () => {
    expect(needsReplaceConfirmation("identity_in_use_mergeable")).toBe(true);
    for (const c of ["identity_in_use", "already_linked_other", "", undefined, "network"]) expect(needsReplaceConfirmation(c)).toBe(false);
  });
  it("the confirmation names the provider and says what will be deleted", () => {
    const c = replaceConfirmation("apple");
    expect(c.message).toContain("Apple");
    expect(c.message).toMatch(/delete that empty profile/);
    expect(c.confirm).toMatch(/Replace/);
  });
  it("explains each refusal in plain words, and stays silent when she cancelled", () => {
    expect(linkFailureMessage("identity_in_use", "google")).toMatch(/already used by another profile that has content/);
    expect(linkFailureMessage("already_linked_other", "apple")).toMatch(/different Apple account/);
    expect(linkFailureMessage("something_odd", "google")).toMatch(/couldn't connect Google/);
    expect(linkFailureMessage("", "apple")).toBe("");
    expect(linkFailureMessage(undefined, "apple")).toBe("");
  });
});
