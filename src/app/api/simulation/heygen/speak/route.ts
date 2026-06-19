import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { speakText } from "@/lib/heygen";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { heygen_session_id, text } = await req.json();

    if (!heygen_session_id || !text) {
      return NextResponse.json({ error: "Missing heygen_session_id or text" }, { status: 400 });
    }

    const result = await speakText(heygen_session_id, text);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[heygen/speak]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
