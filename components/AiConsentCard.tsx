import { View, Text, TouchableOpacity, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { ShieldCheck } from "lucide-react-native";
import { useTheme } from "../lib/theme-context";
import { useSettingsStore } from "../lib/stores/settings-store";
import { AI_CONSENT_TITLE, aiConsentParagraphs } from "../lib/ai-consent-core";
import { isVoiceSupported } from "../lib/kokoro-tts";
import { openLink } from "../lib/links";
import { pageUrl } from "../lib/links-core";

/** Shown in place of the chat box until she says yes (or when she has said no). Nothing is sent before "Allow". */
export function AiConsentCard() {
  const { theme } = useTheme();
  const aiConsent = useSettingsStore((s) => s.aiConsent);
  const setAiConsent = useSettingsStore((s) => s.setAiConsent);
  const declined = aiConsent === "declined";

  return (
    <View
      testID="ai-consent"
      style={{
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: Platform.OS === "ios" ? 30 : 14,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <ShieldCheck size={18} color={theme.accent[500]} />
        <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: theme.text.primary }}>
          {declined ? "AI replies are off" : AI_CONSENT_TITLE}
        </Text>
      </View>
      {aiConsentParagraphs(isVoiceSupported).map((t) => (
        <Text key={t} style={{ fontFamily: "Quicksand-Medium", fontSize: 13, lineHeight: 19, color: theme.text.secondary, marginBottom: 6 }}>
          {t}
        </Text>
      ))}
      <Text
        accessibilityRole="link"
        onPress={() => openLink(pageUrl("privacy"))}
        style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: theme.accent[500], marginBottom: 12 }}
      >
        Read our privacy policy
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {!declined && (
          <TouchableOpacity
            testID="ai-consent-decline"
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setAiConsent("declined");
            }}
            style={{ flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: theme.border }}
          >
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: theme.text.secondary }}>Not now</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID="ai-consent-allow"
          accessibilityRole="button"
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setAiConsent("granted");
          }}
          style={{ flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: "center", backgroundColor: theme.accent[500] }}
        >
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: "#FFFFFF" }}>{declined ? "Turn on AI replies" : "Allow"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
