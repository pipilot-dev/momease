import { create } from "zustand";
import type { User } from "../types";
import { authService } from "../mock-auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const result = await authService.signIn(email, password);
    if (result.success && result.user) {
      set({ user: result.user, isAuthenticated: true, isLoading: false });
      return true;
    }
    set({ error: result.error || "Sign in failed", isLoading: false });
    return false;
  },

  signUp: async (email, password, name) => {
    set({ isLoading: true, error: null });
    const result = await authService.signUp(email, password, name);
    if (result.success && result.user) {
      set({ user: result.user, isAuthenticated: true, isLoading: false });
      return true;
    }
    set({ error: result.error || "Sign up failed", isLoading: false });
    return false;
  },

  signOut: async () => {
    set({ isLoading: true });
    await authService.signOut();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  clearError: () => set({ error: null }),
  setUser: (user) => set({ user }),
  completeOnboarding: () =>
    set((state) => ({
      user: state.user ? { ...state.user, onboardingCompleted: true } : null,
    })),
}));
