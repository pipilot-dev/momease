// Pure helpers for Sign in with Apple (no native imports, so they can be unit-tested).

export interface AppleFullName {
  givenName?: string | null;
  familyName?: string | null;
}

/** Apple only gives the name the first time a person signs in; pass it through if present. */
export function nameFromCredential(fullName?: AppleFullName | null): AppleFullName | undefined {
  const givenName = fullName?.givenName?.trim() || undefined;
  const familyName = fullName?.familyName?.trim() || undefined;
  return givenName || familyName ? { givenName, familyName } : undefined;
}

export function toHex(bytes: ArrayLike<number>): string {
  return Array.from(bytes as ArrayLike<number>, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The button is offered on iPhone/iPad only (Apple's own button; the web app has no Apple sign-in). */
export function offersAppleSignIn(os: string): boolean {
  return os === "ios";
}

/** expo-apple-authentication reports a cancelled sheet with this code. */
export function isAppleCancel(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "ERR_REQUEST_CANCELED";
}
