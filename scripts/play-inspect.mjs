// Dump every Play track's current state so we know exactly where the app
// stands relative to the closed-testing gate.

import { readFileSync } from "fs";
import crypto from "crypto";

const PACKAGE = "com.momease.app";
const key = JSON.parse(readFileSync("credentials/play-service-account.json", "utf8"));

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
const call = async (m, p, t, b) => {
  const r = await fetch(`${API}${p}`, {
    method: m, headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
    body: b ? JSON.stringify(b) : undefined,
  });
  const txt = await r.text();
  return { ok: r.ok, status: r.status, data: txt ? JSON.parse(txt) : {} };
};

(async () => {
  const token = await getAccessToken();
  const edit = await call("POST", `/applications/${PACKAGE}/edits`, token);
  const editId = edit.data.id;

  const tracks = await call("GET", `/applications/${PACKAGE}/edits/${editId}/tracks`, token);
  console.log("=== ALL TRACKS ===");
  for (const t of tracks.data.tracks || []) {
    console.log(`\n[${t.track}]`);
    if (!t.releases || t.releases.length === 0) {
      console.log("  (no releases)");
      continue;
    }
    for (const r of t.releases) {
      console.log(`  • ${r.name || "(unnamed)"}`);
      console.log(`      status:       ${r.status}`);
      console.log(`      versionCodes: ${r.versionCodes?.join(", ") || "-"}`);
      if (r.userFraction !== undefined) console.log(`      userFraction: ${r.userFraction}`);
      if (r.releaseNotes) console.log(`      notes:        ${r.releaseNotes.length} language(s)`);
    }
  }

  // Discard the read-only edit
  await call("DELETE", `/applications/${PACKAGE}/edits/${editId}`, token);
})().catch(e => { console.error(e); process.exit(1); });
