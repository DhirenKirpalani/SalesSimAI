import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SimulationState } from "@/types/simulation";
import { mockPersonas } from "@/lib/data/mockData";
import { getCallOutcome } from "@/lib/buyer-brain/scenario";

function buildSystemPrompt(participantRole: string = "seller"): string {
  return `You are an expert B2B sales coach analyzing a sales call transcript using the MEDDIC framework. The human participant is the ${participantRole}. Score strictly. Do not give points for silence, greetings, "yes", "sounds good", or generic small talk.

MEDDIC scoring guidance — start every dimension at 0 and award points ONLY when the ${participantRole}'s own words provide clear evidence:
- 0: No evidence the ${participantRole} addressed this dimension.
- 20-40: Weak or implicit mention (one vague reference, not probed).
- 50-70: Clear evidence (specific question or statement tied to the dimension).
- 80-100: Strong evidence (probed deeply, quantified, or tied to a concrete next step).

Dimensions:
- Metrics: Did they quantify business impact and ROI?
- Economic Buyer: Did they identify and engage the decision maker?
- Decision Criteria: Did they uncover the buyer's evaluation criteria?
- Decision Process: Did they map the buying process and timeline?
- Identify Pain: Did they discover and probe specific pain points?
- Champion: Did they build a relationship and internal advocate?

Compute the overall_score as a weighted average: Identify Pain 25%, Metrics 20%, Economic Buyer 15%, Decision Criteria 15%, Decision Process 15%, Champion 10%.

Return ONLY valid JSON in this exact shape:
{
  "overall_score": <0-100>,
  "breakdown": {
    "Metrics": <0-100>,
    "Economic Buyer": <0-100>,
    "Decision Criteria": <0-100>,
    "Decision Process": <0-100>,
    "Identify Pain": <0-100>,
    "Champion": <0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "missed_opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "coaching_recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "coaching_moments": [
    {
      "buyer_quote": "<exact buyer statement from transcript>",
      "signal": "<what this statement signals>",
      "what_they_should_have_said": "<exact script they should have used in that moment>"
    }
  ]
}

Rules for strengths, weaknesses, missed opportunities, and coaching recommendations:
- They MUST be grounded in the actual transcript and the scenario above.
- Strengths: specific things the ${participantRole} actually said or did well. Do NOT list generic advice. If there are no real strengths, return an empty array.
- Weaknesses: specific gaps or mistakes evident in the transcript. Use quotes or refer to actual turns.
- Missed opportunities: specific questions or tactics the ${participantRole} failed to use at a real moment in the conversation.
- Coaching recommendations: actionable advice that directly addresses the weaknesses and missed opportunities. Do not repeat generic sales tips.

COACHING MOMENTS rules:
- Pick 3-5 real moments from the transcript where the buyer said something significant.
- For each, explain what signal that statement sends (objection, buying signal, etc.).
- Provide an exact script the ${participantRole} should have used — not generic advice, word-for-word what to say.
- Be honest and specific. Reference actual moments from the transcript.
`}

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

    const { data: session } = await supabase
      .from("simulation_sessions")
      .select("*, scenario_id, scenario_table, state, started_at, ended_at")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from("simulation_messages")
      .select("role, content, emotion, intent, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages in this session. Have a conversation with the buyer before generating analysis." }, { status: 400 });
    }

    const { data: scenario } = await supabase
      .from(session.scenario_table)
      .select("name, custom_persona, preset_persona_id, context_note, seller_description, scenario_type, seller_company, seller_product, scoring_criteria, evaluation_framework, product_type")
      .eq("id", session.scenario_id)
      .single();

    // Resolve persona: custom > preset > fallback
    let personaName = "Unknown Buyer";
    let personaRole = "";
    let personaCompany = "";
    if (scenario?.custom_persona) {
      personaName = scenario.custom_persona.name;
      personaRole = scenario.custom_persona.jobTitle;
      personaCompany = scenario.custom_persona.company;
    } else if (scenario?.preset_persona_id) {
      const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
      if (preset) { personaName = preset.name; personaRole = preset.jobTitle; personaCompany = preset.company; }
    }

    const state = session.state as SimulationState;
    const participantRole = scenario?.scenario_type === "Product Knowledge Interview" ? "CANDIDATE" : "SALESPERSON";
    const transcript = messages
      .map((m) => `${m.role === "user" ? participantRole : "BUYER"}: ${m.content}`)
      .join("\n");

    const factsFound = Object.entries(state.facts_discovered ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k);

    const contextBlock = `
SCENARIO: ${scenario?.name ?? "Unknown"}
CALL TYPE: ${scenario?.scenario_type ?? "Discovery Call"}
PRODUCT CATEGORY: ${scenario?.product_type ?? ""}
BUYER: ${personaName}${personaRole ? `, ${personaRole}` : ""}${personaCompany ? ` at ${personaCompany}` : ""}
WHAT WAS BEING SOLD: ${scenario?.seller_description ?? ""}
CALL CONTEXT: ${scenario?.context_note ?? ""}

SCORING RUBRIC (checkpoints the seller should hit):
${scenario?.scoring_criteria ?? "No rubric provided"}

SESSION OUTCOME:
- Final trust level: ${state.trust_level}/100
- Buyer mood: ${state.buyer_mood} (-10 frustrated → +10 engaged)
- Stage reached: ${state.stage}
- Facts uncovered: ${factsFound.length ? factsFound.join(", ") : "none"}
- Total messages: ${messages.length}
- Buyer decision: ${getCallOutcome(state).replace(/_/g, " ")}

TRANSCRIPT:
${transcript}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    const systemPrompt = buildSystemPrompt(participantRole.toLowerCase());

    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextBlock },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 800,
      }),
    });

    if (!gptRes.ok) {
      throw new Error(`OpenAI error: ${await gptRes.text()}`);
    }

    const gptData = await gptRes.json();
    const rawAnalysis = JSON.parse(gptData.choices[0].message.content);

    // Normalize breakdown keys: accept MEDDIC names with spaces or snake_case, clamp to 0-100
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const rawBreakdown = rawAnalysis.breakdown ?? {};
    const normalizedBreakdown = {
      metrics: clamp(rawBreakdown["Metrics"] ?? rawBreakdown["metrics"] ?? 0),
      economic_buyer: clamp(rawBreakdown["Economic Buyer"] ?? rawBreakdown["economic_buyer"] ?? 0),
      decision_criteria: clamp(rawBreakdown["Decision Criteria"] ?? rawBreakdown["decision_criteria"] ?? 0),
      decision_process: clamp(rawBreakdown["Decision Process"] ?? rawBreakdown["decision_process"] ?? 0),
      identify_pain: clamp(rawBreakdown["Identify Pain"] ?? rawBreakdown["identify_pain"] ?? 0),
      champion: clamp(rawBreakdown["Champion"] ?? rawBreakdown["champion"] ?? 0),
    };
    const analysis = {
      ...rawAnalysis,
      breakdown: normalizedBreakdown,
      overall_score: Math.round(
        normalizedBreakdown.identify_pain * 0.25 +
        normalizedBreakdown.metrics * 0.20 +
        normalizedBreakdown.economic_buyer * 0.15 +
        normalizedBreakdown.decision_criteria * 0.15 +
        normalizedBreakdown.decision_process * 0.15 +
        normalizedBreakdown.champion * 0.10
      ),
    };

    // Cache the analysis result on the session row
    await supabase
      .from("simulation_sessions")
      .update({ analysis })
      .eq("id", sessionId);

    return NextResponse.json({ analysis, scenario, state, messages, call_outcome: getCallOutcome(state) });
  } catch (err) {
    console.error("[simulation/analyze]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
