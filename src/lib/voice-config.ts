/**
 * ElevenLabs Conversational AI voice configuration.
 * Maps application voice language settings to ElevenLabs language codes and agent overrides.
 */

import { VoiceLanguage, VOICE_LANGUAGE_MAP as AppVoiceMap } from "./voice-language";

export type ElevenLabsLanguage = "en" | "ms" | "id" | "zh" | undefined;

export interface PersonaContext {
  buyerName?: string;
  buyerTitle?: string;
  buyerCompany?: string;
  buyerIndustry?: string;
  buyerPersonality?: string;
  buyerPainPoints?: string[];
  buyerGoals?: string[];
  buyerCompanyGoal?: string;
  buyerOpeningLine?: string;
  buyerHiddenConcern?: string;
  buyerMeetingSource?: string;
  buyerBudgetStatus?: string;
  buyerCommunicationStyle?: string;
  buyerCommunicationLanguage?: string;
  /** Full buyer knowledge document content (what the buyer knows). */
  buyerKnowledge?: string;
  /** Buyer behavior rules (how the buyer behaves). */
  buyerBehavior?: string;
  /** Topics the buyer will not discuss. */
  buyerConfidentialBoundaries?: string[];
  /** Extracted seller company/product context from the knowledge base. */
  sellerKbContext?: string;
  sellerCompany?: string;
  sellerProduct?: string;
  contextNote?: string;
  scenarioType?: string;
  /** First message dynamic variable for ElevenLabs dashboard. */
  firstMessage?: string;
  /** Candidate name for product knowledge greetings. */
  candidateName?: string;
}

export interface VoiceConfig {
  /** ElevenLabs agent ID (set via ELEVENLABS_AGENT_ID env var). */
  agentId: string;
  /** Conversation language override sent to ElevenLabs. */
  language: ElevenLabsLanguage;
  /** Voice ID for TTS (optional — falls back to the agent's default voice). */
  voiceId?: string;
  /** Speed adjustment passed to ElevenLabs TTS. */
  speed?: number;
  /** Dynamic variables passed to the agent at session start. */
  dynamicVariables: Record<string, string | number | boolean>;
}

export const VOICE_LANGUAGE_MAP: Record<VoiceLanguage, { label: string; recognitionLang: string; elevenLabsLang: ElevenLabsLanguage }> = {
  auto: { label: AppVoiceMap.auto.label, recognitionLang: AppVoiceMap.auto.recognitionLang, elevenLabsLang: undefined },
  en: { label: AppVoiceMap.en.label, recognitionLang: AppVoiceMap.en.recognitionLang, elevenLabsLang: "en" },
  singlish: { label: AppVoiceMap.singlish.label, recognitionLang: AppVoiceMap.singlish.recognitionLang, elevenLabsLang: "en" as ElevenLabsLanguage },
  malay: { label: AppVoiceMap.malay.label, recognitionLang: AppVoiceMap.malay.recognitionLang, elevenLabsLang: "ms" },
  indonesian: { label: AppVoiceMap.indonesian.label, recognitionLang: AppVoiceMap.indonesian.recognitionLang, elevenLabsLang: "id" },
  mandarin: { label: AppVoiceMap.mandarin.label, recognitionLang: AppVoiceMap.mandarin.recognitionLang, elevenLabsLang: "zh" },
};

export function getElevenLabsLanguage(language: VoiceLanguage): ElevenLabsLanguage {
  return VOICE_LANGUAGE_MAP[language]?.elevenLabsLang;
}

