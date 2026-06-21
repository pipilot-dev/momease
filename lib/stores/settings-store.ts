import { create } from "zustand";
import { attachPersistence } from "../persist";
import {
  scheduleDailyCheckin,
  cancelDailyCheckin,
  requestNotificationPermissions,
} from "../notifications";
import { makePinRecord, verifyPinRecord, type PinRecord } from "../pin";
import { getBiometricFlag, setBiometricFlag } from "../biometrics";

interface SettingsState {
  notificationsEnabled: boolean;
  reminderHour: number; // 0-23, local time of the daily check-in nudge
  reminderMinute: number;
  hydrated: boolean;

  // App-lock PIN. `pin` (a salted hash) is persisted + cloud-synced so the lock
  // follows the account across devices. `locked` is ephemeral UI state — never
  // persisted — that gates the app behind the unlock screen.
  pin: PinRecord | null;
  locked: boolean;
  // Device-local (never synced): whether biometric unlock is turned on here.
  biometricEnabled: boolean;

  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  setReminderTime: (hour: number, minute: number) => Promise<void>;
  syncReminder: () => Promise<void>;

  pinEnabled: () => boolean;
  setPin: (pin: string) => Promise<void>;
  disablePin: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
  setBiometricEnabled: (on: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  notificationsEnabled: true,
  reminderHour: 9,
  reminderMinute: 0,
  hydrated: false,
  pin: null,
  locked: false,
  biometricEnabled: false,

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

  pinEnabled: () => get().pin !== null,

  setPin: async (pin) => {
    const record = await makePinRecord(pin);
    set({ pin: record });
  },

  disablePin: () => set({ pin: null, locked: false }),

  verifyPin: async (pin) => verifyPinRecord(get().pin, pin),

  lock: () => {
    if (get().pin) set({ locked: true });
  },
  unlock: () => set({ locked: false }),

  setBiometricEnabled: async (on) => {
    await setBiometricFlag(on);
    set({ biometricEnabled: on });
  },
}));

attachPersistence(
  useSettingsStore,
  "momease-settings",
  (s) => ({
    notificationsEnabled: s.notificationsEnabled,
    reminderHour: s.reminderHour,
    reminderMinute: s.reminderMinute,
    pin: s.pin,
  }),
  {
    onHydrated: (state) => {
      // Lock at launch if a PIN was already stored on this device.
      useSettingsStore.setState({ hydrated: true, locked: !!state.pin });
      // Restore the device-local biometric preference.
      getBiometricFlag().then((on) => useSettingsStore.setState({ biometricEnabled: on })).catch(() => {});
      // Re-arm the OS reminder to match the restored preference.
      useSettingsStore.getState().syncReminder().catch(() => {});
    },
  }
);
