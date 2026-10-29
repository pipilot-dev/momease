import { Modal, Pressable, Text, View } from "react-native";
import { useDialogStore } from "../lib/dialog-store";
import { useTheme } from "../lib/theme-context";

/** Renders dialogs opened with showAlert on the web build (mounted once in the root layout). */
export function DialogHost() {
  const { current, choose, dismiss } = useDialogStore();
  const { theme } = useTheme();
  if (!current) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismiss} statusBarTranslucent>
      <Pressable
        onPress={dismiss}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        <Pressable
          accessibilityRole="alert"
          onPress={() => {}}
          style={{ width: "100%", maxWidth: 360, borderRadius: 20, padding: 22, backgroundColor: theme.surface ?? "#FFFFFF" }}
        >
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: theme.text.primary }}>{current.title}</Text>
          {current.message ? (
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, lineHeight: 21, color: theme.text.secondary, marginTop: 8 }}>
              {current.message}
            </Text>
          ) : null}
          <View style={{ marginTop: 20, gap: 10 }}>
            {current.buttons.map((b, i) => {
              const destructive = b.style === "destructive";
              const cancel = b.style === "cancel";
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={b.text ?? "OK"}
                  onPress={() => choose(b)}
                  style={{
                    paddingVertical: 13,
                    borderRadius: 14,
                    alignItems: "center",
                    backgroundColor: destructive ? "#EF4444" : cancel ? (theme.surfaceAlt ?? "#F3F4F6") : "#EC4899",
                  }}
                >
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: cancel ? theme.text.primary : "#FFFFFF" }}>
                    {b.text ?? "OK"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
