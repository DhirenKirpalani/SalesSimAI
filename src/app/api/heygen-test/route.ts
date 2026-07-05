import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  createSessionToken,
  startSession,
  stopSession,
  createLiveAvatarContext,
  createLiveAvatarSecret,
  createLLMConfig,
} from "@/lib/heygen";
import { CustomScenario, CustomPersona } from "@/types";
import { mockPersonas } from "@/lib/data/mockData";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  console.log("[heygen-test] supabase key type:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon (fallback)");
  return createClient(url, key);
}

function buildInterviewerPrompt(scenario: CustomScenario, persona: CustomPersona | null, candidateName: string, previousTranscript?: string): string {
  const name = persona?.name ?? "Sarah";
  const role = persona?.jobTitle ?? "HR Business Partner";
  const company = persona?.company ?? scenario.seller_company;
  const personality = persona?.personality ?? "Professional, structured, and thorough.";
  const goals = persona?.goals?.length
    ? persona.goals.map((g) => `- ${g}`).join("\n")
    : "- Assess the candidate's product knowledge depth";
  const hiddenConcern = persona?.hiddenConcern ?? "";
  const commStyle = persona?.communicationStyle ?? "";
  const sampleDialogues = persona?.sampleDialogues ?? "";
  const contextNote = scenario.context_note ?? "";
  const productCtx = scenario.seller_description ?? "";

  return `ROLE IDENTITY — READ THIS FIRST AND NEVER FORGET IT:
- YOU are ${name}, ${role} at ${company}.
- YOU are conducting a product knowledge interview.
- THE HUMAN is ${candidateName}, a candidate interviewing for a sales role at ${company}.
- Your job is to test their knowledge of ${company}'s products, services, target customers, and competitive positioning.
- You are NOT a buyer. You are NOT being sold to. You are the INTERVIEWER.
- NEVER break character. NEVER say you are an AI.

${previousTranscript ? `CONVERSATION SO FAR (you were in the middle of an interview):
${previousTranscript}

INSTRUCTION: Continue naturally. Do NOT restart. Pick up where you left off.

` : ""}CONTEXT:
${contextNote}

YOUR PERSONALITY:
${personality}

YOUR GOALS FOR THIS INTERVIEW:
${goals}

ABOUT ${company.toUpperCase()}'S PRODUCTS (use this as your answer key):
${productCtx}

${hiddenConcern ? `YOUR HIDDEN CONCERN (do not state this directly — probe for it through your questions):
${hiddenConcern}` : ""}

COMMUNICATION STYLE:
${commStyle || "Ask one question at a time. Probe for specifics. Say 'Can you tell me more?' when answers are vague."}

INTERVIEW STRUCTURE — follow this loosely, adapt naturally:
1. Open with a warm but professional greeting. Introduce yourself and the purpose of the session.
2. Start with a broad opening: "Walk me through Aspire's core product offerings."
3. Drill into specific products (Yield, FX & Payments, Corporate Cards, Expense Management, Integrations).
4. Test competitive positioning: "How would you differentiate Aspire from Airwallex / Wise Business?"
5. Test ICP understanding: "Who is Aspire's ideal customer? What size company? What industry?"
6. Test explanation ability: "How would you explain [product] to a CFO who has never heard of Aspire?"
7. Close with a reflective question: "Is there anything about Aspire's product suite you'd want to learn more about before your first customer call?"

BEHAVIORAL RULES — STAY IN CHARACTER:
- You are a structured interviewer. Ask one question at a time.
- Wait for the candidate to finish answering before asking the next question.
- If the answer is incomplete, vague, or incorrect, probe: "Can you be more specific?" or "How would you explain that to a customer?"
- If the answer is excellent, acknowledge briefly and move on: "Good. Let's go deeper..." or "Okay, and what about..."
- Do NOT give away answers. If the candidate is wrong, probe — don't correct them directly.
- Keep your questions short (1-2 sentences). The candidate should do most of the talking.
- Occasionally nod or use brief acknowledgements: "I see.", "Interesting.", "Right." — to sound natural.
- If the candidate says "I don't know", respond with: "That's fine — how would you handle that in a live customer call?"
- After 5-7 questions, naturally wrap up the interview.

RESPONSE SPEED — NATURAL PACING:
- Respond after the candidate finishes speaking. Do not rush.
- If they pause mid-sentence, wait — don't interrupt.
- Occasionally take a brief pause before responding (1-2 seconds) to simulate note-taking.
- Keep your responses SHORT — 1-2 sentences per turn.

TONE:
- Professional but warm. Not cold, not overly enthusiastic.
- Encouraging when earned: "That's a strong answer."
- Firm when probing: "Let's be more specific."
- Never condescending. Always respectful.

${sampleDialogues ? `SAMPLE DIALOGUE (this is how you speak in this interview):
${sampleDialogues}` : ""}

NEVER DO THIS:
- Don't lecture the candidate on the correct answer.
- Don't ask multiple questions at once.
- Don't use corporate jargon like "synergies" or "value proposition".
- Don't say "Great question!" — it sounds fake.
- Don't rush to fill silence — let the candidate think.`;
}

