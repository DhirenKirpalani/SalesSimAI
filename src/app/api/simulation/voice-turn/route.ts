/**
 * Voice Call Turn API
 * Receives user transcript, runs direct GPT-4o with persona prompt,
 * TTS the response (ElevenLabs preferred, OpenAI fallback), returns SSE with text + audio.
 *
 * Flow:
 *   User speaks → Web Speech API → POST here
 *   → Build persona system prompt inline
 *   → GPT-4o direct call (plain text, no JSON mode)
 *   → ElevenLabs TTS (or OpenAI fallback) on full response
 *   → SSE: {type:"text"} + {type:"audio", data: base64}
 *   → Persist messages to simulation_messages
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CustomPersona } from "@/types";
import { SimulationMessage, SimulationState } from "@/types/simulation";
import { mockPersonas } from "@/lib/data/mockData";
import { buildCompanyRagContext } from "@/lib/vector-store";
import { VOICE_LANGUAGE_MAP, VoiceLanguage } from "@/lib/voice-language";
import { buildSystemPrompt, applyStateUpdates } from "@/lib/buyer-brain";

function sseLine(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const { sessionId, transcript, voiceId, language } = await req.json();
        const voiceLanguage: VoiceLanguage = VOICE_LANGUAGE_MAP[language as VoiceLanguage] ? (language as VoiceLanguage) : "en";

        if (!sessionId || !transcript?.trim()) {
          controller.enqueue(encoder.encode(sseLine({ type: "error", message: "Missing sessionId or transcript" })));
          controller.close();
          return;
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          controller.enqueue(encoder.encode(sseLine({ type: "error", message: "Unauthorized" })));
          controller.close();
          return;
        }

        // Load session + scenario + profile in parallel
        const [{ data: session, error: sessionError }, { data: profile }, { data: recentMessages }] = await Promise.all([
          supabase.from("simulation_sessions").select("*").eq("id", sessionId).eq("user_id", user.id).single(),
          supabase.from("profiles").select("full_name, position, company, organization_id").eq("id", user.id).single(),
          supabase
            .from("simulation_messages")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true })
            .limit(20),
        ]);

        if (sessionError || !session) {
          controller.enqueue(encoder.encode(sseLine({ type: "error", message: "Session not found" })));
          controller.close();
          return;
        }

        if (session.status !== "active") {
          controller.enqueue(encoder.encode(sseLine({ type: "error", message: "Session is not active" })));
          controller.close();
          return;
        }

        const { data: scenario, error: scenarioError } = await supabase
          .from(session.scenario_table)
          .select("custom_persona, preset_persona_id, context_note, seller_description, name, seller_company, seller_product, scenario_type, difficulty, duration, product_type")
          .eq("id", session.scenario_id)
          .single();

        if (scenarioError || !scenario) {
          controller.enqueue(encoder.encode(sseLine({ type: "error", message: "Scenario not found" })));
          controller.close();
          return;
        }

        // Resolve persona
        let persona: CustomPersona = scenario.custom_persona as CustomPersona;
        if (!persona && scenario.preset_persona_id) {
          const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
          if (preset) {
            persona = {
              name: preset.name,
              jobTitle: preset.jobTitle,
              company: preset.company,
              industry: preset.industry,
              personality: preset.personality,
              painPoints: preset.painPoints,
              goals: preset.goals,
            };
          }
        }
        if (!persona) {
          persona = {
            name: "Alex Buyer",
            jobTitle: "VP of Operations",
            company: "a different company",
            industry: "Technology",
            personality: "analytical, skeptical, busy",
            painPoints: ["efficiency", "cost control"],
          };
        }

        // Build context note
        const contextParts: string[] = [];
        if (scenario.scenario_type) contextParts.push(`Call type: ${scenario.scenario_type}`);
        if (scenario.product_type) contextParts.push(`Product category: ${scenario.product_type}`);
        if (scenario.seller_company) contextParts.push(`Selling company: ${scenario.seller_company}`);
        if (scenario.seller_product) contextParts.push(`Product: ${scenario.seller_product}`);
        if (scenario.context_note) contextParts.push(`Backstory: ${scenario.context_note}`);
        const richContextNote = contextParts.join("\n");

        // Company RAG — fetch relevant docs from the org's knowledge base
        let companyRag = "";
        if (profile?.organization_id) {
          try {
            companyRag = await buildCompanyRagContext(transcript.trim(), profile.organization_id, { limit: 3 });
          } catch (e) {
            console.warn("[voice-turn] company RAG failed:", e);
          }
        }

        const messages: SimulationMessage[] = (recentMessages ?? []) as SimulationMessage[];
        const state = (session.state ?? { trust_level: 30, buyer_mood: 0, stage: "opening", facts_discovered: { budget: false, decision_maker: false, timeline: false, current_solution: false }, objections_used: [], engagement_level: 30 }) as SimulationState;
        const sessionStart = new Date(session.created_at ?? Date.now());
        const elapsedMin = Math.max(0, Math.round((Date.now() - sessionStart.getTime()) / 60000));
        const sellerInfo = { name: profile?.full_name ?? undefined, position: profile?.position ?? undefined, company: profile?.company ?? undefined };

        let systemPrompt = buildSystemPrompt(
          persona,
          richContextNote,
          scenario.seller_description || "",
          state,
          sellerInfo,
          scenario.difficulty ?? undefined,
          scenario.scenario_type ?? undefined,
          messages,
          companyRag,
          scenario.duration ?? undefined,
          elapsedMin
        );

        // Voice-specific language override for explicit language selection
        if (voiceLanguage !== "auto" && voiceLanguage !== "en") {
          systemPrompt += `\n\nVOICE LANGUAGE OVERRIDE: You MUST respond in ${VOICE_LANGUAGE_MAP[voiceLanguage].promptName} for this call. Use natural vocabulary, slang, tone, and sentence structure typical of this language. If the seller switches language, you may follow, but always default back to ${VOICE_LANGUAGE_MAP[voiceLanguage].promptName}.`;
        }

        // Persist user message immediately
        const userMsgPromise = supabase.from("simulation_messages").insert({
          session_id: sessionId,
          role: "user",
          content: transcript.trim(),
        });

        console.log(`[voice-turn] scenario_type=${scenario.scenario_type}, difficulty=${scenario.difficulty}, persona=${persona.name}`);

        // Call GPT-4o with minimal JSON for live coaching (emotion + intent)
        const openAiKey = process.env.OPENAI_API_KEY;
        let buyerText = "I'm not sure what to say.";
        let buyerEmotion = "neutral";
        let buyerIntent = "answer";
        if (openAiKey) {
          try {
            const chatHistory = messages.slice(-10).map((m) => ({
              role: m.role === "user" ? ("user" as const) : ("assistant" as const),
              content: m.content,
            }));

            const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openAiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                  { role: "system", content: systemPrompt },
                  ...chatHistory,
                  { role: "user", content: transcript.trim() },
                ],
                response_format: { type: "json_object" },
                temperature: 0.75,
                max_tokens: 250,
              }),
            });

            if (gptRes.ok) {
              const data = await gptRes.json();
              const raw = data.choices?.[0]?.message?.content?.trim() || "";
              try {
                const parsed = JSON.parse(raw);
                buyerText = parsed.message || parsed.response || raw;
                buyerEmotion = parsed.emotion || "neutral";
                buyerIntent = parsed.intent || "answer";
                if (parsed.state_updates) {
                  const newState = applyStateUpdates(state, parsed.state_updates, messages.length + 1);
                  supabase.from("simulation_sessions").update({ state: newState }).eq("id", sessionId).then(() => {});
                }
              } catch {
                buyerText = raw;
              }
            } else {
              console.error("[voice-turn] GPT error:", await gptRes.text());
            }
          } catch (gptErr) {
            console.error("[voice-turn] GPT exception:", gptErr);
          }
        }

        // Send text immediately
        controller.enqueue(encoder.encode(sseLine({ type: "text", content: buyerText })));

        // TTS — ElevenLabs preferred, OpenAI fallback
        const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
        const ttsInput = buyerText.slice(0, 4096);
        let audioSent = false;

        if (elevenLabsKey) {
          try {
            const effectiveVoiceId = voiceId || selectElevenLabsVoice(persona.personality, voiceLanguage);
            const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${effectiveVoiceId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "xi-api-key": elevenLabsKey,
              },
              body: JSON.stringify({
                text: ttsInput,
                model_id: "eleven_flash_v2_5",
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75,
                  speed: 1.1,
                },
                output_format: "mp3_44100_128",
              }),
            });
            if (ttsRes.ok) {
              const audioBuffer = await ttsRes.arrayBuffer();
              const base64 = Buffer.from(audioBuffer).toString("base64");
              controller.enqueue(encoder.encode(sseLine({ type: "audio", data: base64, format: "mp3" })));
              audioSent = true;
            } else {
              console.error("[voice-turn] ElevenLabs error:", await ttsRes.text());
            }
          } catch (ttsErr) {
            console.error("[voice-turn] ElevenLabs exception:", ttsErr);
          }
        }

        // OpenAI fallback (or if ElevenLabs failed)
        if (!audioSent && openAiKey) {
          try {
            const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openAiKey}`,
              },
              body: JSON.stringify({
                model: "tts-1",
                voice: selectVoice(persona.personality),
                input: ttsInput,
                response_format: "mp3",
                speed: 1.15,
              }),
            });
            if (ttsRes.ok) {
              const audioBuffer = await ttsRes.arrayBuffer();
              const base64 = Buffer.from(audioBuffer).toString("base64");
              controller.enqueue(encoder.encode(sseLine({ type: "audio", data: base64, format: "mp3" })));
            }
          } catch (ttsErr) {
            console.error("[voice-turn] OpenAI TTS error:", ttsErr);
          }
        }

        // Persist buyer response
        await Promise.all([
          userMsgPromise,
          supabase.from("simulation_messages").insert({
            session_id: sessionId,
            role: "buyer",
            content: buyerText,
            emotion: buyerEmotion,
            intent: buyerIntent,
          }),
        ]);

        controller.enqueue(encoder.encode(sseLine({
          type: "done",
          emotion: buyerEmotion,
          intent: buyerIntent,
        })));

        controller.close();
      } catch (err) {
        console.error("[voice-turn] error:", err);
        controller.enqueue(encoder.encode(sseLine({ type: "error", message: err instanceof Error ? err.message : "Internal error" })));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function selectVoice(personality: string): string {
  const p = personality.toLowerCase();
  if (p.includes("aggressive") || p.includes("direct") || p.includes("assertive")) return "echo";
  if (p.includes("friendly") || p.includes("warm") || p.includes("collaborative")) return "nova";
  if (p.includes("analytical") || p.includes("skeptical") || p.includes("cautious")) return "onyx";
  if (p.includes("young") || p.includes("energetic")) return "shimmer";
  if (p.includes("storyteller") || p.includes("creative")) return "fable";
  return "alloy";
}

function selectElevenLabsVoice(personality: string, language: VoiceLanguage = "en"): string {
  // For auto mode and multilingual outputs, use a voice that handles many languages well.
  if (language === "auto" || language === "malay" || language === "indonesian" || language === "mandarin") {
    return "XB0fDUnXU5powFXSHcV"; // Bella — professional multilingual
  }
  if (language === "singlish") {
    return "21m00Tcm4TlvDq8ikWAM"; // Rachel — warm English, works for Singlish tone
  }
  const p = personality.toLowerCase();
  // Josh — deep, serious, authoritative
  if (p.includes("aggressive") || p.includes("direct") || p.includes("assertive")) return "TxGEqnHWrfWFTfGW9XjX";
  // Rachel — warm, natural, friendly
  if (p.includes("friendly") || p.includes("warm") || p.includes("collaborative")) return "21m00Tcm4TlvDq8ikWAM";
  // Antoni — calm, thoughtful, analytical
  if (p.includes("analytical") || p.includes("skeptical") || p.includes("cautious")) return "ErXwobaYiN019PkySvjV";
  // Elli — young, bright, energetic
  if (p.includes("young") || p.includes("energetic")) return "MF3mGyEYCl7XYWbV9V6O";
  // Sarah — soft, creative, storyteller
  if (p.includes("storyteller") || p.includes("creative")) return "EXAVITQu4vr4xnSDxMaL";
  // Default: Rachel
  return "21m00Tcm4TlvDq8ikWAM";
}
