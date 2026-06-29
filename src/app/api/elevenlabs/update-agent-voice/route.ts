import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId, voiceId } = await req.json();
    if (!agentId || !voiceId) {
      return NextResponse.json({ error: "agentId and voiceId are required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_config: {
          tts: {
            voice_id: voiceId,
          },
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[elevenlabs update-agent-voice] error:", res.status, errorText);
      return NextResponse.json({ error: `ElevenLabs API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, agent: data });
  } catch (err) {
    console.error("[elevenlabs update-agent-voice] unexpected error:", err);
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
