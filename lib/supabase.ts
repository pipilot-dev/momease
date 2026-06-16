// Supabase client + config detection.
//
// The app works with NO backend (mock auth) until you provide credentials.
// Provide them via either:
//   1. app.json -> expo.extra.supabaseUrl / supabaseAnonKey, or
//   2. env vars EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
//
// The anon (publishable) key is safe to ship in a client app.
import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || "";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || "";

/** OAuth callback used by the Lovable-managed auth proxy. */
export const OAUTH_REDIRECT =
  process.env.EXPO_PUBLIC_OAUTH_REDIRECT ||
  extra.oauthRedirect ||
  "https://oauth.lovable.app/callback";

/** True when real Supabase credentials are configured. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      },
    })
  : null;
