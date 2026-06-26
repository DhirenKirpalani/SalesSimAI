/**
 * Voice Call Turn API
 * Receives user transcript, runs direct GPT-4o with persona prompt,
 * TTS the response, returns SSE with text + audio.
 *
 * Flow:
 *   User speaks → Web Speech API → POST here
 *   → Build persona system prompt inline
 *   → GPT-4o direct call (plain text, no JSON mode)
 *   → Single TTS call on full response
 *   → SSE: {type:"text"} + {type:"audio", data: base64}
 *   → Persist messages to simulation_messages
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CustomPersona } from "@/types";
import { SimulationMessage } from "@/types/simulation";
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
            company: "a different company",
            industry: "Technology",
            personality: "analytical, skeptical, busy",
            painPoints: ["efficiency", "cost control"],
          };
        }

        // Build persona system prompt inline
        const contextParts: string[] = [];
        if (scenario.scenario_type) contextParts.push(`Call type: ${scenario.scenario_type}`);
        if (scenario.difficulty) contextParts.push(`Difficulty level: ${scenario.difficulty}`);
        if (scenario.duration) contextParts.push(`Call duration: ${scenario.duration} minutes`);
        if (scenario.seller_company) contextParts.push(`Selling company: ${scenario.seller_company}`);
        if (scenario.seller_product) contextParts.push(`Product: ${scenario.seller_product}`);
        if (scenario.context_note) contextParts.push(`Backstory: ${scenario.context_note}`);

        // Time pressure awareness
        const sessionStart = new Date(session.created_at ?? Date.now());
        const elapsedMin = Math.max(0, Math.round((Date.now() - sessionStart.getTime()) / 60000));
        const totalMin = scenario.duration ?? 5;
        const remainingMin = Math.max(0, totalMin - elapsedMin);
        const remainingPct = totalMin > 0 ? remainingMin / totalMin : 1;
        let timePressure = "";
        if (remainingPct <= 0.1) {
          timePressure = `TIME PRESSURE: Only ~${remainingMin} min left. You are RUSHED. Wrap up quickly — either push for concrete next steps or politely indicate you need to end the call. Be brief (1 sentence).`;
        } else if (remainingPct <= 0.3) {
          timePressure = `TIME PRESSURE: ~${remainingMin} min remaining. You are getting IMPATIENT. Cut small talk. Ask direct questions or push for a decision. Don't let the seller ramble.`;
        } else if (remainingPct <= 0.7) {
          timePressure = `TIME: ~${remainingMin} min left. Normal engagement. Stay in character.`;
        } else {
          timePressure = `TIME: ~${remainingMin} min left. Early in the call. Be patient, exploratory, and let the seller lead.`;
        }
        if (timePressure) contextParts.push(timePressure);

        const richContextNote = contextParts.join("\n");

        const messages: SimulationMessage[] = (recentMessages ?? []) as SimulationMessage[];

        const systemPrompt = `You are ${persona.name}, ${persona.jobTitle} at ${persona.company}.
Industry: ${persona.industry ?? "Technology"}
Personality: ${persona.personality}
Pain points: ${persona.painPoints?.join(", ") || "unspecified"}
Goals: ${persona.goals?.join(", ") || "unspecified"}

${richContextNote}

SELLER INFO (you do NOT know this in detail):
${scenario.seller_description || "A sales rep is calling you."}

ROLE GUARDRAILS — never break these:
- You are the BUYER / PROSPECT. You are NOT the seller. Never pitch, explain, or describe their product.
- Never say "we provide", "our platform", "our solution", "how can I help", "how can I assist", "let me tell you about", or any offer to help or sell.
- When asked who you are, say ONLY your name, role, and company. Nothing more. Never follow it with "How can I help?"
- You are a real person with opinions, frustrations, and limited patience.
- Be skeptical. Ask tough questions. Don't volunteer information.
- Respond naturally in 1-3 sentences.
- Your behavior MUST shift based on remaining time (see TIME PRESSURE above).

RESPOND IN JSON:
{"message":"your spoken response","emotion":"neutral|skeptical|interested|frustrated","intent":"answer|objection|question|redirect"}`;

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

        // Single TTS call on the full response
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
                input: buyerText.slice(0, 4096),
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
