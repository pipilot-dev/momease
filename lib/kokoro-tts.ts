// Free hosted Kokoro TTS — https://tts.voice-generator.com
//
// Web-only for now: MomEase's voice mode targets browsers (PWA on iOS/Android),
// so we use the DOM `Audio` element directly. Native builds silently skip TTS.
//
// Trap #1 (the reason this exists): the endpoint returns HTTP 200 + JSON on
// failure — `res.ok` alone is a lie, we gate on content-type.
// Trap #2: `lang` and `voice` must agree — derived from the voice prefix here.
// Trap #3: cap ~510 tokens (~1.5-2k chars), we clamp defensively.

import { Platform } from "react-native";

const BASE = "https://tts.voice-generator.com";

/** Soft, gentle British female — chosen for warmth in a wellness context. */
export const DEFAULT_VOICE = "bf_isabella";

/** Voice id encodes language in its first letter. */
const langFor = (voice: string): string =>
  /^[abjzefhip]/.test(voice) ? voice[0] : "a";

export type SpeakOptions = {
  voice?: string;
  speed?: number;
  signal?: AbortSignal;
};

export const isVoiceSupported = Platform.OS === "web" && typeof window !== "undefined";

/**
 * Fetch synthesized audio as a Blob. Throws on network failure OR on the
 * "200 + JSON error body" case that this endpoint uses instead of proper
 * HTTP status codes.
 */
export async function synthesize(text: string, opts: SpeakOptions = {}): Promise<Blob> {
  if (!isVoiceSupported) throw new Error("Voice not supported on this platform");
  const voice = opts.voice ?? DEFAULT_VOICE;
  const qs = new URLSearchParams({
    text: text.trim().slice(0, 1500),
    voice,
    lang: langFor(voice),
    format: "mp3",
    speed: String(opts.speed ?? 1),
  });

  const res = await fetch(`${BASE}/tts?${qs}`, { signal: opts.signal });
  if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);

  const type = res.headers.get("content-type") ?? "";
  if (!/^audio\//i.test(type)) {
    const body = await res.text().catch(() => "");
    throw new Error(`TTS error: ${body.slice(0, 160)}`);
  }
  const blob = await res.blob();
  if (!blob.size) throw new Error("TTS: empty audio");
  return blob;
}

export type SpeechHandle = {
  /** Stop playback + release the blob URL. Safe to call multiple times. */
  stop: () => void;
  /** Resolves when playback ends OR the utterance is stopped. */
  done: Promise<void>;
};

let currentHandle: SpeechHandle | null = null;

export function stopSpeaking() {
  currentHandle?.stop();
  currentHandle = null;
}

export function speak(text: string, opts: SpeakOptions = {}): SpeechHandle {
  stopSpeaking();

  const controller = new AbortController();
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;
  let resolveDone: () => void;
  const done = new Promise<void>((resolve) => (resolveDone = resolve));

  const handle: SpeechHandle = {
    stop() {
      controller.abort();
      audio?.pause();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      resolveDone();
    },
    done,
  };
  currentHandle = handle;

  (async () => {
    try {
      const blob = await synthesize(text, { ...opts, signal: controller.signal });
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      audio = new Audio(objectUrl);
      audio.addEventListener("ended", () => handle.stop(), { once: true });
      audio.addEventListener("error", () => handle.stop(), { once: true });
      await audio.play();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.warn("[kokoro]", err);
      }
      handle.stop();
    }
  })();

  return handle;
}
