import { BuyerResponse, BuyerEmotion, BuyerIntent, BuyerAction } from "@/types/simulation";
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

interface ParsedMetadata {
  emotion: string;
  intent: string;
  action?: string;
  trust_delta: number;
  mood_delta: number;
  facts_revealed: string[];
  follow_up_question?: string;
}

function parseMetadataJson(content: string, userMessage: string): ParsedMetadata {
  try {
    const jsonStr = content.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
    const meta = JSON.parse(jsonStr);
    return {
      emotion: meta.emotion ?? "neutral",
      intent: meta.intent ?? "answer",
      action: meta.action,
      trust_delta: meta.state_updates?.trust_delta ?? meta.trust_delta ?? 0,
      mood_delta: meta.state_updates?.mood_delta ?? meta.mood_delta ?? 0,
      facts_revealed: meta.state_updates?.facts_revealed ?? meta.facts_revealed ?? [],
      follow_up_question: meta.follow_up_question,
    };
  } catch {
    return { emotion: "neutral", intent: "answer", trust_delta: 0, mood_delta: 0, facts_revealed: [] };
  }
}

function buildResponseFromMetadata(
  fullMessage: string,
  metadata: ParsedMetadata,
  userMessage: string
): BuyerResponse {
  const validEmotions: BuyerEmotion[] = ["neutral", "skeptical", "interested", "frustrated"];
  const validIntents: BuyerIntent[] = ["answer", "objection", "question", "redirect"];
  const validActions: BuyerAction[] = ["reveal_pain", "challenge", "ask_question", "push_back", "engage", "deflect", "end_call", "close"];
  const action = metadata.action && validActions.includes(metadata.action as BuyerAction)
    ? (metadata.action as BuyerAction)
    : undefined;
  return {
    message: fullMessage.trim() || "I see.",
    emotion: (validEmotions.includes(metadata.emotion as BuyerEmotion) ? metadata.emotion : "neutral") as BuyerEmotion,
    intent: (validIntents.includes(metadata.intent as BuyerIntent) ? metadata.intent : "answer") as BuyerIntent,
    action,
    state_updates: {
      trust_delta: metadata.trust_delta,
      mood_delta: metadata.mood_delta,
      facts_revealed: metadata.facts_revealed,
    },
    follow_up_question: metadata.follow_up_question,
  };
}

/**
 * Parses an OpenAI SSE stream and yields sentence chunks, then a final metadata chunk.
 * Supports two metadata modes:
 *   1. Legacy text separator mode: "text\n---\nJSON"
 *   2. Tool call mode: plain text + record_buyer_metadata function call
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

  // Tool call state
  const toolCallBuffers: Record<number, { name: string; arguments: string }> = {};
  let activeToolCallIndex: number | null = null;
  let metadataToolCall: string | null = null;

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
        const choice = chunk.choices?.[0];
        const delta = choice?.delta ?? {};

        // Handle tool call deltas
        if (delta.tool_calls?.length) {
          for (const tc of delta.tool_calls) {
            const index = tc.index ?? 0;
            if (!toolCallBuffers[index]) {
              toolCallBuffers[index] = { name: "", arguments: "" };
            }
            if (tc.function?.name) {
              toolCallBuffers[index].name += tc.function.name;
            }
            if (tc.function?.arguments) {
              toolCallBuffers[index].arguments += tc.function.arguments;
            }
            if (toolCallBuffers[index].name === "record_buyer_metadata") {
              metadataToolCall = toolCallBuffers[index].arguments;
            }
          }
          continue;
        }

        // Handle content deltas (spoken text)
        const content: string = delta.content ?? "";
        if (!content) continue;

        if (!pastSeparator) {
          textBuffer += content;
          const sepIdx = textBuffer.indexOf("\n---");
          if (sepIdx !== -1) {
            pastSeparator = true;
            const textBeforeThisDelta = textBuffer.length - content.length;
            const tailFromDelta = sepIdx > textBeforeThisDelta
              ? content.slice(0, sepIdx - textBeforeThisDelta)
              : "";
            sentenceBuffer += tailFromDelta;
            yield* flushSentence(true);
            metaBuffer = textBuffer.slice(sepIdx + 4);
            textBuffer = "";
          } else {
            sentenceBuffer += content;
            yield* flushSentence();
          }
        } else {
          metaBuffer += content;
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

  let metadata: ParsedMetadata;
  if (metadataToolCall) {
    metadata = parseMetadataJson(metadataToolCall, userMessage);
  } else {
    metadata = parseMetadataJson(metaBuffer, userMessage);
  }

  const buyerResponse = buildResponseFromMetadata(fullMessage, metadata, userMessage);

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
