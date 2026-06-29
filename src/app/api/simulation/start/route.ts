import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { scenarioId, scenarioTable, callMode } = await req.json();

    if (!scenarioId || !scenarioTable) {
      return NextResponse.json({ error: "Missing scenarioId or scenarioTable" }, { status: 400 });
    }

    const supabase = await createClient();

    // Run auth and scenario fetch in parallel to reduce latency
    const [
      { data: { user }, error: authError },
      { data: scenario, error: scenarioError },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from(scenarioTable).select("id, name").eq("id", scenarioId).single(),
    ]);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (scenarioError || !scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions")
      .insert({
        user_id: user.id,
        scenario_id: scenarioId,
        scenario_table: scenarioTable,
        scenario_name: scenario.name ?? "Simulation",
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
