/**
 * Return the most recent buyer message for a simulation session.
 * Used by the ElevenLabs voice layer to retrieve emotion/intent metadata
 * that the streaming TTS pipeline does not expose to the frontend.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  // Verify the session belongs to the current user
  const { data: session } = await supabase
    .from("simulation_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: message } = await supabase
    .from("simulation_messages")
    .select("role, content, emotion, intent, created_at")
    .eq("session_id", sessionId)
    .eq("role", "buyer")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ message: message ?? null });
}
