import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions")
      .select("id, user_id, scenario_id, scenario_table, scenario_name, duration_s, call_mode, state")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const state = (session.state as Record<string, unknown>) ?? {};

    return NextResponse.json({
      sessionId: session.id,
      scenarioId: session.scenario_id,
      scenarioTable: session.scenario_table,
      scenarioName: session.scenario_name,
      durationS: session.duration_s,
      callMode: session.call_mode,
      avatarId: state.avatar_id as string | undefined,
      avatarImageUrl: state.avatar_image_url as string | undefined,
      voiceId: state.voice_id as string | undefined,
      avatarName: state.avatar_name as string | undefined,
      voiceAvatarImageUrl: state.voice_avatar_image_url as string | undefined,
      elevenlabsVoiceId: state.elevenlabs_voice_id as string | undefined,
    });
  } catch (err) {
    console.error("[simulation/session]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
