import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FDFCFB" },
        animation: "slide_from_right",
      }}
    />
  );
}
