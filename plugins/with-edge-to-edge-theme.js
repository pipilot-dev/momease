// Google Play flags `android:statusBarColor` / `android:navigationBarColor` theme items as deprecated
// edge-to-edge parameters on Android 15. The app is edge-to-edge (system bars are drawn transparent and
// the UI pads for them), so these items are dead weight: strip them from every generated theme.
const { withAndroidStyles } = require("expo/config-plugins");

const DEPRECATED = new Set(["android:statusBarColor", "android:navigationBarColor", "android:navigationBarDividerColor"]);

/** Remove the deprecated items from a parsed styles.xml (mutates and returns it). */
function stripDeprecatedItems(styles) {
  for (const style of styles.resources.style ?? []) {
    style.item = (style.item ?? []).filter((i) => !DEPRECATED.has(i.$?.name));
  }
  return styles;
}

module.exports = function withEdgeToEdgeTheme(config) {
  return withAndroidStyles(config, (cfg) => {
    cfg.modResults = stripDeprecatedItems(cfg.modResults);
    return cfg;
  });
};
module.exports.stripDeprecatedItems = stripDeprecatedItems;
