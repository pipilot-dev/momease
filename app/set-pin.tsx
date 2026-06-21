import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ChevronLeft } from "lucide-react-native";
import { useSettingsStore } from "../lib/stores/settings-store";
import { useTheme } from "../lib/theme-context";
import { PinPad } from "../components/PinPad";

type Mode = "set" | "change" | "disable";

export default function SetPinScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { mode = "set" } = useLocalSearchParams<{ mode?: Mode }>();
  const { setPin, disablePin, verifyPin } = useSettingsStore();

  // Steps differ per mode:
  //  set     -> "new" -> "confirm"
  //  change  -> "current" -> "new" -> "confirm"
  //  disable -> "current"
  const firstStep = mode === "set" ? "new" : "current";
  const [step, setStep] = useState<"current" | "new" | "confirm">(firstStep);
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);

  const reset = () => setResetToken((t) => t + 1);

  const finish = async (pin: string) => {
    await setPin(pin);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handle = async (entered: string) => {
    setError(null);
    if (step === "current") {
      const ok = await verifyPin(entered);
      if (!ok) {
        setError("Incorrect PIN");
        reset();
        return;
      }
      if (mode === "disable") {
        disablePin();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
        return;
      }
      setStep("new");
      reset();
      return;
    }
    if (step === "new") {
      setFirstPin(entered);
      setStep("confirm");
      reset();
      return;
    }
    // confirm
    if (entered !== firstPin) {
      setError("PINs don't match");
      setFirstPin("");
      setStep("new");
      reset();
      return;
    }
    finish(entered);
  };

  const titles: Record<string, { title: string; subtitle: string }> = {
    current: { title: "Enter current PIN", subtitle: mode === "disable" ? "Confirm to turn off App Lock" : "Verify it's you" },
    new: { title: mode === "change" ? "Enter new PIN" : "Create a PIN", subtitle: "Choose a 4-digit code to lock the app" },
    confirm: { title: "Confirm your PIN", subtitle: "Enter it once more" },
  };
  const t = titles[step];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient
        colors={isDark ? [theme.gradients.roseGlow[0], theme.gradients.roseGlow[1], theme.bg] : ["#FDE5EC", "#FDF2F8", theme.bg]}
        style={{ paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? theme.surface : "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={{ flex: 1, justifyContent: "center", paddingBottom: 40 }}>
        <PinPad title={t.title} subtitle={t.subtitle} error={error} resetToken={resetToken} onComplete={handle} />
      </View>
    </View>
  );
}
