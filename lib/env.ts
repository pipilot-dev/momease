// Runtime environment detection.
//
// The subscription flow behaves differently depending on where the app is
// running: a browser PWA can redirect the tab straight to Stripe, while a
// native/installed build has to hand the URL off to the system browser and
// then re-sync when the user comes back.

import { Platform } from "react-native";

/** Running in a browser (PWA / installed home-screen PWA). */
export const isWebPWA = Platform.OS === "web";

/** Running as a native React Native app on iOS or Android. */
export const isNativeApp = Platform.OS === "ios" || Platform.OS === "android";

/**
 * Rough Android WebView detection. We check the browser user agent for the
 * `; wv` token that Chrome adds inside a WebView. Used to tune the checkout
 * copy when the site is loaded inside a wrapper app.
 */
export const isAndroidWebview = (() => {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua) && /; wv\)/.test(ua);
})();

/**
 * When true, checkout should be handed off to the system browser rather than
 * loaded in-tab. Native builds always; a webview wrapper does too.
 */
export const usesExternalBrowserForCheckout = isNativeApp || isAndroidWebview;
