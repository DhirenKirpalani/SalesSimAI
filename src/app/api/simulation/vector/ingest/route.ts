import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestConversationVectors } from "@/lib/vector-store";

/**
 * POST /api/simulation/vector/ingest
 * Ingests a completed session's conversation turns into the vector store.
 * Call this after the session ends (e.g. from the simulation end flow).
 */
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

    // Load session metadata (try simulation_sessions first, then heygen_sessions)
    let session: any = null;
    const { data: simSession } = await supabase
      .from("simulation_sessions")
      .select("id, user_id, scenario_table, state, scenario_name")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (simSession) {
      session = simSession;
    } else {
      // For HeyGen calls, the sessionId might be the heygen session ID
      const { data: heygenSession } = await supabase
        .from("heygen_sessions")
        .select("id, user_id, scenario_name, scenario_id")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (heygenSession) session = heygenSession;
    }

    // Load messages for this session
    const { data: messages, error: msgErr } = await supabase
      .from("simulation_messages")
      .select("role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (msgErr) {
      return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ ok: true, ingested: 0, message: "No messages to ingest" });
    }

    // Load coaching score if available (only for simulation_sessions)
    const { data: coaching } = session?.scenario_table
      ? await supabase.from("simulation_coaching").select("overall_score").eq("session_id", sessionId).maybeSingle()
      : { data: null };

    const scenarioType =
      (session?.state as any)?.scenario_type ??
      (session?.scenario_name?.includes("Product Knowledge") ? "Product Knowledge Interview" : "Discovery Call");

    // Build chunks from messages
    const chunks = (messages ?? []).map((m, i) => ({
      source: (m.role === "user" ? "user" : "buyer") as "user" | "buyer",
      content: m.content,
      turnIndex: i,
    }));

    await ingestConversationVectors({
      sessionId,
      userId: user.id,
      scenarioType,
      overallScore: coaching?.overall_score ?? null,
      chunks,
    });

    return NextResponse.json({ ok: true, ingested: chunks.length });
  } catch (err) {
    console.error("[vector/ingest]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ingest failed" },
      { status: 500 }
    );
  }
}
