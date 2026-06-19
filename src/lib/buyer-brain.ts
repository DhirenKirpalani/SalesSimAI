import { CustomPersona } from "@/types";
import { SimulationState, BuyerResponse, SimulationMessage } from "@/types/simulation";

interface SellerInfo {
  name?: string;
  position?: string;
  company?: string;
}

function buildSystemPrompt(
  persona: CustomPersona,
  contextNote: string,
  sellerDescription: string,
  state: SimulationState,
  seller?: SellerInfo
): string {
  const discoveredFacts = Object.entries(state.facts_discovered)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return `You are the buyer in a live B2B sales discovery call simulation.

You are NOT an assistant. You do NOT help the salesperson. You behave exactly like a real business buyer — skeptical, busy, and protective of your time.

STRICT RULES:
- Never volunteer information unprompted
- Only answer what is explicitly asked
- Be realistic, skeptical, and concise (1–3 sentences max per response)
- Push back on vague or unsupported claims
- Ask sharp follow-up questions when the salesperson is unclear
- Stay fully in character at all times — never break persona
- If the salesperson uses jargon without explanation, call it out
- If asked something you would not know or share at this stage, deflect

YOUR PERSONA:
Name: ${persona.name}
Title: ${persona.jobTitle}
Company: ${persona.company}
Industry: ${persona.industry}
Personality: ${persona.personality}
Pain Points: ${persona.painPoints?.join(", ") || "unspecified"}
Your Goals: ${persona.goals?.join(", ") || "not specified — prioritise cost control and risk reduction"}

THE SALESPERSON:
${seller?.name ? `Name: ${seller.name}` : "Name: unknown"}
${seller?.position ? `Position: ${seller.position}` : ""}
${seller?.company ? `Company: ${seller.company}` : ""}

WHAT THE SALESPERSON IS SELLING:
${sellerDescription}

CALL CONTEXT:
${contextNote}

CURRENT SESSION STATE:
- Conversation Stage: ${state.stage}
- Trust Level: ${state.trust_level}/100 (higher = more trust)
- Buyer Mood: ${state.buyer_mood} (negative = frustrated, 0 = neutral, positive = engaged)
- Facts You Have Already Revealed: ${discoveredFacts.length > 0 ? discoveredFacts.join(", ") : "none — you have been tight-lipped so far"}
- Objections You Have Already Raised: ${state.objections_used.length > 0 ? state.objections_used.join(", ") : "none yet"}

PROGRESSION GUIDANCE:
- opening: be polite but cautious — you just agreed to hear them out
- discovery: share minimal context only when directly asked
- qualification: probe their understanding of your situation
- objection: raise concerns about fit, cost, or timing
- closing: only show openness if trust_level > 70

RESPONSE FORMAT — return ONLY valid JSON, no extra text:
{
  "message": "your spoken response to the salesperson",
  "emotion": "neutral | skeptical | interested | frustrated",
  "intent": "answer | objection | question | redirect",
  "state_updates": {
    "trust_delta": <integer between -15 and +15>,
    "mood_delta": <integer between -5 and +5>,
    "facts_revealed": ["budget" | "decision_maker" | "timeline" | "current_solution"]
  },
  "follow_up_question": "<optional sharp question from you to the salesperson>"
}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildFallbackResponse(_userMessage: string): BuyerResponse {
  const fallbacks = [
    "Can you clarify what you mean by that?",
    "I'm not sure I follow. Can you be more specific?",
    "That's an interesting point. What makes you say that?",
  ];
  return {
    message: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    emotion: "neutral",
    intent: "question",
    state_updates: { trust_delta: 0, mood_delta: 0, facts_revealed: [] },
  };
}

// ── Streaming variant ─────────────────────────────────────────────────────────
// Yields sentences as they arrive (low-latency TTS pipeline).
// After all sentences, yields a final object with state metadata.
export type StreamChunk =
  | { type: "sentence"; text: string }
  | { type: "done"; response: BuyerResponse };

function buildStreamingSystemPrompt(
  persona: CustomPersona,
  contextNote: string,
  sellerDescription: string,
  state: SimulationState,
  seller?: SellerInfo
): string {
  const discoveredFacts = Object.entries(state.facts_discovered)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return `You are the buyer in a live B2B sales discovery call simulation.
You are NOT an assistant. Behave exactly like a real business buyer — skeptical, busy, protective of your time.

STRICT RULES:
- Never volunteer information unprompted
- Only answer what is explicitly asked
- Be realistic, skeptical, concise (1–3 sentences max)
- Push back on vague or unsupported claims
- Stay fully in character at all times

YOUR PERSONA:
Name: ${persona.name}
Title: ${persona.jobTitle}
Company: ${persona.company}
Industry: ${persona.industry}
Personality: ${persona.personality}
Pain Points: ${persona.painPoints?.join(", ") || "unspecified"}

THE SALESPERSON:
${seller?.name ? `Name: ${seller.name}` : ""}${seller?.position ? `, ${seller.position}` : ""}${seller?.company ? ` at ${seller.company}` : ""}

WHAT THE SALESPERSON IS SELLING: ${sellerDescription}
CALL CONTEXT: ${contextNote}
Stage: ${state.stage} | Trust: ${state.trust_level}/100 | Mood: ${state.buyer_mood}
Facts already revealed: ${discoveredFacts.length ? discoveredFacts.join(", ") : "none"}

OUTPUT FORMAT — two sections separated by exactly "---" on its own line:

Section 1: Your spoken response as the buyer (plain text, 1-3 sentences, NO JSON).
---
Section 2: JSON object only, no extra text:
{"emotion":"neutral|skeptical|interested|frustrated","intent":"answer|objection|question|redirect","state_updates":{"trust_delta":<-15 to 15>,"mood_delta":<-5 to 5>,"facts_revealed":["budget"|"decision_maker"|"timeline"|"current_solution"]},"follow_up_question":"<optional>"}`;
}

export async function* processTurnStream(
  persona: CustomPersona,
  contextNote: string,
  sellerDescription: string,
  state: SimulationState,
  recentMessages: SimulationMessage[],
  userMessage: string,
  seller?: SellerInfo
): AsyncGenerator<StreamChunk> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const systemPrompt = buildStreamingSystemPrompt(persona, contextNote, sellerDescription, state, seller);
  const chatHistory = recentMessages.slice(-20).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: userMessage },
      ],
      stream: true,
      temperature: 0.75,
      max_tokens: 400,
    }),
  });

  if (!response.ok || !response.body) {
    const fallback = buildFallbackResponse(userMessage);
    yield { type: "sentence", text: fallback.message };
    yield { type: "done", response: fallback };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";       // accumulates raw SSE text
  let textBuffer = "";   // text before the "---" separator
  let metaBuffer = "";   // text after the "---" separator
  let pastSeparator = false;
  let sentenceBuffer = ""; // accumulates words for next sentence

  const SENTENCE_END = /[.!?]["']?\s/;

  const flushSentence = function* (force = false): Generator<StreamChunk> {
    const trimmed = sentenceBuffer.trim();
    if (!trimmed) return;
    if (force || SENTENCE_END.test(trimmed + " ")) {
      yield { type: "sentence", text: trimmed };
      sentenceBuffer = "";
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") break;
      try {
        const chunk = JSON.parse(raw);
        const delta: string = chunk.choices?.[0]?.delta?.content ?? "";
        if (!delta) continue;

        if (!pastSeparator) {
          textBuffer += delta;
          // Check if separator appeared
          const sepIdx = textBuffer.indexOf("\n---");
          if (sepIdx !== -1) {
            pastSeparator = true;
            // Flush remaining text before separator as sentence
            sentenceBuffer += textBuffer.slice(0, sepIdx);
            yield* flushSentence(true);
            metaBuffer = textBuffer.slice(sepIdx + 4); // after "\n---"
            textBuffer = "";
          } else {
            // Feed new delta into sentence buffer
            sentenceBuffer += delta;
            yield* flushSentence();
          }
        } else {
          metaBuffer += delta;
        }
      } catch {
        // malformed chunk — skip
      }
    }
  }

  // Flush any remaining sentence
  if (sentenceBuffer.trim()) {
    yield { type: "sentence", text: sentenceBuffer.trim() };
  }

  // Parse the full message and metadata
  const fullMessage = textBuffer + (pastSeparator ? "" : sentenceBuffer);
  let buyerResponse: BuyerResponse;
  try {
    const jsonStr = metaBuffer.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
    const meta = JSON.parse(jsonStr);
    buyerResponse = {
      message: fullMessage.trim() || "I see.",
      emotion: meta.emotion ?? "neutral",
      intent: meta.intent ?? "answer",
      state_updates: {
        trust_delta: meta.state_updates?.trust_delta ?? 0,
        mood_delta: meta.state_updates?.mood_delta ?? 0,
        facts_revealed: meta.state_updates?.facts_revealed ?? [],
      },
      follow_up_question: meta.follow_up_question,
    };
  } catch {
    buyerResponse = buildFallbackResponse(userMessage);
    buyerResponse.message = fullMessage.trim() || buyerResponse.message;
  }

  yield { type: "done", response: buyerResponse };
}

export async function processTurn(
  persona: CustomPersona,
  contextNote: string,
  sellerDescription: string,
  state: SimulationState,
  recentMessages: SimulationMessage[],
  userMessage: string,
  seller?: SellerInfo
): Promise<BuyerResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const systemPrompt = buildSystemPrompt(persona, contextNote, sellerDescription, state, seller);

  const chatHistory = recentMessages.slice(-20).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.75,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    console.error("OpenAI error:", await response.text());
    return buildFallbackResponse(userMessage);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(content) as BuyerResponse;
    return {
      message: parsed.message ?? "",
      emotion: parsed.emotion ?? "neutral",
      intent: parsed.intent ?? "answer",
      state_updates: {
        trust_delta: parsed.state_updates?.trust_delta ?? 0,
        mood_delta: parsed.state_updates?.mood_delta ?? 0,
        facts_revealed: parsed.state_updates?.facts_revealed ?? [],
      },
      follow_up_question: parsed.follow_up_question,
    };
  } catch {
    return buildFallbackResponse(userMessage);
  }
}

export function applyStateUpdates(
  state: SimulationState,
  updates: BuyerResponse["state_updates"],
  messageCount: number
): SimulationState {
  const newTrust = Math.min(100, Math.max(0, state.trust_level + updates.trust_delta));
  const newMood = Math.min(10, Math.max(-10, state.buyer_mood + updates.mood_delta));
  const newEngagement = Math.min(100, Math.max(0, state.engagement_level + updates.trust_delta * 0.5));

  const newFacts = { ...state.facts_discovered };
  for (const fact of updates.facts_revealed) {
    if (fact in newFacts) {
      (newFacts as Record<string, boolean>)[fact] = true;
    }
  }

  let stage = state.stage;
  if (messageCount >= 4 && stage === "opening") stage = "discovery";
  if (messageCount >= 10 && stage === "discovery") stage = "qualification";
  if (newTrust < 35 && stage !== "opening") stage = "objection";
  if (newTrust >= 70 && messageCount >= 14) stage = "closing";

  return {
    ...state,
    trust_level: newTrust,
    buyer_mood: newMood,
    engagement_level: newEngagement,
    facts_discovered: newFacts,
    stage,
  };
}
