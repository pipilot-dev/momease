// Web Push — Phase 1 (no server required).
//
// Provides:
//   - permission-status checks + request flow that survives every browser edge
//   - showNotification() routed through the Service Worker so notifications
//     pop up as real OS toasts on desktop and on installed iOS/Android PWAs
//   - client-side daily-reminder trigger: on app open we fire the reminder
//     if we're past the user's preferred reminder time and haven't already
//     surfaced one today.
//
// Phase 2 (needs backend): subscribe via PushManager with VAPID, POST the
// subscription to a Cloudflare Worker, cron-trigger real push payloads. All
// wiring is here (see subscribeForPush + service-worker 'push' handler) so
// switching later is a config change, not a rewrite.

import { Platform } from "react-native";

export const isPushSupported =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  typeof Notification !== "undefined" &&
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator;

export const isRunningStandalonePWA =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  ((window.matchMedia?.("(display-mode: standalone)").matches ?? false) ||
    (window.navigator as any).standalone === true);

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function getPermission(): PushPermission {
  if (!isPushSupported) return "unsupported";
  return Notification.permission as PushPermission;
}

export async function requestPermission(): Promise<PushPermission> {
  if (!isPushSupported) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await new Promise<NotificationPermission>((resolve) => {
    const p = Notification.requestPermission((r) => resolve(r));
    if (p && typeof (p as any).then === "function") {
      (p as Promise<NotificationPermission>).then(resolve);
    }
  });
  return result as PushPermission;
}

export async function showNotification(
  title: string,
  options: NotificationOptions & { url?: string } = {}
): Promise<boolean> {
  if (!isPushSupported) return false;
  if (Notification.permission !== "granted") return false;

  const { url, ...rest } = options;
  const opts: NotificationOptions = {
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    ...rest,
    data: { url: url ?? "/", ...(rest.data as Record<string, unknown> | undefined) },
  };

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.showNotification(title, opts);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}

export async function subscribeForPush(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!isPushSupported || !vapidPublicKey) return null;
  if (Notification.permission !== "granted") return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    });
  } catch {
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;
    return await sub.unsubscribe();
  } catch {
    return false;
  }
}

const LAST_FIRED_KEY = "momease-reminder-lastFired";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export async function maybeFireDailyReminder(
  preferredHour: number,
  preferredMinute: number,
  body = "Your daily moment of calm is waiting. Take a minute for you."
): Promise<boolean> {
  if (!isPushSupported) return false;
  if (Notification.permission !== "granted") return false;

  const now = new Date();
  const target = new Date();
  target.setHours(preferredHour, preferredMinute, 0, 0);
  if (now < target) return false;

  const last = typeof localStorage !== "undefined" ? localStorage.getItem(LAST_FIRED_KEY) : null;
  if (last === today()) return false;

  const ok = await showNotification("Time for a MomEase moment 💛", {
    body,
    tag: "momease-daily",
    url: "/checkin",
  });
  if (ok && typeof localStorage !== "undefined") {
    localStorage.setItem(LAST_FIRED_KEY, today());
  }
  return ok;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
