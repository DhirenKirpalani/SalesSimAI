import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createSessionToken,
  createLiveAvatarSecret,
  createLLMConfig,
  deleteLLMConfig,
  createLiveAvatarContext,
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

    // Detect if we are deployed (FULL mode) or local (LITE mode fallback)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const isDeployed = !!appUrl && !appUrl.includes("localhost");

    let llmConfigId: string | undefined;
    let contextId: string | undefined;

    if (isDeployed && sessionId) {
      // ── FULL mode setup ───────────────────────────────────────────────────
      // 1. Register OpenAI key as a LiveAvatar secret (so LiveAvatar can call our proxy)
      const openaiKey = process.env.OPENAI_API_KEY!;
      let secretId: string;
      try {
        secretId = await createLiveAvatarSecret(openaiKey, `SalesSim-${sessionId}`);
        console.log("[heygen/new] created secret:", secretId);
      } catch (e) {
        console.warn("[heygen/new] secret creation failed, falling back to LITE mode:", e);
        return fallbackToLite(avatarIdToUse, quality, isSandbox, sessionId, supabase, user.id);
      }

      // 2. Create LLM config pointing to our proxy endpoint
      const baseUrl = `${appUrl}/api/simulation/llm/${sessionId}`;
      try {
        llmConfigId = await createLLMConfig({
          display_name: `SalesSim-${sessionId}`,
          model_name: "gpt-4o",
          secret_id: secretId,
          base_url: baseUrl,
        });
        console.log("[heygen/new] created LLM config:", llmConfigId, "→", baseUrl);
      } catch (e) {
        console.warn("[heygen/new] LLM config creation failed, falling back to LITE mode:", e);
        return fallbackToLite(avatarIdToUse, quality, isSandbox, sessionId, supabase, user.id);
      }

      // 3. Build persona context for avatar greeting + personality
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
            const prompt = buildPersonaPrompt(scenario as CustomScenario, persona);
            const openingName = persona?.name ?? "Buyer";
            contextId = await createLiveAvatarContext({
              name: `${scenario.name} — ${openingName}`,
              prompt,
              opening_text: `Hi, this is ${openingName} speaking. Thanks for calling.`,
            });
            console.log("[heygen/new] created context:", contextId);
          }
        } catch (e) {
          console.warn("[heygen/new] context creation failed, proceeding without:", e);
        }
      }

      // 4. Create FULL mode session token
      const liveSession = await createSessionToken({
        mode: "FULL",
        avatar_id: avatarIdToUse,
        quality: quality ?? "low",
        is_sandbox: isSandbox ?? false,
        interactivity_type: "PUSH_TO_TALK",
        llm_configuration_id: llmConfigId,
        context_id: contextId,
        voice_id: voiceId ?? process.env.LIVEAVATAR_VOICE_ID,
      });

      await supabase.from("simulation_sessions")
        .update({ heygen_session_id: liveSession.session_id, meta: { llm_config_id: llmConfigId } })
        .eq("id", sessionId).eq("user_id", user.id);

      return NextResponse.json({
        session_id: liveSession.session_id,
        session_token: liveSession.session_token,
        mode: "FULL",
        context_id: contextId,
      });
    }

    // ── LITE mode fallback (local / no APP_URL) ───────────────────────────────
    return fallbackToLite(avatarIdToUse, quality, isSandbox, sessionId, supabase, user.id);
  } catch (err) {
    console.error("[heygen/new]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fallbackToLite(avatarId: string, quality: "low" | "medium" | "high" | undefined, isSandbox: boolean, sessionId: string, supabase: any, userId: string) {
  const liveSession = await createSessionToken({
    mode: "LITE",
    avatar_id: avatarId,
    quality: quality ?? "low",
    is_sandbox: isSandbox ?? false,
  });
  if (sessionId) {
    await supabase.from("simulation_sessions")
      .update({ heygen_session_id: liveSession.session_id })
      .eq("id", sessionId).eq("user_id", userId);
  }
  return NextResponse.json({
    session_id: liveSession.session_id,
    session_token: liveSession.session_token,
    mode: "LITE",
  });
}

// Clean up LLM config when session ends (called from stop route)
export async function DELETE(req: NextRequest) {
  const { llm_config_id } = await req.json();
  if (llm_config_id) await deleteLLMConfig(llm_config_id);
  return NextResponse.json({ ok: true });
}
