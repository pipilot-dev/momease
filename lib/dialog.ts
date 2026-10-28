import { Alert, Platform } from "react-native";
import { webAlert, type AlertButton } from "./dialog-core";

/** Drop-in for Alert.alert that also works in the browser build. */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    webAlert(window, title, message, buttons);
    return;
  }
  Alert.alert(title, message, buttons);
}
