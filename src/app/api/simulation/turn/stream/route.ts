/**
 * Streaming turn endpoint — streams buyer sentences as SSE so TTS can start
 * on the first sentence while GPT-4o is still generating the rest.
 *
 * Events:
 *   data: {"type":"sentence","text":"..."}   — speak this sentence immediately
 *   data: {"type":"done","buyerMessage":"...","emotion":"...","state":{...}}
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processTurnStream, applyStateUpdates, getConditionalRagContext, shouldRetrieveRag, buildBuyerContext, renderBuyerContext, extractMemoryUpdates, defaultBuyerMemory, computeRagStateImpact, mergeRagImpactIntoStateUpdates } from "@/lib/buyer-brain";
import type { BuyerMemory, RagStateImpact } from "@/lib/buyer-brain";
import { CustomPersona } from "@/types";
import { SimulationState } from "@/types/simulation";
import { mockPersonas } from "@/lib/data/mockData";

export async function POST(req: NextRequest) {
  const { sessionId, message } = await req.json();
  if (!sessionId || !message?.trim()) {
    return NextResponse.json({ error: "Missing sessionId or message" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabase.from("simulation_sessions").select("*, buyer_context, buyer_memory").eq("id", sessionId).eq("user_id", user.id).single(),
    supabase.from("profiles").select("full_name, position, company, organization_id").eq("id", user.id).single(),
  ]);

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "active") return NextResponse.json({ error: "Session not active" }, { status: 400 });

  const { data: scenario } = await supabase
    .from(session.scenario_table)
    .select("custom_persona, preset_persona_id, context_note, seller_description, name, seller_company, seller_product, scenario_type, difficulty, duration")
    .eq("id", session.scenario_id)
    .single();

  let persona: CustomPersona = scenario?.custom_persona as CustomPersona;
  if (!persona && scenario?.preset_persona_id) {
    const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
    if (preset) persona = { name: preset.name, jobTitle: preset.jobTitle, company: preset.company, industry: preset.industry, personality: preset.personality, painPoints: preset.painPoints, goals: preset.goals };
  }
  if (!persona) {
    persona = { name: "Alex", jobTitle: "VP of Operations", company: "a different company", industry: "Technology", personality: "analytical, skeptical", painPoints: ["efficiency", "cost"] };
  }

  const { data: recentMessages } = await supabase
    .from("simulation_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(20);

  const contextParts: string[] = [];
  if (scenario?.seller_company) contextParts.push(`Selling company: ${scenario.seller_company}`);
  if (scenario?.seller_product) contextParts.push(`Product: ${scenario.seller_product}`);
  if (scenario?.context_note) contextParts.push(`Backstory: ${scenario.context_note}`);

  const state = session.state as SimulationState;
  const sellerInfo = { name: profile?.full_name, position: profile?.position, company: profile?.company };
  const buyerMemory = (session.buyer_memory as BuyerMemory | null) ?? defaultBuyerMemory;

  // Load or build the static buyer context (system prompt) once per session.
  let buyerContextString: string | null = null;
  const storedContext = session.buyer_context as { response_format?: { mode?: string } } | null;
  if (storedContext?.response_format?.mode === "streaming") {
    buyerContextString = renderBuyerContext(storedContext as any);
  }
  if (!buyerContextString) {
    const freshContext = buildBuyerContext(
      persona,
      scenario?.scenario_type ?? "Discovery Call",
      scenario?.difficulty ?? "Intermediate",
      sellerInfo,
      "streaming"
    );
    buyerContextString = renderBuyerContext(freshContext);
    const { error: cacheError } = await supabase
      .from("simulation_sessions")
      .update({ buyer_context: freshContext as any })
      .eq("id", sessionId);
    if (cacheError) {
      console.warn("[simulation/turn/stream] failed to cache buyer_context:", cacheError);
    }
  }

  // Company RAG — only retrieve when the turn actually asks for company knowledge.
  let companyRag = "";
  let ragImpact: RagStateImpact | null = null;
  const trimmedMessage = message.trim();
  if (shouldRetrieveRag(trimmedMessage) && profile?.organization_id) {
    try {
      companyRag = await getConditionalRagContext(trimmedMessage, profile.organization_id, { limit: 3 });
      ragImpact = await computeRagStateImpact(trimmedMessage, companyRag, state);
    } catch (e) {
      console.warn("[simulation/turn/stream] company RAG failed:", e);
    }
  }

  const sessionStart = new Date(session.created_at ?? Date.now());
  const elapsedMin = Math.max(0, Math.round((Date.now() - sessionStart.getTime()) / 60000));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        let fullMessage = "";
        let buyerResponseFinal = null;
        const sentences: string[] = [];

        for await (const chunk of processTurnStream(
          persona, contextParts.join("\n"), scenario?.seller_description ?? "",
          state, recentMessages ?? [], message.trim(), sellerInfo,
          scenario?.difficulty ?? undefined,
          scenario?.scenario_type ?? undefined,
          companyRag,
          scenario?.duration ?? undefined,
          elapsedMin,
          "gpt-4.1-mini",
          buyerContextString,
          buyerMemory
        )) {
          if (chunk.type === "sentence") {
            sentences.push(chunk.text);
            fullMessage += (fullMessage ? " " : "") + chunk.text;
            send({ type: "sentence", text: chunk.text });
          } else {
            buyerResponseFinal = chunk.response;
            if (!fullMessage) fullMessage = chunk.response.message;
          }
        }

        if (!buyerResponseFinal) {
          buyerResponseFinal = { message: fullMessage, emotion: "neutral", intent: "answer", state_updates: { trust_delta: 0, mood_delta: 0, facts_revealed: [] } };
        }

        const mergedStateUpdates = ragImpact
          ? mergeRagImpactIntoStateUpdates(buyerResponseFinal.state_updates, ragImpact)
          : buyerResponseFinal.state_updates;
        const newState = applyStateUpdates(state, mergedStateUpdates, (recentMessages?.length ?? 0) + 1);
        const updatedMemory = await extractMemoryUpdates(buyerMemory, message.trim(), fullMessage, recentMessages ?? []);

        // Persist to DB (async, after stream starts)
        await Promise.all([
          supabase.from("simulation_messages").insert({ session_id: sessionId, role: "user", content: message.trim() }),
          supabase.from("simulation_messages").insert({ session_id: sessionId, role: "buyer", content: fullMessage, emotion: buyerResponseFinal.emotion, intent: buyerResponseFinal.intent, action: buyerResponseFinal.action as any }),
          supabase.from("simulation_sessions").update({ state: newState, buyer_memory: updatedMemory as any }).eq("id", sessionId),
        ]);

        send({
          type: "done",
          buyerMessage: fullMessage,
          emotion: buyerResponseFinal.emotion,
          intent: buyerResponseFinal.intent,
          state: newState,
          buyer_memory: updatedMemory,
        });
      } catch (err) {
        console.error("[turn/stream]", err);
        send({ type: "error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
