import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AI_PROVIDER, TTS_PROVIDER, aiConsentParagraphs, canSendToAi } from "../../lib/ai-consent-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");

describe("AI consent", () => {
  it("only an explicit Allow lets anything be sent", () => {
    expect(canSendToAi("granted")).toBe(true);
    expect(canSendToAi("declined")).toBe(false);
    expect(canSendToAi(null)).toBe(false);
    expect(canSendToAi(undefined)).toBe(false);
  });

  it("the consent text names the provider, what is sent and what is not; voice only when voice exists", () => {
    const withVoice = aiConsentParagraphs(true).join(" ");
    const noVoice = aiConsentParagraphs(false).join(" ");
    expect(withVoice).toContain(AI_PROVIDER);
    expect(withVoice).toContain(TTS_PROVIDER);
    expect(noVoice).not.toContain(TTS_PROVIDER);
    expect(noVoice).toContain("We do not send your email address");
  });

  it("every call to the AI service in mock-ai checks consent first", () => {
    const src = read("lib/mock-ai.ts");
    const fetches = [...src.matchAll(/await fetch\(A0_API_URL/g)].map((m) => m.index!);
    expect(fetches.length).toBeGreaterThanOrEqual(3);
    for (const at of fetches) {
      const fnStart = src.lastIndexOf("export async function", at);
      const head = src.slice(fnStart, at);
      expect(head, src.slice(fnStart, fnStart + 60)).toContain("aiAllowed()");
    }
  });

  it("voice (text-to-speech), the chat store and the chat screen check consent too", () => {
    expect(read("lib/kokoro-tts.ts")).toMatch(/canSendToAi\(useSettingsStore\.getState\(\)\.aiConsent\)[\s\S]*await fetch\(`\$\{BASE\}/);
    expect(read("lib/stores/chat-store.ts")).toMatch(/sendMessage: async \(content\) => \{[\s\S]{0,200}canSendToAi/);
    const chat = read("app/(tabs)/chat.tsx");
    expect(chat).toContain("<AiConsentCard />");
    expect(chat).toContain("!t || !aiOn");
  });

  it("the consent answer is saved with her settings, and starts as 'never asked'", () => {
    const store = read("lib/stores/settings-store.ts");
    expect(store).toContain("aiConsent: null");
    expect(store).toMatch(/pin: s\.pin,\s+aiConsent: s\.aiConsent/);
  });

  it("nothing else in the app talks to the AI or voice services", () => {
    const allowed = new Set(["lib/mock-ai.ts", "lib/kokoro-tts.ts", "lib/ai-consent-core.ts"]); // the last one only names the providers in the consent text
    const offenders: string[] = [];
    const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
    const walk = (d: string) => {
      for (const f of readdirSync(join(root, d))) {
        const rel = `${d}/${f}`;
        if (statSync(join(root, rel)).isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(f) && !allowed.has(rel) && /api\.a0\.dev\/ai|tts\.voice-generator\.com/.test(read(rel))) offenders.push(rel);
      }
    };
    for (const d of ["app", "components", "lib"]) walk(d);
    expect(offenders).toEqual([]);
  });

  it("the privacy policy names the real AI and voice providers and says nothing is sent before Allow", () => {
    const html = read("landing/privacy.html");
    expect(html).toContain(AI_PROVIDER);
    expect(html).toContain(TTS_PROVIDER);
    expect(html).toContain("Only after you tap");
    expect(html).not.toMatch(/OpenAI|Supabase|Expo push/);
  });
});
