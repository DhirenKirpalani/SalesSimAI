/**
 * Voice Call Turn API — Streaming Pipeline
 *
 * Flow:
 *   User speaks → Web Speech API → POST here
 *   → Build persona system prompt inline
 *   → GPT-4o STREAMING (plain text, no JSON mode)
 *   → Sentence buffer detects sentence boundaries
 *   → ElevenLabs TTS per sentence (or OpenAI fallback)
 *   → SSE: {type:"text"} per sentence + {type:"audio"} per sentence
 *   → Browser plays audio chunks in order while GPT continues generating
 *   → After stream ends: quick gpt-4o-mini call for emotion/intent/state
 *   → Persist messages to simulation_messages
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CustomPersona } from "@/types";
import { SimulationMessage, SimulationState } from "@/types/simulation";
import { mockPersonas } from "@/lib/data/mockData";
import { VOICE_LANGUAGE_MAP, VoiceLanguage } from "@/lib/voice-language";
import { buildSystemPrompt, applyStateUpdates, getConditionalRagContext, shouldRetrieveRag, buildBuyerContext, renderBuyerContext, extractMemoryUpdates, renderBuyerMemory, defaultBuyerMemory, computeRagStateImpact, mergeRagImpactIntoStateUpdates } from "@/lib/buyer-brain";
import type { BuyerMemory, RagStateImpact } from "@/lib/buyer-brain";

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
          supabase.from("simulation_sessions").select("*, buyer_context, buyer_memory").eq("id", sessionId).eq("user_id", user.id).single(),
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

        const messages: SimulationMessage[] = (recentMessages ?? []) as SimulationMessage[];
        const state = (session.state ?? { trust_level: 30, buyer_mood: 0, stage: "opening", facts_discovered: { budget: false, decision_maker: false, timeline: false, current_solution: false }, objections_used: [], engagement_level: 30 }) as SimulationState;

        // Company RAG — only retrieve when the turn actually asks for company knowledge.
        let companyRag = "";
        let ragImpact: RagStateImpact | null = null;
        const trimmedTranscript = transcript.trim();
        if (shouldRetrieveRag(trimmedTranscript) && profile?.organization_id) {
          try {
            companyRag = await getConditionalRagContext(trimmedTranscript, profile.organization_id, { limit: 3 });
            ragImpact = await computeRagStateImpact(trimmedTranscript, companyRag, state);
          } catch (e) {
            console.warn("[voice-turn] company RAG failed:", e);
          }
        }

        const sessionStart = new Date(session.created_at ?? Date.now());
        const elapsedMin = Math.max(0, Math.round((Date.now() - sessionStart.getTime()) / 60000));
        const sellerInfo = { name: profile?.full_name ?? undefined, position: profile?.position ?? undefined, company: profile?.company ?? undefined };
        const buyerMemory = (session.buyer_memory as BuyerMemory | null) ?? defaultBuyerMemory;

        // Load or build the static buyer context (system prompt) once per session.
        let systemPrompt: string | null = null;
        const storedContext = session.buyer_context as { response_format?: { mode?: string } } | null;
        if (storedContext?.response_format?.mode === "streaming") {
          systemPrompt = renderBuyerContext(storedContext as any);
        }
        if (!systemPrompt) {
          const freshContext = buildBuyerContext(
            persona,
            scenario.scenario_type ?? "Discovery Call",
            scenario.difficulty ?? "Intermediate",
            sellerInfo,
            "streaming"
          );
          systemPrompt = renderBuyerContext(freshContext);
          const { error: cacheError } = await supabase
            .from("simulation_sessions")
            .update({ buyer_context: freshContext as any })
            .eq("id", sessionId);
          if (cacheError) {
            console.warn("[voice-turn] failed to cache buyer_context:", cacheError);
          }
        }

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

        const openAiKey = process.env.OPENAI_API_KEY;
        const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
        let buyerText = "I'm not sure what to say.";
        let buyerEmotion = "neutral";
        let buyerIntent = "answer";
        let action: string | undefined;

        // ── Streaming pipeline: GPT-4o stream → sentence buffer → TTS per sentence → SSE audio chunks ──
        if (openAiKey) {
          try {
            const chatHistory = messages.slice(-10).map((m) => ({
              role: m.role === "user" ? ("user" as const) : ("assistant" as const),
              content: m.content,
            }));

            // Override JSON format — for voice, we want spoken text + inline metadata
            const voiceSystemPrompt = systemPrompt.replace(
              /RESPONSE FORMAT — return ONLY valid JSON[\s\S]*$/,
              `OUTPUT FORMAT — two sections separated by exactly "---":

Section 1: Your spoken response (plain text, 2-4 sentences, NO JSON).
---
Section 2: JSON only:
{"emotion":"neutral|skeptical|interested|frustrated","intent":"answer|objection|question|redirect","state_updates":{"trust_delta":<-15 to 15>,"mood_delta":<-5 to 5>,"facts_revealed":[]},"follow_up_question":"<optional>"}`
            );

            const memoryText = renderBuyerMemory(buyerMemory);
            const userPrompt = memoryText
              ? `${memoryText}\n\nSELLER SAID:\n${transcript.trim()}`
              : transcript.trim();

            const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openAiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                  { role: "system", content: voiceSystemPrompt },
                  ...chatHistory,
                  { role: "user", content: userPrompt },
                ],
                stream: true,
                temperature: 0.75,
                max_tokens: 250,
              }),
            });

            if (gptRes.ok && gptRes.body) {
              const reader = gptRes.body.getReader();
              const decoder = new TextDecoder();
              let gptBuffer = "";
              let fullText = "";
              let textBuffer = "";   // spoken text before the "---" separator
              let metaBuffer = "";   // JSON metadata after the "---" separator
              let sentenceBuffer = "";
              let ttsChunkIndex = 0;
              let pastSeparator = false;

              // Helper: send a sentence to TTS and emit audio SSE
              const ttsSentence = async (text: string) => {
                const trimmed = text.trim();
                if (!trimmed) return;
                ttsChunkIndex++;

                // Send text chunk to client immediately
                controller.enqueue(encoder.encode(sseLine({ type: "text", content: trimmed })));

                // TTS — ElevenLabs preferred, OpenAI fallback
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
                        text: trimmed.slice(0, 4096),
                        model_id: "eleven_flash_v2_5",
                        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.1 },
                        output_format: "mp3_44100_128",
                      }),
                    });
                    if (ttsRes.ok) {
                      const audioBuffer = await ttsRes.arrayBuffer();
                      const base64 = Buffer.from(audioBuffer).toString("base64");
                      controller.enqueue(encoder.encode(sseLine({ type: "audio", data: base64, format: "mp3", chunkIndex: ttsChunkIndex })));
                      return;
                    } else {
                      console.error("[voice-turn] ElevenLabs error:", await ttsRes.text());
                    }
                  } catch (ttsErr) {
                    console.error("[voice-turn] ElevenLabs exception:", ttsErr);
                  }
                }

                // OpenAI TTS fallback
                if (openAiKey) {
                  try {
                    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
                      body: JSON.stringify({
                        model: "tts-1",
                        voice: selectVoice(persona.personality),
                        input: trimmed.slice(0, 4096),
                        response_format: "mp3",
                        speed: 1.15,
                      }),
                    });
                    if (ttsRes.ok) {
                      const audioBuffer = await ttsRes.arrayBuffer();
                      const base64 = Buffer.from(audioBuffer).toString("base64");
                      controller.enqueue(encoder.encode(sseLine({ type: "audio", data: base64, format: "mp3", chunkIndex: ttsChunkIndex })));
                    }
                  } catch (ttsErr) {
                    console.error("[voice-turn] OpenAI TTS error:", ttsErr);
                  }
                }
              };

              // Read the stream
              let firstClauseSent = false;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                gptBuffer += decoder.decode(value, { stream: true });
                const lines = gptBuffer.split("\n");
                gptBuffer = lines.pop() ?? "";

                for (const line of lines) {
                  if (!line.startsWith("data: ")) continue;
                  const raw = line.slice(6).trim();
                  if (raw === "[DONE]") continue;

                  try {
                    const chunk = JSON.parse(raw);
                    const token = chunk.choices?.[0]?.delta?.content ?? "";
                    if (!token) continue;

                    fullText += token;

                    if (!pastSeparator) {
                      textBuffer += token;
                      const sepIdx = textBuffer.indexOf("\n---");
                      if (sepIdx !== -1) {
                        pastSeparator = true;
                        const textBeforeThisDelta = textBuffer.length - token.length;
                        const tailFromDelta = sepIdx > textBeforeThisDelta
                          ? token.slice(0, sepIdx - textBeforeThisDelta)
                          : "";
                        sentenceBuffer += tailFromDelta;
                        // Flush any remaining spoken text before the separator
                        if (sentenceBuffer.trim()) {
                          await ttsSentence(sentenceBuffer);
                          sentenceBuffer = "";
                        }
                        firstClauseSent = true;
                        metaBuffer = textBuffer.slice(sepIdx + 4); // after "\n---"
                        textBuffer = "";
                      } else {
                        sentenceBuffer += token;
                        // Check for sentence boundaries
                        const sentenceEnd = sentenceBuffer.search(/[.!?]\s/);
                        if (sentenceEnd >= 0) {
                          const sentence = sentenceBuffer.slice(0, sentenceEnd + 1);
                          sentenceBuffer = sentenceBuffer.slice(sentenceEnd + 2);
                          await ttsSentence(sentence);
                          firstClauseSent = true;
                        } else if (!firstClauseSent && sentenceBuffer.length > 45 && sentenceBuffer.split(/\s+/).filter(Boolean).length >= 6) {
                          // First chunk: send a clause/phrase early to reduce time-to-first-audio
                          const breakAt = sentenceBuffer.lastIndexOf(", ");
                          if (breakAt > 15) {
                            const chunk = sentenceBuffer.slice(0, breakAt + 1);
                            sentenceBuffer = sentenceBuffer.slice(breakAt + 2);
                            await ttsSentence(chunk);
                            firstClauseSent = true;
                          }
                        }
                      }
                    } else {
                      metaBuffer += token;
                    }
                  } catch {
                    // skip unparseable chunks
                  }
                }
              }

              // Flush any remaining text
              const flushPromise = sentenceBuffer.trim()
                ? ttsSentence(sentenceBuffer)
                : Promise.resolve();

              await flushPromise;

              buyerText = fullText.split("\n---")[0].trim() || buyerText;

              // Parse inline metadata generated by the same model
              try {
                const jsonStr = metaBuffer.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
                const parsed = JSON.parse(jsonStr);
                buyerEmotion = parsed.emotion || "neutral";
                buyerIntent = parsed.intent || "answer";
                if (parsed.action) {
                  action = parsed.action;
                }
                if (parsed.state_updates) {
                  const mergedStateUpdates = ragImpact
                    ? mergeRagImpactIntoStateUpdates(parsed.state_updates, ragImpact)
                    : parsed.state_updates;
                  const newState = applyStateUpdates(state, mergedStateUpdates, messages.length + 1);
                  const updatedMemory = await extractMemoryUpdates(buyerMemory, transcript.trim(), buyerText, messages);
                  supabase.from("simulation_sessions").update({ state: newState, buyer_memory: updatedMemory as any }).eq("id", sessionId).then(() => {});
                }
              } catch { /* use defaults */ }
            } else {
              console.error("[voice-turn] GPT stream error:", await gptRes.text().catch(() => "unknown"));
            }
          } catch (gptErr) {
            console.error("[voice-turn] GPT exception:", gptErr);
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
            action: action as any,
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
