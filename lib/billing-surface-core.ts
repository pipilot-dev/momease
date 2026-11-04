// Where a person can START a paid plan, by platform.
//
// On iPhone the app does not sell anything: no price, no trial, no buy button and no checkout.
// A free account sees one plain link to manage the subscription on the website; a person who is
// already Premium (subscribed on the web or on Android) keeps their benefits and the manage screen.
// Android and the web keep the normal checkout.

/** The web page where a person signs in to subscribe or manage billing. */
export const WEB_ACCOUNT_URL = "https://app.mease.mom/upgrade";

/** Text of the single link a free iPhone account sees. */
export const MANAGE_ON_WEB_LABEL = "Manage your subscription at mease.mom";

/** True where the app may show the price, the trial and a button that starts checkout. */
export function sellsInApp(os: string): boolean {
  return os !== "ios";
}
