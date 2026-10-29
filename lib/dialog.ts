import { Alert, Platform } from "react-native";
import type { AlertButton } from "./dialog-core";
import { useDialogStore } from "./dialog-store";

/** Drop-in for Alert.alert: the native alert on devices, an in-app dialog (<DialogHost/>) on the web. */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS === "web") {
    useDialogStore.getState().open(title, message, buttons);
    return;
  }
  Alert.alert(title, message, buttons);
}
