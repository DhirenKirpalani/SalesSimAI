import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryCompanyDocuments } from "@/lib/vector-store";
import { mockPersonas } from "@/lib/data/mockData";

interface RawProductCorrection {
  claim?: unknown;
  correction?: unknown;
  severity?: unknown;
  topic?: unknown;
}

interface SessionState {
  facts_discovered?: Record<string, unknown>;
  trust_level?: number;
  buyer_mood?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, sellerText, buyerText, currentStep, stepsCompleted } = await req.json();
    if (!sessionId || !sellerText?.trim()) {
      return NextResponse.json({ fallback: true });
    }

    // Skip coaching for very short utterances — not enough content to evaluate
    if (sellerText.trim().split(/\s+/).length < 5) {
      return NextResponse.json({ fallback: true });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ fallback: true });

    // Fetch session + recent messages in parallel
    const [{ data: session }, { data: recentMessages }] = await Promise.all([
      supabase
        .from("simulation_sessions")
        .select("scenario_id, scenario_table, state")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("simulation_messages")
        .select("role, content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(12),
    ]);

    if (!session) return NextResponse.json({ fallback: true });

    // Fetch scenario details (depends on session.scenario_table)
    const { data: scenario } = await supabase
      .from(session.scenario_table)
      .select("scoring_criteria, custom_persona, preset_persona_id, context_note, seller_description, seller_company, seller_product, scenario_type, difficulty, product_type, organization_id")
      .eq("id", session.scenario_id)
      .single();

    if (!scenario?.scoring_criteria) {
      return NextResponse.json({ fallback: true });
    }

    // Resolve persona
    let personaName = "Unknown Buyer";
    let personaRole = "";
    let personaCompany = "";
    if (scenario.custom_persona) {
      personaName = scenario.custom_persona.name ?? "Unknown";
      personaRole = scenario.custom_persona.jobTitle ?? "";
      personaCompany = scenario.custom_persona.company ?? "";
    } else if (scenario.preset_persona_id) {
      const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
      if (preset) {
        personaName = preset.name;
        personaRole = preset.jobTitle;
        personaCompany = preset.company;
      }
    }

    const history = (recentMessages ?? [])
      .slice(-6)
      .map((m) => `${m.role === "user" ? "SELLER" : "BUYER"}: ${m.content}`)
      .join("\n");

    const state = session.state as SessionState | null;
    const factsFound = Object.entries(state?.facts_discovered ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k);

    // Build product knowledge base from scenario description + relevant company documents
    let docContext = "";
    if (scenario.organization_id && scenario.product_type) {
      try {
        const docChunks = await queryCompanyDocuments(
          sellerText.trim(),
          scenario.organization_id,
          { docType: scenario.product_type, limit: 5, minSimilarity: 0.65 }
        );
        if (docChunks.length > 0) {
          const uniqueChunks = [...new Map(docChunks.map((c) => [c.id, c])).values()];
          docContext = "\n\nRELEVANT COMPANY DOCUMENTS:\n" + uniqueChunks
            .slice(0, 5)
            .map((c) => `[${c.doc_type}] ${c.name}:\n${c.content}`)
            .join("\n\n---\n\n");
        }
      } catch (err) {
        console.error("[coach-turn] document retrieval error:", err);
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ fallback: true });

    const completedSteps = Array.isArray(stepsCompleted)
      ? stepsCompleted.map((c, i) => (c ? i : -1)).filter((i) => i >= 0)
      : [];
    const nextStepIndex = typeof currentStep === "number" ? currentStep : completedSteps.length;

    const systemPrompt = `You are a concise, accurate sales coach observing a live sales call. Your job is to help the seller improve ONE thing on the very last thing they said.

SCENARIO: ${scenario.scenario_type ?? "Discovery Call"}
SELLING: ${scenario.seller_product ?? scenario.seller_company ?? "Unknown"}
PRODUCT CATEGORY: ${scenario.product_type ?? ""}
CONTEXT: ${scenario.context_note ?? ""}
DIFFICULTY: ${scenario.difficulty ?? "Intermediate"}

BUYER: ${personaName}${personaRole ? `, ${personaRole}` : ""}${personaCompany ? ` at ${personaCompany}` : ""}

SESSION STATE:
- Trust: ${state?.trust_level ?? 30}/100
- Mood: ${state?.buyer_mood ?? 0}
- Facts uncovered: ${factsFound.length ? factsFound.join(", ") : "none"}
- Coaching steps already covered: ${completedSteps.length ? completedSteps.join(", ") : "none"}
- Next recommended coaching step index: ${nextStepIndex}

PRODUCT KNOWLEDGE BASE (use to fact-check seller claims):
${scenario.seller_description || "No product knowledge base provided."}${docContext}

SCORING RUBRIC (checkpoints the seller should hit):
${scenario.scoring_criteria}

CONVERSATION SO FAR:
${history || "(start of call)"}

Instructions:
1. Look only at the LATEST exchange below.
2. Decide if the seller's response was good, missed the mark, or needs a warning. Base this on the rubric and the buyer's actual words.
3. If the buyer asked a question, raised an objection, or expressed concern, the next suggestion must directly address that point first. Do not change the subject or jump to a later rubric step until the buyer's immediate concern is handled.
4. If the buyer did not raise a new concern, suggest the next logical step forward in the rubric, skipping nothing that is still pending.
5. Never suggest going back to a step that is already marked as covered above.
6. If the seller said something factually wrong about the product, list it in product_corrections. Otherwise leave that array empty.
7. If no rubric checkpoint is clearly hit this turn, set checkpoint_hit and checkpoint_name to null.
8. Be concise. Do not lecture. Do not contradict the rubric or the conversation history. Do not suggest actions the seller already took.

Examples of good responses:
- Seller: "We cover the Philippines." Buyer: "Are you sure?" → nudge: "Confirm Philippines coverage with specifics." suggested_next: "Share the countries and compliance details you cover."
- Seller: "Tell me about your current process." Buyer: "We do it manually." → nudge: "Good discovery question." suggested_next: "Ask what breaks down most in that manual process."
- Seller: "Our pricing is $99." (knowledge base says $199) → nudge: "Pricing correction needed." suggested_next: "Clarify the correct pricing before continuing." product_corrections: [{claim:"$99", correction:"$199 per month", severity:"error", topic:"pricing"}]

Return ONLY valid JSON:
{
  "checkpoint_hit": "<rubric checkpoint ID, e.g. B1, or null>",
  "checkpoint_name": "<checkpoint name or null>",
  "quality": "good" | "warning" | "missed",
  "nudge": "<one clear coaching sentence, max 15 words, tied to the last exchange>",
  "suggested_next": "<one concrete next action, max 15 words; address the buyer's concern first, then move forward>",
  "already_covered": ["<checkpoint IDs already hit>"],
  "product_corrections": [
    {
      "claim": "<incorrect claim>",
      "correction": "<correct fact from knowledge base>",
      "severity": "error" | "warning",
      "topic": "<coverage/pricing/features/etc>"
    }
  ]
}`;

    const userMsg = `LATEST EXCHANGE:
Seller: "${sellerText.trim()}"
Buyer: "${(buyerText || "").trim()}"`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      console.error("[coach-turn] GPT error:", await res.text().catch(() => "unknown"));
      return NextResponse.json({ fallback: true });
    }

    const data = await res.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Validate required fields
    if (!result.quality || !result.nudge) {
      console.error("[coach-turn] Invalid response:", result);
      return NextResponse.json({ fallback: true });
    }

    // Normalize product_corrections to a safe array
    const productCorrections = Array.isArray(result.product_corrections)
      ? result.product_corrections.filter((c: RawProductCorrection) => {
          const claim = typeof c?.claim === "string" ? c.claim.trim() : "";
          const correction = typeof c?.correction === "string" ? c.correction.trim() : "";
          return claim.length > 0 && correction.length > 0;
        })
      : [];

    return NextResponse.json({ fallback: false, ...result, product_corrections: productCorrections });
  } catch (err) {
    console.error("[coach-turn] error:", err);
    return NextResponse.json({ fallback: true });
  }
}