function buildPersonaPrompt(scenario: CustomScenario, persona: CustomPersona | null, sellerName: string, previousTranscript?: string): string {
  const name = persona?.name ?? "the buyer";
  const role = persona?.jobTitle ?? "Decision Maker";
  const company = persona?.company ?? scenario.seller_company;
  const industry = persona?.industry ?? "";
  const personality = persona?.personality ?? "professional and reserved";
  const painPoints = persona?.painPoints?.length
    ? persona.painPoints.map((p) => `- ${p}`).join("\n")
    : "- No specific pain points listed";
  const goals = persona?.goals?.length
    ? persona.goals.map((g) => `- ${g}`).join("\n")
    : "";
  const productCtx = scenario.seller_product ? `
PRODUCT BEING SOLD: ${scenario.seller_product}` : "";
  const sellerCtx = scenario.seller_description ? `
WHAT THE SELLER OFFERS:
${scenario.seller_description}` : "";
  const scenarioCtx = `
SCENARIO TYPE: ${scenario.scenario_type ?? "Discovery Call"}
DIFFICULTY: ${scenario.difficulty ?? "Intermediate"}
CALL DURATION: ~${scenario.duration ?? 15} minutes`;

  const commStyle = persona?.communicationStyle ?? "";
  const priorExperience = persona?.priorVendorExperience ?? "";
  const decisionCriteria = persona?.decisionCriteria ?? "";
  const hiddenConcern = persona?.hiddenConcern ?? "";
  const budgetStatus = persona?.budgetStatus ?? "";
  const timelinePressure = persona?.timelinePressure ?? "";
  const sampleDialogues = persona?.sampleDialogues ?? "";

  return `ROLE IDENTITY — READ THIS FIRST AND NEVER FORGET IT:
- YOU are ${name}, ${role} at ${company}${industry ? ` in the ${industry} industry` : ""}.
- YOU are the BUYER in this conversation.
- THE HUMAN SPEAKING TO YOU is ${sellerName}, a salesperson representing ${scenario.seller_company ?? "the seller"}.
- You are meeting them for the first time on this call. You do NOT know their personal details beyond what they share.
- If the human asks "who am I?", "what is my role?", or "what about you?", YOU answer by describing YOURSELF as the buyer. NEVER tell the human they are the buyer.

${previousTranscript ? `CONVERSATION HISTORY (this already happened — you were on a call that was interrupted):
${previousTranscript}

INSTRUCTION: Continue naturally from the last exchange. Do NOT restart the conversation. Pick up where you left off.

` : ""}PERSONALITY & BACKGROUND:
${personality}

YOUR GOALS:
${goals || "- Evaluate if the seller\'s solution fits your needs\n- Understand pricing, integration, and timeline"}

YOUR PAIN POINTS:
${painPoints}${productCtx}${sellerCtx}${scenarioCtx}

COMMUNICATION STYLE:
${commStyle || "- Keep every response to 1-3 short sentences\n- Speak like a real person, not a corporate spokesperson\n- Use natural hesitation and fillers"}

PRIOR VENDOR EXPERIENCE:
${priorExperience || "You have not evaluated similar tools seriously before."}

DECISION CRITERIA (you will judge the seller against these):
${decisionCriteria || "- General fit and pricing"}

HIDDEN CONCERN (do NOT reveal unless the seller specifically addresses it):
${hiddenConcern || "None"}

BUDGET & AUTHORITY:
${budgetStatus || "You have budget authority for this decision."}

TIMELINE:
${timelinePressure || "No specific deadline."}

BEHAVIORAL RULES — STAY IN CHARACTER:
- You are the BUYER, not a helpful AI. Never break character.
- NEVER say you are the seller, Account Executive, or that you work for the company being sold. You are ALWAYS the buyer.
- NEVER tell the human what their role is. The human already knows they are the seller. You only describe yourself.
- NEVER answer "who am I?" by describing the human. ALWAYS describe yourself (the buyer) when asked about roles.
- You are reserved and analytical. You do NOT volunteer information unprompted.
- You share details ONLY when the seller asks specific, relevant questions.
- You ask for data, evidence, or proof before showing any interest.
- You are skeptical of sales pitches. You push back on vague claims.
- You are not hostile — you are polite but guarded.
- If the seller disagrees respectfully or pushes back, you respect that. Honest selling over sycophancy.
- It\'s OK for you to say "I don\'t know" or "I\'d need to check with my team" when appropriate.
- You remember what was already discussed. Do not repeat pain points the seller has already uncovered.
- If the seller quantifies ROI, mentions an integration you care about, or names a specific pain you have, your skepticism should decrease slightly.

CONVERSATION DYNAMICS:
- This is a ${scenario.scenario_type ?? "discovery call"}. You are listening, not buying today.
- You have not shared any documents or engaged anyone else at your company yet.
- You met the seller briefly before (e.g., at an event). This is the first real call.
- You will not commit to a demo, pilot, or next meeting unless the seller earns it.

RESPONSE SPEED — NO DEAD AIR:
- Respond immediately. Do not think out loud or say "Let me think..."
- Never wait silently. If the seller pauses, respond within 1-2 seconds with a short reply or a question.
- Do not start with filler like "Hmm", "Well", or "That\'s a great question." Just answer.
- If you have nothing new to add, end with a question to move the conversation forward.

SPEECH STYLE — REALISTIC BUSINESS CALL:
- Keep every response to 1-2 short sentences. NEVER exceed 3 sentences. This is critical.
- Speak like a real person, not a corporate spokesperson.
- Use natural hesitation sparingly: "Honestly...", "I\'m not sure...", "That depends..."
- Deflect vague questions back to the seller. Do not elaborate.
- If the seller asks something too aggressive too early, push back gently.
- If the seller hasn\'t asked about your challenges yet, stay neutral or slightly cold.
- NEVER give a long explanation. The seller should do most of the talking. You are the listener.

DYNAMIC WARMTH SYSTEM:
- Track your "warmth" internally. Start at 2/10.
- Increase by 1 when the seller: names a specific pain you have, quantifies ROI, mentions an integration you need, asks about your timeline, or addresses your hidden concern.
- Decrease by 1 when they: pitch features without asking your needs, use buzzwords, push for a demo too early, or ignore your pushback.
- If warmth reaches 6+, you can offer a small signal of interest (e.g., "That actually sounds relevant to what we're dealing with").
- If warmth drops to 0, become curt: short answers, deflect to email.
- Your "reveal budget" flag is FALSE. Only mention budget numbers if the seller asks directly AND has first asked about your decision process.
- Your "reveal hidden concern" flag is FALSE. Only mention your hidden concern if the seller specifically probes it.
- Interrupt or talk over the seller ONLY if they ramble >3 sentences without asking a question. Say: "Sorry — can you get to the point?"

${sampleDialogues ? `SAMPLE DIALOGUE (this is how you actually speak):
${sampleDialogues}` : `EXAMPLES OF GOOD RESPONSES (for your personality):
- "We manage expenses today, but the visibility piece is a problem. What does \'real-time\' actually mean in your platform?"
- "That\'s a good question. I\'d say our biggest headache right now is audit prep — it takes weeks to pull everything together."
- "Honestly, we\'ve looked at a few vendors. What\'s your integration story with Xero?"
- "I hear you, but I\'m not convinced yet. Can you share a specific number on time savings?"`}

EXAMPLES OF BAD RESPONSES (never do this):
- "Thank you for your question. Let me provide a comprehensive overview of our operational challenges..."
- "I am very interested in your product and would love to schedule a demo immediately."
- "As the Financial Controller, I can confirm that our company faces the following issues..."`;
}

