// Where the in-app support links go. Kept free of React Native imports so tests can check them.

export const SITE = "https://mease.mom";
export const SUPPORT_EMAIL = "support@momease.app"; // the address every legal page on the site already publishes
export const ANDROID_PACKAGE = "com.momease.app";

/** Pages that must exist in /landing — a unit test checks each one. */
export const SITE_PAGES = {
  help: "/help.html",
  privacy: "/privacy.html",
  terms: "/terms.html",
  cancellation: "/cancellation.html",
  deleteAccount: "/delete-account.html",
} as const;

export const pageUrl = (page: keyof typeof SITE_PAGES) => `${SITE}${SITE_PAGES[page]}`;

export function feedbackMailto(version?: string): string {
  const subject = encodeURIComponent("MomEase feedback");
  const body = encodeURIComponent(`\n\n—\nApp version: ${version ?? "unknown"}`);
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export const playStoreUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
