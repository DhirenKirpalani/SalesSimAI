/**
 * ElevenLabs Conversational AI — Custom LLM endpoint.
 *
 * ElevenLabs calls this endpoint instead of OpenAI directly.
 * We run the existing buyer brain (processTurnStream) and return a streaming
 * OpenAI-compatible SSE response so ElevenLabs can TTS it in real time.
 *
 * Configure the agent in the ElevenLabs dashboard:
 *   LLM provider: Custom LLM
 *   URL: https://your-app.com/api/eleven-agent/webhook
 *   Custom LLM extra body: enabled
 *
 * The frontend passes session_id via dynamicVariables; ElevenLabs forwards it
 * in elevenlabs_extra_body.session_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { processTurnStream, applyStateUpdates } from "@/lib/buyer-brain";
import { buildCompanyRagContext } from "@/lib/vector-store";
import { CustomPersona } from "@/types";
import { SimulationState, SimulationMessage } from "@/types/simulation";
import { mockPersonas } from "@/lib/data/mockData";

function serviceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function sseChunk(id: string, content: string, first = false): string {
  const delta: Record<string, unknown> = { content };
  if (first) delta.role = "assistant";
  return (
    "data: " +
    JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: "gpt-4o",
      choices: [{ index: 0, delta, finish_reason: null }],
    }) +
    "\n\n"
  );
}

function sseFallback(id: string, text: string): string {
  return sseChunk(id, text, true) + sseDone(id);
}

function sseDone(id: string): string {
  return (
    "data: " +
    JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: "gpt-4o",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    }) +
    "\n\n" +
    "data: [DONE]\n\n"
  );
}

function computeThinkingDelay(state: SimulationState, persona: CustomPersona): number {
  const mood = state.buyer_mood ?? 0;
  const personality = (persona.personality ?? "").toLowerCase();
  const traits = (persona.personalityTraits ?? []).join(" ").toLowerCase();
  const combined = `${personality} ${traits}`;

  // Frustrated / angry buyers respond quickly (or interrupt)
  if (mood <= -3 || combined.includes("frustrated") || combined.includes("impatient") || combined.includes("angry")) {
    return 0;
  }

  // Skeptical / analytical buyers pause longer
  if (mood < 0 || combined.includes("skeptical") || combined.includes("analytical") || combined.includes("cautious")) {
    return 500 + Math.floor(Math.random() * 200);
  }

  // Interested / thoughtful buyers
  if (combined.includes("interested") || combined.includes("thoughtful") || combined.includes("friendly")) {
    return 250 + Math.floor(Math.random() * 150);
  }

  // Default neutral
  return 150 + Math.floor(Math.random() * 150);
}

function resolveSessionId(req: NextRequest, body: Record<string, unknown>): string | null {
  // ElevenLabs can forward the session ID as a custom request header
  const headerSessionId = req.headers.get("X-Session-Id");
  console.log("[eleven-agent] resolveSessionId headers:", Object.fromEntries(req.headers.entries()), "body keys:", Object.keys(body));
  if (headerSessionId) return headerSessionId;

  // ElevenLabs forwards dynamic variables in elevenlabs_extra_body
  const extra = body.elevenlabs_extra_body as Record<string, unknown> | undefined;
  if (typeof extra?.session_id === "string" && extra.session_id) return extra.session_id;
  if (typeof extra?.sessionId === "string" && extra.sessionId) return extra.sessionId;

  // Fallback: try to extract from the last user message content
  const messages = (body.messages ?? []) as Array<{ role: string; content?: string }>;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser?.content?.startsWith("session_id:")) {
    return lastUser.content.split("\n")[0].replace("session_id:", "").trim();
  }
  return null;
}

export async function POST(req: NextRequest) {
  const completionId = `chatcmpl-${Date.now()}`;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    console.log("[eleven-agent] POST body:", JSON.stringify(body, null, 2));
    const stream = (body.stream as boolean) ?? true;
    const sessionId = resolveSessionId(req, body);
    console.log("[eleven-agent] resolved sessionId:", sessionId, "stream:", stream);

    if (!sessionId) {
      console.error("[eleven-agent] missing session_id — returning SSE fallback");
      const enc = new TextEncoder();
      const fb = new ReadableStream({ start(c) { c.enqueue(enc.encode(sseFallback(completionId, "Sorry, give me a moment."))); c.close(); } });
      return new NextResponse(fb, { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
    }

    const messages = (body.messages ?? []) as Array<{ role: string; content?: string }>;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const userText = lastUserMsg?.content?.trim() ?? "";

    if (!userText) {
      console.error("[eleven-agent] no user text — returning SSE done");
      const enc = new TextEncoder();
      const fb = new ReadableStream({ start(c) { c.enqueue(enc.encode(sseDone(completionId))); c.close(); } });
      return new NextResponse(fb, { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
    }
    console.log("[eleven-agent] userText:", userText);

    const supabase = serviceSupabase();

    // Load session first (we need the user_id to load the profile)
    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("[eleven-agent] session not found:", sessionId, sessionError);
      const enc = new TextEncoder();
      const fb = new ReadableStream({ start(c) { c.enqueue(enc.encode(sseFallback(completionId, "Sorry, I seem to have lost context. Could you repeat that?"))); c.close(); } });
      return new NextResponse(fb, { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
    }
    console.log("[eleven-agent] session loaded:", { id: session.id, user_id: session.user_id, state: session.state, scenario_id: session.scenario_id });

    // Load profile, messages, and scenario all in parallel (scenario_id/table are on the session)
    const [{ data: profile }, { data: recentMessages }, { data: scenario }] = await Promise.all([
      supabase.from("profiles").select("full_name, position, company, organization_id").eq("id", session.user_id).single(),
      supabase
        .from("simulation_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(20),
      supabase
        .from(session.scenario_table)
        .select("custom_persona, preset_persona_id, context_note, seller_description, name, seller_company, seller_product, difficulty, scenario_type, duration, product_type")
        .eq("id", session.scenario_id)
        .single(),
    ]);

    console.log("[eleven-agent] profile:", profile, "recentMessages count:", recentMessages?.length ?? 0);

    if (!scenario) {
      console.error("[eleven-agent] scenario not found:", session.scenario_id, session.scenario_table);
      const enc = new TextEncoder();
      const fb = new ReadableStream({ start(c) { c.enqueue(enc.encode(sseFallback(completionId, "Sorry, I seem to have lost context. Could you repeat that?"))); c.close(); } });
      return new NextResponse(fb, { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
    }
    console.log("[eleven-agent] scenario loaded:", { name: scenario.name, type: scenario.scenario_type, difficulty: scenario.difficulty });

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
    console.log("[eleven-agent] persona:", persona?.name ?? "fallback");
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
    console.log("[eleven-agent] richContextNote:", richContextNote);

    // Company RAG
    let companyRag = "";
    if (profile?.organization_id) {
      try {
        companyRag = await buildCompanyRagContext(userText, profile.organization_id, { limit: 3 });
      } catch (e) {
        console.warn("[eleven-agent] company RAG failed:", e);
      }
    }

    console.log("[eleven-agent] companyRag:", companyRag ? `${companyRag.slice(0, 200)}...` : "none");
    const state = (session.state ?? {
      trust_level: 30,
      buyer_mood: 0,
      stage: "opening",
      facts_discovered: { budget: false, decision_maker: false, timeline: false, current_solution: false },
      objections_used: [],
      engagement_level: 30,
    }) as SimulationState;

    const sessionStart = new Date(session.created_at ?? Date.now());
    const elapsedMin = Math.max(0, Math.round((Date.now() - sessionStart.getTime()) / 60000));
    const sellerInfo = {
      name: profile?.full_name ?? undefined,
      position: profile?.position ?? undefined,
      company: profile?.company ?? undefined,
    };

    console.log(
      "[eleven-agent] session:", sessionId,
      "scenario:", scenario.scenario_type,
      "difficulty:", scenario.difficulty,
      "persona:", persona.name,
      "elapsedMin:", elapsedMin,
      "sellerInfo:", sellerInfo
    );

    if (!stream) {
      // Non-streaming fallback (shouldn't be used by ElevenLabs, but keeps the endpoint compatible)
      const chunks: string[] = [];
      let finalResponse: { message: string; emotion: string; intent: string; state_updates: { trust_delta: number; mood_delta: number; facts_revealed: string[] } } = {
        message: "",
        emotion: "neutral",
        intent: "answer",
        state_updates: { trust_delta: 0, mood_delta: 0, facts_revealed: [] },
      };
      for await (const chunk of processTurnStream(
        persona,
        richContextNote,
        scenario.seller_description || "",
        state,
        (recentMessages ?? []) as SimulationMessage[],
        userText,
        sellerInfo,
        scenario.difficulty ?? undefined,
        scenario.scenario_type ?? undefined,
        companyRag,
        scenario.duration ?? undefined,
        elapsedMin
      )) {
        if (chunk.type === "sentence") {
          chunks.push(chunk.text);
        } else {
          finalResponse = chunk.response;
        }
      }
      const responseText = chunks.join(" ");
      const newState = applyStateUpdates(state, finalResponse.state_updates, ((recentMessages ?? []).length) + 1);
      persistTurn(supabase, sessionId, userText, responseText, finalResponse.emotion, finalResponse.intent, newState);
      return NextResponse.json({
        id: completionId,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-4o",
        choices: [{ index: 0, message: { role: "assistant", content: responseText }, finish_reason: "stop" }],
      });
    }

    // Streaming response
    const encoder = new TextEncoder();
    let fullResponseText = "";
    let finalStateUpdates: { trust_delta: number; mood_delta: number; facts_revealed: string[] } = {
      trust_delta: 0,
      mood_delta: 0,
      facts_revealed: [],
    };
    let finalEmotion = "neutral";
    let finalIntent = "answer";

    const readable = new ReadableStream({
      async start(controller) {
        let firstChunk = true;
        try {
          for await (const chunk of processTurnStream(
            persona,
            richContextNote,
            scenario.seller_description || "",
            state,
            (recentMessages ?? []) as SimulationMessage[],
            userText,
            sellerInfo,
            scenario.difficulty ?? undefined,
            scenario.scenario_type ?? undefined,
            companyRag,
            scenario.duration ?? undefined,
            elapsedMin
          )) {
            if (chunk.type === "sentence") {
              console.log("[eleven-agent] SSE sentence chunk:", chunk.text);
              controller.enqueue(encoder.encode(sseChunk(completionId, chunk.text + " ", firstChunk)));
              firstChunk = false;
              fullResponseText += (fullResponseText ? " " : "") + chunk.text;
            } else {
              console.log("[eleven-agent] SSE done chunk metadata:", chunk.response);
              finalStateUpdates = chunk.response.state_updates;
              finalEmotion = chunk.response.emotion ?? finalEmotion;
              finalIntent = chunk.response.intent ?? finalIntent;
            }
          }
          controller.enqueue(encoder.encode(sseDone(completionId)));
        } catch (err) {
          console.error("[eleven-agent] stream error:", err);
          controller.enqueue(encoder.encode(sseDone(completionId)));
        } finally {
          console.log("[eleven-agent] stream closing. fullResponseText:", fullResponseText, "finalEmotion:", finalEmotion, "finalIntent:", finalIntent);
          controller.close();
          // Persist after streaming completes
          const newState = applyStateUpdates(state, finalStateUpdates, ((recentMessages ?? []).length) + 1);
          persistTurn(supabase, sessionId, userText, fullResponseText, finalEmotion, finalIntent, newState);
        }
      },
    });

    return new NextResponse(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[eleven-agent] unhandled error:", err);
    const enc = new TextEncoder();
    const fb = new ReadableStream({ start(c) { c.enqueue(enc.encode(sseFallback(completionId, "Sorry, give me a moment."))); c.close(); } });
    return new NextResponse(fb, { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  }
}

function persistTurn(
  supabase: ReturnType<typeof serviceSupabase>,
  sessionId: string,
  userText: string,
  responseText: string,
  emotion: string,
  intent: string,
  newState: SimulationState
) {
  console.log("[eleven-agent] persistTurn:", { sessionId, userText, responseText: responseText.slice(0, 100), emotion, intent, newState });
  Promise.all([
    supabase.from("simulation_messages").insert({ session_id: sessionId, role: "user", content: userText }),
    supabase.from("simulation_messages").insert({
      session_id: sessionId,
      role: "buyer",
      content: responseText,
      emotion,
      intent,
    }),
    supabase.from("simulation_sessions").update({ state: newState }).eq("id", sessionId),
  ]).catch((e) => console.error("[eleven-agent] persist error:", e));
}
