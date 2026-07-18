/**
 * OpenAI-compatible /chat/completions proxy for LiveAvatar FULL mode.
 * LiveAvatar calls this endpoint instead of OpenAI directly.
 * We run our GPT-4o buyer brain here and return a streaming SSE response.
 *
 * URL: POST /api/simulation/llm/[sessionId]/chat/completions
 * LiveAvatar config: base_url = https://your-app.com/api/simulation/llm/[sessionId]
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { processTurn, applyStateUpdates } from "@/lib/buyer-brain";
import { buildCompanyRagContext } from "@/lib/vector-store";
import { buildInterviewSystemPrompt } from "@/lib/voice-config";
import { CustomPersona } from "@/types";
import { SimulationState } from "@/types/simulation";
import { mockPersonas } from "@/lib/data/mockData";

const INTERVIEW_TYPES = ["First Round Interview", "Product Knowledge Interview"];

function serviceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function sseChunk(id: string, content: string): string {
  return (
    "data: " +
    JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: "gpt-4o",
      choices: [{ index: 0, delta: { content }, finish_reason: null }],
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const completionId = `chatcmpl-${Date.now()}`;

  try {
    const body = await req.json();
    const messages: Array<{ role: string; content: string }> = body.messages ?? [];
    const stream: boolean = body.stream ?? true;

    // Extract the last user message (what the user just said)
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg?.content?.trim()) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 });
    }
    const userText = lastUserMsg.content.trim();

    // Load session + scenario from Supabase (service role — no browser cookies)
    const supabase = serviceSupabase();
    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("[llm-proxy] session not found:", sessionId, sessionError);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: scenario } = await supabase
      .from(session.scenario_table)
      .select("custom_persona, preset_persona_id, context_note, seller_description, name, seller_company, seller_product, difficulty, scenario_type, duration")
      .eq("id", session.scenario_id)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, position, company, organization_id")
      .eq("id", session.user_id)
      .single();

    const { data: recentMessages } = await supabase
      .from("simulation_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Resolve persona
    let persona: CustomPersona = scenario?.custom_persona as CustomPersona;
    if (!persona && scenario?.preset_persona_id) {
      const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
      if (preset) {
        persona = { name: preset.name, jobTitle: preset.jobTitle, company: preset.company, industry: preset.industry, personality: preset.personality, painPoints: preset.painPoints, goals: preset.goals };
      }
    }
    if (!persona) {
      persona = { name: "Alex", jobTitle: "VP of Operations", company: "a different company", industry: "Technology", personality: "analytical, skeptical", painPoints: ["efficiency", "cost"] };
    }

    const contextParts: string[] = [];
    if (scenario?.seller_company) contextParts.push(`Selling company: ${scenario.seller_company}`);
    if (scenario?.seller_product) contextParts.push(`Product: ${scenario.seller_product}`);
    if (scenario?.context_note) contextParts.push(`Backstory: ${scenario.context_note}`);

    const state = session.state as SimulationState;
    const sellerInfo = { name: profile?.full_name, position: profile?.position, company: profile?.company };

    // Time awareness for buyer
    const sessionStart = new Date(session.created_at ?? Date.now());
    const elapsedMin = Math.max(0, Math.round((Date.now() - sessionStart.getTime()) / 60000));
    const durationMin = scenario?.duration ?? undefined;

    // Company RAG — fetch relevant docs from the org's knowledge base
    let companyRag = "";
    if (profile?.organization_id) {
      try {
        companyRag = await buildCompanyRagContext(userText, profile.organization_id, { limit: 3 });
      } catch (e) {
        console.warn("[llm-proxy] company RAG failed:", e);
      }
    }

    console.log("[llm-proxy] running for session:", sessionId, "msg:", userText.slice(0, 60), "elapsed:", elapsedMin, "min");

    const scenarioType = scenario?.scenario_type ?? "";
    const isInterview = INTERVIEW_TYPES.includes(scenarioType);

    let responseText: string;
    let newState: SimulationState;
    let buyerResponse: any = null;

    if (isInterview) {
      // Interview scenario — use the interview system prompt with dynamic variables
      const systemPrompt = buildInterviewSystemPrompt()
        .replace(/\{\{buyer_name\}\}/g, persona.name)
        .replace(/\{\{buyer_title\}\}/g, persona.jobTitle)
        .replace(/\{\{buyer_company\}\}/g, persona.company ?? scenario?.seller_company ?? "the company")
        .replace(/\{\{buyer_knowledge\}\}/g, scenario?.seller_description ?? "No product knowledge provided.")
        .replace(/\{\{buyer_behavior\}\}/g, persona.personality ?? "Professional and direct.")
        .replace(/\{\{scenario_type\}\}/g, scenarioType)
        .replace(/\{\{context_note\}\}/g, scenario?.context_note ?? "");

      const conversationMessages = [
        { role: "system", content: systemPrompt },
        ...(recentMessages ?? []).map((m: any) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
        { role: "user", content: userText },
      ];

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: conversationMessages,
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text().catch(() => "unknown");
        console.error("[llm-proxy] interview OpenAI error:", openaiRes.status, errText);
        return NextResponse.json({ error: "Interview response failed" }, { status: 500 });
      }

      const openaiData = await openaiRes.json();
      responseText = openaiData.choices[0].message.content.trim();
      newState = state; // no state updates for interviews

      console.log("[llm-proxy] interview response:", responseText.slice(0, 80));
    } else {
      // Sales roleplay — use buyer brain
      buyerResponse = await processTurn(
        persona,
        contextParts.join("\n"),
        scenario?.seller_description ?? "",
        state,
        recentMessages ?? [],
        userText,
        sellerInfo,
        scenario?.difficulty ?? undefined,
        scenario?.scenario_type ?? undefined,
        companyRag,
        durationMin,
        elapsedMin
      );

      newState = applyStateUpdates(state, buyerResponse.state_updates, (recentMessages?.length ?? 0) + 1);
      responseText = buyerResponse.message;

      console.log("[llm-proxy] buyer response:", responseText.slice(0, 80));
    }

    // Persist messages + updated state (fire-and-forget)
    Promise.all([
      supabase.from("simulation_messages").insert({ session_id: sessionId, role: "user", content: userText }),
      supabase.from("simulation_messages").insert({ session_id: sessionId, role: "buyer", content: responseText, emotion: isInterview ? undefined : (buyerResponse as any)?.emotion, intent: isInterview ? undefined : (buyerResponse as any)?.intent }),
      supabase.from("simulation_sessions").update({ state: newState }).eq("id", sessionId),
    ]).catch((e) => console.error("[llm-proxy] supabase persist error:", e));

    console.log("[llm-proxy] response:", responseText.slice(0, 80));

    if (!stream) {
      return NextResponse.json({
        id: completionId,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-4o",
        choices: [{ index: 0, message: { role: "assistant", content: responseText }, finish_reason: "stop" }],
      });
    }

    // Streaming SSE — word-by-word for natural LiveAvatar speech cadence
    const words = responseText.split(" ");
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunk = i === words.length - 1 ? words[i] : words[i] + " ";
          controller.enqueue(encoder.encode(sseChunk(completionId, chunk)));
        }
        controller.enqueue(encoder.encode(sseDone(completionId)));
        controller.close();
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
    console.error("[llm-proxy] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
