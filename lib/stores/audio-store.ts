// Global ambient-sound player for the Calm Space.
// Wraps a single expo-av Sound instance so playback persists across tabs,
// with looping + an optional sleep timer.
import { create } from "zustand";
import { Audio } from "expo-av";

let soundObj: Audio.Sound | null = null;
let sleepHandle: ReturnType<typeof setTimeout> | null = null;
let audioModeReady = false;

async function ensureAudioMode() {
  if (audioModeReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    // web / unsupported — safe to ignore
  }
  audioModeReady = true;
}

interface AudioState {
  currentId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  /** Selected sleep-timer length in minutes, or null for off. */
  sleepMinutes: number | null;
  /** Epoch ms when the sleep timer will stop playback, or null. */
  sleepEndsAt: number | null;

  play: (id: string, source: number) => Promise<void>;
  toggle: () => Promise<void>;
  stop: () => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentId: null,
  isPlaying: false,
  isLoading: false,
  sleepMinutes: null,
  sleepEndsAt: null,

  play: async (id, source) => {
    const { currentId } = get();

    // Tapping the already-active sound toggles it instead of reloading.
    if (currentId === id && soundObj) {
      await get().toggle();
      return;
    }

    set({ isLoading: true });
    await ensureAudioMode();

    // Tear down any previous sound.
    if (soundObj) {
      try {
        await soundObj.stopAsync();
        await soundObj.unloadAsync();
      } catch {}
      soundObj = null;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        source,
        { isLooping: true, shouldPlay: true, volume: 0.9 },
      );
      soundObj = sound;
      set({ currentId: id, isPlaying: true, isLoading: false });
    } catch {
      set({ isLoading: false, currentId: null, isPlaying: false });
    }
  },

  toggle: async () => {
    if (!soundObj) return;
    const { isPlaying } = get();
    try {
      if (isPlaying) {
        await soundObj.pauseAsync();
        set({ isPlaying: false });
      } else {
        await soundObj.playAsync();
        set({ isPlaying: true });
      }
    } catch {}
  },

  stop: async () => {
    if (sleepHandle) {
      clearTimeout(sleepHandle);
      sleepHandle = null;
    }
    if (soundObj) {
      try {
        await soundObj.stopAsync();
        await soundObj.unloadAsync();
      } catch {}
      soundObj = null;
    }
    set({ currentId: null, isPlaying: false, sleepMinutes: null, sleepEndsAt: null });
  },

  setSleepTimer: (minutes) => {
    if (sleepHandle) {
      clearTimeout(sleepHandle);
      sleepHandle = null;
    }
    if (!minutes) {
      set({ sleepMinutes: null, sleepEndsAt: null });
      return;
    }
    const endsAt = Date.now() + minutes * 60_000;
    sleepHandle = setTimeout(() => {
      get().stop();
    }, minutes * 60_000);
    set({ sleepMinutes: minutes, sleepEndsAt: endsAt });
  },
}));
