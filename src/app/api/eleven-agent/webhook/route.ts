/**
 * ElevenLabs Conversational AI — Custom LLM endpoint.
 *
 * ElevenLabs calls this endpoint instead of OpenAI directly.
 * We run the existing buyer brain (processTurnStream) and return a streaming
 * OpenAI-compatible SSE response so ElevenLabs can TTS it in real time.
 *
 * Configure the agent in the ElevenLabs dashboard:
 *   LLM provider: Custom LLM
 *   Server URL: https://your-app.com/api/eleven-agent
 *   Endpoint: Chat Completions
 *   Path: /chat/completions
 *   Custom LLM extra body: enabled
 *
 * The frontend passes session_id via dynamicVariables; ElevenLabs forwards it
 * in elevenlabs_extra_body.session_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { processTurnStream, applyStateUpdates, buildBuyerContext, renderBuyerContext, extractMemoryUpdates, defaultBuyerMemory, computeRagStateImpact, mergeRagImpactIntoStateUpdates } from "@/lib/buyer-brain";
import { getConditionalRagContext, shouldRetrieveRag } from "@/lib/buyer-brain/rag";
import type { BuyerMemory, RagStateImpact } from "@/lib/buyer-brain";
import { CustomPersona } from "@/types";
import { SimulationState, SimulationMessage, BuyerResponse } from "@/types/simulation";
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
  // Header fallback (useful when dynamic variables are passed as headers)
  const headerSessionId = req.headers.get("x-session-id");
  if (typeof headerSessionId === "string" && headerSessionId) return headerSessionId;

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
  console.log("[eleven-agent] request received", { completionId });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const stream = (body.stream as boolean) ?? true;
    const sessionId = resolveSessionId(req, body);
    console.log("[eleven-agent] resolved sessionId:", sessionId, "stream:", stream);

    if (!sessionId) {
      console.warn("[eleven-agent] missing session_id");
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const messages = (body.messages ?? []) as Array<{ role: string; content?: string }>;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const userText = lastUserMsg?.content?.trim() ?? "";
    console.log("[eleven-agent] userText:", userText, "message count:", messages.length);

    if (!userText) {
      console.warn("[eleven-agent] no user message found");
      return NextResponse.json({ error: "No user message found" }, { status: 400 });
    }

    const supabase = serviceSupabase();

    // Load session first (we need the user_id to load the profile)
    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions")
      .select("*, buyer_context, buyer_memory")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("[eleven-agent] session not found:", sessionId, sessionError);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Load profile and messages in parallel
    const [{ data: profile }, { data: recentMessages }] = await Promise.all([
      supabase.from("profiles").select("full_name, position, company, organization_id").eq("id", session.user_id).single(),
      supabase
        .from("simulation_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(20),
    ]);

    const { data: scenario } = await supabase
      .from(session.scenario_table)
      .select(
        "custom_persona, preset_persona_id, context_note, seller_description, name, seller_company, seller_product, difficulty, scenario_type, duration, product_type"
      )
      .eq("id", session.scenario_id)
      .single();

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
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

    const state = (session.state ?? {
      trust_level: 30,
      buyer_mood: 0,
      stage: "opening",
      facts_discovered: { budget: false, decision_maker: false, timeline: false, current_solution: false },
      objections_used: [],
      engagement_level: 30,
    }) as SimulationState;

    // Company RAG — only retrieve when the turn actually asks for company knowledge.
    // Session memory (persona, state, scenario) is already injected via the prompt.
    let companyRag = "";
    let ragImpact: RagStateImpact | null = null;
    const needsRag = shouldRetrieveRag(userText);
    if (needsRag && profile?.organization_id) {
      try {
        companyRag = await getConditionalRagContext(userText, profile.organization_id, { limit: 3 });
        console.log("[eleven-agent] RAG triggered:", userText.slice(0, 60));
        ragImpact = await computeRagStateImpact(userText, companyRag, state);
        console.log("[eleven-agent] RAG impact:", ragImpact);
      } catch (e) {
        console.warn("[eleven-agent] company RAG failed:", e);
      }
    }

    const sessionStart = new Date(session.created_at ?? Date.now());
    const elapsedMin = Math.max(0, Math.round((Date.now() - sessionStart.getTime()) / 60000));
    const sellerInfo = {
      name: profile?.full_name ?? undefined,
      position: profile?.position ?? undefined,
      company: profile?.company ?? undefined,
    };

    // Load or build the static buyer context (system prompt) once per session.
    let buyerContextString: string | null = null;
    const storedContext = session.buyer_context as { response_format?: { mode?: string } } | null;
    if (storedContext?.response_format?.mode === "streaming") {
      buyerContextString = renderBuyerContext(storedContext as any);
    }

    const buyerMemory = (session.buyer_memory as BuyerMemory | null) ?? defaultBuyerMemory;

    if (!buyerContextString) {
      const freshContext = buildBuyerContext(
        persona,
        scenario.scenario_type ?? "Discovery Call",
        scenario.difficulty ?? "Intermediate",
        sellerInfo,
        "streaming"
      );
      buyerContextString = renderBuyerContext(freshContext);
      const { error: cacheError } = await supabase
        .from("simulation_sessions")
        .update({ buyer_context: freshContext as any })
        .eq("id", sessionId);
      if (cacheError) {
        console.warn("[eleven-agent] failed to cache buyer_context:", cacheError);
      }
    }

    console.log(
      "[eleven-agent] session:", sessionId,
      "scenario:", scenario.scenario_type,
      "difficulty:", scenario.difficulty,
      "persona:", persona.name
    );

    if (!stream) {
      // Non-streaming fallback (shouldn't be used by ElevenLabs, but keeps the endpoint compatible)
      console.log("[eleven-agent] non-streaming path");
      const chunks: string[] = [];
      let finalResponse: BuyerResponse = {
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
        elapsedMin,
        "gpt-4.1-mini",
        buyerContextString,
        buyerMemory
      )) {
        if (chunk.type === "sentence") {
          chunks.push(chunk.text);
        } else {
          finalResponse = chunk.response;
        }
      }
      const responseText = chunks.join(" ");
      const mergedStateUpdates = ragImpact
        ? mergeRagImpactIntoStateUpdates(finalResponse.state_updates, ragImpact)
        : finalResponse.state_updates;
      const newState = applyStateUpdates(state, mergedStateUpdates, ((recentMessages ?? []).length) + 1);
      const updatedMemory = await extractMemoryUpdates(buyerMemory, userText, responseText, (recentMessages ?? []) as SimulationMessage[]);
      console.log("[eleven-agent] non-streaming response:", responseText, "metadata:", finalResponse);
      persistTurn(supabase, sessionId, userText, responseText, finalResponse.emotion, finalResponse.intent, newState, updatedMemory, finalResponse.action);
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
    let finalAction: string | undefined;

    const thinkingDelay = computeThinkingDelay(state, persona);

    const readable = new ReadableStream({
      async start(controller) {
        let firstChunk = true;
        let chunkCount = 0;
        try {
          console.log("[eleven-agent] starting response stream");
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
            elapsedMin,
            "gpt-4.1-mini",
            buyerContextString,
            buyerMemory
          )) {
            chunkCount++;
            if (chunk.type === "sentence") {
              if (firstChunk && thinkingDelay > 0) {
                await new Promise((resolve) => setTimeout(resolve, thinkingDelay));
              }
              console.log("[eleven-agent] sentence chunk:", chunk.text);
              controller.enqueue(encoder.encode(sseChunk(completionId, chunk.text + " ", firstChunk)));
              firstChunk = false;
              fullResponseText += (fullResponseText ? " " : "") + chunk.text;
            } else {
              console.log("[eleven-agent] metadata chunk:", chunk.response);
              finalStateUpdates = chunk.response.state_updates;
              finalEmotion = chunk.response.emotion ?? finalEmotion;
              finalIntent = chunk.response.intent ?? finalIntent;
              finalAction = chunk.response.action ?? finalAction;
            }
          }
          console.log("[eleven-agent] stream complete, chunks:", chunkCount, "fullResponseText:", fullResponseText);
          controller.enqueue(encoder.encode(sseDone(completionId)));
        } catch (err) {
          console.error("[eleven-agent] stream error:", err);
          controller.enqueue(encoder.encode(sseDone(completionId)));
        } finally {
          controller.close();
          // Persist after streaming completes
          const mergedStateUpdates = ragImpact
            ? mergeRagImpactIntoStateUpdates(finalStateUpdates, ragImpact)
            : finalStateUpdates;
          const newState = applyStateUpdates(state, mergedStateUpdates, ((recentMessages ?? []).length) + 1);
          const updatedMemory = await extractMemoryUpdates(buyerMemory, userText, fullResponseText, (recentMessages ?? []) as SimulationMessage[]);
          console.log("[eleven-agent] persisting turn", { sessionId, userText, fullResponseText, finalEmotion, finalIntent, finalAction });
          persistTurn(supabase, sessionId, userText, fullResponseText, finalEmotion, finalIntent, newState, updatedMemory, finalAction);
        }
      },
    });

    console.log("[eleven-agent] returning streaming response");
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
    console.error("[eleven-agent] error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

function persistTurn(
  supabase: ReturnType<typeof serviceSupabase>,
  sessionId: string,
  userText: string,
  responseText: string,
  emotion: string,
  intent: string,
  newState: SimulationState,
  buyerMemory?: BuyerMemory,
  action?: string
) {
  Promise.all([
    supabase.from("simulation_messages").insert({ session_id: sessionId, role: "user", content: userText }),
    supabase.from("simulation_messages").insert({
      session_id: sessionId,
      role: "buyer",
      content: responseText,
      emotion,
      intent,
      action: action as any,
    }),
    supabase.from("simulation_sessions").update({
      state: newState,
      ...(buyerMemory ? { buyer_memory: buyerMemory as any } : {}),
    }).eq("id", sessionId),
  ]).catch((e) => console.error("[eleven-agent] persist error:", e));
}
