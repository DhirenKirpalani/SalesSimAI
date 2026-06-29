import { BuyerResponse } from "@/types/simulation";
import { StreamChunk } from "./types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildFallbackResponse(_userMessage: string): BuyerResponse {
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

const SENTENCE_END = /[.!?]["']?\s/;

/**
 * Parses an OpenAI SSE stream and yields sentence chunks, then a final metadata chunk.
 */
export async function* parseOpenAIStream(
  response: Response,
  userMessage: string
): AsyncGenerator<StreamChunk> {
  if (!response.ok || !response.body) {
    const fallback = buildFallbackResponse(userMessage);
    yield { type: "sentence", text: fallback.message };
    yield { type: "done", response: fallback };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let textBuffer = "";
  let metaBuffer = "";
  let pastSeparator = false;
  let sentenceBuffer = "";

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
          const sepIdx = textBuffer.indexOf("\n---");
          if (sepIdx !== -1) {
            pastSeparator = true;
            const textBeforeThisDelta = textBuffer.length - delta.length;
            const tailFromDelta = sepIdx > textBeforeThisDelta
              ? delta.slice(0, sepIdx - textBeforeThisDelta)
              : "";
            sentenceBuffer += tailFromDelta;
            yield* flushSentence(true);
            metaBuffer = textBuffer.slice(sepIdx + 4);
            textBuffer = "";
          } else {
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

  if (sentenceBuffer.trim()) {
    yield { type: "sentence", text: sentenceBuffer.trim() };
  }

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

/**
 * Parses a non-streaming OpenAI JSON response.
 */
export function parseOpenAIJsonResponse(content: string, userMessage: string): BuyerResponse {
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
