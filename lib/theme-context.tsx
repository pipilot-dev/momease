// Theme system: light + dark palettes that preserve the MomEase brand
// (warm coral, fresh mint, rich violet) with a calm, soft aesthetic.
//
// Usage:  const { theme, mode, isDark, setMode, toggle } = useTheme();
// `theme` mirrors the static shape in theme.ts so screens can be migrated
// incrementally.
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors as baseColors, gradients as baseGradients } from "./theme";

export type ThemeMode = "light" | "dark";

type ColorScale = { DEFAULT: string; [k: string]: string };
type Gradients = Record<string, readonly string[]>;

export interface Palette {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: { primary: string; secondary: string; muted: string; inverse: string };
  success: string;
  error: string;
  warning: string;
  gradients: Gradients;
  /** Header gradients tuned per mode. */
  heroGradient: [string, string, string];
  isDark: boolean;
}

const light: Palette = {
  primary: baseColors.primary,
  secondary: baseColors.secondary,
  accent: baseColors.accent,
  bg: "#FDFBF7",
  bgElevated: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F8F4EF",
  border: "#F0E9E0",
  text: { primary: "#1C1917", secondary: "#57534E", muted: "#A8A29E", inverse: "#FFFFFF" },
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  gradients: baseGradients,
  heroGradient: ["#FFF7ED", "#FEF3C7", "#FDFBF7"],
  isDark: false,
};

const dark: Palette = {
  // Slightly brightened brand hues read better on dark surfaces.
  primary: { ...baseColors.primary, DEFAULT: "#FDBA74", 400: "#FDBA74", 500: "#FB923C" },
  secondary: { ...baseColors.secondary, DEFAULT: "#6EE7B7", 400: "#6EE7B7", 500: "#34D399" },
  accent: { ...baseColors.accent, DEFAULT: "#C4B5FD", 400: "#C4B5FD", 500: "#A78BFA" },
  bg: "#1A1614",
  bgElevated: "#241F1C",
  surface: "#241F1C",
  surfaceAlt: "#2E2825",
  border: "#3A332F",
  text: { primary: "#F5F0EB", secondary: "#C4BCB4", muted: "#8A817A", inverse: "#1C1917" },
  success: "#34D399",
  error: "#F87171",
  warning: "#FBBF24",
  gradients: {
    ...baseGradients,
    warmMorning: ["#2E2520", "#2A211C", "#1A1614"],
    violetDream: ["#2A2438", "#241F30", "#1A1614"],
    roseGlow: ["#33232A", "#2A1F25", "#1A1614"],
    mintGlow: ["#1F2E28", "#1B2722", "#1A1614"],
  },
  heroGradient: ["#2E2520", "#2A211C", "#1A1614"],
  isDark: true,
};

const PALETTES: Record<ThemeMode, Palette> = { light, dark };
const STORAGE_KEY = "momease-theme-mode";

interface ThemeContextValue {
  theme: Palette;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: light,
  mode: "light",
  isDark: false,
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark") setModeState(v);
    });
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: PALETTES[mode], mode, isDark: mode === "dark", setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
