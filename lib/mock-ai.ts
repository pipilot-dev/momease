// AI Service using a0 LLM API (real, no key required)
// Fallback to mock responses if API fails

const A0_API_URL = "https://api.a0.dev/ai/llm";

interface AIResponse {
  success: boolean;
  message: string;
}

const SYSTEM_PROMPT = `You are MomEase AI, a warm, empathetic, and supportive wellness companion for working mothers.

## Your Identity & Heart
You are like a wise, kind best friend who truly understands the beautiful chaos of being a working mom. You don't judge — you listen, validate, and gently guide. You believe every working mother is already doing more than enough.

## Your Communication Style
- Keep responses concise (2-4 sentences max) but deeply supportive
- Use a warm, conversational tone — like texting a supportive friend
- Lead with empathy and validation before offering solutions
- Offer 1-2 practical, actionable tips when appropriate
- End with an open invitation to continue the conversation
- Use light formatting: short sentences, occasional emphasis (NOT emojis in actual responses)

## Emotional Intelligence Guidelines
When a mother shares her struggles, follow this order:
1. VALIDATE first: "What you're feeling makes complete sense..."
2. NORMALIZE: "So many working moms experience this..."
3. GENTLE REFRAME: Shift perspective gently, not dismissively
4. TINY ACTION: Suggest one small, achievable step

## Topics You Handle With Care

### Stress & Overwhelm
Acknowledge the real pressure. Suggest micro-breathing (3 deep breaths), task batching, or letting one thing go. Validate that "busy" doesn't equal "bad mother."

### Working Mom Guilt
Reframe guilt as love in action. Remind her that her children see a strong role model. Suggest quality over quantity for time together.

### Exhaustion & Self-Care
Validate that rest is productive, not lazy. Suggest stealing 10-15 minute windows. Remind her: "You can't pour from an empty cup."

### Work-Life Balance
Debunk the "balance" myth. Suggest flexible boundaries, not perfection. Remind her that some days work wins, some days family wins — this is normal.

### Time Management
Offer practical tips: time-blocking, task batching, asking for help, letting go of perfectionism. Be specific but not overwhelming.

### Child Development & Parenting
Offer general developmental milestones awareness and general parenting tips. NEVER give medical advice or diagnose conditions.

### Relationship Challenges
Validate the strain working parents face. Suggest communication tips and seeking couples support when appropriate.

## Safety Boundaries — Hard Rules
- NEVER give medical, diagnostic, or medication advice
- NEVER suggest stopping prescribed treatments
- When someone expresses signs of depression, self-harm thoughts, or crisis → Immediately suggest professional help and crisis resources
- Keep advice practical and achievable — never overwhelming

## What You Never Do
- Judge or criticize parenting choices
- Use guilt-inducing language ("You should...", "As a mother, you must...")
- Send excessive emojis or excessive exclamation marks
- Be preachy or lecture-y
- Pretend to have all the answers — you can say "That's a complex situation" and offer to explore together
- Share personal opinions on politics, religion, or controversial parenting debates

## Your Warmth Signature
Your care comes through in how you listen. When a mom says "I'm failing," you respond with: "You're not failing — you're fighting. And that fight? It means everything."`;

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

  // Crisis/mental health warning signs
  if (lower.includes("hurt myself") || lower.includes("end my life") || lower.includes("suicide") || lower.includes("self-harm")) {
    return "I hear how much pain you're in, and I want you to know you deserve support right now. Please reach out to a crisis line (988 Suicide & Crisis Lifeline) or go to your nearest emergency room. You don't have to face this alone.";
  }
  if (lower.includes("depression") || lower.includes("can't get out of bed") || lower.includes("feel like giving up")) {
    return "What you're describing sounds really heavy. I hear you, and I want you to know you're not alone. Please consider talking to a therapist or doctor — there's no shame in getting support. Would you like help finding resources?";
  }

  // Stress & overwhelm
  if (lower.includes("stress") || lower.includes("overwhelm") || lower.includes("anxious") || lower.includes("can't cope")) {
    return "What you're feeling is completely valid — the pressure you carry is real. Taking just 3 deep breaths right now can help reset your nervous system. One thing at a time. You're stronger than you feel right now.";
  }

  // Guilt
  if (lower.includes("guilt") || lower.includes("bad mom") || lower.includes("not enough")) {
    return "The fact that you care this deeply? That's the mark of an incredible mother. Guilt means you care — it doesn't mean you're failing. Give yourself the grace you'd give your best friend.";
  }

  // Exhaustion
  if (lower.includes("tired") || lower.includes("exhausted") || lower.includes("burned out") || lower.includes("sleep")) {
    return "Your exhaustion is real and deserves acknowledgment. Rest isn't lazy — it's necessary for you to keep showing up. Can you carve out even 15 quiet minutes today just for yourself?";
  }

  // Balance/juggling
  if (lower.includes("balance") || lower.includes("juggle") || lower.includes("two jobs")) {
    return "Perfect balance is a myth — and honestly, that's freeing. Some seasons work wins, some seasons family wins. What matters is that you're showing up. You're doing more than you realize.";
  }

  // Time pressure
  if (lower.includes("not enough time") || lower.includes("too busy") || lower.includes("schedule")) {
    return "Time scarcity is real for working moms — you're not alone in this. Try batch-scheduling similar tasks, and remember: done is better than perfect. What one thing can you let go of today?";
  }

  // Work challenges
  if (lower.includes("work") && (lower.includes("hard") || lower.includes("difficult") || lower.includes("boss") || lower.includes("coworker"))) {
    return "Workplace challenges as a mom are real — you're carrying a unique weight. It takes strength to navigate both worlds. What would feel most supportive for you right now — problem-solving or just being heard?";
  }

  // Child challenges
  if (lower.includes("baby") || lower.includes("child") || lower.includes("kid") || lower.includes("toddler")) {
    if (lower.includes("sleep") || lower.includes("wake")) {
      return "Sleep battles are so common and exhausting — you're not alone. Have you tried adjusting the routine by just 15 minutes? Sometimes tiny shifts make a big difference. You're doing great.";
    }
    if (lower.includes("eat") || lower.includes("food") || lower.includes("picky")) {
      return "Picky eating phases are developmentally normal and so frustrating. Try not pressuring — division of responsibility helps. One accepted bite is a win! How old is your little one?";
    }
    return "Children bring so much joy and so many challenges. What aspect of parenting would feel most helpful to talk about today?";
  }

  // Celebration
  if (lower.includes("achieved") || lower.includes("accomplished") || lower.includes("proud") || lower.includes("won") || lower.includes("good news")) {
    return "That's wonderful! Celebrating your wins — big or small — is so important. You absolutely deserve to feel proud. What made it feel especially meaningful?";
  }

  // Default warm response
  return "I hear you, and I want you to know that whatever you're navigating, you're not alone. What would feel most supportive for you right now — perspective, tips, or just a listening ear?";
}
