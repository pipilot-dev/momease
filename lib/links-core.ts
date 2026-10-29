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

/** The beta feedback form (Google Form). Same form the short link https://tinyurl.com/2226ps48 points to. */
export const FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeuHAmAGfXrxjVNi9KFeKs8cTdWtIRkCfeq0Xuf163AjGbCWQ/viewform";

// Entry ids of the form's "Platform" and "App version" questions (used to pre-fill them).
const FORM_ENTRY_PLATFORM = "entry.1792733158";
const FORM_ENTRY_VERSION = "entry.232678679";

const PLATFORM_LABEL: Record<string, string> = { android: "Android", ios: "iOS", web: "Web" };

/** Feedback form link with platform and app version filled in, so we know what the tester is on. */
export function feedbackFormUrl(platform?: string, version?: string): string {
  const q = new URLSearchParams({ usp: "pp_url" });
  if (platform) q.set(FORM_ENTRY_PLATFORM, PLATFORM_LABEL[platform] ?? platform);
  if (version) q.set(FORM_ENTRY_VERSION, version);
  return `${FEEDBACK_FORM_URL}?${q.toString()}`;
}

export const playStoreUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
