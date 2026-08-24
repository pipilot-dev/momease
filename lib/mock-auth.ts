// Mock authentication service.
// Used as a fallback when Supabase isn't configured or unreachable.
//
// Design intent: this must NOT impersonate a specific persona. Reviewers
// should experience the app as themselves — real name derived from their
// email, no seeded avatar, empty stores, and the personalized onboarding
// flow still ahead of them.

import type { User } from "./types";

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/** "hansade2005" → "Hansade" — a reasonable first-name guess from an email. */
function nameFromEmail(email: string): string {
  const local = (email.split("@")[0] || "").split(/[._-]/)[0];
  if (!local) return "Mama";
  const cleaned = local.replace(/[0-9]+/g, "");
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "Mama";
}

function buildUser(email: string, providedName?: string): User {
  const name = providedName?.trim() || nameFromEmail(email);
  return {
    id: `usr_${Date.now().toString(36)}`,
    email,
    name,
    role: "free",
    createdAt: new Date().toISOString(),
    onboardingCompleted: false,
  };
}

class MockAuthService {
  private currentUser: User | null = null;
  private isAuthenticated = false;

  async signIn(email: string, password: string): Promise<AuthResult> {
    await this.delay(600);
    if (!email || password.length < 6) {
      return { success: false, error: "Invalid email or password" };
    }
    this.currentUser = buildUser(email);
    this.isAuthenticated = true;
    return { success: true, user: this.currentUser };
  }

  async signUp(email: string, password: string, name: string): Promise<AuthResult> {
    await this.delay(800);
    if (!email || password.length < 6 || !name) {
      return { success: false, error: "Please fill all fields correctly" };
    }
    this.currentUser = buildUser(email, name);
    this.isAuthenticated = true;
    return { success: true, user: this.currentUser };
  }

  async signOut(): Promise<void> {
    await this.delay(200);
    this.currentUser = null;
    this.isAuthenticated = false;
  }

  async getCurrentUser(): Promise<User | null> {
    await this.delay(150);
    return this.currentUser;
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    await this.delay(500);
    return email ? { success: true } : { success: false, error: "Please enter a valid email" };
  }

  getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const authService = new MockAuthService();
