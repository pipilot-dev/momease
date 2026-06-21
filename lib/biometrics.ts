// Biometric unlock (Face ID / Touch ID / Android fingerprint or face) layered
// on top of the PIN. expo-local-authentication uses whatever secure biometric
// the device offers; the PIN is always the fallback/recovery.
//
// The "enabled" flag is DEVICE-LOCAL (not cloud-synced) — biometric enrollment
// belongs to a specific device, so turning it on for one phone must not turn it
// on for another.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

const FLAG_KEY = "momease-biometric";

/** True only if the device has biometric hardware AND the user has enrolled. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** Human label for the device's primary biometric (Face ID, Touch ID, ...). */
export async function biometricLabel(): Promise<string> {
  if (Platform.OS === "web") return "Biometrics";
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === "ios" ? "Face ID" : "Face Unlock";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    }
    return "Biometrics";
  } catch {
    return "Biometrics";
  }
}

/** Trigger the OS biometric prompt. Returns true on success. */
export async function authenticateBiometric(promptMessage: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: "Use PIN",
      // We provide our own PIN fallback, so don't offer the device passcode.
      disableDeviceFallback: true,
    });
    return res.success;
  } catch {
    return false;
  }
}

export async function getBiometricFlag(): Promise<boolean> {
  return (await AsyncStorage.getItem(FLAG_KEY)) === "1";
}

export async function setBiometricFlag(on: boolean): Promise<void> {
  if (on) await AsyncStorage.setItem(FLAG_KEY, "1");
  else await AsyncStorage.removeItem(FLAG_KEY);
}
