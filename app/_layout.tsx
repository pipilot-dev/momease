import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider, useTheme } from "../lib/theme-context";
import { LockGate } from "../components/LockGate";
// Side-effect imports: instantiating the persisted stores at launch hydrates
// saved state, re-arms the daily reminder, and registers every store for
// Supabase cloud sync so a login pulls the full account, not just whatever
// screens happen to be mounted.
import "../lib/stores/settings-store";
import "../lib/stores/task-store";
import "../lib/stores/chat-store";
import "../lib/stores/checkin-store";
import "../lib/stores/milestone-store";
import "../lib/stores/sleep-store";
import "../lib/stores/community-store";
import "../global.css";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { theme, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <LockGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="milestones" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="mood" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="journal" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="sleep" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="breathe" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="checkin" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="friends" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="messages" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="dm" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="set-pin" options={{ animation: "slide_from_bottom" }} />
      </Stack>
      </LockGate>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Quicksand: require("../assets/fonts/Quicksand-Regular.ttf"),
    "Quicksand-Medium": require("../assets/fonts/Quicksand-Medium.ttf"),
    "Quicksand-SemiBold": require("../assets/fonts/Quicksand-SemiBold.ttf"),
    "Quicksand-Bold": require("../assets/fonts/Quicksand-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
