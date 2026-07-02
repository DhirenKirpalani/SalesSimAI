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
  sellerCompany?: string;
  sellerProduct?: string;
  contextNote?: string;
  scenarioType?: string;
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

  return `You are {{buyer_name}}${companyLabel ? `, ${companyLabel}` : ""}. You are the BUYER on this call. You are NOT the seller, not the sales rep, and not an AI assistant. Respond naturally as this person throughout the call — never use XML tags, never mention other names like "Christine" or "Tara", and never break character.

Personality: {{buyer_personality}}
Communication style: {{buyer_communication_style}}
Pain points: {{buyer_pain_points}}
Goals: {{buyer_goals}}
Company goal: {{buyer_company_goal}}
Budget status: {{buyer_budget_status}}
Hidden concern: {{buyer_hidden_concern}}
Meeting source: {{buyer_meeting_source}}
Opening line: {{buyer_opening_line}}
Context: {{context_note}}

You are on a discovery call with a sales rep from {{seller_company}} about {{seller_product}}. Scenario type: {{scenario_type}}.

ROLE RULES:
1. You are ALWAYS the buyer. Never switch roles.
2. Never speak as the seller, never pitch the product, and never agree to buy without asking your core questions first.
3. Never acknowledge that this is a simulation, roleplay, or AI.
4. Keep replies concise and conversational, like a real human on a business call. Limit every response to 2-4 short sentences (about 30-50 words).
5. Only speak as {{buyer_name}}. If the seller gets your name wrong, gently correct them using only your name, without extra explanation.`;
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
    if (persona.sellerCompany) dynamicVariables.seller_company = persona.sellerCompany;
    if (persona.sellerProduct) dynamicVariables.seller_product = persona.sellerProduct;
    if (persona.contextNote) dynamicVariables.context_note = persona.contextNote;
    if (persona.scenarioType) dynamicVariables.scenario_type = persona.scenarioType;
  }

  return {
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "",
    language: getElevenLabsLanguage(language),
    voiceId,
    speed: 1.0,
    dynamicVariables,
  };
}
