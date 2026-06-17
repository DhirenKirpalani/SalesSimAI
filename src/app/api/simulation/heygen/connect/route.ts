import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LIVEAVATAR_BASE = "https://api.liveavatar.com";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { session_token } = await req.json();

    if (!session_token) {
      return NextResponse.json({ error: "Missing session_token" }, { status: 400 });
    }

    // /v1/sessions/start uses Bearer (session_token), not X-API-KEY, and takes no body
    const res = await fetch(`${LIVEAVATAR_BASE}/v1/sessions/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session_token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[heygen/connect] LiveAvatar start error:", data);
      return NextResponse.json({ error: JSON.stringify(data) }, { status: res.status });
    }

    // Returns: { session_id, livekit_url, livekit_client_token, ws_url? }
    return NextResponse.json(data?.data ?? {});
  } catch (err) {
    console.error("[heygen/connect]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
