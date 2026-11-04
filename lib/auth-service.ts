// Auth service — talks to the momease-data-api Worker.
// Google OAuth (Web client) opens the Worker's /auth/google/start URL in an
// in-app browser; Google redirects to the Worker's callback, which in turn
// redirects to momease://auth-callback with the session token in the query.

import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { User } from "./types";
import type { AuthResult } from "./mock-auth";
import { authService as mockAuth } from "./mock-auth";
import { API_BASE, api, ApiError, friendlyError, getToken, isNetworkError, loadToken, setToken } from "./api";
import { parseCallbackUrl } from "./auth-callback";
import { isAppleCancel, nameFromCredential, offersAppleSignIn, toHex } from "./apple-auth-core";
import { parseLinkResult, type Identities } from "./link-core";

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

/** Outcome of connecting another sign-in method. code "" means she cancelled. */
export type ConnectResult = { ok: true; pending?: boolean } | { ok: false; code: string };

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
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const data = await api.postNoAuth<AuthPayload>("/auth/signin", { email, password });
      await setToken(data.token);
      return { success: true, user: toUser(data.user) };
    } catch (e) {
      return { success: false, error: friendlyError(e, "Sign in failed. Please try again.") };
    }
  },

  async signUp(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      const data = await api.postNoAuth<AuthPayload>("/auth/signup", { email, password, name });
      await setToken(data.token);
      return { success: true, user: toUser(data.user) };
    } catch (e) {
      return { success: false, error: friendlyError(e, "Sign up failed. Please try again.") };
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
      const { token } = parseCallbackUrl(result.url);
      if (!token) return { success: false, error: "Google sign-in did not return a session." };
      await setToken(token);
      const me = await api.get<{ user: ApiUser }>("/session");
      return { success: true, user: toUser(me.user) };
    } catch (e) {
      return { success: false, error: friendlyError(e, "Google sign-in failed. Please try again.") };
    }
  },

  /** iPhone only: Apple's native sheet -> identity token -> our server verifies it and returns a session. */
  async signInWithApple(): Promise<AuthResult> {
    try {
      if (!offersAppleSignIn(Platform.OS)) return { success: false, error: "Sign in with Apple is only available on iPhone." };
      const AppleAuthentication = await import("expo-apple-authentication");
      const Crypto = await import("expo-crypto");
      // A fresh random value per attempt; Apple signs its SHA-256 into the token so a stolen token can't be replayed.
      const rawNonce = toHex(await Crypto.getRandomBytesAsync(16));
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      });
      if (!cred.identityToken) return { success: false, error: "Apple didn't return a sign-in token. Please try again." };
      const data = await api.postNoAuth<AuthPayload>("/auth/apple", {
        identityToken: cred.identityToken,
        nonce: rawNonce,
        authorizationCode: cred.authorizationCode ?? undefined, // lets the server revoke this sign-in if she deletes her account
        fullName: nameFromCredential(cred.fullName),
      });
      await setToken(data.token);
      return { success: true, user: toUser(data.user) };
    } catch (e) {
      if (isAppleCancel(e)) return { success: false, error: "" }; // she closed the sheet: not an error to show
      return { success: false, error: friendlyError(e, "Apple sign-in failed. Please try again.") };
    }
  },

  /** Which sign-in methods are attached to the profile she is in. */
  async getIdentities(): Promise<Identities> {
    try {
      const me = await api.get<{ identities?: Identities }>("/session");
      return me.identities ?? { google: false, apple: false };
    } catch {
      return { google: false, apple: false };
    }
  },

  /** iPhone: attach an Apple account to the current profile (Apple's sheet, then our server checks the token). */
  async connectApple(replaceOther = false): Promise<ConnectResult> {
    try {
      if (!offersAppleSignIn(Platform.OS)) return { ok: false, code: "unsupported" };
      const AppleAuthentication = await import("expo-apple-authentication");
      const Crypto = await import("expo-crypto");
      const rawNonce = toHex(await Crypto.getRandomBytesAsync(16));
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      });
      if (!cred.identityToken) return { ok: false, code: "invalid_apple_token" };
      await api.post("/auth/link/apple", { identityToken: cred.identityToken, nonce: rawNonce, authorizationCode: cred.authorizationCode ?? undefined, replaceOther });
      return { ok: true };
    } catch (e) {
      if (isAppleCancel(e)) return { ok: false, code: "" };
      return { ok: false, code: e instanceof ApiError ? e.code : "network" };
    }
  },

  /** Attach a Google account to the current profile. On the web the page leaves and returns to /auth-callback. */
  async connectGoogle(replaceOther = false): Promise<ConnectResult> {
    try {
      const { linkToken } = await api.post<{ linkToken: string }>("/auth/link/google/init", { replaceOther });
      const web = Platform.OS === "web" && typeof window !== "undefined";
      const redirectTo = web ? window.location.origin + "/auth-callback" : "momease://auth-callback";
      const startUrl = `${API_BASE}/auth/google/start?redirect=${encodeURIComponent(redirectTo)}&link=${encodeURIComponent(linkToken)}`;
      if (web) {
        window.location.href = startUrl;
        return { ok: true, pending: true };
      }
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectTo);
      if (result.type !== "success") return { ok: false, code: "" };
      const r = parseLinkResult(result.url);
      if (r.linked) return { ok: true };
      return { ok: false, code: r.error ?? "unknown" };
    } catch (e) {
      return { ok: false, code: e instanceof ApiError ? e.code : "network" };
    }
  },

  async signOut(): Promise<void> {
    try { if (getToken()) await api.post("/auth/signout") } catch {}
    await setToken(null);
  },

  /**
   * Restore a session at app start. `offline` means the server couldn't be
   * reached, so the caller may keep trusting a previously persisted user
   * instead of logging them out on a plane.
   */
  async restoreSession(): Promise<{ user: User | null; offline: boolean }> {
    await loadToken();
    if (!getToken()) return { user: null, offline: false };
    try {
      const me = await api.get<{ user: ApiUser }>("/session");
      return { user: toUser(me.user), offline: false };
    } catch (e) {
      return { user: null, offline: isNetworkError(e) || (e instanceof ApiError && e.status >= 500) };
    }
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
      return { success: false, error: friendlyError(e, "Could not send reset email. Try again.") };
    }
  },
};

// Keep mock-auth linked so its module still resolves during rollout.
void mockAuth;
