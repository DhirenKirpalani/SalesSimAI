import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const {
      scenarioId,
      scenarioTable,
      avatarId,
      voiceId,
      scenarioName,
      avatarName,
      voiceAvatarImageUrl,
      elevenlabsVoiceId,
      callMode = "voice",
    } = await req.json();

    if (!scenarioId || !scenarioTable) {
      return NextResponse.json({ error: "Missing scenarioId or scenarioTable" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      { data: scenario, error: scenarioError },
      { data: profile },
    ] = await Promise.all([
      supabase.from(scenarioTable).select("id, name, duration, organization_id").eq("id", scenarioId).single(),
      supabase.from("profiles").select("organization_id").eq("id", user.id).single(),
    ]);

    if (scenarioError || !scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const effectiveVoiceAvatarImageUrl = voiceAvatarImageUrl ?? null;
    const effectiveElevenlabsVoiceId = elevenlabsVoiceId ?? null;

    const organizationId = (scenario as { organization_id?: string | null }).organization_id ?? profile?.organization_id ?? null;

    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        scenario_id: scenarioId,
        scenario_table: scenarioTable,
        scenario_name: scenario.name ?? scenarioName ?? "Simulation",
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
          avatar_id: avatarId ?? null,
          voice_id: voiceId ?? null,
          avatar_name: avatarName ?? null,
          voice_avatar_image_url: effectiveVoiceAvatarImageUrl,
          elevenlabs_voice_id: effectiveElevenlabsVoiceId,
        },
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("[simulation/prepare] failed to create session:", sessionError?.message ?? "unknown");
      return NextResponse.json({ error: sessionError?.message ?? "Failed to create session" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error("[simulation/prepare]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
