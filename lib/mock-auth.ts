// Mock Authentication Service
// Replace with Supabase/Firebase by swapping this single file

import type { User } from "./types";

const MOCK_USER: User = {
  id: "usr_001",
  email: "sarah@momease.app",
  name: "Sarah Mitchell",
  avatarUrl: "https://api.a0.dev/assets/image?text=warm%20portrait%20of%20a%20smiling%20professional%20mother%20soft%20lighting&aspect=1:1",
  role: "premium",
  childrenAges: ["3", "7"],
  workSchedule: "full-time",
  interests: ["yoga", "meal-prep", "mindfulness"],
  createdAt: "2026-01-15T00:00:00Z",
  onboardingCompleted: true,
};

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

class MockAuthService {
  private currentUser: User | null = null;
  private isAuthenticated = false;

  async signIn(email: string, password: string): Promise<AuthResult> {
    await this.delay(800);
    if (email && password.length >= 6) {
      this.currentUser = { ...MOCK_USER, email };
      this.isAuthenticated = true;
      return { success: true, user: this.currentUser };
    }
    return { success: false, error: "Invalid email or password" };
  }

  async signUp(email: string, password: string, name: string): Promise<AuthResult> {
    await this.delay(1000);
    if (email && password.length >= 6 && name) {
      this.currentUser = {
        ...MOCK_USER,
        email,
        name,
        onboardingCompleted: false,
        role: "free",
      };
      this.isAuthenticated = true;
      return { success: true, user: this.currentUser };
    }
    return { success: false, error: "Please fill all fields correctly" };
  }

  async signOut(): Promise<void> {
    await this.delay(300);
    this.currentUser = null;
    this.isAuthenticated = false;
  }

  async getCurrentUser(): Promise<User | null> {
    await this.delay(200);
    return this.currentUser;
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    await this.delay(600);
    if (email) {
      return { success: true };
    }
    return { success: false, error: "Please enter a valid email" };
  }

  getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const authService = new MockAuthService();
