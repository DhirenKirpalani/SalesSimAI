import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startSession } from "@/lib/heygen";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { session_token } = body;

    if (!session_token) {
      return NextResponse.json({ error: "Missing session_token" }, { status: 400 });
    }

    console.log("[heygen/connect] Starting LiveAvatar session…");
    const payload = await startSession(session_token);
    console.log("[heygen/connect] Session started, keys:", Object.keys(payload));

    return NextResponse.json(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[heygen/connect]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
