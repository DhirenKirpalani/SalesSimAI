import { CustomPersona } from "@/types";
import { SimulationMessage, SimulationState } from "@/types/simulation";
import { buildPersonaSection } from "./persona";
import { countDontKnow } from "./memory";
import {
  getAbsoluteRoleLock,
  getDifficultyNote,
  getLanguageNote,
  getRoleHeader,
  getScenarioBehavior,
  getTimePressure,
  ScenarioContext,
} from "./scenario";
import { SellerInfo } from "./types";

function buildScenarioContext(
  persona: CustomPersona,
  state: SimulationState,
  seller: SellerInfo | undefined,
  scenarioType: string | undefined,
  difficulty: string | undefined,
  durationMin: number | undefined,
  elapsedMin: number | undefined,
  recentMessages: SimulationMessage[] | undefined
): ScenarioContext {
  return {
    persona,
    state,
    seller,
    scenarioType,
    difficulty,
    durationMin,
    elapsedMin,
    dontKnowCount: countDontKnow(recentMessages ?? []),
  };
}

function getDiscoveredFacts(state: SimulationState): string {
  const facts = Object.entries(state.facts_discovered)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return facts.length ? facts.join(", ") : "none";
}

/**
 * Builds the full system prompt for non-streaming / JSON responses.
 */
export function buildSystemPrompt(
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
  const ctx = buildScenarioContext(persona, state, seller, scenarioType, difficulty, durationMin, elapsedMin, recentMessages);

  return `${getAbsoluteRoleLock(persona)}

${getRoleHeader(ctx)}
${getTimePressure(ctx)}
${getDifficultyNote(difficulty) ? "\n" + getDifficultyNote(difficulty) : ""}
You are a real person with opinions, frustrations, and limited patience. You are NOT an assistant. Stay in character.

${getScenarioBehavior(ctx)}

${getLanguageNote()}

${ragContext ? ragContext + "\n\n" : ""}What you know: your own process, frustrations, priorities, and internal situation.
What you DON'T know: their pricing, product details, or capabilities.

${buildPersonaSection(persona)}

CONTEXT:
${contextNote}

SELLER INFO (you do NOT know this in detail):
${sellerDescription}

TRUST: ${state.trust_level}/100 | MOOD: ${state.buyer_mood}
FACTS REVEALED: ${getDiscoveredFacts(state)}

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

/**
 * Builds the system prompt for streaming responses (voice / realtime).
 */
export function buildStreamingSystemPrompt(
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
  const ctx = buildScenarioContext(persona, state, seller, scenarioType, difficulty, durationMin, elapsedMin, recentMessages);

  return `${getAbsoluteRoleLock(persona)}

${getRoleHeader(ctx)}
${getTimePressure(ctx)}
${getDifficultyNote(difficulty) ? "\n" + getDifficultyNote(difficulty) : ""}
You are a real person with opinions, frustrations, and limited patience. You are NOT an assistant. Stay in character.

${getScenarioBehavior(ctx)}

${getLanguageNote()}

${ragContext ? ragContext + "\n\n" : ""}What you know: your own process, frustrations, priorities, and internal situation.
What you DON'T know: their pricing, product details, or capabilities.

${buildPersonaSection(persona)}

CONTEXT:
${contextNote}

SELLER INFO (you do NOT know this in detail):
${sellerDescription}

TRUST: ${state.trust_level}/100 | MOOD: ${state.buyer_mood}
FACTS REVEALED: ${getDiscoveredFacts(state)}

OUTPUT FORMAT — two sections separated by exactly "---":

Section 1: Your spoken response (plain text, 1-3 sentences, NO JSON).
---
Section 2: JSON only:
{"emotion":"neutral|skeptical|interested|frustrated","intent":"answer|objection|question|redirect","state_updates":{"trust_delta":<-15 to 15>,"mood_delta":<-5 to 5>,"facts_revealed":[]},"follow_up_question":"<optional>"}`;
}
