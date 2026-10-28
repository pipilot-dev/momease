import { create } from "zustand";
import type { ChatMessage } from "../types";
import { sendAIMessage } from "../mock-ai";
import { attachPersistence } from "../persist";
import { useAuthStore } from "./auth-store";
import { isNotMom } from "../personalization";

const NOT_MOM_WELCOME_TEXT =
  "Hi there! I'm your MomEase wellness companion. I'm here to listen, support, and help you feel calmer and more like yourself. What's on your mind today?";

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
  /** Persisted: when true, AI replies are read aloud via Kokoro TTS. */
  voiceMode: boolean;

  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  /** Swap the default welcome for a neutral one (she told us she is not a mom). Leaves real chats alone. */
  adaptWelcome: (notMom: boolean) => void;
  setVoiceMode: (on: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [WELCOME],
  isTyping: false,
  voiceMode: false,

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

    const response = await sendAIMessage(content, undefined, { notMom: isNotMom(useAuthStore.getState().user?.personalization?.lifeStage) });

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

  adaptWelcome: (notMom) =>
    set((state) => {
      const only = state.messages.length === 1 && state.messages[0].id === "welcome";
      if (!only || state.messages[0].content === "Chat cleared! I'm still here whenever you need to talk.") return state;
      return { messages: [{ ...WELCOME, content: notMom ? NOT_MOM_WELCOME_TEXT : WELCOME.content }] };
    }),

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

  setVoiceMode: (on) => set({ voiceMode: on }),
}));

attachPersistence(useChatStore, "momease-chat", (s) => ({
  messages: s.messages,
  voiceMode: s.voiceMode,
}));
