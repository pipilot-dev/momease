// Real local notifications via expo-notifications.
//
// Drives the daily check-in reminder and per-task reminders. On web,
// expo-notifications has no scheduling backend, so every call degrades to a
// safe no-op and the UI keeps working.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const isWeb = Platform.OS === "web";

// Foreground presentation: show an alert + play a sound when a notification
// fires while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** A stable identifier so we never stack duplicate daily reminders. */
const DAILY_CHECKIN_ID = "momease-daily-checkin";

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isWeb) return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Schedule (or reschedule) the repeating daily check-in nudge. Cancels any
 * prior instance first so changing the time never leaves a stale reminder.
 */
export async function scheduleDailyCheckin(hour = 9, minute = 0): Promise<boolean> {
  if (isWeb) return false;
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  await cancelDailyCheckin();
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_CHECKIN_ID,
    content: {
      title: "Your daily moment 🌿",
      body: "Take a mindful minute and check in with yourself today.",
      data: { type: "checkin" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return true;
}

export async function cancelDailyCheckin(): Promise<void> {
  if (isWeb) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_CHECKIN_ID).catch(() => {});
}

/** One-off reminder for a specific task at an absolute time. Returns its id. */
export async function scheduleTaskReminder(
  taskTitle: string,
  when: Date
): Promise<string | null> {
  if (isWeb) return null;
  const granted = await requestNotificationPermissions();
  if (!granted || when.getTime() <= Date.now()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Task reminder",
      body: taskTitle,
      data: { type: "task" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
}

export async function cancelNotification(id: string): Promise<void> {
  if (isWeb || !id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

export async function cancelAllNotifications(): Promise<void> {
  if (isWeb) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
