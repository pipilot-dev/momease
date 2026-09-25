// Auth service — talks to the momease-data-api Worker.
// Google OAuth (Web client) opens the Worker's /auth/google/start URL in an
// in-app browser; Google redirects to the Worker's callback, which in turn
// redirects to momease://auth-callback with the session token in the query.

import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { User } from "./types";
import type { AuthResult } from "./mock-auth";
import { authService as mockAuth } from "./mock-auth";
import { API_BASE, api, getToken, loadToken, setToken } from "./api";

WebBrowser.maybeCompleteAuthSession();

export type { AuthResult };

interface ApiUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role?: "free" | "premium";
  childrenAges?: string[];
  workSchedule?: User["workSchedule"];
  interests?: string[];
  personalization?: User["personalization"];
  onboardingCompleted?: boolean;
  createdAt?: string;
}
interface AuthPayload { user: ApiUser; token: string }

function toUser(u: ApiUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? (u.email ? u.email.split("@")[0] : "Mama"),
    avatarUrl: u.avatarUrl,
    role: u.role ?? "free",
    childrenAges: u.childrenAges ?? [],
    workSchedule: u.workSchedule,
    interests: u.interests ?? [],
    personalization: u.personalization,
    createdAt: u.createdAt ?? new Date().toISOString(),
    onboardingCompleted: u.onboardingCompleted ?? false,
  };
}

export const authService = {
  // Legacy flag name — every caller only reads this to know a real backend
  // is available. The Cloudflare Worker is always configured, so: true.
  get usesSupabase() { return true },

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const data = await api.postNoAuth<AuthPayload>("/auth/signin", { email, password });
      await setToken(data.token);
      return { success: true, user: toUser(data.user) };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Sign in failed" };
    }
  },

  async signUp(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      const data = await api.postNoAuth<AuthPayload>("/auth/signup", { email, password, name });
      await setToken(data.token);
      return { success: true, user: toUser(data.user) };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Sign up failed" };
    }
  },

  async signInWithGoogle(): Promise<AuthResult> {
    try {
      const redirectTo =
        Platform.OS === "web" && typeof window !== "undefined"
          ? window.location.origin + "/auth-callback"
          : "momease://auth-callback";
      const startUrl = `${API_BASE}/auth/google/start?redirect=${encodeURIComponent(redirectTo)}`;

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.location.href = startUrl;
        return { success: true };
      }

      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectTo);
      if (result.type !== "success") return { success: false, error: "Google sign-in was cancelled" };
      const final = new URL(result.url);
      const token = final.searchParams.get("token");
      if (!token) return { success: false, error: "Google sign-in did not return a session." };
      await setToken(token);
      const me = await api.get<{ user: ApiUser }>("/session");
      return { success: true, user: toUser(me.user) };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Google sign-in failed" };
    }
  },

  async signOut(): Promise<void> {
    try { if (getToken()) await api.post("/auth/signout") } catch {}
    await setToken(null);
  },

  async getCurrentUser(): Promise<User | null> {
    await loadToken();
    if (!getToken()) return null;
    try {
      const me = await api.get<{ user: ApiUser }>("/session");
      return toUser(me.user);
    } catch {
      return null;
    }
  },

  async updateProfile(updates: Partial<User>): Promise<void> {
    if (!getToken()) return;
    try { await api.post("/auth/update", updates) }
    catch (e) { console.warn("[auth] updateProfile failed:", e) }
  },

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await api.postNoAuth("/auth/reset/request", { email });
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Could not send reset email." };
    }
  },
};

// Keep mock-auth linked so its module still resolves during rollout.
void mockAuth;
