import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildBuyerContext, renderBuyerContext, defaultBuyerMemory } from "@/lib/buyer-brain";
import { CustomPersona } from "@/types";
import { mockPersonas } from "@/lib/data/mockData";

export async function POST(req: NextRequest) {
  try {
    const { scenarioId, scenarioTable, callMode } = await req.json();

    if (!scenarioId || !scenarioTable) {
      return NextResponse.json({ error: "Missing scenarioId or scenarioTable" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: scenario, error: scenarioError }, { data: profile }] = await Promise.all([
      supabase
        .from(scenarioTable)
        .select("id, name, custom_persona, preset_persona_id, context_note, seller_description, seller_company, seller_product, scenario_type, difficulty, duration, product_type")
        .eq("id", scenarioId)
        .single(),
      supabase.from("profiles").select("full_name, position, company").eq("id", user.id).single(),
    ]);

    if (scenarioError || !scenario) {
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

    const sellerInfo = {
      name: profile?.full_name ?? undefined,
      position: profile?.position ?? undefined,
      company: profile?.company ?? undefined,
    };

    const isStreaming = callMode !== "text";
    const buyerContext = buildBuyerContext(
      persona,
      scenario.scenario_type ?? "Discovery Call",
      scenario.difficulty ?? "Intermediate",
      sellerInfo,
      isStreaming ? "streaming" : "json"
    );
    // Render once to ensure it is valid; the stored JSON is the source of truth.
    renderBuyerContext(buyerContext);

    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions")
      .insert({
        user_id: user.id,
        scenario_id: scenarioId,
        scenario_table: scenarioTable,
        scenario_name: scenario.name ?? "Simulation",
        call_mode: callMode === "text" ? "text" : "voice",
        status: "active",
        buyer_context: buyerContext as any,
        buyer_memory: defaultBuyerMemory as any,
        state: {
          trust_level: 30,
          buyer_mood: 0,
          stage: "opening",
          facts_discovered: {
            budget: false,
            decision_maker: false,
            timeline: false,
            current_solution: false,
          },
          objections_used: [],
          engagement_level: 30,
        },
      })
      .select()
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("[simulation/start]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
