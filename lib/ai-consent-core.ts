// Consent before anything about a person is sent to a third-party AI service.
//
// Apple (App Review Guideline 5.1.2(i)) and good practice: say who gets the data, what is sent,
// and ask first. Until she taps "Allow", NOTHING is sent: no chat message, no greeting request, no voice text.

export type AiConsent = "granted" | "declined" | null;

/** True only after an explicit "Allow". Unknown, declined and never-asked all mean "do not send". */
export function canSendToAi(consent: AiConsent | undefined): boolean {
  return consent === "granted";
}

/** Who receives the text. Keep in step with landing/privacy.html (a unit test checks both mention it). */
export const AI_PROVIDER = "a0.dev";
export const TTS_PROVIDER = "tts.voice-generator.com";

export const AI_CONSENT_TITLE = "Before you chat";

export function aiConsentParagraphs(voiceAvailable: boolean): string[] {
  const out = [
    `The companion's replies are written by an AI service run by another company (${AI_PROVIDER}). When you send a message, its text is sent to that service so it can reply. On the home screen your first name may be sent to write a greeting.`,
    "We do not send your email address or other account details.",
  ];
  if (voiceAvailable) out.push(`If you turn on voice replies, the text of each reply is also sent to a text-to-speech service (${TTS_PROVIDER}).`);
  out.push("You can change your mind any time in Settings.");
  return out;
}
