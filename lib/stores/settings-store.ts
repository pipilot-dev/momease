import { create } from "zustand";
import { attachPersistence } from "../persist";
import {
  scheduleDailyCheckin,
  cancelDailyCheckin,
  requestNotificationPermissions,
} from "../notifications";

interface SettingsState {
  notificationsEnabled: boolean;
  reminderHour: number; // 0-23, local time of the daily check-in nudge
  reminderMinute: number;
  hydrated: boolean;

  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  setReminderTime: (hour: number, minute: number) => Promise<void>;
  /** Re-apply the current preference to the OS scheduler (called on boot). */
  syncReminder: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  notificationsEnabled: true,
  reminderHour: 9,
  reminderMinute: 0,
  hydrated: false,

  setNotificationsEnabled: async (enabled) => {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        // Permission denied — keep the toggle off and report failure.
        set({ notificationsEnabled: false });
        return false;
      }
      await scheduleDailyCheckin(get().reminderHour, get().reminderMinute);
    } else {
      await cancelDailyCheckin();
    }
    set({ notificationsEnabled: enabled });
    return enabled;
  },

  setReminderTime: async (hour, minute) => {
    set({ reminderHour: hour, reminderMinute: minute });
    if (get().notificationsEnabled) {
      await scheduleDailyCheckin(hour, minute);
    }
  },

  syncReminder: async () => {
    const { notificationsEnabled, reminderHour, reminderMinute } = get();
    if (notificationsEnabled) {
      await scheduleDailyCheckin(reminderHour, reminderMinute);
    }
  },
}));

attachPersistence(
  useSettingsStore,
  "momease-settings",
  (s) => ({
    notificationsEnabled: s.notificationsEnabled,
    reminderHour: s.reminderHour,
    reminderMinute: s.reminderMinute,
  }),
  {
    onHydrated: () => {
      useSettingsStore.setState({ hydrated: true });
      // Re-arm the OS reminder to match the restored preference.
      useSettingsStore.getState().syncReminder().catch(() => {});
    },
  }
);
