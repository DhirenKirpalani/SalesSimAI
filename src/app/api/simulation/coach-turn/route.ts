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
    const { sessionId, sellerText, buyerText } = await req.json();
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

    const systemPrompt = `You are a real-time sales coach monitoring a live sales call. Evaluate the seller's latest exchange against the rubric below AND check product facts against the knowledge base.

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

PRODUCT KNOWLEDGE BASE:
${scenario.seller_description || "No product knowledge base provided."}${docContext}

SCORING RUBRIC:
${scenario.scoring_criteria}

CONVERSATION SO FAR:
${history || "(start of call)"}

Evaluate ONLY the latest exchange. Consider what has already been covered to avoid repeating nudges or re-scoring checkpoints already hit.

Additionally, check whether the seller stated any product fact that contradicts the PRODUCT KNOWLEDGE BASE above (e.g., wrong numbers, wrong coverage, wrong features, wrong timelines). For each contradiction, include an entry in product_corrections. If the seller did not state any product fact or if all facts are correct, return an empty product_corrections array.

Return ONLY valid JSON:
{
  "checkpoint_hit": "<checkpoint ID from the rubric, e.g. B1, B2 — or null if none clearly hit this turn>",
  "checkpoint_name": "<short name of the checkpoint — or null>",
  "quality": "good" | "warning" | "missed",
  "nudge": "<direct, specific coaching message — max 15 words, reference what the seller actually said>",
  "suggested_next": "<what the seller should do next — max 15 words, based on rubric progression>",
  "already_covered": ["<checkpoint IDs already hit in previous turns>"],
  "product_corrections": [
    {
      "claim": "<exact incorrect claim the seller made>",
      "correction": "<the correct fact from the product knowledge base>",
      "severity": "error" | "warning",
      "topic": "<short topic label, e.g., coverage, pricing, features>"
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
