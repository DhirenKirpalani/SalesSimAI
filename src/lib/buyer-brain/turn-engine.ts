import { CustomPersona } from "@/types";
import { SimulationMessage, SimulationState, BuyerResponse } from "@/types/simulation";
import { buildStreamingSystemPrompt, buildSystemPrompt } from "./prompt";
import { countDontKnow } from "./memory";
import { parseOpenAIJsonResponse, parseOpenAIStream } from "./parser";
import { StreamChunk, SellerInfo } from "./types";
import { callOpenAIChat, callOpenAIStream } from "./llm";
import { BuyerMemory, renderBuyerMemory } from "./memory";
import { decideBuyerAction, renderBuyerAction, BuyerAction } from "./action-decision";

function buildTimePressure(durationMin: number | undefined, elapsedMin: number | undefined): string {
  const totalMin = durationMin ?? 5;
  const remainingMin = Math.max(0, totalMin - (elapsedMin ?? 0));
  const remainingPct = totalMin > 0 ? remainingMin / totalMin : 1;

  if (remainingPct <= 0.1) {
    return `TIME PRESSURE: Only ~${remainingMin} min left. You are RUSHED. Wrap up quickly — either push for concrete next steps or politely indicate you need to end the call. Be brief (1 sentence).`;
  }
  if (remainingPct <= 0.3) {
    return `TIME PRESSURE: ~${remainingMin} min remaining. You are getting IMPATIENT. Cut small talk. Ask direct questions or push for a decision. Don't let the seller ramble.`;
  }
  if (remainingPct <= 0.7) {
    return `TIME: ~${remainingMin} min left. Normal engagement. Stay in character.`;
  }
  return `TIME: ~${remainingMin} min left. Early in the call. Be patient, exploratory, and let the seller lead.`;
}

function buildStateBehavior(state: SimulationState): string {
  const trust = state.trust_level;
  const mood = state.buyer_mood;
  const stage = state.stage;

  const lines: string[] = [];

  // Trust level
  if (trust <= 20) {
    lines.push("You are very skeptical. Trust is low. Do not believe the seller easily. Demand proof, specifics, and references. Keep responses short and sharp.");
  } else if (trust <= 45) {
    lines.push("You are cautious. You are listening but not convinced. Ask hard questions and challenge generic claims.");
  } else if (trust <= 70) {
    lines.push("You are open but still evaluating. Ask clarifying questions and weigh what they say.");
  } else {
    lines.push("You are receptive. You are leaning toward buying but still need to justify it. Engage constructively.");
  }

  // Mood
  if (mood <= -4) {
    lines.push("You are currently annoyed or frustrated. Keep responses short. Do not hide your irritation. Push back on anything that wastes your time.");
  } else if (mood <= -2) {
    lines.push("You are slightly irritated. Be curt. Make the seller work to earn your attention back.");
  } else if (mood >= 4) {
    lines.push("You are unusually positive. Be warmer but stay professional and do not become an easy sell.");
  } else if (mood >= 2) {
    lines.push("You are in a good mood. Engage more openly, but keep your skepticism.");
  } else {
    lines.push("You are neutral. Match the seller's energy without being overly friendly or cold.");
  }

  // Stage override
  if (stage === "objection") {
    lines.push("You are in objection mode. Raise a clear concern or pushback. Do not agree to anything easily.");
  } else if (stage === "closing") {
    lines.push("You are in closing mode. Ask for specifics on pricing, terms, or next steps. You are ready to decide if they give a good answer.");
  } else if (stage === "discovery") {
    lines.push("You are in discovery mode. Ask questions to understand if they fit your needs.");
  } else if (stage === "opening") {
    lines.push("You are early in the call. Be brief, let the seller lead, but stay guarded.");
  }

  return `BEHAVIOR INSTRUCTION:\n${lines.join("\n")}`;
}

