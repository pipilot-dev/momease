import { useState, useRef, useEffect } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Send, Sparkles, Trash2, Heart, MessageCircle } from "lucide-react-native";
import { useChatStore } from "../../lib/stores/chat-store";
import { colors, gradients, animation } from "../../lib/theme";

const aiAvatar = require("../../assets/ai-assistant.png");

export default function ChatScreen() {
  const { messages, isTyping, sendMessage, clearChat } = useChatStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const dotAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Entrance animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: animation.duration.slow,
      delay: animation.stagger.medium,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isTyping]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const quickPrompts = [
    "I'm feeling overwhelmed today",
    "Give me a self-care tip",
    "Help me manage my time better",
    "I need encouragement",
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <LinearGradient
        colors={[gradients.violetDream[0], gradients.violetDream[1], colors.bg]}
        style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Image
              source={aiAvatar}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
              }}
            />
            <View>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: colors.text.primary }}>
                AI Companion
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.success,
                  }}
                />
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: colors.success }}>
                  Always here for you
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => {
            clearChat();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}>
            <Trash2 size={20} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Messages or Empty State */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Empty State */}
          {messages.length === 0 && (
            <Animated.View style={{ opacity: fadeAnim, alignItems: "center", paddingTop: 60 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.accent[50],
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <MessageCircle size={36} color={colors.accent[500]} />
              </View>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: colors.text.primary, marginBottom: 8 }}>
                Start a Conversation
              </Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 15, color: colors.text.secondary, textAlign: "center", paddingHorizontal: 32 }}>
                Your AI companion is here to listen, support, and help you navigate motherhood
              </Text>
            </Animated.View>
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                marginBottom: 12,
              }}
            >
              {msg.role === "assistant" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <Heart size={12} color={colors.accent[400]} fill={colors.accent[400]} />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 11, color: colors.text.muted }}>
                    MomEase AI
                  </Text>
                </View>
              )}
              <View
                style={{
                  backgroundColor: msg.role === "user" ? colors.primary[500] : colors.surface,
                  borderRadius: 20,
                  borderBottomRightRadius: msg.role === "user" ? 4 : 20,
                  borderBottomLeftRadius: msg.role === "assistant" ? 4 : 20,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 15,
                    color: msg.role === "user" ? "#FFFFFF" : colors.text.primary,
                    lineHeight: 22,
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
                  marginTop: 4,
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <View style={{ alignSelf: "flex-start", marginBottom: 12 }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 20,
                  borderBottomLeftRadius: 4,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                }}
              >
                <Animated.View style={{ flexDirection: "row", gap: 4, opacity: dotAnim }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent[400] }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent[300] }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent[200] }} />
                </Animated.View>
              </View>
            </View>
          )}

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <Animated.View style={{ opacity: fadeAnim, marginTop: 8, marginBottom: 16 }}>
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 13,
                  color: colors.text.muted,
                  marginBottom: 12,
                }}
              >
                Try asking...
              </Text>
              {quickPrompts.map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    sendMessage(prompt);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: colors.primary[100],
                  }}
                >
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: colors.text.secondary }}>
                    {prompt}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: Platform.OS === "ios" ? 32 : 12,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.primary[100],
            gap: 12,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              fontFamily: "Quicksand-Medium",
              fontSize: 16,
              color: colors.text.primary,
              backgroundColor: colors.primary[50],
              borderRadius: 24,
              paddingHorizontal: 20,
              paddingVertical: 12,
              maxHeight: 100,
            }}
            placeholder="Type your message..."
            placeholderTextColor={colors.text.muted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity onPress={handleSend} disabled={!input.trim()} activeOpacity={0.85}>
            <LinearGradient
              colors={input.trim() ? [colors.accent[400], colors.accent[500]] : [colors.primary[200], colors.primary[300]]}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
