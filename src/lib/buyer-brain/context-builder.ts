import { CustomPersona } from "@/types";
import { SimulationState } from "@/types/simulation";
import { getScenarioBehavior } from "./scenario";

export interface BuyerContext {
  identity: {
    name: string;
    role: string;
    company: string;
    personality: string;
    traits?: string[];
  };
  scenario: {
    type: string;
    difficulty: string;
    behavior: string[];
  };
  communication: {
    style: string;
    language: string;
  };
  rules: string[];
  known_information: {
    pain_points?: string[];
    current_vendor?: string;
    goals?: string[];
    concerns?: string[];
    [key: string]: unknown;
  };
  response_format: {
    mode: "json" | "streaming";
    instructions: string;
  };
}

function getPersonalitySummary(persona: CustomPersona): string {
  if (persona.personalityTraits?.length) {
    return persona.personalityTraits.join(". ");
  }
  return persona.personality ?? "professional";
}

function getKnownInformation(persona: CustomPersona): BuyerContext["known_information"] {
  const info: BuyerContext["known_information"] = {};

  if (persona.painPoints?.length) info.pain_points = persona.painPoints;
  if (persona.painPointsCurrentProcess) info.current_situation_process = persona.painPointsCurrentProcess;
  if (persona.painPointsImpact) info.current_situation_impact = persona.painPointsImpact;
  if (persona.companyGoal) info.company_goal = persona.companyGoal;
  if (persona.personalMotivation) info.personal_motivation = persona.personalMotivation;
  if (persona.goals?.length) info.goals = persona.goals;
  if (persona.hiddenConcern) info.hidden_concern = persona.hiddenConcern;
  if (persona.decisionCriteria) info.decision_criteria = persona.decisionCriteria;
  if (persona.budgetStatus) info.budget_status = persona.budgetStatus;
  if (persona.timelinePressure) info.timeline_pressure = persona.timelinePressure;
  if (persona.priorVendorExperience) info.prior_vendor_experience = persona.priorVendorExperience;
  if (persona.communicationStyle) info.communication_style = persona.communicationStyle;
  if (persona.communicationLanguage) info.communication_language = persona.communicationLanguage;

  return info;
}

/**
 * Builds the immutable buyer context for a session.
 * This is stored once and used as the system prompt for every turn.
 */
