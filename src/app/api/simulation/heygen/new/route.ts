import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSessionToken, createLiveAvatarContext } from "@/lib/heygen";
import { CustomScenario, CustomPersona } from "@/types";
import { mockPersonas } from "@/lib/data/mockData";

function buildPersonaPrompt(scenario: CustomScenario, resolvedPersona?: CustomPersona | null): { prompt: string; opening_text: string } {
  const persona: CustomPersona | null = resolvedPersona ?? scenario.custom_persona;

  const name = persona?.name ?? "the buyer";
  const role = persona?.jobTitle ?? "Decision Maker";
  const company = persona?.company ?? scenario.seller_company;
  const industry = persona?.industry ?? "";
  const personality = persona?.personality ?? "professional and reserved";
  const painPoints = persona?.painPoints?.length
    ? persona.painPoints.map((p) => `- ${p}`).join("\n")
    : "- No specific pain points listed";

  const sellerContext = scenario.seller_description
    ? `\n\nWHAT IS BEING SOLD:\n${scenario.seller_description}`
    : "";

  const callContext = scenario.context_note
    ? `\n\nCALL CONTEXT:\n${scenario.context_note}`
    : "";

  const prompt = `You are ${name}, ${role} at ${company}${industry ? ` (${industry})` : ""}.

PERSONALITY: ${personality}

YOUR PAIN POINTS:
${painPoints}
${sellerContext}
${callContext}

GROUND RULES:
- You are the BUYER in this conversation, NOT a helpful assistant.
- Stay fully in character as ${name} at all times.
- Be ${personality.split(",")[0].trim()} — share information only when asked the right questions.
- Do NOT volunteer information unprompted.
- You are not hostile, but you are guarded and analytical.
- Ask for data and proof before committing to anything.
- It is OK to say "I'd need to check on that" or "Send me something in writing."`;

  const opening_text = `Hi, this is ${name} speaking. Thanks for calling.`;

  return { prompt, opening_text };
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
      return NextResponse.json({ error: "No avatar_id provided and LIVEAVATAR_AVATAR_ID is not set" }, { status: 400 });
    }

    let contextId: string | undefined;
    if (scenarioId && scenarioTable) {
      const { data: scenario } = await supabase
        .from(scenarioTable)
        .select("*")
        .eq("id", scenarioId)
        .single();

      if (scenario) {
        // Resolve persona: custom > preset > undefined (buildPersonaPrompt handles null)
        let resolvedPersona: CustomPersona | null = scenario.custom_persona ?? null;
        if (!resolvedPersona && scenario.preset_persona_id) {
          const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
          if (preset) {
            resolvedPersona = {
              name: preset.name,
              jobTitle: preset.jobTitle,
              company: preset.company,
              industry: preset.industry,
              personality: preset.personality,
              painPoints: preset.painPoints,
              goals: preset.goals,
            };
          }
        }

        const { prompt, opening_text } = buildPersonaPrompt(scenario as CustomScenario, resolvedPersona);
        const personaName = resolvedPersona?.name ?? "Buyer";
        try {
          contextId = await createLiveAvatarContext({
            name: `${scenario.name} — ${personaName}`,
            prompt,
            opening_text,
          });
        } catch (ctxErr) {
          console.warn("[heygen/new] Context creation failed, proceeding without:", ctxErr);
        }
      }
    }

    const liveSession = await createSessionToken({
      avatar_id: avatarIdToUse,
      voice_id: voiceId ?? process.env.LIVEAVATAR_VOICE_ID,
      context_id: contextId,
      quality: quality ?? "low",
      is_sandbox: isSandbox ?? false,
      interactivity_type: "PUSH_TO_TALK",
    });

    if (sessionId) {
      await supabase
        .from("simulation_sessions")
        .update({ heygen_session_id: liveSession.session_id })
        .eq("id", sessionId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      session_id: liveSession.session_id,
      session_token: liveSession.session_token,
      context_id: contextId,
    });
  } catch (err) {
    console.error("[heygen/new]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
