export { buildPersonaSection } from "./buyer-brain/persona";
export { formatChatHistory, countDontKnow } from "./buyer-brain/memory";
export { applyStateUpdates } from "./buyer-brain/state";
export { buildCompanyRagContext } from "./buyer-brain/rag";
export { buildSystemPrompt, buildStreamingSystemPrompt } from "./buyer-brain/prompt";
export { buildFallbackResponse, parseOpenAIJsonResponse, parseOpenAIStream } from "./buyer-brain/parser";
export { callOpenAIStream, callOpenAIChat } from "./buyer-brain/llm";
export type { SellerInfo, StreamChunk } from "./buyer-brain/types";

import { CustomPersona } from "@/types";
import { SimulationMessage, SimulationState, BuyerResponse } from "@/types/simulation";
import { buildStreamingSystemPrompt, buildSystemPrompt } from "./buyer-brain/prompt";
import { formatChatHistory } from "./buyer-brain/memory";
import { parseOpenAIJsonResponse, parseOpenAIStream } from "./buyer-brain/parser";
import { StreamChunk, SellerInfo } from "./buyer-brain/types";
import { callOpenAIChat, callOpenAIStream } from "./buyer-brain/llm";

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
  elapsedMin?: number,
  model: string = "gpt-4.1-mini"
): AsyncGenerator<StreamChunk> {
  const systemPrompt = buildStreamingSystemPrompt(
    persona,
    contextNote,
    sellerDescription,
    state,
    seller,
    difficulty,
    scenarioType,
    recentMessages,
    ragContext,
    durationMin,
    elapsedMin
  );
  const chatHistory = formatChatHistory(recentMessages);
  const response = await callOpenAIStream(model, systemPrompt, chatHistory, userMessage);
  yield* parseOpenAIStream(response, userMessage);
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
  elapsedMin?: number,
  model: string = "gpt-4o"
): Promise<BuyerResponse> {
  const systemPrompt = buildSystemPrompt(
    persona,
    contextNote,
    sellerDescription,
    state,
    seller,
    difficulty,
    scenarioType,
    recentMessages,
    ragContext,
    durationMin,
    elapsedMin
  );
  const chatHistory = formatChatHistory(recentMessages);
  const response = await callOpenAIChat(model, systemPrompt, chatHistory, userMessage);

  if (!response.ok) {
    console.error("OpenAI error:", await response.text());
    return parseOpenAIJsonResponse("", userMessage);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  return parseOpenAIJsonResponse(content, userMessage);
}