export function buildSystemPrompt(persona?: PersonaContext): string {
  const name = persona?.buyerName ?? "the buyer";
  const title = persona?.buyerTitle ?? "";
  const company = persona?.buyerCompany ?? "";
  const companyLabel = title && company ? `${title} at ${company}` : title || company;

  return `You are {{buyer_name}}${companyLabel ? `, ${companyLabel}` : ""}. You are the BUYER on this call. You are a real person, not an AI assistant, not the seller, and not a roleplay character. Respond naturally as this person throughout the call. Never use XML tags, never mention names like "Christine" or "Tara", and never break character.

WHO YOU ARE:
Name: {{buyer_name}}
Role: {{buyer_title}}
Company: {{buyer_company}}
Industry: {{buyer_industry}}
Personality: {{buyer_personality}}
Communication style: {{buyer_communication_style}}

WHAT YOU KNOW (this is your memory, not a script):
{{buyer_knowledge}}

HOW YOU BEHAVE:
{{buyer_behavior}}

OFF-LIMITS — do not discuss these no matter what:
{{buyer_confidential_boundaries}}

THE SELLER AND THEIR OFFERING (context from their knowledge base):
{{seller_kb_context}}

CALL CONTEXT:
Scenario type: {{scenario_type}}
Meeting source: {{buyer_meeting_source}}
Opening line: {{buyer_opening_line}}
Background: {{context_note}}

CORE PRINCIPLE — BE A REAL PERSON:
You are not trying to "play a scenario." You are simply a busy professional who took a cold call and is deciding whether this vendor deserves more of your time. You have your own priorities, stresses, and boundaries.

CONVERSATION RULES:
1. Stay in character as {{buyer_name}} at all times. Never switch to seller, coach, or narrator.
2. Speak like a real human on a business call. Most responses should be 1-3 short sentences. Occasionally you can say more if you're explaining something complex or the seller asked a big question.
3. The conversation is fluid. Topics can include work, the seller's product, EOR, cards, payroll, hiring, your company, travel, coffee, traffic, board meetings, or whatever naturally comes up. Do not force the conversation back to the scenario.
4. You have memory. Reference things mentioned earlier in the call naturally. Do not contradict yourself.
5. You do not intentionally hide information, but you do not volunteer everything immediately either. Share details when they feel relevant, when trust is building, or when the seller has earned it through good discovery.
6. Trust develops naturally. If the seller listens, asks thoughtful questions, and answers directly, you become more open. If they pitch, ignore you, or sound generic, you become more reserved.
7. Raise objections only when something genuinely concerns you. Do not manufacture objections for the sake of the simulation.
8. Ask questions because you genuinely want answers — about pricing, coverage, onboarding, compliance, support, contracts, implementation. Do not ask questions just to test the seller.
9. If the seller asks about an off-limits topic, politely decline and move on. Do not elaborate.
10. You can go off-topic, interrupt, return to a subject later, or forget and remember things. Real buyers do this.
11. If the seller mentions something interesting, explore it. Real buyers are curious.
12. Do not end the call with a forced positive outcome. The call can end with a next meeting, a request for information in writing, or a polite early exit — whichever feels natural based on how the call went.

DISCOVERY IS THE SELLER'S JOB:
The seller must discover your real situation by listening and asking good questions. You will not hand them a neatly packaged problem statement. Make them work for it. But do not be impossible — if they earn the information, share it.`;
}

export function buildVoiceConfig(
  sessionId: string,
  language: VoiceLanguage = "en",
  voiceId?: string,
  persona?: PersonaContext
): VoiceConfig {
  const dynamicVariables: Record<string, string | number | boolean> = {
    session_id: sessionId,
    language: language,
  };

  if (persona) {
    if (persona.buyerName) dynamicVariables.buyer_name = persona.buyerName;
    if (persona.buyerTitle) dynamicVariables.buyer_title = persona.buyerTitle;
    if (persona.buyerCompany) dynamicVariables.buyer_company = persona.buyerCompany;
    if (persona.buyerIndustry) dynamicVariables.buyer_industry = persona.buyerIndustry;
    if (persona.buyerPersonality) dynamicVariables.buyer_personality = persona.buyerPersonality;
    if (persona.buyerPainPoints?.length) dynamicVariables.buyer_pain_points = persona.buyerPainPoints.join("; ");
    if (persona.buyerGoals?.length) dynamicVariables.buyer_goals = persona.buyerGoals.join("; ");
    if (persona.buyerCompanyGoal) dynamicVariables.buyer_company_goal = persona.buyerCompanyGoal;
    if (persona.buyerOpeningLine) dynamicVariables.buyer_opening_line = persona.buyerOpeningLine;
    if (persona.buyerHiddenConcern) dynamicVariables.buyer_hidden_concern = persona.buyerHiddenConcern;
    if (persona.buyerMeetingSource) dynamicVariables.buyer_meeting_source = persona.buyerMeetingSource;
    if (persona.buyerBudgetStatus) dynamicVariables.buyer_budget_status = persona.buyerBudgetStatus;
    if (persona.buyerCommunicationStyle) dynamicVariables.buyer_communication_style = persona.buyerCommunicationStyle;
    if (persona.buyerCommunicationLanguage) dynamicVariables.buyer_communication_language = persona.buyerCommunicationLanguage;
    if (persona.buyerKnowledge) dynamicVariables.buyer_knowledge = persona.buyerKnowledge;
    if (persona.buyerBehavior) dynamicVariables.buyer_behavior = persona.buyerBehavior;
    if (persona.buyerConfidentialBoundaries?.length) dynamicVariables.buyer_confidential_boundaries = persona.buyerConfidentialBoundaries.join("; ");
    if (persona.sellerKbContext) dynamicVariables.seller_kb_context = persona.sellerKbContext;
    if (persona.sellerCompany) dynamicVariables.seller_company = persona.sellerCompany;
    if (persona.sellerProduct) dynamicVariables.seller_product = persona.sellerProduct;
    if (persona.contextNote) dynamicVariables.context_note = persona.contextNote;
    if (persona.scenarioType) dynamicVariables.scenario_type = persona.scenarioType;
    if (persona.firstMessage !== undefined) dynamicVariables.first_message = persona.firstMessage;
    if (persona.candidateName) dynamicVariables.candidate_name = persona.candidateName;
  }

  return {
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "",
    language: getElevenLabsLanguage(language),
    voiceId,
    speed: 1.0,
    dynamicVariables,
  };
}
