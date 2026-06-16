import { create } from "zustand";
import type { ChatMessage } from "../types";
import { sendAIMessage } from "../mock-ai";
import { attachPersistence } from "../persist";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! I'm your MomEase wellness companion. I'm here to listen, support, and help you navigate the beautiful chaos of being a working mom. What's on your mind today?",
  timestamp: new Date().toISOString(),
};

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;

  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [WELCOME],
  isTyping: false,

  sendMessage: async (content) => {
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isTyping: true,
    }));

    const response = await sendAIMessage(content);

    const aiMessage: ChatMessage = {
      id: `msg_${Date.now() + 1}`,
      role: "assistant",
      content: response.message,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, aiMessage],
      isTyping: false,
    }));
  },

  clearChat: () =>
    set({
      messages: [
        {
          id: "welcome",
          role: "assistant",
          content: "Chat cleared! I'm still here whenever you need to talk.",
          timestamp: new Date().toISOString(),
        },
      ],
    }),
}));

attachPersistence(useChatStore, "momease-chat", (s) => ({ messages: s.messages }));