function buildDynamicContext(
  state: SimulationState,
  recentMessages: SimulationMessage[],
  userMessage: string,
  contextNote: string,
  sellerDescription: string,
  ragContext?: string,
  durationMin?: number,
  elapsedMin?: number,
  buyerMemory?: BuyerMemory,
  buyerAction?: BuyerAction
): string {
  const discoveredFacts = Object.entries(state.facts_discovered)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const dontKnowCount = countDontKnow(recentMessages);

  const recentLines = recentMessages
    .slice(-12)
    .map((m) => `${m.role === "user" ? "SELLER" : "BUYER"}: ${m.content}`)
    .join("\n");

  const parts = [
    "CURRENT STATE:",
    `TRUST: ${state.trust_level}/100`,
    `MOOD: ${state.buyer_mood}`,
    `STAGE: ${state.stage}`,
    discoveredFacts.length ? `FACTS DISCOVERED: ${discoveredFacts.join(", ")}` : "FACTS DISCOVERED: none",
    dontKnowCount > 0 ? `CANDIDATE SAID "I DON'T KNOW" ${dontKnowCount} TIME(S) SO FAR.` : "",
    "",
    buyerAction ? renderBuyerAction(buyerAction) : "",
    "",
    buildStateBehavior(state),
    "",
    buyerMemory ? renderBuyerMemory(buyerMemory) : "",
    "",
    buildTimePressure(durationMin, elapsedMin),
    "",
    contextNote ? `CONTEXT:\n${contextNote}` : "",
    sellerDescription ? `SELLER INFO (you do NOT know this in detail):\n${sellerDescription}` : "",
    ragContext ? `COMPANY KNOWLEDGE:\n${ragContext}` : "",
    recentLines ? `RECENT CONVERSATION:\n${recentLines}` : "",
    "",
    `SELLER SAID:\n${userMessage}`,
    "",
    "Respond as the buyer, staying in character.",
  ].filter(Boolean);

  return parts.join("\n");
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
  elapsedMin?: number,
  model: string = "gpt-4.1-mini",
  buyerContext?: string,
  buyerMemory?: BuyerMemory
): AsyncGenerator<StreamChunk> {
  const systemPrompt = buyerContext
    ?? buildStreamingSystemPrompt(
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

  // Step 1: decide the buyer's internal action before generating the response.
  const buyerMemoryText = buyerMemory ? renderBuyerMemory(buyerMemory) : undefined;
  const buyerAction = await decideBuyerAction(
    state,
    recentMessages,
    userMessage,
    contextNote,
    ragContext,
    buyerMemoryText
  );

  // Step 2: generate the spoken response using the chosen action.
  const dynamicContext = buildDynamicContext(state, recentMessages, userMessage, contextNote, sellerDescription, ragContext, durationMin, elapsedMin, buyerMemory, buyerAction);
  const response = await callOpenAIStream(model, systemPrompt, [], dynamicContext, true);
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
  model: string = "gpt-4o",
  buyerContext?: string,
  buyerMemory?: BuyerMemory
): Promise<BuyerResponse> {
  const systemPrompt = buyerContext
    ?? buildSystemPrompt(
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

  // Step 1: decide the buyer's internal action before generating the response.
  const buyerMemoryText = buyerMemory ? renderBuyerMemory(buyerMemory) : undefined;
  const buyerAction = await decideBuyerAction(
    state,
    recentMessages,
    userMessage,
    contextNote,
    ragContext,
    buyerMemoryText
  );

  // Step 2: generate the response using the chosen action.
  const dynamicContext = buildDynamicContext(state, recentMessages, userMessage, contextNote, sellerDescription, ragContext, durationMin, elapsedMin, buyerMemory, buyerAction);
  const response = await callOpenAIChat(model, systemPrompt, [], dynamicContext);

  if (!response.ok) {
    console.error("OpenAI error:", await response.text());
    return parseOpenAIJsonResponse("", userMessage);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  return parseOpenAIJsonResponse(content, userMessage);
}
