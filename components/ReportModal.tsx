import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { X, Flag } from "lucide-react-native";
import { useTheme } from "../lib/theme-context";

const REASONS = [
  "Harassment or bullying",
  "Spam or scam",
  "Inappropriate or explicit content",
  "Hate speech",
  "Self-harm or dangerous content",
  "Other",
];

interface ReportModalProps {
  visible: boolean;
  targetLabel: string; // e.g. "@jess" or "this post"
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
}

export function ReportModal({ visible, targetLabel, onClose, onSubmit }: ReportModalProps) {
  const { theme, isDark } = useTheme();
  const [reason, setReason] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) { setReason(null); setSent(false); setBusy(false); }
  }, [visible]);

  const submit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onSubmit(reason);
    setSent(true);
    setBusy(false);
    setTimeout(onClose, 1400);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          {sent ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.success + "22", alignItems: "center", justifyContent: "center" }}>
                <Flag size={26} color={theme.success} />
              </View>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: theme.text.primary, marginTop: 14 }}>Report received</Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.secondary, marginTop: 6, textAlign: "center" }}>
                Thanks for keeping the community safe. Our team will review it.
              </Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: theme.text.primary }}>Report {targetLabel}</Text>
                <TouchableOpacity onPress={onClose}><X size={24} color={theme.text.muted} /></TouchableOpacity>
              </View>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.secondary, marginBottom: 16 }}>
                Why are you reporting this?
              </Text>
              {REASONS.map((r) => {
                const active = reason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => { Haptics.selectionAsync(); setReason(r); }}
                    style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, backgroundColor: active ? "#F472B6" + "18" : (isDark ? theme.surfaceAlt : "#F9FAFB"), borderWidth: 1.5, borderColor: active ? "#F472B6" : theme.border }}
                  >
                    <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: active ? "#F472B6" : theme.text.primary }}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={submit} disabled={!reason || busy} activeOpacity={0.85} style={{ marginTop: 12 }}>
                <LinearGradient colors={["#F9A8D4", "#F472B6"]} style={{ borderRadius: 16, paddingVertical: 16, alignItems: "center", opacity: reason && !busy ? 1 : 0.5 }}>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#fff" }}>Submit report</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
