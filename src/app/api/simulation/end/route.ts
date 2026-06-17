import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stopSession } from "@/lib/heygen";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

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
      .select("heygen_session_id, status")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.heygen_session_id) {
      try {
        await stopSession(session.heygen_session_id);
      } catch (e) {
        console.warn("[simulation/end] HeyGen stop failed:", e);
      }
    }

    await supabase
      .from("simulation_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", sessionId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[simulation/end]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
