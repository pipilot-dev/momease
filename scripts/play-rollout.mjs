// Add release notes + flip the Internal Testing draft to 'completed' so
// Play starts rolling out to internal testers.
//
// Uses the service account JSON in credentials/play-service-account.json.
// No googleapis package — pure fetch + RS256 JWT via node:crypto.
//
// Usage: node scripts/play-rollout.mjs [--track internal] [--notes-file path]

import { readFileSync } from "fs";
import crypto from "crypto";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, arr) => {
    if (v.startsWith("--")) a.push([v.slice(2), arr[i + 1]]);
    return a;
  }, [])
);

const PACKAGE = "com.momease.app";
const TRACK = args.track || "internal";
const KEY_PATH = "credentials/play-service-account.json";
const LANG = "en-US";

// Release notes — edit here or pass --notes-file <path>.
const NOTES = args["notes-file"]
  ? readFileSync(args["notes-file"], "utf8")
  : `Welcome to MomEase — internal test build 1.0.0

Try today:
• Personalized 60-second onboarding
• Guided breathing (Box, 4-7-8, Gentle Relax)
• Companion chat with soft-voice audio replies
• Daily mood check-ins + journal
• Sleep sounds + tracker
• Community
• Premium: 7-day free trial

Feedback: support@momease.app
Please share bugs, wording, and anything that feels off.`;

const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));

// ─── 1. Sign a JWT and exchange it for an access token ────────────────────
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: key.private_key_id };
  const claim = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: key.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${b64url(header)}.${b64url(claim)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const sig = signer.sign(key.private_key)
    .toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${signingInput}.${sig}`;

  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ─── 2. Play Publisher API helpers ────────────────────────────────────────
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";

async function call(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = data?.error?.message || text;
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

// ─── 3. Orchestrate ───────────────────────────────────────────────────────
(async () => {
  console.log(`Play rollout: ${PACKAGE} → ${TRACK}`);
  const token = await getAccessToken();
  console.log("  ✓ access token acquired");

  // Open an edit
  const edit = await call("POST", `/applications/${PACKAGE}/edits`, token);
  console.log(`  ✓ edit opened: ${edit.id}`);

  // Read current track so we don't clobber the AAB EAS uploaded
  const track = await call("GET", `/applications/${PACKAGE}/edits/${edit.id}/tracks/${TRACK}`, token);
  console.log(`  ✓ current ${TRACK} track: ${(track.releases || []).map(r => `${r.name} (${r.status}, versionCodes=${r.versionCodes?.join(",")})`).join("; ") || "empty"}`);

  const draft = (track.releases || []).find(r => r.status === "draft") || track.releases?.[0];
  if (!draft) throw new Error(`no release in ${TRACK} track — was the AAB uploaded?`);

  // Attach release notes + flip to 'completed' (starts the rollout).
  const updated = {
    track: TRACK,
    releases: [
      {
        name: draft.name || `1.0.0 (${draft.versionCodes?.[0]})`,
        versionCodes: draft.versionCodes,
        status: "completed",
        releaseNotes: [{ language: LANG, text: NOTES }],
      },
    ],
  };
  await call("PUT", `/applications/${PACKAGE}/edits/${edit.id}/tracks/${TRACK}`, token, updated);
  console.log("  ✓ release notes attached + status → completed");

  // Commit — that's the button-press that actually rolls out.
  const committed = await call("POST", `/applications/${PACKAGE}/edits/${edit.id}:commit`, token);
  console.log(`  ✓ edit committed: ${committed.id}`);
  console.log("\n🚀 Rolling out to internal testers on Play Console.");
})().catch(e => {
  console.error("\n❌", e.message);
  process.exit(1);
});
