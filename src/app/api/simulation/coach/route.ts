/**
 * Post-call coaching evaluation.
 * Takes a completed session transcript, runs GPT-4o deep evaluation,
 * stores structured results in simulation_coaching table.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { resolveFramework } from "@/lib/evaluation-frameworks";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

interface CoachingEvaluation {
  discovery_score: number;
  objection_score: number;
  empathy_score: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  missed_opportunities: string[];
  recommendations: string[];
  discovery_coverage: Record<string, boolean>;
  criteria_scores?: Record<string, number>;
  meddic_breakdown?: Record<string, number>;
  star_breakdown?: Record<string, number>;
  framework?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceDb = serviceSupabase();

    // Load session + transcript + scenario
    const [{ data: session, error: sessionError }, { data: messages }] = await Promise.all([
      serviceDb.from("simulation_sessions").select("*, scenario_id, scenario_table, state").eq("id", sessionId).eq("user_id", user.id).single(),
      serviceDb
        .from("simulation_messages")
        .select("role, content, emotion, intent")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: scenario } = await serviceDb
      .from(session.scenario_table)
      .select("name, context_note, seller_company, seller_product, custom_persona, preset_persona_id, scoring_criteria, evaluation_framework, product_type, seller_description, scenario_type, difficulty, duration")
      .eq("id", session.scenario_id)
      .single();

    // Resolve persona
    let persona = scenario?.custom_persona as { name?: string; jobTitle?: string; company?: string; personality?: string; painPoints?: string[]; goals?: string[] } | null;
    if (!persona && scenario?.preset_persona_id) {
      const { mockPersonas } = await import("@/lib/data/mockData");
      const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
      if (preset) {
        persona = {
          name: preset.name,
          jobTitle: preset.jobTitle,
          company: preset.company,
          personality: preset.personality,
          painPoints: preset.painPoints,
          goals: preset.goals,
        };
      }
    }

    const state = session.state as Record<string, unknown> | null;
    const factsFound = Object.entries((state as any)?.facts_discovered ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k);

    // Build transcript string
    const framework = resolveFramework(scenario?.scenario_type, scenario?.evaluation_framework);
    const transcriptLabel = framework.transcriptLabel;
    const transcriptLines = (messages ?? []).map((m) => `${m.role === "user" ? transcriptLabel : "BUYER"}: ${m.content}`);
    const transcript = transcriptLines.join("\n");

    if (transcriptLines.length < 2) {
      return NextResponse.json({ error: "Not enough messages to evaluate (minimum 2 turns)" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
    }

    const participantRole = framework.participantRole;
    const prompt = `You are an expert coach evaluating a simulation using the ${framework.name} framework. The human participant is the ${participantRole}.

SCENARIO: ${scenario?.name ?? "Sales simulation"}
CALL TYPE: ${scenario?.scenario_type ?? "Discovery Call"}
COMPANY: ${scenario?.seller_company ?? "Unknown"}
PRODUCT: ${scenario?.seller_product ?? "Unknown"}
PRODUCT CATEGORY: ${scenario?.product_type ?? ""}
WHAT IS BEING SOLD: ${scenario?.seller_description ?? ""}
CONTEXT: ${scenario?.context_note ?? ""}
DIFFICULTY: ${scenario?.difficulty ?? "Intermediate"}
DURATION: ${scenario?.duration ?? 5} minutes
FRAMEWORK: ${scenario?.evaluation_framework ?? framework.name}

BUYER PERSONA:
- Name: ${persona?.name ?? "Unknown"}
- Role: ${persona?.jobTitle ?? ""}
- Company: ${persona?.company ?? ""}
- Personality: ${persona?.personality ?? ""}
- Pain points: ${persona?.painPoints?.join("; ") ?? ""}
- Goals: ${persona?.goals?.join("; ") ?? ""}

SESSION STATE:
- Trust level: ${(state as any)?.trust_level ?? 30}/100
- Buyer mood: ${(state as any)?.buyer_mood ?? 0} (-10 frustrated → +10 engaged)
- Stage reached: ${(state as any)?.stage ?? "opening"}
- Facts uncovered: ${factsFound.length ? factsFound.join(", ") : "none"}

SCORING RUBRIC:
${scenario?.scoring_criteria ?? "No rubric provided"}

TRANSCRIPT:
${transcript}

${framework.buildEvaluationInstructions(participantRole)}

Return ONLY valid JSON:
${framework.buildJsonShape()}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[coach] OpenAI error:", errText);
      return NextResponse.json({ error: `Evaluation failed: ${errText.slice(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    let evaluation: CoachingEvaluation;
    try {
      evaluation = JSON.parse(content) as CoachingEvaluation;
    } catch {
      return NextResponse.json({ error: "Failed to parse evaluation" }, { status: 500 });
    }

    // Normalize scores using the framework config
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const normalizedBreakdown = framework.normalizeBreakdown(evaluation as unknown as Record<string, unknown>);
    evaluation.framework = framework.id;
    // Map first 3 dimensions to legacy score fields for backward compatibility
    const dims = framework.dimensions;
    evaluation.discovery_score = normalizedBreakdown[dims[0].key] ?? 0;
    evaluation.objection_score = normalizedBreakdown[dims[2]?.key ?? dims[1].key] ?? 0;
    evaluation.empathy_score = normalizedBreakdown[dims[dims.length - 1].key] ?? 0;
    // Store the framework-specific breakdown
    if (framework.id === "star") {
      evaluation.star_breakdown = normalizedBreakdown;
    } else {
      evaluation.meddic_breakdown = normalizedBreakdown;
    }
    evaluation.strengths = Array.isArray(evaluation.strengths) ? evaluation.strengths : [];
    evaluation.weaknesses = Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses : evaluation.missed_opportunities ?? [];
    evaluation.overall_score = framework.computeOverall(normalizedBreakdown);

    // Persist to simulation_coaching table
    const { error: insertError } = await serviceDb.from("simulation_coaching").upsert(
      {
        session_id: sessionId,
        discovery_score: evaluation.discovery_score,
        objection_score: evaluation.objection_score,
        empathy_score: evaluation.empathy_score,
        overall_score: evaluation.overall_score,
        missed_opportunities: evaluation.missed_opportunities,
        recommendations: evaluation.recommendations,
        discovery_coverage: evaluation.discovery_coverage,
      },
      { onConflict: "session_id" }
    );

    if (insertError) {
      console.error("[coach] upsert error:", insertError);
    }

    // Also write a lightweight score to simulation_sessions.analysis so the list view works
    await serviceDb.from("simulation_sessions").update({
      analysis: { overall_score: evaluation.overall_score },
    }).eq("id", sessionId);

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (err) {
    console.error("[coach] error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
