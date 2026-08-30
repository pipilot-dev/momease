// Upload a fresh icon to the Play Store listing (no rebuild required).
// Replaces the 512×512 icon shown on the store product page.
//
// Usage:
//   node scripts/play-upload-icon.mjs
//   node scripts/play-upload-icon.mjs --file path/to/other.png --lang fr-FR
//
// Play's REST API for listing images has two entrypoints per (lang, imageType):
//   DELETE /applications/{pkg}/edits/{editId}/listings/{lang}/{imageType}
//   POST   /upload/androidpublisher/v3/applications/{pkg}/edits/{editId}/listings/{lang}/{imageType}?uploadType=media
// We clear then upload — Play caps 'icon' to a single image.

import { readFileSync } from "fs";
import crypto from "crypto";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, arr) => {
    if (v.startsWith("--")) a.push([v.slice(2), arr[i + 1] ?? "true"]);
    return a;
  }, [])
);

const PACKAGE = "com.momease.app";
const LANG = args.lang || "en-US";
const FILE = args.file || "store-assets/icons/momease-heart-512.png";
const KEY_PATH = "credentials/play-service-account.json";
const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64")
      .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${b64url({ alg: "RS256", typ: "JWT", kid: key.private_key_id })}.${b64url({
    iss: key.client_email, scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: key.token_uri, iat: now, exp: now + 3600,
  })}`;
  const sig = crypto.createSign("RSA-SHA256").update(signingInput).sign(key.private_key)
    .toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const res = await fetch(key.token_uri, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${sig}`,
    }),
  });
  return (await res.json()).access_token;
}

const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const UPLOAD = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3";

async function call(url, opts) {
  const res = await fetch(url, opts);
  const txt = await res.text();
  const data = txt ? (opts.expectJson === false ? txt : JSON.parse(txt)) : {};
  if (!res.ok) {
    const detail = data?.error?.details ? "\n" + JSON.stringify(data.error.details, null, 2) : "";
    throw new Error(`${opts.method} ${url} → ${res.status}: ${data?.error?.message || txt}${detail}`);
  }
  return data;
}

(async () => {
  console.log(`Play icon upload: ${PACKAGE} · ${LANG} ← ${FILE}`);
  const token = await getAccessToken();
  console.log("  ✓ token");

  const edit = await call(`${API}/applications/${PACKAGE}/edits`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  console.log(`  ✓ edit ${edit.id}`);

  // Clear the existing icon slot (Play only allows one)
  await call(`${API}/applications/${PACKAGE}/edits/${edit.id}/listings/${LANG}/icon`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
    expectJson: false,
  }).catch((e) => console.log("  ℹ no existing icon to delete (fine)"));
  console.log("  ✓ existing icon cleared");

  // Upload the new one
  const bytes = readFileSync(FILE);
  const uploaded = await call(
    `${UPLOAD}/applications/${PACKAGE}/edits/${edit.id}/listings/${LANG}/icon?uploadType=media`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "image/png" },
      body: bytes,
    }
  );
  console.log(`  ✓ uploaded icon (sha1=${uploaded.image?.sha1 ?? "?"})`);

  // Commit — icons are listing metadata, no review needed for changes to
  // graphical assets that don't gate a release
  const committed = await call(
    `${API}/applications/${PACKAGE}/edits/${edit.id}:commit?changesNotSentForReview=false`,
    { method: "POST", headers: { authorization: `Bearer ${token}` } }
  );
  console.log(`  ✓ committed: ${committed.id}`);
  console.log("\n🎨 Store listing icon updated — visible on Play in a few minutes.");
})().catch((e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});
