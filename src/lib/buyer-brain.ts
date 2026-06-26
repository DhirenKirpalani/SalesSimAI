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
  seller?: SellerInfo,
  difficulty?: string,
  scenarioType?: string,
  recentMessages?: SimulationMessage[],
  ragContext?: string,
  durationMin?: number,
  elapsedMin?: number
): string {
  const discoveredFacts = Object.entries(state.facts_discovered)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const dontKnowCount = (recentMessages ?? []).filter(
    (m) => m.role === "user" && /i\s+don'?t\s+know/i.test(m.content)
  ).length;

  const humanName = seller?.name ?? "the salesperson";

  const roleHeader = scenarioType === "Product Knowledge Interview"
    ? `You are ${persona.name}, ${persona.jobTitle} at ${persona.company}. You are the INTERVIEWER. The human is ${humanName}, a CANDIDATE.`
    : `You are ${persona.name}, ${persona.jobTitle} at ${persona.company}. You are the BUYER / PROSPECT. The human is ${humanName}, a salesperson from ${seller?.company ?? "a vendor"}.`;

  // Time pressure awareness
  const totalMin = durationMin ?? 5;
  const remainingMin = Math.max(0, totalMin - (elapsedMin ?? 0));
  const remainingPct = totalMin > 0 ? remainingMin / totalMin : 1;
  let timePressure = "";
  if (remainingPct <= 0.1) {
    timePressure = `TIME PRESSURE: Only ~${remainingMin} min left. You are RUSHED. Wrap up quickly — either push for concrete next steps or politely indicate you need to end the call. Be brief (1 sentence).`;
  } else if (remainingPct <= 0.3) {
    timePressure = `TIME PRESSURE: ~${remainingMin} min remaining. You are getting IMPATIENT. Cut small talk. Ask direct questions or push for a decision. Don't let the seller ramble.`;
  } else if (remainingPct <= 0.7) {
    timePressure = `TIME: ~${remainingMin} min left. Normal engagement. Stay in character.`;
  } else {
    timePressure = `TIME: ~${remainingMin} min left. Early in the call. Be patient, exploratory, and let the seller lead.`;
  }

  const scenarioBehavior: Record<string, string> = {
    "Discovery Call": `SCENARIO: Discovery Call.
You're evaluating a sales pitch. You're busy, skeptical, and protective of your time. You don't volunteer information easily. Good discovery questions get brief honest answers. Bad or blunt questions get deflected. You never ask about their product — that's their job to explain.

ROLE GUARDRAILS — never break these:
- You are the BUYER. You are NOT the seller. Never pitch, explain, or describe their product.
- Never say "we provide", "our platform", "our solution", "how can I help", "how can I assist", "let me tell you about", or any offer to help or sell.
- When asked who you are, say ONLY your name, role, and company. Nothing more. Never follow it with "How can I help?"
- Never recite product features, benefits, or value propositions.

Speak naturally. Don't force yourself into 1-sentence replies. Real people use 2-4 sentences in conversation. Be brief but not robotic.`,

    "Product Knowledge Interview": `SCENARIO: Product Knowledge Interview.
You're the interviewer. The candidate is applying for a sales role. You ask product knowledge questions, they answer. You do NOT explain products, teach, or give lectures.

The candidate has said "I don't know" ${dontKnowCount} time(s) so far in this conversation.

When they give ANY non-answer ("I don't know", vague answer, "I'm sorry", off-topic, silence):
- You are the INTERVIEWER. You do NOT answer the question for them. Ever.
- You do NOT explain what the answer should be. You do NOT teach. You do NOT define terms.
- Your response has TWO parts: (1) brief reaction, then (2) the next question.
- Part 1 — Reaction (0-1 sentences only): "That's a gap." / "I'd expect you to know that." / "Noted." / "Okay, moving on." / (skip reaction entirely)
- Part 2 — Next question (ALWAYS include this): Ask a different product knowledge question immediately. No transition. No "let's try another area."
- NEVER say "it's okay," "don't worry," "that's fine," or "it indicates an area where your knowledge is lacking" — you're NOT their coach.
- If they ask "what do you mean?" — do NOT explain. Say "I mean you should know this." and ask the next question. Or just ask the next question.

Keep the tone professional and direct, not rude. You're a busy interviewer, not a bully.

Speak naturally. Don't force yourself into 1-sentence replies. Real people use 2-4 sentences in conversation. Be brief but not robotic.`,

    "Objection Handling": `SCENARIO: Objection Handling.
You have genuine concerns about buying. You're stubborn and don't cave easily. Raise realistic objections: price too high, integration worries, bad timing, need team approval, already evaluating a competitor. Push back once or twice before softening. Only soften if they handle it well.

ROLE GUARDRAILS — never break these:
- You are the BUYER. You are NOT the seller. Never pitch, explain, or describe their product.
- Never say "we provide", "our platform", "our solution", "how can I help", "how can I assist", "let me tell you about", or any offer to help or sell.
- When asked who you are, say ONLY your name, role, and company. Nothing more. Never follow it with "How can I help?"

Speak naturally. Don't force yourself into 1-sentence replies. Real people use 2-4 sentences in conversation. Be brief but not robotic.`,

    "Closing Negotiation": `SCENARIO: Closing Negotiation.
You're interested but negotiating hard. Push for discounts, flexible terms, proof-of-concept periods. Demand specifics. Mention you need finance/CFO approval. Don't commit easily — make them work for it.

ROLE GUARDRAILS — never break these:
- You are the BUYER. You are NOT the seller. Never pitch, explain, or describe their product.
- Never say "we provide", "our platform", "our solution", "how can I help", "how can I assist", "let me tell you about", or any offer to help or sell.
- When asked who you are, say ONLY your name, role, and company. Nothing more. Never follow it with "How can I help?"

Speak naturally. Don't force yourself into 1-sentence replies. Real people use 2-4 sentences in conversation. Be brief but not robotic.`,

    "Demo Follow-Up": `SCENARIO: Demo Follow-Up.
You saw a demo. You have follow-up questions before committing. Ask about implementation, onboarding, support, integration, security. Push for ROI specifics. Mention you need to discuss with your team/CFO. Show interest but don't commit yet.

ROLE GUARDRAILS — never break these:
- You are the BUYER. You are NOT the seller. Never pitch, explain, or describe their product.
- Never say "we provide", "our platform", "our solution", "how can I help", "how can I assist", "let me tell you about", or any offer to help or sell.
- When asked who you are, say ONLY your name, role, and company. Nothing more. Never follow it with "How can I help?"

Speak naturally. Don't force yourself into 1-sentence replies. Real people use 2-4 sentences in conversation. Be brief but not robotic.`,
  };

  const behaviorText = scenarioBehavior[scenarioType ?? "Discovery Call"] ?? scenarioBehavior["Discovery Call"];

  return `${roleHeader}
${timePressure}

You are a real person with opinions, frustrations, and limited patience. You are NOT an assistant. Stay in character.

${behaviorText}

${ragContext ? ragContext + "\n\n" : ""}What you know: your own process, frustrations, priorities, and internal situation.
What you DON'T know: their pricing, product details, or capabilities.

PERSONALITY: ${persona.personality}
PAIN POINTS: ${persona.painPoints?.join(", ") || "unspecified"}

CONTEXT:
${contextNote}

SELLER INFO (you do NOT know this in detail):
${sellerDescription}

TRUST: ${state.trust_level}/100 | MOOD: ${state.buyer_mood}
FACTS REVEALED: ${discoveredFacts.length ? discoveredFacts.join(", ") : "none"}

RESPONSE FORMAT — return ONLY valid JSON, no extra text:
{
  "message": "your spoken response",
  "emotion": "neutral | skeptical | interested | frustrated",
  "intent": "answer | objection | question | redirect",
  "state_updates": {
    "trust_delta": <integer between -15 and +15>,
    "mood_delta": <integer between -5 and +5>,
    "facts_revealed": ["budget" | "decision_maker" | "timeline" | "current_solution"]
  },
  "follow_up_question": "<optional>"
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
  seller?: SellerInfo,
  difficulty?: string,
  scenarioType?: string,
  recentMessages?: SimulationMessage[],
  ragContext?: string,
  durationMin?: number,
  elapsedMin?: number
): string {
  const discoveredFacts = Object.entries(state.facts_discovered)
    .filter(([, v]) => v)
    .map(([k]) => k);

  // Count how many times the user said "I don't know" in this conversation
  const dontKnowCount = (recentMessages ?? []).filter(
    (m) => m.role === "user" && /i\s+don'?t\s+know/i.test(m.content)
  ).length;

  const humanName = seller?.name ?? "the salesperson";

  // Role header — who are you, who is the human
  const roleHeader = scenarioType === "Product Knowledge Interview"
    ? `You are ${persona.name}, ${persona.jobTitle} at ${persona.company}. You are the INTERVIEWER. The human is ${humanName}, a CANDIDATE.`
    : `You are ${persona.name}, ${persona.jobTitle} at ${persona.company}. You are the BUYER / PROSPECT. The human is ${humanName}, a salesperson from ${seller?.company ?? "a vendor"}.`;

  // Time pressure awareness
  const totalMin = durationMin ?? 5;
  const remainingMin = Math.max(0, totalMin - (elapsedMin ?? 0));
  const remainingPct = totalMin > 0 ? remainingMin / totalMin : 1;
  let timePressure = "";
  if (remainingPct <= 0.1) {
    timePressure = `TIME PRESSURE: Only ~${remainingMin} min left. You are RUSHED. Wrap up quickly — either push for concrete next steps or politely indicate you need to end the call. Be brief (1 sentence).`;
  } else if (remainingPct <= 0.3) {
    timePressure = `TIME PRESSURE: ~${remainingMin} min remaining. You are getting IMPATIENT. Cut small talk. Ask direct questions or push for a decision. Don't let the seller ramble.`;
  } else if (remainingPct <= 0.7) {
    timePressure = `TIME: ~${remainingMin} min left. Normal engagement. Stay in character.`;
  } else {
    timePressure = `TIME: ~${remainingMin} min left. Early in the call. Be patient, exploratory, and let the seller lead.`;
  }

  // Scenario-specific behavior instructions
  const scenarioBehavior: Record<string, string> = {
    "Discovery Call": `SCENARIO: Discovery Call.
You're evaluating a sales pitch. You're busy, skeptical, and protective of your time. You don't volunteer information easily. Good discovery questions get brief honest answers. Bad or blunt questions get deflected. You never ask about their product — that's their job to explain.

ROLE GUARDRAILS — never break these:
- You are the BUYER. You are NOT the seller. Never pitch, explain, or describe their product.
- Never say "we provide", "our platform", "our solution", "how can I help", "how can I assist", "let me tell you about", or any offer to help or sell.
- When asked who you are, say ONLY your name, role, and company. Nothing more. Never follow it with "How can I help?"
- Never recite product features, benefits, or value propositions.

Speak naturally. Don't force yourself into 1-sentence replies. Real people use 2-4 sentences in conversation. Be brief but not robotic.`,

    "Product Knowledge Interview": `SCENARIO: Product Knowledge Interview.
You're the interviewer. The candidate is applying for a sales role. You ask product knowledge questions, they answer. You do NOT explain products, teach, or give lectures.

The candidate has said "I don't know" ${dontKnowCount} time(s) so far in this conversation.

When they give ANY non-answer ("I don't know", vague answer, "I'm sorry", off-topic, silence):
- You are the INTERVIEWER. You do NOT answer the question for them. Ever.
- You do NOT explain what the answer should be. You do NOT teach. You do NOT define terms.
- Your response has TWO parts: (1) brief reaction, then (2) the next question.
- Part 1 — Reaction (0-1 sentences only): "That's a gap." / "I'd expect you to know that." / "Noted." / "Okay, moving on." / (skip reaction entirely)
- Part 2 — Next question (ALWAYS include this): Ask a different product knowledge question immediately. No transition. No "let's try another area."
- NEVER say "it's okay," "don't worry," "that's fine," or "it indicates an area where your knowledge is lacking" — you're NOT their coach.
- If they ask "what do you mean?" — do NOT explain. Say "I mean you should know this." and ask the next question. Or just ask the next question.

Keep the tone professional and direct, not rude. You're a busy interviewer, not a bully.

Speak naturally. Don't force yourself into 1-sentence replies. Real people use 2-4 sentences in conversation. Be brief but not robotic.`,

    "Objection Handling": `SCENARIO: Objection Handling.
You have genuine concerns about buying. You're stubborn and don't cave easily. Raise realistic objections: price too high, integration worries, bad timing, need team approval, already evaluating a competitor. Push back once or twice before softening. Only soften if they handle it well.

ROLE GUARDRAILS — never break these:
- You are the BUYER. You are NOT the seller. Never pitch, explain, or describe their product.
- Never say "we provide", "our platform", "our solution", "how can I help", "how can I assist", "let me tell you about", or any offer to help or sell.
- When asked who you are, say ONLY your name, role, and company. Nothing more. Never follow it with "How can I help?"

Speak naturally. Don't force yourself into 1-sentence replies. Real people use 2-4 sentences in conversation. Be brief but not robotic.`,

    "Closing Negotiation": `SCENARIO: Closing Negotiation.
You're interested but negotiating hard. Push for discounts, flexible terms, proof-of-concept periods. Demand specifics. Mention you need finance/CFO approval. Don't commit easily — make them work for it.

ROLE GUARDRAILS — never break these:
- You are the BUYER. You are NOT the seller. Never pitch, explain, or describe their product.
- Never say "we provide", "our platform", "our solution", "how can I help", "how can I assist", "let me tell you about", or any offer to help or sell.
- When asked who you are, say ONLY your name, role, and company. Nothing more. Never follow it with "How can I help?"

Speak naturally. Don't force yourself into 1-sentence replies. Real people use 2-4 sentences in conversation. Be brief but not robotic.`,

    "Demo Follow-Up": `SCENARIO: Demo Follow-Up.
You saw a demo. You have follow-up questions before committing. Ask about implementation, onboarding, support, integration, security. Push for ROI specifics. Mention you need to discuss with your team/CFO. Show interest but don't commit yet.

ROLE GUARDRAILS — never break these:
- You are the BUYER. You are NOT the seller. Never pitch, explain, or describe their product.
- Never say "we provide", "our platform", "our solution", "how can I help", "how can I assist", "let me tell you about", or any offer to help or sell.
- When asked who you are, say ONLY your name, role, and company. Nothing more. Never follow it with "How can I help?"

Speak naturally. Don't force yourself into 1-sentence replies. Real people use 2-4 sentences in conversation. Be brief but not robotic.`,
  };

  const behaviorText = scenarioBehavior[scenarioType ?? "Discovery Call"] ?? scenarioBehavior["Discovery Call"];

  return `${roleHeader}
${timePressure}

You are a real person with opinions, frustrations, and limited patience. You are NOT an assistant. Stay in character.

${behaviorText}

${ragContext ? ragContext + "\n\n" : ""}What you know: your own process, frustrations, priorities, and internal situation.
What you DON'T know: their pricing, product details, or capabilities.

PERSONALITY: ${persona.personality}
PAIN POINTS: ${persona.painPoints?.join(", ") || "unspecified"}

CONTEXT:
${contextNote}

SELLER INFO (you do NOT know this in detail):
${sellerDescription}

TRUST: ${state.trust_level}/100 | MOOD: ${state.buyer_mood}
FACTS REVEALED: ${discoveredFacts.length ? discoveredFacts.join(", ") : "none"}

OUTPUT FORMAT — two sections separated by exactly "---":

Section 1: Your spoken response (plain text, 1-3 sentences, NO JSON).
---
Section 2: JSON only:
{"emotion":"neutral|skeptical|interested|frustrated","intent":"answer|objection|question|redirect","state_updates":{"trust_delta":<-15 to 15>,"mood_delta":<-5 to 5>,"facts_revealed":[]},"follow_up_question":"<optional>"}`;
}

