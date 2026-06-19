import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  startSession,
  stopSession,
  createLiveAvatarContext,
  createLiveAvatarSecret,
  createLLMConfig,
  deleteLLMConfig,
} from "@/lib/heygen";

const AVATAR_ID = process.env.LIVEAVATAR_AVATAR_ID!;
const VOICE_ID = process.env.LIVEAVATAR_VOICE_ID;

export async function POST() {
  try {
    let contextId: string | undefined;
    try {
      contextId = await createLiveAvatarContext({
        name: "LiveAvatar Test",
        prompt: "You are a friendly assistant. Answer questions naturally and concisely.",
        opening_text: "Hi there! I'm your LiveAvatar test. Go ahead and talk to me.",
      });
    } catch (e) {
      console.warn("[heygen-test] context creation failed:", e);
    }

    let llmConfigId: string | undefined;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (appUrl && openaiKey) {
      const name = `Test-${Date.now()}`;
      try {
        const secretId = await createLiveAvatarSecret(openaiKey, name);
        llmConfigId = await createLLMConfig({
          display_name: name,
          model_name: "gpt-4o",
          secret_id: secretId,
          base_url: `${appUrl}/api/simulation/llm/test-session`,
        });
        console.log("[heygen-test] LLM config:", llmConfigId);
      } catch (e) {
        console.warn("[heygen-test] LLM config failed:", e);
      }
    } else {
      console.log("[heygen-test] No APP_URL — skipping LLM config (localhost)");
    }

    const token = await createSessionToken({
      mode: "FULL",
      avatar_id: AVATAR_ID,
      quality: "medium",
      is_sandbox: false,
      interactivity_type: "CONVERSATIONAL",
      voice_id: VOICE_ID,
      context_id: contextId,
      llm_configuration_id: llmConfigId,
    });

    console.log("[heygen-test] session token created:", token.session_id);

    const session = await startSession(token.session_token);
    console.log("[heygen-test] session started:", session.session_id);

    return NextResponse.json({
      session_id: session.session_id,
      livekit_url: session.livekit_url,
      livekit_client_token: session.livekit_client_token,
      llm_config_id: llmConfigId ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[heygen-test] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { session_id, llm_config_id } = await req.json();
  if (session_id) await stopSession(session_id).catch(() => {});
  if (llm_config_id) await deleteLLMConfig(llm_config_id).catch(() => {});
  return NextResponse.json({ ok: true });
}
