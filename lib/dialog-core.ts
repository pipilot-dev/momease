// Shared types and rules for in-app dialogs. react-native-web ships Alert.alert as an empty function and
// the browser's own confirm() can be blocked (in-app browsers, installed web apps, "prevent more dialogs"),
// which made Sign out and other confirmations do nothing, so the web build shows its own dialog.

export interface AlertButton {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
}

export interface DialogSpec {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

/** Always offer at least an OK button, and put the cancel button first (same order as the native alert). */
export function normalizeDialog(title: string, message?: string, buttons?: AlertButton[]): DialogSpec {
  const list = buttons && buttons.length ? buttons : [{ text: "OK" }];
  const cancel = list.filter((b) => b.style === "cancel");
  const rest = list.filter((b) => b.style !== "cancel");
  return { title, message, buttons: [...cancel, ...rest] };
}
