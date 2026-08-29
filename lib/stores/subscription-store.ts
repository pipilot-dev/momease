// Subscription store — mirror of what the billing Worker's KV knows.
//
// Not the source of truth (Stripe is). We cache the last known status locally
// so the UI can render Premium instantly, and refresh from the Worker on
// mount + after a checkout return.

import { create } from "zustand";
import { attachPersistence } from "../persist";
import { fetchStatus, type SubStatus } from "../billing";

interface SubscriptionState {
  status: SubStatus;
  loading: boolean;
  lastRefreshed: number | null;

  refresh: (userId: string) => Promise<void>;
  reset: () => void;
}

const initialStatus: SubStatus = { premium: false, status: "none" };

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  status: initialStatus,
  loading: false,
  lastRefreshed: null,

  refresh: async (userId) => {
    if (!userId) return;
    set({ loading: true });
    try {
      const s = await fetchStatus(userId);
      set({ status: s, loading: false, lastRefreshed: Date.now() });
    } catch {
      set({ loading: false });
    }
  },

  reset: () => set({ status: initialStatus, lastRefreshed: null }),
}));

attachPersistence(useSubscriptionStore, "momease-subscription", (s) => ({
  status: s.status,
  lastRefreshed: s.lastRefreshed,
}));
