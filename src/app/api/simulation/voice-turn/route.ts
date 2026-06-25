/**
 * Voice Call Turn API
 * Receives user transcript, runs buyer brain (streaming GPT),
 * buffers into sentences, TTS each chunk, returns SSE with text + audio.
 *
 * Flow:
 *   User speaks → Web Speech API → POST here
 *   → processTurn (GPT-4o, full response like video call)
 *   → Single TTS call on full response
 *   → SSE: {type:"text"} + {type:"audio", data: base64}
 *   → Simpler, fewer API calls, consistent with video call flow
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processTurn } from "@/lib/buyer-brain";
import { buildRagContext } from "@/lib/vector-store";
import { CustomPersona } from "@/types";
import { SimulationState, SimulationMessage } from "@/types/simulation";
import { mockPersonas } from "@/lib/data/mockData";

function sseLine(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const { sessionId, transcript } = await req.json();

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
          supabase.from("profiles").select("full_name, position, company").eq("id", user.id).single(),
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
          .select("custom_persona, preset_persona_id, context_note, seller_description, name, seller_company, seller_product, scenario_type, difficulty, duration")
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
            company: scenario.seller_company ?? "a mid-market company",
            industry: "Technology",
            personality: "analytical, skeptical, busy",
            painPoints: ["efficiency", "cost control"],
          };
        }

        const contextParts: string[] = [];
        if (scenario.scenario_type) contextParts.push(`Call type: ${scenario.scenario_type}`);
        if (scenario.difficulty) contextParts.push(`Difficulty level: ${scenario.difficulty}`);
        if (scenario.duration) contextParts.push(`Call duration: ${scenario.duration} minutes`);
        if (scenario.seller_company) contextParts.push(`Selling company: ${scenario.seller_company}`);
        if (scenario.seller_product) contextParts.push(`Product: ${scenario.seller_product}`);
        if (scenario.context_note) contextParts.push(`Backstory: ${scenario.context_note}`);
        const richContextNote = contextParts.join("\n");

        const state = session.state as SimulationState;
        const sellerInfo = { name: profile?.full_name ?? undefined, position: profile?.position ?? undefined, company: profile?.company ?? undefined };
        const messages: SimulationMessage[] = (recentMessages ?? []) as SimulationMessage[];

        // Persist user message immediately
        const userMsgPromise = supabase.from("simulation_messages").insert({
          session_id: sessionId,
          role: "user",
          content: transcript.trim(),
        });

        // Query vector store for similar past buyer responses (RAG)
        const ragContext = await buildRagContext(
          transcript.trim(),
          user.id,
          scenario.scenario_type ?? undefined
        ).catch(() => "");

        console.log(`[voice-turn] scenario_type=${scenario.scenario_type}, difficulty=${scenario.difficulty}, persona=${persona.name}`);

        // Run buyer brain (non-streaming, same as video call)
        const buyerResponse = await processTurn(
          persona,
          richContextNote,
          scenario.seller_description ?? "",
          state,
          messages,
          transcript.trim(),
          sellerInfo,
          scenario.difficulty ?? undefined,
          scenario.scenario_type ?? undefined,
          ragContext || undefined
        );

        // Send text immediately
        controller.enqueue(encoder.encode(sseLine({ type: "text", content: buyerResponse.message })));

        // Single TTS call on the full response
        const openAiKey = process.env.OPENAI_API_KEY;
        if (openAiKey) {
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
                input: buyerResponse.message.slice(0, 4096),
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
            console.error("[voice-turn] TTS error:", ttsErr);
          }
        }

        // Persist buyer response + updated state
        const { applyStateUpdates } = await import("@/lib/buyer-brain");
        const newState = applyStateUpdates(state, buyerResponse.state_updates, messages.length + 1);

        await Promise.all([
          userMsgPromise,
          supabase.from("simulation_messages").insert({
            session_id: sessionId,
            role: "buyer",
            content: buyerResponse.message,
            emotion: buyerResponse.emotion,
            intent: buyerResponse.intent,
          }),
          supabase.from("simulation_sessions").update({ state: newState }).eq("id", sessionId),
        ]);

        controller.enqueue(encoder.encode(sseLine({
          type: "done",
          state: newState,
          emotion: buyerResponse.emotion,
          intent: buyerResponse.intent,
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
