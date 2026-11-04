import { Platform } from "react-native";
import { brandFor } from "./brand-core";

/** Name shown to the user inside the app. */
export const BRAND = brandFor(Platform.OS);
