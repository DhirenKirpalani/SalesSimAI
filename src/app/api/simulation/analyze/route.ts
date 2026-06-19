import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SimulationState } from "@/types/simulation";
import { mockPersonas } from "@/lib/data/mockData";

const SYSTEM_PROMPT = `You are an expert B2B sales coach analyzing a sales call transcript.
Evaluate the salesperson's performance using the MEDDIC framework and provide actionable feedback.

Return ONLY valid JSON in this exact shape:
{
  "overall_score": <0-100>,
  "breakdown": {
    "metrics": <0-100>,
    "economic_buyer": <0-100>,
    "decision_criteria": <0-100>,
    "decision_process": <0-100>,
    "identify_pain": <0-100>,
    "champion": <0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "missed_opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "coaching_recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}

MEDDIC scoring guidance:
- Metrics: Did they quantify business impact and ROI?
- Economic Buyer: Did they identify and engage the decision maker?
- Decision Criteria: Did they uncover evaluation criteria?
- Decision Process: Did they map the buying process and timeline?
- Identify Pain: Did they discover and probe specific pain points?
- Champion: Did they build a relationship and internal advocate?

Be honest and specific. Reference actual moments from the transcript.`;

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
      .select("name, custom_persona, preset_persona_id, context_note, seller_description, scenario_type, seller_company, seller_product")
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
    const transcript = messages
      .map((m) => `${m.role === "user" ? "SALESPERSON" : "BUYER"}: ${m.content}`)
      .join("\n");

    const factsFound = Object.entries(state.facts_discovered ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k);

    const contextBlock = `
SCENARIO: ${scenario?.name ?? "Unknown"}
CALL TYPE: ${scenario?.scenario_type ?? "Discovery Call"}
BUYER: ${personaName}${personaRole ? `, ${personaRole}` : ""}${personaCompany ? ` at ${personaCompany}` : ""}
WHAT WAS BEING SOLD: ${scenario?.seller_description ?? ""}
CALL CONTEXT: ${scenario?.context_note ?? ""}

SESSION OUTCOME:
- Final trust level: ${state.trust_level}/100
- Buyer mood: ${state.buyer_mood} (-10 frustrated → +10 engaged)
- Stage reached: ${state.stage}
- Facts uncovered: ${factsFound.length ? factsFound.join(", ") : "none"}
- Total messages: ${messages.length}

TRANSCRIPT:
${transcript}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
    const analysis = JSON.parse(gptData.choices[0].message.content);

    // Cache the analysis result on the session row
    await supabase
      .from("simulation_sessions")
      .update({ analysis })
      .eq("id", sessionId);

    return NextResponse.json({ analysis, scenario, state, messages });
  } catch (err) {
    console.error("[simulation/analyze]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
