import { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Send,
  Trash2,
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  StopCircle,
  Sparkles,
} from "lucide-react-native";
import { useChatStore } from "../../lib/stores/chat-store";
import { animation } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";
import { speak, stopSpeaking, isVoiceSupported, type SpeechHandle } from "../../lib/kokoro-tts";

const aiAvatar = require("../../assets/ai-assistant.png");

export default function ChatScreen() {
  const { messages, isTyping, sendMessage, clearChat, voiceMode, setVoiceMode } = useChatStore();
  const { theme, isDark } = useTheme();
  const colors = theme;
  const [input, setInput] = useState("");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const dotAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const speechRef = useRef<SpeechHandle | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: animation.duration.slow,
      delay: animation.stagger.medium,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!isTyping) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isTyping]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    if (!voiceMode || !isVoiceSupported) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (last.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = last.id;

    setSpeakingId(last.id);
    const handle = speak(last.content);
    speechRef.current = handle;
    handle.done.then(() => {
      setSpeakingId((cur) => (cur === last.id ? null : cur));
    });
  }, [messages, voiceMode]);

  useEffect(() => {
    if (!voiceMode) {
      speechRef.current?.stop();
      speechRef.current = null;
      setSpeakingId(null);
    }
    return () => {
      speechRef.current?.stop();
    };
  }, [voiceMode]);

  const handleSend = () => {
    const t = input.trim();
    if (!t) return;
    sendMessage(t);
    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const handleStopSpeech = () => {
    stopSpeaking();
    setSpeakingId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleToggleVoice = () => {
    if (!isVoiceSupported) return;
    setVoiceMode(!voiceMode);
    Haptics.selectionAsync().catch(() => {});
  };

  const quickPrompts = useMemo(
    () => [
      "I'm feeling overwhelmed today",
      "Give me a self-care tip",
      "Help me manage my time better",
      "I need encouragement",
    ],
    []
  );

  const headerPadTop = Platform.OS === "ios" ? 52 : 36;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Compact header — single row, ~56 content px + status bar inset. */}
      <View
        style={{
          paddingTop: headerPadTop,
          paddingBottom: 10,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Image source={aiAvatar} style={{ width: 32, height: 32, borderRadius: 16 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: colors.text.primary }}
            numberOfLines={1}
          >
            AI Companion
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: voiceMode && speakingId ? colors.accent[500] : colors.success,
              }}
            />
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 11,
                color: voiceMode && speakingId ? colors.accent[500] : colors.text.muted,
              }}
              numberOfLines={1}
            >
              {voiceMode && speakingId ? "Speaking…" : voiceMode ? "Voice mode on" : "Always here"}
            </Text>
          </View>
        </View>

        {isVoiceSupported && (
          <TouchableOpacity
            onPress={handleToggleVoice}
            hitSlop={8}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: voiceMode ? colors.accent[500] : "transparent",
            }}
          >
            {voiceMode ? (
              <Volume2 size={18} color="#FFFFFF" />
            ) : (
              <VolumeX size={18} color={colors.text.muted} />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            clearChat();
            handleStopSpeech();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={18} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <Animated.View style={{ opacity: fadeAnim, alignItems: "center", paddingTop: 40 }}>
              <View
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 34,
                  backgroundColor: isDark ? colors.surfaceAlt : colors.accent[50],
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <MessageCircle size={30} color={colors.accent[500]} />
              </View>
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 18,
                  color: colors.text.primary,
                  marginBottom: 6,
                }}
              >
                Start a conversation
              </Text>
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 14,
                  color: colors.text.secondary,
                  textAlign: "center",
                  paddingHorizontal: 24,
                  lineHeight: 20,
                }}
              >
                Your AI companion is here to listen and support you.
              </Text>
            </Animated.View>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const isSpeaking = speakingId === msg.id;
            return (
              <View
                key={msg.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                  marginBottom: 10,
                }}
              >
                {!isUser && (
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 }}
                  >
                    <Heart size={11} color={colors.accent[400]} fill={colors.accent[400]} />
                    <Text
                      style={{
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 10,
                        color: colors.text.muted,
                      }}
                    >
                      MomEase AI
                    </Text>
                    {isSpeaking && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                          marginLeft: 4,
                        }}
                      >
                        <Volume2 size={11} color={colors.accent[500]} />
                        <Text
                          style={{
                            fontFamily: "Quicksand-SemiBold",
                            fontSize: 10,
                            color: colors.accent[500],
                          }}
                        >
                          speaking
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                <View
                  style={{
                    backgroundColor: isUser ? colors.primary[500] : colors.surface,
                    borderRadius: 18,
                    borderBottomRightRadius: isUser ? 4 : 18,
                    borderBottomLeftRadius: isUser ? 18 : 4,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                    borderWidth: isSpeaking ? 1.5 : 0,
                    borderColor: isSpeaking ? colors.accent[300] : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Quicksand-Medium",
                      fontSize: 15,
                      color: isUser ? "#FFFFFF" : colors.text.primary,
                      lineHeight: 21,
                    }}
                  >
                    {msg.content}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 10,
                    color: colors.text.muted,
                    marginTop: 3,
                    alignSelf: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            );
          })}

          {isTyping && (
            <View style={{ alignSelf: "flex-start", marginBottom: 10 }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 18,
                  borderBottomLeftRadius: 4,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Animated.View style={{ flexDirection: "row", gap: 4, opacity: dotAnim }}>
                  <View
                    style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent[400] }}
                  />
                  <View
                    style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent[300] }}
                  />
                  <View
                    style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent[200] }}
                  />
                </Animated.View>
              </View>
            </View>
          )}

          {messages.length <= 1 && (
            <Animated.View style={{ opacity: fadeAnim, marginTop: 4, marginBottom: 16 }}>
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 11,
                  color: colors.text.muted,
                  marginBottom: 8,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                Try asking
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {quickPrompts.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    onPress={() => {
                      sendMessage(prompt);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Quicksand-Medium",
                        fontSize: 13,
                        color: colors.text.secondary,
                      }}
                    >
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          <View style={{ height: 12 }} />
        </ScrollView>

        {isVoiceSupported && voiceMode && speakingId && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleStopSpeech}
            style={{
              marginHorizontal: 16,
              marginBottom: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: colors.accent[500] + "15",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.accent[500],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <StopCircle size={14} color="#FFFFFF" />
            </View>
            <Text
              style={{
                flex: 1,
                fontFamily: "Quicksand-SemiBold",
                fontSize: 12,
                color: colors.accent[500],
              }}
            >
              Speaking · tap to stop
            </Text>
            <Sparkles size={12} color={colors.accent[500]} />
          </TouchableOpacity>
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 28 : 10,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 8,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              fontFamily: "Quicksand-Medium",
              fontSize: 15,
              color: colors.text.primary,
              backgroundColor: isDark ? colors.surfaceAlt : colors.primary[50],
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingTop: Platform.OS === "ios" ? 10 : 8,
              paddingBottom: Platform.OS === "ios" ? 10 : 8,
              maxHeight: 100,
              minHeight: 40,
            }}
            placeholder={voiceMode ? "Type · replies will be spoken" : "Type your message…"}
            placeholderTextColor={colors.text.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            multiline
            blurOnSubmit={false}
            // Web: Enter sends, Shift+Enter inserts a newline. On native
            // Enter always makes a newline (mobile convention), so we guard.
            onKeyPress={(e: any) => {
              const key = e?.nativeEvent?.key;
              const shift = e?.nativeEvent?.shiftKey;
              if (Platform.OS === "web" && key === "Enter" && !shift) {
                e.preventDefault?.();
                handleSend();
              }
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim()}
            activeOpacity={0.85}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: input.trim() ? colors.accent[500] : colors.primary[200],
            }}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
