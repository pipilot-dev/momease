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
import { Send, Sparkles, Trash2, Heart } from "lucide-react-native";
import { useChatStore } from "../../lib/stores/chat-store";

const aiAvatar = require("../../assets/ai-assistant.png");

export default function ChatScreen() {
  const { messages, isTyping, sendMessage, clearChat } = useChatStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const dotAnim = useRef(new Animated.Value(0)).current;

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
  };

  const quickPrompts = [
    "I'm feeling overwhelmed today",
    "Give me a self-care tip",
    "Help me manage my time better",
    "I need encouragement",
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFCFB" }}>
      {/* Header */}
      <LinearGradient
        colors={["#EDE9FE", "#F5F3FF", "#FDFCFB"]}
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
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: "#1F2937" }}>
                AI Companion
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#10B981",
                  }}
                />
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#10B981" }}>
                  Always here for you
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={clearChat}>
            <Trash2 size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        >
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
                  <Heart size={12} color="#C4B5FD" fill="#C4B5FD" />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 11, color: "#9CA3AF" }}>
                    MomEase AI
                  </Text>
                </View>
              )}
              <View
                style={{
                  backgroundColor: msg.role === "user" ? "#F472B6" : "#FFFFFF",
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
                    color: msg.role === "user" ? "#FFFFFF" : "#1F2937",
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
                  color: "#9CA3AF",
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
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  borderBottomLeftRadius: 4,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                }}
              >
                <Animated.View style={{ flexDirection: "row", gap: 4, opacity: dotAnim }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#C4B5FD" }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#DDD6FE" }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#EDE9FE" }} />
                </Animated.View>
              </View>
            </View>
          )}

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <View style={{ marginTop: 8, marginBottom: 16 }}>
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 13,
                  color: "#9CA3AF",
                  marginBottom: 12,
                }}
              >
                Try asking...
              </Text>
              {quickPrompts.map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => sendMessage(prompt)}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: "#F3F4F6",
                  }}
                >
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#4B5563" }}>
                    {prompt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            gap: 12,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              fontFamily: "Quicksand-Medium",
              fontSize: 16,
              color: "#1F2937",
              backgroundColor: "#F9FAFB",
              borderRadius: 24,
              paddingHorizontal: 20,
              paddingVertical: 12,
              maxHeight: 100,
            }}
            placeholder="Type your message..."
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity onPress={handleSend} disabled={!input.trim()} activeOpacity={0.85}>
            <LinearGradient
              colors={input.trim() ? ["#C4B5FD", "#8B5CF6"] : ["#E5E7EB", "#D1D5DB"]}
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
