/**
 * Post-call coaching evaluation.
 * Takes a completed session transcript, runs GPT-4o deep evaluation,
 * stores structured results in simulation_coaching table.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
  meddic_breakdown?: {
    "Identify Pain": number;
    Metrics: number;
    "Economic Buyer": number;
    "Decision Criteria": number;
    "Decision Process": number;
    Champion: number;
  };
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
    const transcriptLabel = scenario?.scenario_type === "Product Knowledge Interview" ? "CANDIDATE" : "SELLER";
    const transcriptLines = (messages ?? []).map((m) => `${m.role === "user" ? transcriptLabel : "BUYER"}: ${m.content}`);
    const transcript = transcriptLines.join("\n");

    if (transcriptLines.length < 2) {
      return NextResponse.json({ error: "Not enough messages to evaluate (minimum 2 turns)" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
    }

    const participantRole = scenario?.scenario_type === "Product Knowledge Interview" ? "candidate" : "seller";
    const prompt = `You are an expert sales coach evaluating a B2B sales call simulation using the MEDDIC framework. The human participant is the ${participantRole}.

SCENARIO: ${scenario?.name ?? "Sales simulation"}
CALL TYPE: ${scenario?.scenario_type ?? "Discovery Call"}
COMPANY: ${scenario?.seller_company ?? "Unknown"}
PRODUCT: ${scenario?.seller_product ?? "Unknown"}
PRODUCT CATEGORY: ${scenario?.product_type ?? ""}
WHAT IS BEING SOLD: ${scenario?.seller_description ?? ""}
CONTEXT: ${scenario?.context_note ?? ""}
DIFFICULTY: ${scenario?.difficulty ?? "Intermediate"}
DURATION: ${scenario?.duration ?? 5} minutes
FRAMEWORK: ${scenario?.evaluation_framework ?? "MEDDIC"}

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

EVALUATE on MEDDIC dimensions. Start each dimension at 0 and award points ONLY when the ${participantRole}'s own words in the transcript provide clear evidence. Silence, greetings, "yes", "sounds good", or generic small talk must score 0.

Use this strict scale for each dimension:
- 0: No evidence the ${participantRole} addressed this dimension.
- 20-40: Weak or implicit mention (one vague reference, not probed).
- 50-70: Clear evidence (specific question or statement tied to the dimension).
- 80-100: Strong evidence (probed deeply, quantified, or tied to a concrete next step).

Dimensions:
1. Identify Pain: Did the ${participantRole} discover and probe specific business pain points?
2. Metrics: Did they quantify business impact, ROI, or cost of the pain?
3. Economic Buyer: Did they identify or engage the financial decision maker?
4. Decision Criteria: Did they uncover the buyer's evaluation requirements?
5. Decision Process: Did they map the buying process, timeline, or steps?
6. Champion: Did they build a relationship and find or create an internal advocate?

Use the SCORING RUBRIC above to judge how well the ${participantRole} hit each checkpoint. Do not give partial credit for simply talking; require evidence.

Also provide:
- OVERALL_SCORE: weighted average (0-100). Weights: Identify Pain 25%, Metrics 20%, Economic Buyer 15%, Decision Criteria 15%, Decision Process 15%, Champion 10%.
- STRENGTHS: Specific things the ${participantRole} actually did well (max 3). Must be grounded in the transcript. Return empty if none.
- WEAKNESSES: Specific gaps or mistakes evident in the transcript (max 5). Reference actual turns or quotes.
- MISSED_OPPORTUNITIES: Specific questions or tactics the ${participantRole} failed to use at a real moment in the transcript (max 5).
- RECOMMENDATIONS: Actionable coaching tips that directly address the weaknesses and missed opportunities (max 5). Do not repeat generic sales advice.
- DISCOVERY_COVERAGE: Which of the 9 discovery steps were covered (true/false)
  Steps: intro_agenda, current_process, breakdown, impact, cost, previous_attempts, future_state, stakeholders, blockers

Return ONLY valid JSON:
{
  "discovery_score": <identify_pain score>,
  "objection_score": <decision_criteria score>,
  "empathy_score": <champion score>,
  "overall_score": number,
  "meddic_breakdown": {
    "Identify Pain": number,
    "Metrics": number,
    "Economic Buyer": number,
    "Decision Criteria": number,
    "Decision Process": number,
    "Champion": number
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missed_opportunities": ["..."],
  "recommendations": ["..."],
  "discovery_coverage": { "intro_agenda": boolean, "current_process": boolean, "breakdown": boolean, "impact": boolean, "cost": boolean, "previous_attempts": boolean, "future_state": boolean, "stakeholders": boolean, "blockers": boolean }
}`;

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

    // Normalize scores: ensure breakdown exists, clamp to 0-100, and recompute overall from breakdown
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const mb = evaluation.meddic_breakdown ?? {
      "Identify Pain": evaluation.discovery_score ?? 0,
      "Metrics": evaluation.discovery_score ?? 0,
      "Economic Buyer": evaluation.empathy_score ?? 0,
      "Decision Criteria": evaluation.objection_score ?? 0,
      "Decision Process": 0,
      "Champion": evaluation.empathy_score ?? 0,
    };
    const normalizedBreakdown = {
      "Identify Pain": clamp(mb["Identify Pain"]),
      "Metrics": clamp(mb["Metrics"]),
      "Economic Buyer": clamp(mb["Economic Buyer"]),
      "Decision Criteria": clamp(mb["Decision Criteria"]),
      "Decision Process": clamp(mb["Decision Process"]),
      "Champion": clamp(mb["Champion"]),
    };
    evaluation.meddic_breakdown = normalizedBreakdown;
    evaluation.discovery_score = normalizedBreakdown["Identify Pain"];
    evaluation.objection_score = normalizedBreakdown["Decision Criteria"];
    evaluation.empathy_score = normalizedBreakdown["Champion"];
    evaluation.strengths = Array.isArray(evaluation.strengths) ? evaluation.strengths : [];
    evaluation.weaknesses = Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses : evaluation.missed_opportunities ?? [];
    evaluation.overall_score = Math.round(
      normalizedBreakdown["Identify Pain"] * 0.25 +
      normalizedBreakdown["Metrics"] * 0.20 +
      normalizedBreakdown["Economic Buyer"] * 0.15 +
      normalizedBreakdown["Decision Criteria"] * 0.15 +
      normalizedBreakdown["Decision Process"] * 0.15 +
      normalizedBreakdown["Champion"] * 0.10
    );

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
