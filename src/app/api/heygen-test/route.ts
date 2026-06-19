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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  console.log("[heygen-test] supabase key type:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon (fallback)");
  return createClient(url, key);
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

    console.log("[heygen-test] ── START ──────────────────────────────────────────");
    console.log("[heygen-test] scenarioId:", scenarioId ?? "(none)");
    console.log("[heygen-test] scenarioTable:", scenarioTable ?? "(none)");

    let personaPrompt = "You are a friendly assistant. Answer questions naturally and concisely.";
    let openingText = "Hi there! I'm your LiveAvatar test. Go ahead and talk to me.";
    let scenarioName = "LiveAvatar Test";

    if (scenarioId && scenarioTable) {
      console.log("[heygen-test] Looking up scenario from Supabase…");
      try {
        const supabase = serviceSupabase();
        const { data: scenario, error: scenarioError } = await supabase
          .from(scenarioTable)
          .select("*")
          .eq("id", scenarioId)
          .single();

        if (scenarioError) {
          console.error("[heygen-test] ❌ Supabase error:", scenarioError.message);
        } else if (!scenario) {
          console.warn("[heygen-test] ⚠️  Scenario not found — id:", scenarioId, "table:", scenarioTable);
        } else {
          scenarioName = scenario.name ?? scenarioName;
          console.log("[heygen-test] ✅ Scenario found:", scenarioName);
          console.log("[heygen-test] seller_company:", scenario.seller_company);
          console.log("[heygen-test] seller_product:", scenario.seller_product);
          console.log("[heygen-test] scenario_type:", scenario.scenario_type);
          console.log("[heygen-test] has custom_persona:", !!scenario.custom_persona);
          console.log("[heygen-test] preset_persona_id:", scenario.preset_persona_id ?? "(none)");

          let persona: CustomPersona | null = scenario.custom_persona as CustomPersona ?? null;
          if (!persona && scenario.preset_persona_id) {
            const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
            if (preset) {
              persona = { name: preset.name, jobTitle: preset.jobTitle, company: preset.company, industry: preset.industry, personality: preset.personality, painPoints: preset.painPoints, goals: preset.goals };
              console.log("[heygen-test] Resolved preset persona:", preset.name, "-", preset.jobTitle);
            } else {
              console.warn("[heygen-test] ⚠️  preset_persona_id not found in mockPersonas:", scenario.preset_persona_id);
            }
          } else if (persona) {
            console.log("[heygen-test] Using custom_persona:", persona.name, "-", persona.jobTitle, "at", persona.company);
          } else {
            console.warn("[heygen-test] ⚠️  No persona found — using fallback");
          }

          personaPrompt = buildPersonaPrompt(scenario as CustomScenario, persona);
          openingText = `Hi, I'm ${persona?.name ?? "Alex"}. Thanks for reaching out — go ahead.`;

          console.log("[heygen-test] ── PERSONA PROMPT ──────────────────────────");
          console.log(personaPrompt);
          console.log("[heygen-test] ── OPENING TEXT ────────────────────────────");
          console.log(openingText);
          console.log("[heygen-test] ──────────────────────────────────────────────");
        }
      } catch (e) {
        console.error("[heygen-test] ❌ scenario lookup threw:", e);
      }
    } else {
      console.log("[heygen-test] No scenarioId/scenarioTable — using generic prompt");
    }

    let contextId: string | undefined;
    console.log("[heygen-test] Creating LiveAvatar context…");
    try {
      contextId = await createLiveAvatarContext({
        name: `Test-${Date.now()}`,
        prompt: personaPrompt,
        opening_text: openingText,
      });
      console.log("[heygen-test] ✅ Context created:", contextId);
    } catch (e) {
      console.error("[heygen-test] ❌ Context creation failed:", e);
    }

    let llmConfigId: string | undefined;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const openaiKey = process.env.OPENAI_API_KEY;
    console.log("[heygen-test] NEXT_PUBLIC_APP_URL:", appUrl ?? "(not set — localhost, LLM will be skipped)");
    if (appUrl && openaiKey) {
      const llmName = `Test-${Date.now()}`;
      const llmEndpoint = `${appUrl}/api/heygen-test/llm`;
      console.log("[heygen-test] LLM base_url:", llmEndpoint);
      console.log("[heygen-test] LiveAvatar will call:", llmEndpoint + "/chat/completions");
      try {
        const secretId = await createLiveAvatarSecret(openaiKey, llmName);
        console.log("[heygen-test] ✅ Secret created:", secretId);
        llmConfigId = await createLLMConfig({
          display_name: llmName,
          model_name: "gpt-4o",
          secret_id: secretId,
          base_url: llmEndpoint,
        });
        console.log("[heygen-test] ✅ LLM config created:", llmConfigId);
      } catch (e) {
        console.error("[heygen-test] ❌ LLM config failed:", e);
      }
    } else {
      console.warn("[heygen-test] ⚠️  No APP_URL or OPENAI_API_KEY — skipping LLM config. Avatar will NOT respond.");
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

    console.log("[heygen-test] ── SESSION TOKEN ───────────────────────────────");
    console.log("[heygen-test] session_id:", token.session_id);
    console.log("[heygen-test] context_id:", contextId ?? "(none — persona NOT passed)");
    console.log("[heygen-test] llm_config_id:", llmConfigId ?? "(none — avatar will NOT respond)");
    console.log("[heygen-test] mode: FULL, interactivity: CONVERSATIONAL");
    console.log("[heygen-test] ────────────────────────────────────────────────");

    const session = await startSession(token.session_token);
    console.log("[heygen-test] ✅ Session started:", session.session_id);
    console.log("[heygen-test] livekit_url:", session.livekit_url);

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