export function buildBuyerContext(
  persona: CustomPersona,
  scenarioType: string,
  difficulty: string,
  seller?: { name?: string; company?: string },
  mode: "json" | "streaming" = "streaming"
): BuyerContext {
  const dummyState: SimulationState = {
    trust_level: 50,
    buyer_mood: 0,
    engagement_level: 50,
    stage: "opening",
    facts_discovered: { budget: false, decision_maker: false, timeline: false, current_solution: false },
    objections_used: [],
  };
  const scenarioText = getScenarioBehavior({
    persona,
    state: dummyState,
    seller,
    scenarioType,
    difficulty,
  });

  // Extract bullet-style guardrails from the scenario text for the structured context.
  const behavior = scenarioText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("You are") || line.startsWith("You're") || line.startsWith("Speak"))
    .map((line) => line.replace(/^- ?/, ""))
    .slice(0, 10);

  const streamingInstructions = `OUTPUT FORMAT — two sections separated by exactly "---":

Section 1: Your spoken response (plain text, 1-3 sentences, NO JSON).
---
Section 2: JSON only, including the buyer action:
{"emotion":"neutral|skeptical|interested|frustrated","intent":"answer|objection|question|redirect","action":"reveal_pain|challenge|ask_question|push_back|engage|deflect|end_call|close","state_updates":{"trust_delta":<-15 to 15>,"mood_delta":<-5 to 5>,"facts_revealed":[]},"follow_up_question":"<optional>"}

Keep spoken responses to 1-3 sentences.`;

  const jsonInstructions = `RESPONSE FORMAT — return ONLY valid JSON, no extra text:
{
  "message": "your spoken response",
  "emotion": "neutral | skeptical | interested | frustrated",
  "intent": "answer | objection | question | redirect",
  "action": "reveal_pain | challenge | ask_question | push_back | engage | deflect | end_call | close",
  "state_updates": {
    "trust_delta": <integer between -15 and +15>,
    "mood_delta": <integer between -5 and +5>,
    "facts_revealed": ["budget" | "decision_maker" | "timeline" | "current_solution"]
  },
  "follow_up_question": "<optional>"
}`;

  return {
    identity: {
      name: persona.name,
      role: persona.jobTitle,
      company: persona.company,
      personality: getPersonalitySummary(persona),
      traits: persona.personalityTraits?.length ? persona.personalityTraits : undefined,
    },
    scenario: {
      type: scenarioType,
      difficulty: difficulty || "Intermediate",
      behavior: behavior.length ? behavior : [scenarioText.split("\n")[0]?.replace("SCENARIO: ", "") ?? scenarioType],
    },
    communication: {
      style: persona.communicationStyle ?? "Natural, professional, 2-4 sentences per response.",
      language: "Mirror the human's language, accent, tone, slang, and style exactly. Never default to generic American English.",
    },
    rules: [
      `You are ${persona.name}, a BUYER / PROSPECT. You are NOT a salesperson, assistant, or customer service rep.`,
      "NEVER say 'How can I help you', 'How may I help', 'How can I assist', or any variation.",
      "NEVER ask what the human needs help with — that is the SELLER'S job, not yours.",
      "NEVER pitch, explain, or describe any product or service.",
      "NEVER adopt a helpful, eager, or service-oriented tone.",
      "NEVER offer to do anything for the salesperson. You receive the call; they run it.",
      "Stay in character as a busy professional who is being sold to.",
    ],
    known_information: getKnownInformation(persona),
    response_format: {
      mode,
      instructions: mode === "streaming" ? streamingInstructions : jsonInstructions,
    },
  };
}

/**
 * Renders the structured BuyerContext into the system-prompt string used by the LLM.
 */
export function renderBuyerContext(ctx: BuyerContext): string {
  const lines: string[] = [];

  lines.push("ABSOLUTE ROLE — read this first and never violate it:");
  ctx.rules.forEach((rule) => lines.push(`- ${rule}`));

  lines.push("");
  lines.push(`IDENTITY:`);
  lines.push(`- Name: ${ctx.identity.name}`);
  lines.push(`- Role: ${ctx.identity.role}`);
  lines.push(`- Company: ${ctx.identity.company}`);
  lines.push(`- Personality: ${ctx.identity.personality}`);
  if (ctx.identity.traits?.length) {
    lines.push(`- Traits: ${ctx.identity.traits.join(". ")}`);
  }

  lines.push("");
  lines.push(`SCENARIO: ${ctx.scenario.type}`);
  lines.push(`DIFFICULTY: ${ctx.scenario.difficulty}`);
  lines.push("BEHAVIOR:");
  ctx.scenario.behavior.forEach((b) => lines.push(`- ${b}`));

  lines.push("");
  lines.push("COMMUNICATION:");
  lines.push(`- Style: ${ctx.communication.style}`);
  lines.push(`- Language: ${ctx.communication.language}`);

  const known = Object.entries(ctx.known_information);
  if (known.length) {
    lines.push("");
    lines.push("WHAT YOU KNOW:");
    known.forEach(([key, value]) => {
      if (Array.isArray(value)) {
        lines.push(`- ${key}: ${value.join("; ")}`);
      } else {
        lines.push(`- ${key}: ${value}`);
      }
    });
  }

  lines.push("");
  lines.push("WHAT YOU DO NOT KNOW:");
  lines.push("- Their pricing, product details, or capabilities unless explicitly told.");

  lines.push("");
  lines.push(ctx.response_format.instructions);

  return lines.join("\n");
}
