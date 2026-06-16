import { create } from "zustand";
import type { User } from "../types";
import { authService } from "../auth-service";
import { attachPersistence } from "../persist";
import { onSignedIn, onSignedOut } from "../cloud-sync";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrated: boolean;

  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hydrated: false,

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        const result = await authService.signIn(email, password);
        if (result.success && result.user) {
          set({ user: result.user, isAuthenticated: true, isLoading: false });
          onSignedIn(result.user.id).catch(() => {});
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
          onSignedIn(result.user.id).catch(() => {});
          return true;
        }
        set({ error: result.error || "Sign up failed", isLoading: false });
        return false;
      },

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });
        const result = await authService.signInWithGoogle();
        if (result.success) {
          // On web the page redirects; user may resolve on reload.
          if (result.user) {
            set({ user: result.user, isAuthenticated: true });
            onSignedIn(result.user.id).catch(() => {});
          }
          set({ isLoading: false });
          return true;
        }
        set({ error: result.error || "Google sign-in failed", isLoading: false });
        return false;
      },

      signOut: async () => {
        set({ isLoading: true });
        await authService.signOut();
        onSignedOut();
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      clearError: () => set({ error: null }),
      setUser: (user) => {
        set({ user, isAuthenticated: true });
        onSignedIn(user.id).catch(() => {});
      },
      updateUser: (updates) => {
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null }));
        authService.updateProfile(updates).catch(() => {});
      },
      completeOnboarding: () => {
        set((state) => ({
          user: state.user ? { ...state.user, onboardingCompleted: true } : null,
        }));
        authService.updateProfile({ onboardingCompleted: true }).catch(() => {});
      },
}));

attachPersistence(
  useAuthStore,
  "momease-auth",
  (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
  { onHydrated: () => useAuthStore.setState({ hydrated: true }) }
);
