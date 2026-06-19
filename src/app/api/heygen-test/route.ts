import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createSessionToken,
  startSession,
  stopSession,
  createLiveAvatarContext,
  createLiveAvatarSecret,
  createLLMConfig,
  deleteLLMConfig,
} from "@/lib/heygen";
import { CustomScenario, CustomPersona } from "@/types";
import { mockPersonas } from "@/lib/data/mockData";

function serviceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function buildPersonaPrompt(scenario: CustomScenario, persona: CustomPersona | null): string {
  const name = persona?.name ?? "the buyer";
  const role = persona?.jobTitle ?? "Decision Maker";
  const company = persona?.company ?? scenario.seller_company;
  const industry = persona?.industry ?? "";
  const personality = persona?.personality ?? "professional and reserved";
  const painPoints = persona?.painPoints?.length
    ? persona.painPoints.map((p) => `- ${p}`).join("\n")
    : "- No specific pain points listed";
  const sellerCtx = scenario.seller_description ? `\nWHAT IS BEING SOLD:\n${scenario.seller_description}` : "";
  const callCtx = scenario.context_note ? `\nCALL CONTEXT:\n${scenario.context_note}` : "";
  return `You are ${name}, ${role} at ${company}${industry ? ` (${industry})` : ""}.\nPERSONALITY: ${personality}\nYOUR PAIN POINTS:\n${painPoints}${sellerCtx}${callCtx}\n\nGROUND RULES:\n- You are the BUYER. Stay fully in character.\n- Be guarded. Share info only when asked the right questions.\n- Ask for data and proof before committing.\n- Keep responses concise (2-4 sentences). Speak naturally.`;
}

const AVATAR_ID = process.env.LIVEAVATAR_AVATAR_ID!;
const VOICE_ID = process.env.LIVEAVATAR_VOICE_ID;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { scenarioId, scenarioTable } = body as { scenarioId?: string; scenarioTable?: string };

    let personaPrompt = "You are a friendly assistant. Answer questions naturally and concisely.";
    let openingText = "Hi there! I'm your LiveAvatar test. Go ahead and talk to me.";
    let scenarioName = "LiveAvatar Test";

    if (scenarioId && scenarioTable) {
      try {
        const supabase = serviceSupabase();
        const { data: scenario } = await supabase
          .from(scenarioTable)
          .select("*")
          .eq("id", scenarioId)
          .single();

        if (scenario) {
          scenarioName = scenario.name ?? scenarioName;
          let persona: CustomPersona | null = scenario.custom_persona as CustomPersona ?? null;
          if (!persona && scenario.preset_persona_id) {
            const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
            if (preset) persona = { name: preset.name, jobTitle: preset.jobTitle, company: preset.company, industry: preset.industry, personality: preset.personality, painPoints: preset.painPoints, goals: preset.goals };
          }
          personaPrompt = buildPersonaPrompt(scenario as CustomScenario, persona);
          openingText = `Hi, I'm ${persona?.name ?? "Alex"}. Thanks for reaching out — go ahead.`;
          console.log("[heygen-test] scenario:", scenarioName, "persona:", persona?.name);
        }
      } catch (e) {
        console.warn("[heygen-test] scenario lookup failed:", e);
      }
    }

    let contextId: string | undefined;
    try {
      contextId = await createLiveAvatarContext({
        name: `Test-${Date.now()}`,
        prompt: personaPrompt,
        opening_text: openingText,
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
          base_url: `${appUrl}/api/heygen-test/llm`,
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
      scenario_name: scenarioName,
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
