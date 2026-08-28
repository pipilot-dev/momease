// Supabase Edge Function: delete the calling user's account.
//
// Deleting the auth user cascades and removes every row that references it
// (profiles, follows, messages, blocks, reports, user_state) thanks to the
// `on delete cascade` foreign keys. The client calls this authenticated; we
// verify the JWT and delete only that user, using the service-role key.
//
// DEPLOY (one time):
//   supabase functions deploy delete-account
//   # SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// If this function is not deployed, the app still deletes all of the user's
// data via row-level-security-permitted deletes; only the empty auth record
// would remain until removed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "missing token" }), { status: 401, headers: cors });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await admin.auth.getUser(jwt);
    if (error || !data.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(data.user.id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
