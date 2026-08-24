// Global ambient-sound player for the Calm Space.
// Wraps a single expo-av Sound instance so playback persists across tabs,
// with looping + an optional sleep timer.
//
// Auto-play (persisted): `autoPlayEnabled` + `lastPlayedId` are persisted to
// local storage. When the Sounds screen mounts, it calls `autoResume(list)`
// — if the toggle is on and a last id is remembered, that sound is resumed
// automatically. Browsers block programmatic audio before any user gesture,
// so failed resumes are swallowed rather than treated as errors.
import { create } from "zustand";
import { Audio } from "expo-av";
import { attachPersistence } from "../persist";

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
  sleepMinutes: number | null;
  sleepEndsAt: number | null;
  autoPlayEnabled: boolean;
  lastPlayedId: string | null;

  play: (id: string, source: number) => Promise<void>;
  toggle: () => Promise<void>;
  stop: () => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;
  setAutoPlayEnabled: (on: boolean) => void;
  autoResume: (list: Array<{ id: string; audioSource: number }>) => Promise<void>;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentId: null,
  isPlaying: false,
  isLoading: false,
  sleepMinutes: null,
  sleepEndsAt: null,
  autoPlayEnabled: false,
  lastPlayedId: null,

  play: async (id, source) => {
    const { currentId } = get();
    if (currentId === id && soundObj) {
      await get().toggle();
      return;
    }
    set({ isLoading: true });
    await ensureAudioMode();
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
      set({ currentId: id, isPlaying: true, isLoading: false, lastPlayedId: id });
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

  setAutoPlayEnabled: (on) => {
    set({ autoPlayEnabled: on });
  },

  autoResume: async (list) => {
    const { autoPlayEnabled, lastPlayedId, currentId } = get();
    if (!autoPlayEnabled || !lastPlayedId || currentId) return;
    const match = list.find((s) => s.id === lastPlayedId);
    if (!match) return;
    try {
      await get().play(match.id, match.audioSource);
    } catch {
      // Browsers require a user gesture before audio can autoplay. Log-only.
    }
  },
}));

attachPersistence(useAudioStore, "momease-audio", (s) => ({
  autoPlayEnabled: s.autoPlayEnabled,
  lastPlayedId: s.lastPlayedId,
}));
