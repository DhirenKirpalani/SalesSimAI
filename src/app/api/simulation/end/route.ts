import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { stopSession } from "@/lib/heygen";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

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
      .select("heygen_session_id, status, started_at")
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

    const endedAt = new Date();
    const startedAt = session.started_at ? new Date(session.started_at) : endedAt;
    const durationS = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

    // Use service role to bypass RLS for session completion
    const svc = serviceSupabase();
    const { error: updateError } = await svc
      .from("simulation_sessions")
      .update({ status: "completed", ended_at: endedAt.toISOString(), duration_s: durationS })
      .eq("id", sessionId);

    if (updateError) {
      console.error("[simulation/end] update error:", JSON.stringify(updateError, null, 2));
      return NextResponse.json({ error: "Failed to update session", details: updateError }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[simulation/end]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
