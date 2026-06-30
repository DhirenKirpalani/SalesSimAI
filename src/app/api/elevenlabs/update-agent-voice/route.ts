import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId, voiceId, systemPrompt } = await req.json();
    if (!agentId || !voiceId) {
      return NextResponse.json({ error: "agentId and voiceId are required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    const conversationConfig: Record<string, unknown> = {
      tts: {
        voice_id: voiceId,
      },
    };
    if (systemPrompt) {
      conversationConfig.agent = { prompt: systemPrompt };
    }

    const patchRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_config: conversationConfig,
      }),
    });

    if (!patchRes.ok) {
      const errorText = await patchRes.text();
      console.error("[elevenlabs update-agent-voice] patch error:", patchRes.status, errorText);
      return NextResponse.json({ error: `ElevenLabs API error: ${patchRes.status}` }, { status: patchRes.status });
    }

    const patchData = await patchRes.json();
    let currentVoiceId = (patchData as any)?.conversation_config?.tts?.voice_id ?? voiceId;

    // Poll the agent config until the voice change is propagated (max 5s)
    let attempts = 0;
    while (currentVoiceId !== voiceId && attempts < 5) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: "GET",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        currentVoiceId = (getData as any)?.conversation_config?.tts?.voice_id ?? currentVoiceId;
      }
      attempts++;
    }

    const verified = currentVoiceId === voiceId;
    console.log("[elevenlabs update-agent-voice] voice verified:", verified, { requested: voiceId, current: currentVoiceId, attempts });
    return NextResponse.json({ success: verified, voiceId: currentVoiceId, verified, agent: patchData });
  } catch (err) {
    console.error("[elevenlabs update-agent-voice] unexpected error:", err);
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
