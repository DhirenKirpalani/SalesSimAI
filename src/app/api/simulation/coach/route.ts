/**
 * Post-call coaching evaluation.
 * Takes a completed session transcript, runs GPT-4o deep evaluation,
 * stores structured results in simulation_coaching table.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CoachingEvaluation {
  discovery_score: number;
  objection_score: number;
  empathy_score: number;
  overall_score: number;
  missed_opportunities: string[];
  recommendations: string[];
  discovery_coverage: Record<string, boolean>;
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

    // Load session + transcript + scenario
    const [{ data: session, error: sessionError }, { data: messages }] = await Promise.all([
      supabase.from("simulation_sessions").select("*, scenario_id, scenario_table, state").eq("id", sessionId).eq("user_id", user.id).single(),
      supabase
        .from("simulation_messages")
        .select("role, content, emotion, intent")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: scenario } = await supabase
      .from(session.scenario_table)
      .select("name, context_note, seller_company, seller_product, custom_persona, scoring_criteria, evaluation_framework")
      .eq("id", session.scenario_id)
      .single();

    // Build transcript string
    const transcriptLines = (messages ?? []).map((m) => `${m.role === "user" ? "SELLER" : "BUYER"}: ${m.content}`);
    const transcript = transcriptLines.join("\n");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
    }

    const framework = scenario?.evaluation_framework || "";
    const customCriteria = scenario?.scoring_criteria || "";

    const frameworkSection = framework
      ? `EVALUATION FRAMEWORK: Use the ${framework} framework to guide your assessment.`
      : "";
    const criteriaSection = customCriteria
      ? `SCORING CRITERIA FOR THIS COMPANY:\n${customCriteria}`
      : "";

    const prompt = `You are an expert sales coach evaluating a B2B sales discovery call simulation.

Evaluate the salesperson's performance in this conversation.

SCENARIO: ${scenario?.name ?? "Sales simulation"}
COMPANY: ${scenario?.seller_company ?? "Unknown"}
PRODUCT: ${scenario?.seller_product ?? "Unknown"}
CONTEXT: ${scenario?.context_note ?? ""}
${frameworkSection}
${criteriaSection}

TRANSCRIPT:
${transcript}

EVALUATE on these dimensions (0-100 score each):

1. DISCOVERY_SCORE: Did the seller uncover the buyer's real pain points, process, and impact? Did they follow a structured discovery framework (intro/agenda → current process → breakdown → impact → cost → previous attempts → future state → stakeholders → blockers)?

2. OBJECTION_SCORE: When the buyer pushed back, did the seller validate, reframe, and offer a path forward? Or did they get defensive?

3. EMPATHY_SCORE: Did the seller show genuine curiosity, use the buyer's language, and make the buyer feel heard?

4. OVERALL_SCORE: Weighted average with emphasis on discovery. ${customCriteria ? "Consider the Scoring Criteria above." : ""}

Also provide:
- MISSED_OPPORTUNITIES: Specific questions or tactics the seller failed to use (max 5)
- RECOMMENDATIONS: Actionable coaching tips (max 5)
- DISCOVERY_COVERAGE: Which of the 9 discovery steps were covered (true/false)
  Steps: intro_agenda, current_process, breakdown, impact, cost, previous_attempts, future_state, stakeholders, blockers

Return ONLY valid JSON. No extra text:

{
  "discovery_score": number,
  "objection_score": number,
  "empathy_score": number,
  "overall_score": number,
  "missed_opportunities": ["..."],
  "recommendations": ["..."],
  "discovery_coverage": {
    "intro_agenda": boolean,
    "current_process": boolean,
    "breakdown": boolean,
    "impact": boolean,
    "cost": boolean,
    "previous_attempts": boolean,
    "future_state": boolean,
    "stakeholders": boolean,
    "blockers": boolean
  }
}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[coach] OpenAI error:", errText);
      return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    let evaluation: CoachingEvaluation;
    try {
      evaluation = JSON.parse(content) as CoachingEvaluation;
    } catch {
      return NextResponse.json({ error: "Failed to parse evaluation" }, { status: 500 });
    }

    // Persist to simulation_coaching table
    const { error: insertError } = await supabase.from("simulation_coaching").upsert({
      session_id: sessionId,
      discovery_score: evaluation.discovery_score,
      objection_score: evaluation.objection_score,
      empathy_score: evaluation.empathy_score,
      overall_score: evaluation.overall_score,
      missed_opportunities: evaluation.missed_opportunities,
      recommendations: evaluation.recommendations,
      discovery_coverage: evaluation.discovery_coverage,
    });

    if (insertError) {
      console.error("[coach] insert error:", insertError);
    }

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (err) {
    console.error("[coach] error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
