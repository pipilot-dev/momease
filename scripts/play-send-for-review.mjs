// Force-flush any completed-but-not-yet-sent releases so Google actually
// reviews them. Necessary when a prior submit used changesNotSentForReview
// = true (EAS's default for auto-submit).
//
// Usage: node scripts/play-send-for-review.mjs [--track alpha]

import { readFileSync } from "fs";
import crypto from "crypto";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, arr) => {
    if (v.startsWith("--")) a.push([v.slice(2), arr[i + 1] ?? "true"]);
    return a;
  }, [])
);

const PACKAGE = "com.momease.app";
const TRACK = args.track || "alpha"; // closed testing = alpha
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
  const data = await res.json();
  if (!res.ok) throw new Error(`token exchange: ${JSON.stringify(data)}`);
  return data.access_token;
}

const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
async function call(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = data?.error?.details ? "\n\ndetails:\n" + JSON.stringify(data.error.details, null, 2) : "";
    throw new Error(`${method} ${path} → ${res.status}: ${data?.error?.message || text}${detail}`);
  }
  return data;
}

(async () => {
  console.log(`Send-for-review: ${PACKAGE} · ${TRACK}`);
  const token = await getAccessToken();

  const edit = await call("POST", `/applications/${PACKAGE}/edits`, token);
  console.log(`  ✓ edit ${edit.id}`);

  // Re-write the track's current release with itself. This is a real,
  // committable change from the API's perspective, so the commit's
  // changesNotSentForReview=false will kick everything into review.
  const track = await call("GET", `/applications/${PACKAGE}/edits/${edit.id}/tracks/${TRACK}`, token);
  const releases = (track.releases || []).map(r => ({
    name: r.name,
    versionCodes: r.versionCodes,
    status: r.status,
    userFraction: r.userFraction,
    releaseNotes: r.releaseNotes,
  })).filter(r => r.versionCodes && r.versionCodes.length > 0);

  if (releases.length === 0) throw new Error(`no releases on ${TRACK} to send for review`);
  console.log(`  ✓ ${TRACK} release(s):`, releases.map(r => `${r.name} (${r.status})`).join(", "));

  await call("PUT", `/applications/${PACKAGE}/edits/${edit.id}/tracks/${TRACK}`, token, {
    track: TRACK, releases,
  });

  // The critical part: commit with changesNotSentForReview=false so Google
  // starts reviewing.
  const committed = await call(
    "POST",
    `/applications/${PACKAGE}/edits/${edit.id}:commit?changesNotSentForReview=false`,
    token
  );
  console.log(`  ✓ edit committed for review: ${committed.id}`);
  console.log("\n📣 Sent to Google for review. Track status in Play Console → Publishing overview.");
})().catch(e => {
  console.error("\n❌", e.message);
  process.exit(1);
});
