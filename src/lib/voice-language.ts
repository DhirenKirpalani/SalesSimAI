export type VoiceLanguage = "auto" | "en" | "singlish" | "malay" | "indonesian" | "mandarin";

export const VOICE_LANGUAGE_MAP: Record<VoiceLanguage, { label: string; recognitionLang: string; promptName: string }> = {
  auto: { label: "Auto-match seller", recognitionLang: "en", promptName: "the seller's language" },
  en: { label: "English", recognitionLang: "en", promptName: "English" },
  singlish: { label: "Singlish", recognitionLang: "en-SG", promptName: "Singlish (Singapore English)" },
  malay: { label: "Malay", recognitionLang: "ms-MY", promptName: "Malay" },
  indonesian: { label: "Bahasa Indonesia", recognitionLang: "id-ID", promptName: "Bahasa Indonesia" },
  mandarin: { label: "Mandarin", recognitionLang: "zh-CN", promptName: "Mandarin Chinese" },
};
