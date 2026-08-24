// In-app notifications inbox.
//
// Not to be confused with lib/notifications.ts (OS-level scheduled reminders
// via expo-notifications). This is the in-app "bell" inbox: things the app
// itself surfaces to the user (streaks, wellness tips, milestone celebrations).
// Persisted to local storage via attachPersistence so read/unread state and
// the list survive reloads.

import { create } from "zustand";
import { attachPersistence } from "../persist";

export type NotificationType =
  | "reminder"
  | "motivation"
  | "community"
  | "task"
  | "milestone"
  | "wellness";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  route?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  hydrated: boolean;

  add: (notif: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

const now = () => new Date().toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const seedNotifications: AppNotification[] = [
  {
    id: "seed_welcome",
    title: "Welcome to MomEase",
    body: "You're in a calm space now. Explore your personalized dashboard whenever you need a moment.",
    type: "motivation",
    read: false,
    createdAt: minutesAgo(2),
    route: "/(tabs)/home",
  },
  {
    id: "seed_breathe",
    title: "Try a 2-minute reset",
    body: "Guided breathing can lower stress in under a minute. Give it a try.",
    type: "wellness",
    read: false,
    createdAt: minutesAgo(45),
    route: "/breathe",
  },
  {
    id: "seed_journal",
    title: "How was your day?",
    body: "A quick journal entry helps you notice patterns. Even one line counts.",
    type: "reminder",
    read: true,
    createdAt: hoursAgo(6),
    route: "/journal",
  },
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: seedNotifications,
  hydrated: false,

  add: (data) => {
    const n: AppNotification = {
      ...data,
      id: `n_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      createdAt: now(),
      read: false,
    };
    set((s) => ({ notifications: [n, ...s.notifications] }));
  },

  markAsRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.read ? n : { ...n, read: true })),
    })),

  remove: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  clearAll: () => set({ notifications: [] }),

  getUnreadCount: () => get().notifications.filter((n) => !n.read).length,
}));

attachPersistence(
  useNotificationStore,
  "momease-notifications",
  (s) => ({ notifications: s.notifications }),
  { onHydrated: () => useNotificationStore.setState({ hydrated: true }) }
);
