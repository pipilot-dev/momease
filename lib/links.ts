import { Linking, Platform } from "react-native";

/** Open a web page, mail composer or store page on every platform. Returns false if nothing could open it. */
export async function openLink(url: string): Promise<boolean> {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(url, url.startsWith("mailto:") ? "_self" : "_blank", "noopener,noreferrer");
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
