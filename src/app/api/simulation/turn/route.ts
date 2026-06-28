import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processTurn, applyStateUpdates } from "@/lib/buyer-brain";
import { buildCompanyRagContext } from "@/lib/vector-store";
import { CustomPersona } from "@/types";
import { SimulationState } from "@/types/simulation";
import { mockPersonas } from "@/lib/data/mockData";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message } = await req.json();

    if (!sessionId || !message?.trim()) {
      return NextResponse.json({ error: "Missing sessionId or message" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: session, error: sessionError }, { data: profile }] = await Promise.all([
      supabase.from("simulation_sessions").select("*").eq("id", sessionId).eq("user_id", user.id).single(),
      supabase.from("profiles").select("full_name, position, company, organization_id").eq("id", user.id).single(),
    ]);

    if (sessionError || !session) {
      console.error("[simulation/turn] session not found:", sessionError);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return NextResponse.json({ error: "Session is not active" }, { status: 400 });
    }

    const { data: scenario, error: scenarioError } = await supabase
      .from(session.scenario_table)
      .select("custom_persona, preset_persona_id, context_note, seller_description, name, seller_company, seller_product, scenario_type, difficulty, duration, product_type")
      .eq("id", session.scenario_id)
      .single();

    if (scenarioError || !scenario) {
      console.error("[simulation/turn] scenario not found:", scenarioError);
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    // Resolve persona: custom > preset > graceful fallback
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
        console.log("[simulation/turn] Resolved preset persona:", preset.name);
      }
    }

    if (!persona) {
      // Graceful fallback — build a generic buyer from scenario context
      persona = {
        name: "Alex Buyer",
        jobTitle: "VP of Operations",
        company: "a different company",
        industry: "Technology",
        personality: "analytical, skeptical, busy",
        painPoints: ["efficiency", "cost control", "vendor reliability"],
      };
      console.warn("[simulation/turn] No persona found — using fallback for scenario", session.scenario_id);
    }

    const { data: recentMessages } = await supabase
      .from("simulation_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = recentMessages ?? [];
    const state = session.state as SimulationState;

    // Build a rich context note: call type + seller info + optional backstory
    const contextParts: string[] = [];
    if (scenario.scenario_type) contextParts.push(`Call type: ${scenario.scenario_type}`);
    if (scenario.product_type) contextParts.push(`Product category: ${scenario.product_type}`);
    if (scenario.seller_company) contextParts.push(`Selling company: ${scenario.seller_company}`);
    if (scenario.seller_product) contextParts.push(`Product: ${scenario.seller_product}`);
    if (scenario.context_note) contextParts.push(`Backstory: ${scenario.context_note}`);
    const richContextNote = contextParts.join("\n");

    const sellerInfo = {
      name: profile?.full_name ?? undefined,
      position: profile?.position ?? undefined,
      company: profile?.company ?? undefined,
    };

    // Company RAG — fetch relevant docs from the org's knowledge base
    let companyRag = "";
    if (profile?.organization_id) {
      try {
        companyRag = await buildCompanyRagContext(message.trim(), profile.organization_id, { limit: 3 });
      } catch (e) {
        console.warn("[simulation/turn] company RAG failed:", e);
      }
    }

    console.log("[simulation/turn] calling buyer-brain…", { sessionId, msgCount: messages.length, trust: state.trust_level, persona: persona.name, seller: sellerInfo.name });
    const sessionStart = new Date(session.created_at ?? Date.now());
    const elapsedMin = Math.max(0, Math.round((Date.now() - sessionStart.getTime()) / 60000));

    const buyerResponse = await processTurn(
      persona,
      richContextNote,
      scenario.seller_description ?? "",
      state,
      messages,
      message.trim(),
      sellerInfo,
      scenario.difficulty ?? undefined,
      scenario.scenario_type ?? undefined,
      companyRag,
      scenario.duration ?? undefined,
      elapsedMin
    );
    console.log("[simulation/turn] buyer-brain response:", buyerResponse.message.slice(0, 100));

    const newState = applyStateUpdates(state, buyerResponse.state_updates, messages.length + 1);

    const [userMsgResult, buyerMsgResult] = await Promise.all([
      supabase.from("simulation_messages").insert({
        session_id: sessionId,
        role: "user",
        content: message.trim(),
      }).select().single(),
      supabase.from("simulation_messages").insert({
        session_id: sessionId,
        role: "buyer",
        content: buyerResponse.message,
        emotion: buyerResponse.emotion,
        intent: buyerResponse.intent,
      }).select().single(),
    ]);

    await supabase
      .from("simulation_sessions")
      .update({ state: newState })
      .eq("id", sessionId);

    return NextResponse.json({
      buyer_response: buyerResponse,
      new_state: newState,
      user_message: userMsgResult.data,
      buyer_message: buyerMsgResult.data,
    });
  } catch (err) {
    console.error("[simulation/turn]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
