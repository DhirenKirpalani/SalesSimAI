import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { scenarioId, scenarioTable, callMode, sessionId } = await req.json();

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If a prepared sessionId is provided, verify ownership and reuse it
    if (sessionId) {
      const { data: existing, error: existingError } = await supabase
        .from("simulation_sessions")
        .select("id, user_id, scenario_id, scenario_table, scenario_name, duration_s, call_mode, state")
        .eq("id", sessionId)
        .single();

      if (existingError || !existing) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      if (existing.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: session, error: updateError } = await supabase
        .from("simulation_sessions")
        .update({ status: "active", call_mode: callMode === "text" ? "text" : "voice" })
        .eq("id", sessionId)
        .select()
        .single();

      if (updateError || !session) {
        return NextResponse.json({ error: "Failed to activate session" }, { status: 500 });
      }

      return NextResponse.json({ session });
    }

    if (!scenarioId || !scenarioTable) {
      return NextResponse.json({ error: "Missing scenarioId or scenarioTable" }, { status: 400 });
    }

    const { data: scenario, error: scenarioError } = await supabase
      .from(scenarioTable)
      .select("id, name, duration, organization_id")
      .eq("id", scenarioId)
      .single();

    if (scenarioError || !scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions")
      .insert({
        user_id: user.id,
        organization_id: (scenario as { organization_id?: string | null }).organization_id ?? null,
        scenario_id: scenarioId,
        scenario_table: scenarioTable,
        scenario_name: scenario.name ?? "Simulation",
        duration_s: (scenario.duration ?? 5) * 60,
        call_mode: callMode === "text" ? "text" : "voice",
        status: "active",
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
