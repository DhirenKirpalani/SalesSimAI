import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SimulationState } from "@/types/simulation";
import { mockPersonas } from "@/lib/data/mockData";
import { getCallOutcome } from "@/lib/buyer-brain/scenario";
import { resolveFramework } from "@/lib/evaluation-frameworks";

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
    const framework = resolveFramework(scenario?.scenario_type, scenario?.evaluation_framework);
    const participantRole = framework.transcriptLabel;
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

    const systemPrompt = framework.buildSystemPrompt(framework.participantRole);

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

    // Normalize breakdown using the framework config
    const normalizedBreakdown = framework.normalizeBreakdown(rawAnalysis);
    const analysis = {
      ...rawAnalysis,
      breakdown: normalizedBreakdown,
      overall_score: framework.computeOverall(normalizedBreakdown),
      framework: framework.id,
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
