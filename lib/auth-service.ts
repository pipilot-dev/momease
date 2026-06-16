// Unified auth service.
//
// Routes to real Supabase auth when configured (lib/supabase.ts), and
// transparently falls back to the in-memory mock service otherwise, so the
// app is fully usable in development with zero backend setup.
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { User } from "./types";
import { authService as mockAuth, type AuthResult } from "./mock-auth";
import { supabase, isSupabaseConfigured, OAUTH_REDIRECT } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export type { AuthResult };

const DEFAULTS = {
  role: "free" as const,
  childrenAges: [] as string[],
  interests: [] as string[],
  onboardingCompleted: false,
};

/** Map a Supabase user record into the app's User shape. */
function mapSupabaseUser(su: any): User {
  const meta = su.user_metadata ?? {};
  return {
    id: su.id,
    email: su.email ?? meta.email ?? "",
    name: meta.full_name || meta.name || (su.email ? su.email.split("@")[0] : "Mama"),
    avatarUrl: meta.avatar_url || meta.picture,
    role: meta.role ?? DEFAULTS.role,
    childrenAges: meta.childrenAges ?? DEFAULTS.childrenAges,
    workSchedule: meta.workSchedule,
    interests: meta.interests ?? DEFAULTS.interests,
    createdAt: su.created_at ?? new Date().toISOString(),
    onboardingCompleted: meta.onboardingCompleted ?? DEFAULTS.onboardingCompleted,
  };
}

export const authService = {
  get usesSupabase() {
    return isSupabaseConfigured;
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!supabase) return mockAuth.signIn(email, password);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { success: false, error: error?.message || "Sign in failed" };
    return { success: true, user: mapSupabaseUser(data.user) };
  },

  async signUp(email: string, password: string, name: string): Promise<AuthResult> {
    if (!supabase) return mockAuth.signUp(email, password, name);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, onboardingCompleted: false } },
    });
    if (error || !data.user) return { success: false, error: error?.message || "Sign up failed" };
    return { success: true, user: mapSupabaseUser(data.user) };
  },

  /**
   * Google OAuth. On web, Supabase performs a full-page redirect. On native,
   * we open the provider URL in a browser tab and the deep link returns control.
   * Returns the signed-in user once the session is established (web resolves
   * after redirect via getCurrentUser on next load).
   */
  async signInWithGoogle(): Promise<AuthResult> {
    if (!supabase) {
      // Mock: simulate a Google account sign-in.
      return mockAuth.signIn("google.user@momease.app", "password123");
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: OAUTH_REDIRECT,
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });
    if (error) return { success: false, error: error.message };

    if (Platform.OS !== "web" && data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT);
      if (result.type !== "success") {
        return { success: false, error: "Google sign-in was cancelled" };
      }
      const { data: sessionData } = await supabase.auth.getUser();
      if (sessionData.user) return { success: true, user: mapSupabaseUser(sessionData.user) };
    }
    // Web: the page redirects; resolution happens on reload.
    return { success: true };
  },

  async signOut(): Promise<void> {
    if (!supabase) return mockAuth.signOut();
    await supabase.auth.signOut();
  },

  async getCurrentUser(): Promise<User | null> {
    if (!supabase) return mockAuth.getCurrentUser();
    const { data } = await supabase.auth.getUser();
    return data.user ? mapSupabaseUser(data.user) : null;
  },

  async updateProfile(updates: Partial<User>): Promise<void> {
    if (!supabase) return;
    await supabase.auth.updateUser({ data: updates });
  },
};