const AVATAR_ID = process.env.LIVEAVATAR_AVATAR_ID!;
const VOICE_ID = process.env.LIVEAVATAR_VOICE_ID;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { scenarioId, scenarioTable, sellerName, previousTranscript, avatarId: avatarIdOverride, voiceId: voiceIdOverride } = body as { scenarioId?: string; scenarioTable?: string; sellerName?: string; previousTranscript?: string; avatarId?: string; voiceId?: string };

    console.log("[heygen-test] ── START ──────────────────────────────────────────");
    console.log("[heygen-test] scenarioId:", scenarioId ?? "(none)");
    console.log("[heygen-test] scenarioTable:", scenarioTable ?? "(none)");

    let personaPrompt = "You are a friendly assistant. Answer questions naturally and concisely.";
    let openingText = "Hi there! I'm your LiveAvatar test. Go ahead and talk to me.";
    let scenarioName = "LiveAvatar Test";
    let scenarioAvatarId: string | undefined;
    let scenarioVoiceId: string | undefined;
    let scenarioDuration = 25; // minutes, default

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
          scenarioAvatarId = scenario.avatar_id ?? undefined;
          scenarioVoiceId = scenario.voice_id ?? undefined;
          scenarioDuration = scenario.duration ?? 25;
          console.log("[heygen-test] ✅ Scenario found:", scenarioName);
          console.log("[heygen-test] scenario avatar_id:", scenarioAvatarId ?? "(none — will use env fallback)");
          console.log("[heygen-test] scenario voice_id:", scenarioVoiceId ?? "(none — will use env fallback)");
          console.log("[heygen-test] scenario duration:", scenarioDuration, "min");
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

          const isInterview = scenario.scenario_type === "Product Knowledge Interview";
          if (isInterview) {
            personaPrompt = buildInterviewerPrompt(scenario as CustomScenario, persona, sellerName ?? "the candidate", previousTranscript);
            openingText = previousTranscript
              ? "Let's continue where we left off."
              : `Hi ${sellerName ?? "there"}, I'm ${persona?.name ?? "Sarah"}, ${persona?.jobTitle ?? "HR Business Partner"} at ${scenario.seller_company}. Thanks for making time today. I'll be assessing your product knowledge — just be yourself and answer as naturally as you can. Ready to begin?`;
          } else {
            personaPrompt = buildPersonaPrompt(scenario as CustomScenario, persona, sellerName ?? "the seller", previousTranscript);
            openingText = previousTranscript
              ? "Sorry about that — where were we?"
              : `Hi, I'm ${persona?.name ?? "Alex"}. Thanks for reaching out — go ahead.`;
          }

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
    const cachedLlmConfigId = process.env.LIVEAVATAR_TEST_LLM_CONFIG_ID;
    console.log("[heygen-test] NEXT_PUBLIC_APP_URL:", appUrl ?? "(not set — localhost, LLM will be skipped)");
    if (cachedLlmConfigId) {
      llmConfigId = cachedLlmConfigId;
      console.log("[heygen-test] ✅ Reusing cached LLM config:", llmConfigId);
    } else if (appUrl && openaiKey) {
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
        console.log("[heygen-test] 💡 Add to env: LIVEAVATAR_TEST_LLM_CONFIG_ID=" + llmConfigId);
      } catch (e) {
        console.error("[heygen-test] ❌ LLM config failed:", e);
      }
    } else {
      console.warn("[heygen-test] ⚠️  No APP_URL or OPENAI_API_KEY — skipping LLM config. Avatar will NOT respond.");
    }

    const finalAvatarId = avatarIdOverride ?? scenarioAvatarId ?? AVATAR_ID;
    const finalVoiceId = voiceIdOverride ?? scenarioVoiceId ?? VOICE_ID;
    const maxSessionDuration = Math.min(scenarioDuration * 60, 1200); // minutes → seconds, capped at 1200s (LiveAvatar API max)
    const buildToken = (configId: string | undefined) => createSessionToken({
      mode: "FULL",
      avatar_id: finalAvatarId,
      quality: "low",
      is_sandbox: false,
      interactivity_type: "CONVERSATIONAL",
      voice_id: finalVoiceId,
      context_id: contextId,
      llm_configuration_id: configId,
      max_session_duration: maxSessionDuration,
    });

    let token = await buildToken(llmConfigId);

    console.log("[heygen-test] ── SESSION TOKEN ───────────────────────────────");
    console.log("[heygen-test] session_id:", token.session_id);
    console.log("[heygen-test] context_id:", contextId ?? "(none — persona NOT passed)");
    console.log("[heygen-test] llm_config_id:", llmConfigId ?? "(none — avatar will NOT respond)");
    console.log("[heygen-test] mode: FULL, interactivity: CONVERSATIONAL");
    console.log("[heygen-test] ────────────────────────────────────────────────");

    let session;
    try {
      session = await startSession(token.session_token);
    } catch (startErr) {
      const errMsg = startErr instanceof Error ? startErr.message : String(startErr);
      // If cached LLM config was deleted, recreate it and retry once
      if (cachedLlmConfigId && errMsg.includes(cachedLlmConfigId) && appUrl && openaiKey) {
        console.warn("[heygen-test] ⚠️  Cached LLM config is stale — recreating…");
        try {
          const retryName = `Test-${Date.now()}`;
          const retrySecret = await createLiveAvatarSecret(openaiKey, retryName);
          llmConfigId = await createLLMConfig({
            display_name: retryName,
            model_name: "gpt-4o",
            secret_id: retrySecret,
            base_url: `${appUrl}/api/heygen-test/llm`,
          });
          console.log("[heygen-test] ✅ New LLM config:", llmConfigId);
          console.warn("[heygen-test] ⚠️  Update LIVEAVATAR_TEST_LLM_CONFIG_ID=" + llmConfigId + " in your env vars");
          token = await buildToken(llmConfigId);
          session = await startSession(token.session_token);
        } catch (retryErr) {
          throw retryErr;
        }
      } else {
        throw startErr;
      }
    }
    console.log("[heygen-test] ✅ Session started:", session.session_id);
    console.log("[heygen-test] livekit_url:", session.livekit_url);

    // Persist session rows in DB (best-effort — don't block on failure)
    let heygenSessionDbId: string | null = null;
    let simSessionDbId: string | null = null;
    try {
      const serverSupabase = await createServerClient();
      const { data: { user } } = await serverSupabase.auth.getUser();
      if (user) {
        const svcSupabase = serviceSupabase();
        const [{ data: scenario }, { data: profile }] = await Promise.all([
          svcSupabase
            .from(scenarioTable ?? "custom_scenarios")
            .select("organization_id")
            .eq("id", scenarioId ?? "")
            .maybeSingle(),
          svcSupabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle(),
        ]);
        const organizationId = scenario?.organization_id ?? profile?.organization_id ?? null;
        const { data: dbRow } = await svcSupabase
          .from("heygen_sessions")
          .insert({
            user_id: user.id,
            organization_id: organizationId,
            scenario_id: scenarioId ?? null,
            scenario_table: scenarioTable ?? null,
            scenario_name: scenarioName,
          })
          .select("id")
          .single();
        heygenSessionDbId = dbRow?.id ?? null;
        console.log("[heygen-test] ✅ heygen_sessions row:", heygenSessionDbId);

        // Also create a simulation_sessions row so video calls appear in unified reporting
        if (scenarioId && scenarioTable) {
          const { data: simRow } = await svcSupabase
            .from("simulation_sessions")
            .insert({
              user_id: user.id,
              organization_id: organizationId,
              scenario_id: scenarioId,
              scenario_table: scenarioTable,
              scenario_name: scenarioName,
              call_mode: "video",
              status: "active",
              heygen_session_id: heygenSessionDbId,
              state: {
                trust_level: 30, buyer_mood: 0, stage: "opening",
                facts_discovered: { budget: false, decision_maker: false, timeline: false, current_solution: false },
                objections_used: [], engagement_level: 50,
              },
            })
            .select("id")
            .single();
          simSessionDbId = simRow?.id ?? null;
          console.log("[heygen-test] ✅ simulation_sessions row:", simSessionDbId);
        }
      } else {
        console.warn("[heygen-test] No authenticated user — session not persisted");
      }
    } catch (dbErr) {
      console.warn("[heygen-test] DB session insert failed (non-fatal):", dbErr);
    }

    return NextResponse.json({
      session_id: session.session_id,
      livekit_url: session.livekit_url,
      livekit_client_token: session.livekit_client_token,
      llm_config_id: llmConfigId ?? null,
      scenario_name: scenarioName,
      heygen_session_db_id: heygenSessionDbId,
      sim_session_db_id: simSessionDbId,
      duration_min: scenarioDuration,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[heygen-test] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { session_id, heygen_session_db_id } = await req.json();
  if (session_id) await stopSession(session_id).catch(() => {});
  if (heygen_session_db_id) {
    try {
      await serviceSupabase()
        .from("heygen_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", heygen_session_db_id);
    } catch (dbErr) {
      console.warn("[heygen-test/DELETE] DB update failed:", dbErr);
    }
  }
  // LLM config is shared infrastructure — never deleted per-session
  return NextResponse.json({ ok: true });
}
