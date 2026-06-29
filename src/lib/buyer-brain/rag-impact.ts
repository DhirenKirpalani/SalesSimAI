import { SimulationState } from "@/types/simulation";

export interface RagStateImpact {
  trust_delta: number;
  mood_delta: number;
  interest_delta: number;
  notes?: string;
}

function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return apiKey;
}

/**
 * Computes how the RAG-backed knowledge should shift the buyer's psychological state.
 * For example: if RAG confirms the seller's claim, trust and interest go up.
 * If RAG shows a mismatch, trust drops.
 */
export async function computeRagStateImpact(
  sellerMessage: string,
  ragContext: string,
  state: SimulationState
): Promise<RagStateImpact> {
  const prompt = `You are analyzing how a buyer's psychology should shift after hearing a seller's claim that is backed by company knowledge.

Buyer current state:
TRUST: ${state.trust_level}/100
MOOD: ${state.buyer_mood}
STAGE: ${state.stage}

Seller claim:
"""${sellerMessage}"""

Company knowledge retrieved:
"""${ragContext}"""

Return ONLY valid JSON with integer deltas:
{
  "trust_delta": <number between -10 and +10>,
  "mood_delta": <number between -5 and +5>,
  "interest_delta": <number between -10 and +10>,
  "notes": "short reason"
}

Rules:
- If the knowledge strongly supports the seller's claim, increase trust and interest.
- If the knowledge answers an objection or reduces risk, increase trust/mood.
- If the knowledge is vague, irrelevant, or contradicts the seller, decrease trust/mood.
- If the knowledge is about a competitor or pricing, judge whether it is a good fit for the buyer.
- Keep deltas small and realistic. Most turns should be 0 or +/- 1-3. Only major proof should be +/- 5-10.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getOpenAIApiKey()}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      console.warn("[computeRagStateImpact] OpenAI error:", await res.text());
      return { trust_delta: 0, mood_delta: 0, interest_delta: 0 };
    }

    const data = await res.json();
    const parsed: Partial<RagStateImpact> = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");

    return {
      trust_delta: Math.max(-10, Math.min(10, Math.round(parsed.trust_delta ?? 0))),
      mood_delta: Math.max(-5, Math.min(5, Math.round(parsed.mood_delta ?? 0))),
      interest_delta: Math.max(-10, Math.min(10, Math.round(parsed.interest_delta ?? 0))),
      notes: parsed.notes,
    };
  } catch (e) {
    console.warn("[computeRagStateImpact] failed:", e);
    return { trust_delta: 0, mood_delta: 0, interest_delta: 0 };
  }
}

/**
 * Merges the RAG state impact into the buyer's state_updates from the model.
 */
export function mergeRagImpactIntoStateUpdates(
  modelStateUpdates: {
    trust_delta?: number;
    mood_delta?: number;
    facts_revealed?: string[];
  },
  ragImpact: RagStateImpact
): {
  trust_delta: number;
  mood_delta: number;
  facts_revealed: string[];
} {
  return {
    trust_delta: (modelStateUpdates.trust_delta ?? 0) + ragImpact.trust_delta,
    mood_delta: (modelStateUpdates.mood_delta ?? 0) + ragImpact.mood_delta,
    facts_revealed: modelStateUpdates.facts_revealed ?? [],
  };
}
