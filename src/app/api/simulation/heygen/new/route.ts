import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createSessionToken,
  createLiveAvatarContext,
  createLiveAvatarSecret,
  createLLMConfig,
  deleteLLMConfig,
} from "@/lib/heygen";
import { CustomScenario, CustomPersona } from "@/types";
import { mockPersonas } from "@/lib/data/mockData";

function buildPersonaPrompt(scenario: CustomScenario, persona: CustomPersona | null) {
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

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, avatarId, voiceId, quality, isSandbox, scenarioId, scenarioTable } = body;

    const avatarIdToUse = avatarId ?? process.env.LIVEAVATAR_AVATAR_ID;
    if (!avatarIdToUse) {
      return NextResponse.json({ error: "No avatar_id provided" }, { status: 400 });
    }

    // Build persona context so LiveAvatar's built-in LLM knows how to behave
    let contextId: string | undefined;
    if (scenarioId && scenarioTable) {
      try {
        const { data: scenario } = await supabase
          .from(scenarioTable).select("*").eq("id", scenarioId).single();
        if (scenario) {
          let persona: CustomPersona | null = scenario.custom_persona ?? null;
          if (!persona && scenario.preset_persona_id) {
            const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
            if (preset) persona = { name: preset.name, jobTitle: preset.jobTitle, company: preset.company, industry: preset.industry, personality: preset.personality, painPoints: preset.painPoints, goals: preset.goals };
          }
          const openingName = persona?.name ?? "the buyer";
          contextId = await createLiveAvatarContext({
            name: `${scenario.name} — ${openingName}`,
            prompt: buildPersonaPrompt(scenario as CustomScenario, persona),
            opening_text: `Hi, I'm ${openingName}. Thanks for reaching out — go ahead.`,
          });
          console.log("[heygen/new] context:", contextId);
        }
      } catch (e) {
        console.warn("[heygen/new] context creation failed, proceeding without:", e);
      }
    }

    // LLM config: use our proxy (only works when APP_URL is publicly reachable, i.e. production).
    // On localhost LiveAvatar's servers cannot call localhost:3000, so we skip.
    let llmConfigId: string | undefined;
    let llmError: string | undefined;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && sessionId && process.env.OPENAI_API_KEY) {
      const uniqueName = `SalesSim-${Date.now()}`;
      try {
        console.log("[heygen/new] Creating LLM secret + config for prod proxy...");
        const secretId = await createLiveAvatarSecret(process.env.OPENAI_API_KEY, uniqueName);
        llmConfigId = await createLLMConfig({
          display_name: uniqueName,
          model_name: "gpt-4o",
          secret_id: secretId,
          base_url: `${appUrl}/api/simulation/llm/${sessionId}`,
        });
        console.log("[heygen/new] LLM config created:", llmConfigId);
      } catch (e) {
        llmError = e instanceof Error ? e.message : String(e);
        console.error("[heygen/new] LLM config creation FAILED:", llmError);
      }
    } else {
      llmError = appUrl ? "OPENAI_API_KEY missing" : "No APP_URL — skipping LLM config (localhost)";
      console.log("[heygen/new]", llmError);
    }

    const liveSession = await createSessionToken({
      mode: "FULL",
      avatar_id: avatarIdToUse,
      quality: quality ?? "low",
      is_sandbox: isSandbox ?? false,
      interactivity_type: "CONVERSATIONAL",
      llm_configuration_id: llmConfigId,
      context_id: contextId,
      voice_id: voiceId ?? process.env.LIVEAVATAR_VOICE_ID,
    });

    if (sessionId) {
      await supabase.from("simulation_sessions")
        .update({ heygen_session_id: liveSession.session_id, meta: { llm_config_id: llmConfigId } })
        .eq("id", sessionId).eq("user_id", user.id);
    }

    return NextResponse.json({
      session_id: liveSession.session_id,
      session_token: liveSession.session_token,
      mode: "FULL",
      llm_config_id: llmConfigId ?? null,
      llm_error: llmError ?? null,
    });
  } catch (err) {
    console.error("[heygen/new]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { llm_config_id } = await req.json();
  if (llm_config_id) await deleteLLMConfig(llm_config_id);
  return NextResponse.json({ ok: true });
}
