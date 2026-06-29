/**
 * ElevenLabs Conversational AI voice configuration.
 * Maps application voice language settings to ElevenLabs language codes and agent overrides.
 */

import { VoiceLanguage, VOICE_LANGUAGE_MAP as AppVoiceMap } from "./voice-language";

export type ElevenLabsLanguage = "en" | "en-SG" | "ms" | "id" | "zh" | undefined;

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
  singlish: { label: AppVoiceMap.singlish.label, recognitionLang: AppVoiceMap.singlish.recognitionLang, elevenLabsLang: "en" },
  malay: { label: AppVoiceMap.malay.label, recognitionLang: AppVoiceMap.malay.recognitionLang, elevenLabsLang: "ms" },
  indonesian: { label: AppVoiceMap.indonesian.label, recognitionLang: AppVoiceMap.indonesian.recognitionLang, elevenLabsLang: "id" },
  mandarin: { label: AppVoiceMap.mandarin.label, recognitionLang: AppVoiceMap.mandarin.recognitionLang, elevenLabsLang: "zh" },
};

export function getElevenLabsLanguage(language: VoiceLanguage): ElevenLabsLanguage {
  return VOICE_LANGUAGE_MAP[language]?.elevenLabsLang;
}

export function buildVoiceConfig(
  sessionId: string,
  language: VoiceLanguage = "en",
  voiceId?: string
): VoiceConfig {
  return {
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "",
    language: getElevenLabsLanguage(language),
    voiceId,
    speed: 1.0,
    dynamicVariables: {
      session_id: sessionId,
      language: language,
    },
  };
}
