// Promote the latest Internal Testing release to Production.
//
// Uses the same service account as scripts/play-rollout.mjs. No AAB
// re-upload — the Play Publisher API lets us just create a release on
// the production track referencing the same versionCode.
//
// Defaults to a staged 20% rollout (Google's recommended pattern for
// first-time prod). Bump with a fresh --fraction later, or --full to
// go 100% immediately.
//
// Usage:
//   node scripts/play-promote.mjs                 # 20% staged
//   node scripts/play-promote.mjs --fraction 0.5  # 50% staged
//   node scripts/play-promote.mjs --full          # 100% immediate
//   node scripts/play-promote.mjs --from alpha    # promote closed→prod
//   node scripts/play-promote.mjs --notes-file path/to/notes.txt

import { readFileSync } from "fs";
import crypto from "crypto";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, arr) => {
    if (v.startsWith("--")) a.push([v.slice(2), arr[i + 1] ?? "true"]);
    return a;
  }, [])
);

const PACKAGE = "com.momease.app";
const FROM = args.from || "internal";
const TO = "production";
const KEY_PATH = "credentials/play-service-account.json";
const LANG = "en-US";
const FULL = args.full === "true";
const FRACTION = FULL ? undefined : Number(args.fraction ?? 0.2);

if (!FULL && (isNaN(FRACTION) || FRACTION <= 0 || FRACTION >= 1)) {
  console.error("--fraction must be between 0 and 1 (exclusive). Use --full for 100%.");
  process.exit(1);
}

const NOTES = args["notes-file"]
  ? readFileSync(args["notes-file"], "utf8")
  : `Welcome to MomEase 💛

A wellness companion built for the beautiful chaos of working motherhood.

• Personalized 60-second onboarding
• Guided breathing (Box, 4-7-8, Gentle Relax)
• Warm companion chat with soft-voice audio
• Daily mood check-ins + prompted journal
• Sleep tracker + calming sounds
• Real mom-to-mom community
• 7-day free Premium trial

Made with love. Feedback: support@momease.app`;

const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64")
      .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${b64url({ alg: "RS256", typ: "JWT", kid: key.private_key_id })}.${b64url({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: key.token_uri,
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = crypto.createSign("RSA-SHA256").update(signingInput).sign(key.private_key)
    .toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${sig}`,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token exchange: ${JSON.stringify(data)}`);
  return data.access_token;
}

const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
async function call(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    // Play API packs the actual reason in error.details — surface it.
    const detail = data?.error?.details
      ? JSON.stringify(data.error.details, null, 2)
      : "";
    throw new Error(
      `${method} ${path} → ${res.status}: ${data?.error?.message || text}${detail ? "\n\ndetails:\n" + detail : ""}`
    );
  }
  return data;
}

(async () => {
  console.log(`Promote: ${PACKAGE} ${FROM} → ${TO}${FULL ? " (100%)" : ` (${Math.round(FRACTION * 100)}% staged)`}`);
  const token = await getAccessToken();
  console.log("  ✓ token");

  const edit = await call("POST", `/applications/${PACKAGE}/edits`, token);
  console.log(`  ✓ edit ${edit.id}`);

  // Take the most-recent versionCode from the source track (highest one wins).
  const src = await call("GET", `/applications/${PACKAGE}/edits/${edit.id}/tracks/${FROM}`, token);
  const codes = (src.releases || []).flatMap(r => r.versionCodes || []).map(Number);
  if (codes.length === 0) throw new Error(`no versionCodes in ${FROM} track — promote what?`);
  const version = Math.max(...codes);
  console.log(`  ✓ promoting versionCode ${version} from ${FROM}`);

  const release = {
    name: `1.0.0 (${version})`,
    versionCodes: [String(version)],
    status: FULL ? "completed" : "inProgress",
    releaseNotes: [{ language: LANG, text: NOTES }],
    ...(FULL ? {} : { userFraction: FRACTION }),
  };
  await call("PUT", `/applications/${PACKAGE}/edits/${edit.id}/tracks/${TO}`, token, {
    track: TO,
    releases: [release],
  });
  console.log(`  ✓ ${TO} release drafted with notes${FULL ? "" : ` and userFraction=${FRACTION}`}`);

  const committed = await call("POST", `/applications/${PACKAGE}/edits/${edit.id}:commit`, token);
  console.log(`  ✓ edit committed: ${committed.id}`);
  console.log("\n📣 Sent to Play Store review. First-time production releases usually approve within a few hours to a couple days.");
  console.log("   Track status live at: https://play.google.com/console → Testing → Publishing overview");
})().catch(e => {
  console.error("\n❌", e.message);
  process.exit(1);
});
