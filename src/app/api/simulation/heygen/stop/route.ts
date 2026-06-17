import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stopSession } from "@/lib/heygen";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { heygen_session_id } = await req.json();

    if (!heygen_session_id) {
      return NextResponse.json({ error: "Missing heygen_session_id" }, { status: 400 });
    }

    await stopSession(heygen_session_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[heygen/stop]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
