// "Connected sign-ins": pure helpers (wording and URL handling) shared by Settings and the web return page.

export type Provider = "apple" | "google";
export const PROVIDER_LABEL: Record<Provider, string> = { apple: "Apple", google: "Google" };

export interface Identities { google: boolean; apple: boolean }

/** What the server answers when a connect is refused. */
export type LinkErrorCode = "identity_in_use_mergeable" | "identity_in_use" | "already_linked_other" | string;

/** The server found another, empty profile that owns this sign-in: ask before replacing it. */
export function needsReplaceConfirmation(code: string | undefined): boolean {
  return code === "identity_in_use_mergeable";
}

export function replaceConfirmation(provider: Provider): { title: string; message: string; confirm: string } {
  const p = PROVIDER_LABEL[provider];
  return {
    title: `Replace the other profile?`,
    message: `This ${p} sign-in already has its own, empty profile. Connecting it will delete that empty profile and use the one you're in now instead.`,
    confirm: "Replace and connect",
  };
}

/** Plain-language reason a connect did not go through (empty string = nothing to say, e.g. she cancelled). */
export function linkFailureMessage(code: string | undefined, provider: Provider): string {
  const p = PROVIDER_LABEL[provider];
  switch (code) {
    case "identity_in_use":
      return `This ${p} sign-in is already used by another profile that has content in it, so it can't be moved here. You can keep signing in with it separately.`;
    case "already_linked_other":
      return `This profile is already connected to a different ${p} account.`;
    case "invalid_apple_token":
      return "Apple sign-in didn't go through. Please try again.";
    case "user_missing":
      return "We couldn't find your profile. Please sign in again.";
    case "":
    case undefined:
      return "";
    default:
      return `We couldn't connect ${p} just now. Please try again.`;
  }
}

/** Parse the result the server puts in the return URL after a Google connect: #linked=google or #link_error=code. */
export function parseLinkResult(url: string): { linked: Provider | null; error: string | null } {
  const hashAt = url.indexOf("#");
  if (hashAt < 0) return { linked: null, error: null };
  const out: Record<string, string> = {};
  for (const part of url.slice(hashAt + 1).split("&")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    try { out[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(part.slice(i + 1).replace(/\+/g, " ")); } catch { /* skip */ }
  }
  const linked = out.linked === "google" || out.linked === "apple" ? (out.linked as Provider) : null;
  return { linked, error: out.link_error || null };
}
