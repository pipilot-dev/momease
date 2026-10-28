// Browser version of Alert.alert. react-native-web ships Alert.alert as an empty function, so on
// app.mease.mom every confirmation (sign out, delete account, journal) silently did nothing.

export interface AlertButton {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
}

export interface BrowserDialogs {
  alert: (message: string) => void;
  confirm: (message: string) => boolean;
}

export function webAlert(win: BrowserDialogs, title: string, message?: string, buttons?: AlertButton[]): void {
  const text = message ? `${title}\n\n${message}` : title;
  const list = buttons ?? [];
  const cancel = list.find((b) => b.style === "cancel");
  const actions = list.filter((b) => b !== cancel);

  if (actions.length === 0 && !cancel) {
    win.alert(text);
    return;
  }
  if (actions.length === 0) {
    win.alert(text);
    void cancel?.onPress?.();
    return;
  }
  if (!cancel && actions.length === 1) {
    win.alert(text);
    void actions[0].onPress?.();
    return;
  }
  // confirm() has exactly two outcomes: run the (last) action, or the cancel button.
  if (win.confirm(text)) void actions[actions.length - 1].onPress?.();
  else void cancel?.onPress?.();
}
