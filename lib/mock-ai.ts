// AI Service using a0 LLM API (real, no key required)
// Fallback to mock responses if API fails

const A0_API_URL = "https://api.a0.dev/ai/llm";

interface AIResponse {
  success: boolean;
  message: string;
}

const SYSTEM_PROMPT = `You are MomEase AI, a warm, empathetic, and supportive wellness assistant for working mothers.
Your tone is like a kind best friend who truly understands the juggling act of career and motherhood.
Keep responses concise (2-4 sentences max) but deeply supportive.
Never give medical advice. Suggest professional help when appropriate.
Use encouraging language. Validate feelings before offering solutions.`;

export async function sendAIMessage(userMessage: string, context?: string): Promise<AIResponse> {
  try {
    const response = await fetch(A0_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(context ? [{ role: "system", content: `Context: ${context}` }] : []),
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) throw new Error("API call failed");

    const data = await response.json();
    return {
      success: true,
      message: data.completion || data.choices?.[0]?.message?.content || getFallbackResponse(userMessage),
    };
  } catch {
    return {
      success: true,
      message: getFallbackResponse(userMessage),
    };
  }
}

export async function getAIGreeting(userName: string): Promise<string> {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  try {
    const response = await fetch(A0_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `Generate a warm, personalized ${timeOfDay} greeting for ${userName}, a working mother.
            Keep it to 1-2 sentences. Be encouraging and uplifting. Don't use emojis.`,
          },
          { role: "user", content: `Greet me for this ${timeOfDay}` },
        ],
      }),
    });

    if (!response.ok) throw new Error("API call failed");
    const data = await response.json();
    return data.completion || data.choices?.[0]?.message?.content || getLocalGreeting(userName, timeOfDay);
  } catch {
    return getLocalGreeting(userName, timeOfDay);
  }
}

export async function getAITaskPrioritization(tasks: string[]): Promise<string> {
  try {
    const response = await fetch(A0_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You're a productivity coach for working moms. Given these tasks, suggest a priority order with brief reasoning (1 sentence each). Be practical and empathetic.`,
          },
          { role: "user", content: `Help me prioritize: ${tasks.join(", ")}` },
        ],
      }),
    });

    if (!response.ok) throw new Error("API call failed");
    const data = await response.json();
    return data.completion || data.choices?.[0]?.message?.content || "Focus on the most time-sensitive tasks first, then tackle what energizes you!";
  } catch {
    return "Focus on the most time-sensitive tasks first, then tackle what energizes you!";
  }
}

function getLocalGreeting(name: string, timeOfDay: string): string {
  const greetings: Record<string, string[]> = {
    morning: [
      `Good morning, ${name}! Today is a fresh start, full of possibilities.`,
      `Rise and shine, ${name}! You're going to do amazing things today.`,
    ],
    afternoon: [
      `Hey ${name}! Halfway through the day and you're doing wonderfully.`,
      `Afternoon, ${name}! Remember to take a moment for yourself.`,
    ],
    evening: [
      `Good evening, ${name}! You made it through another beautiful day.`,
      `Hey ${name}, time to unwind. You've earned some peace tonight.`,
    ],
  };
  const options = greetings[timeOfDay] || greetings.morning;
  return options[Math.floor(Math.random() * options.length)];
}

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("stress") || lower.includes("overwhelm") || lower.includes("anxious")) {
    return "I hear you, and what you're feeling is completely valid. Taking even 3 deep breaths right now can help reset your nervous system. You're doing so much better than you think.";
  }
  if (lower.includes("guilt") || lower.includes("bad mom")) {
    return "The fact that you care so deeply shows what an incredible mother you are. Guilt is a sign of love, not failure. Give yourself the same grace you'd give your best friend.";
  }
  if (lower.includes("tired") || lower.includes("exhausted") || lower.includes("sleep")) {
    return "Your exhaustion is real and valid. Rest isn't lazy — it's necessary. Can you carve out even 15 minutes today just for yourself? You deserve it.";
  }
  if (lower.includes("balance") || lower.includes("juggle")) {
    return "Perfect balance is a myth — and that's freeing! Some days work wins, some days family wins. What matters is that over time, you're showing up for what matters most to you.";
  }

  return "I'm here for you, and I want you to know that whatever you're going through, you don't have to face it alone. What would feel most supportive for you right now?";
}