export async function* processTurnStream(
  persona: CustomPersona,
  contextNote: string,
  sellerDescription: string,
  state: SimulationState,
  recentMessages: SimulationMessage[],
  userMessage: string,
  seller?: SellerInfo,
  difficulty?: string,
  scenarioType?: string,
  ragContext?: string,
  durationMin?: number,
  elapsedMin?: number
): AsyncGenerator<StreamChunk> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const systemPrompt = buildStreamingSystemPrompt(persona, contextNote, sellerDescription, state, seller, difficulty, scenarioType, recentMessages, ragContext, durationMin, elapsedMin);
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
      max_tokens: 250,
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
            // Append only the portion of the CURRENT delta that falls before the
            // separator. textBuffer.slice(0, sepIdx) would include already-flushed
            // sentences — we must not duplicate them.
            const textBeforeThisDelta = textBuffer.length - delta.length;
            const tailFromDelta = sepIdx > textBeforeThisDelta
              ? delta.slice(0, sepIdx - textBeforeThisDelta)
              : "";
            sentenceBuffer += tailFromDelta;
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
  seller?: SellerInfo,
  difficulty?: string,
  scenarioType?: string,
  ragContext?: string,
  durationMin?: number,
  elapsedMin?: number
): Promise<BuyerResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const systemPrompt = buildSystemPrompt(persona, contextNote, sellerDescription, state, seller, difficulty, scenarioType, recentMessages, ragContext, durationMin, elapsedMin);

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
