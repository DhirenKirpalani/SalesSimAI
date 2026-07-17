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
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }
    if (!voiceId && !systemPrompt) {
      return NextResponse.json({ error: "voiceId or systemPrompt is required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    const conversationConfig: Record<string, unknown> = {};
    if (voiceId) {
      conversationConfig.tts = { voice_id: voiceId };
    }
    if (systemPrompt) {
      conversationConfig.agent = { prompt: { prompt: systemPrompt } };
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
      return NextResponse.json({ error: `ElevenLabs API error: ${patchRes.status}`, detail: errorText }, { status: patchRes.status });
    }

    const patchData = await patchRes.json();
    console.log("[elevenlabs update-agent-voice] PATCH response keys:", Object.keys(patchData));
    const patchedPrompt = (patchData as any)?.conversation_config?.agent?.prompt;
    console.log("[elevenlabs update-agent-voice] patched prompt type:", typeof patchedPrompt, Array.isArray(patchedPrompt) ? "array" : "");
    if (typeof patchedPrompt === "string") {
      console.log("[elevenlabs update-agent-voice] patched prompt starts with:", patchedPrompt.slice(0, 100));
      console.log("[elevenlabs update-agent-voice] patched prompt has CRITICAL RULE:", patchedPrompt.includes("CRITICAL RULE"));
    } else if (typeof patchedPrompt === "object" && patchedPrompt !== null) {
      const innerPrompt = (patchedPrompt as any)?.prompt ?? "";
      console.log("[elevenlabs update-agent-voice] patched prompt.prompt starts with:", String(innerPrompt).slice(0, 100));
      console.log("[elevenlabs update-agent-voice] patched prompt.prompt has CRITICAL RULE:", String(innerPrompt).includes("CRITICAL RULE"));
    }
    let currentVoiceId = (patchData as any)?.conversation_config?.tts?.voice_id ?? voiceId ?? "";

    // Poll the agent config until the voice change is propagated (max 5s)
    // Only poll if we actually sent a voice_id
    if (voiceId) {
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
    }

    const verified = voiceId ? currentVoiceId === voiceId : true;
    console.log("[elevenlabs update-agent-voice] voice verified:", verified, { requested: voiceId, current: currentVoiceId });

    // Fetch the agent config to verify the prompt was actually stored
    let promptVerified = false;
    let currentPromptSnippet = "";
    try {
      const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: "GET",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        const agentPrompt = (getData as any)?.conversation_config?.agent?.prompt;
        const promptStr = typeof agentPrompt === "string"
          ? agentPrompt
          : typeof agentPrompt === "object" && agentPrompt !== null
            ? String((agentPrompt as any)?.prompt ?? "")
            : "";
        promptVerified = promptStr.includes("CRITICAL RULE");
        currentPromptSnippet = promptStr.slice(0, 120);
        console.log("[elevenlabs update-agent-voice] PROMPT VERIFICATION:", { promptVerified, snippet: currentPromptSnippet, promptLength: promptStr.length });
      }
    } catch (getErr) {
      console.warn("[elevenlabs update-agent-voice] prompt verification GET failed:", getErr);
    }

    return NextResponse.json({ success: verified, voiceId: currentVoiceId, verified, promptVerified, promptSnippet: currentPromptSnippet, agent: patchData });
  } catch (err) {
    console.error("[elevenlabs update-agent-voice] unexpected error:", err);
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
