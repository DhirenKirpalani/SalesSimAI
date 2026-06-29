import { SimulationMessage } from "@/types/simulation";

export interface BuyerMemory {
  pain_points_discovered: string[];
  objections_raised: string[];
  seller_promises: string[];
  unanswered_questions: string[];
}

export const defaultBuyerMemory: BuyerMemory = {
  pain_points_discovered: [],
  objections_raised: [],
  seller_promises: [],
  unanswered_questions: [],
};

/**
 * Formats recent conversation history for the LLM.
 */
export function formatChatHistory(
  recentMessages: SimulationMessage[],
  limit = 20
): Array<{ role: "user" | "assistant"; content: string }> {
  return recentMessages.slice(-limit).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));
}

/**
 * Counts how many times the user has said "I don't know" in the conversation.
 */
export function countDontKnow(recentMessages: SimulationMessage[]): number {
  return recentMessages.filter(
    (m) => m.role === "user" && /i\s+don'?t\s+know/i.test(m.content)
  ).length;
}

function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return apiKey;
}

/**
 * Uses a small LLM call to extract memory updates from the latest turn.
 * Returns only new items that are not already in the existing memory.
 */
export async function extractMemoryUpdates(
  existingMemory: BuyerMemory,
  sellerMessage: string,
  buyerResponse: string,
  recentMessages: SimulationMessage[]
): Promise<BuyerMemory> {
  const recentContext = recentMessages
    .slice(-6)
    .map((m) => `${m.role === "user" ? "SELLER" : "BUYER"}: ${m.content}`)
    .join("\n");

  const prompt = `You are extracting structured memory for a buyer in a sales simulation.

Existing memory:
${JSON.stringify(existingMemory, null, 2)}

Recent conversation:
${recentContext}

Latest seller message: ${sellerMessage}
Latest buyer response: ${buyerResponse}

Update the buyer's memory based on this turn. Return ONLY valid JSON in this exact shape:
{
  "pain_points_discovered": ["short phrase"],
  "objections_raised": ["short phrase"],
  "seller_promises": ["short phrase"],
  "unanswered_questions": ["short phrase"]
}

Rules:
- Keep items short (max 6 words).
- Do NOT duplicate items already in existing memory.
- Only add items actually mentioned in this turn.
- Return an empty array for a category if nothing new.`;

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
        max_tokens: 250,
      }),
    });

    if (!res.ok) {
      console.warn("[extractMemoryUpdates] OpenAI error:", await res.text());
      return existingMemory;
    }

    const data = await res.json();
    const parsed: Partial<BuyerMemory> = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");

    const merge = (existing: string[], incoming?: string[]) => {
      const clean = (incoming ?? []).map((s) => s.trim()).filter(Boolean);
      return Array.from(new Set([...existing, ...clean]));
    };

    return {
      pain_points_discovered: merge(existingMemory.pain_points_discovered, parsed.pain_points_discovered),
      objections_raised: merge(existingMemory.objections_raised, parsed.objections_raised),
      seller_promises: merge(existingMemory.seller_promises, parsed.seller_promises),
      unanswered_questions: merge(existingMemory.unanswered_questions, parsed.unanswered_questions),
    };
  } catch (e) {
    console.warn("[extractMemoryUpdates] failed:", e);
    return existingMemory;
  }
}

/**
 * Renders the buyer memory as a short summary for the dynamic prompt context.
 */
export function renderBuyerMemory(memory: BuyerMemory): string {
  const sections: string[] = [];
  if (memory.pain_points_discovered.length) {
    sections.push(`Pain points you remember: ${memory.pain_points_discovered.join("; ")}`);
  }
  if (memory.objections_raised.length) {
    sections.push(`Objections you have raised: ${memory.objections_raised.join("; ")}`);
  }
  if (memory.seller_promises.length) {
    sections.push(`Things the seller promised: ${memory.seller_promises.join("; ")}`);
  }
  if (memory.unanswered_questions.length) {
    sections.push(`Questions still unanswered: ${memory.unanswered_questions.join("; ")}`);
  }
  return sections.length ? `BUYER MEMORY:\n${sections.join("\n")}` : "";
}
