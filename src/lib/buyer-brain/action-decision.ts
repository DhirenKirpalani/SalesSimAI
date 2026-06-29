import { SimulationState, SimulationMessage } from "@/types/simulation";

export interface BuyerAction {
  action: "reveal_pain" | "challenge" | "ask_question" | "push_back" | "engage" | "deflect" | "end_call" | "close";
  target?: string;
  reason: string;
  tone: "neutral" | "skeptical" | "interested" | "frustrated" | "warm";
  priority: number;
}

export function defaultBuyerAction(state: SimulationState): BuyerAction {
  if (state.trust_level < 30) {
    return { action: "challenge", target: "seller claims", reason: "low trust", tone: "skeptical", priority: 8 };
  }
  if (state.buyer_mood < -2) {
    return { action: "push_back", target: "seller pressure", reason: "negative mood", tone: "frustrated", priority: 7 };
  }
  if (state.trust_level > 70) {
    return { action: "engage", target: "next steps", reason: "high trust", tone: "interested", priority: 6 };
  }
  return { action: "ask_question", target: "missing details", reason: "neutral exploration", tone: "neutral", priority: 5 };
}

export const decideBuyerActionTool = {
  type: "function" as const,
  function: {
    name: "decide_buyer_action",
    description: "Decide the buyer's internal action before generating the spoken response.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["reveal_pain", "challenge", "ask_question", "push_back", "engage", "deflect", "end_call", "close"],
          description: "The buyer's chosen action for this turn.",
        },
        target: {
          type: "string",
          description: "What the action is directed at (e.g., a claim, a question, a topic).",
        },
        reason: {
          type: "string",
          description: "Why the buyer is taking this action based on the conversation.",
        },
        tone: {
          type: "string",
          enum: ["neutral", "skeptical", "interested", "frustrated", "warm"],
          description: "The tone the buyer should use.",
        },
        priority: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "How strongly the buyer should pursue this action.",
        },
      },
      required: ["action", "reason", "tone", "priority"],
      additionalProperties: false,
    },
  },
};

export function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return apiKey;
}

/**
 * Uses a small LLM call to decide the buyer's internal action before generating the response.
 */
export async function decideBuyerAction(
  state: SimulationState,
  recentMessages: SimulationMessage[],
  sellerMessage: string,
  contextNote: string,
  ragContext?: string,
  buyerMemory?: string
): Promise<BuyerAction> {
  const recentLines = recentMessages
    .slice(-8)
    .map((m) => `${m.role === "user" ? "SELLER" : "BUYER"}: ${m.content}`)
    .join("\n");

  const prompt = `You are the internal decision model for a buyer in a B2B sales simulation.

Decide what the buyer should DO internally before speaking. Do not write the response. Only choose the action.

Current state:
TRUST: ${state.trust_level}/100
MOOD: ${state.buyer_mood}
STAGE: ${state.stage}

Context:
${contextNote || "No extra context"}

${ragContext ? `Company knowledge retrieved:\n${ragContext}\n` : ""}
${buyerMemory ? `Buyer memory:\n${buyerMemory}\n` : ""}

Recent conversation:
${recentLines || "None"}

Seller just said:
${sellerMessage}

Use the decide_buyer_action tool to output your decision.

Choose the action that best fits the buyer's psychology, trust level, and the seller's message.
- reveal_pain: share a real pain point
- challenge: push back on a weak claim
- ask_question: ask for clarification or proof
- push_back: resist pressure or a poor fit
- engage: move forward, show interest
- deflect: avoid answering directly
- end_call: try to wrap up
- close: ask for concrete next steps or terms

Tone should match the mood and action.
Priority 1-10 reflects how strongly to pursue this action.`;

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
        tools: [decideBuyerActionTool],
        tool_choice: { type: "function", function: { name: "decide_buyer_action" } },
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      console.warn("[decideBuyerAction] OpenAI error:", await res.text());
      return defaultBuyerAction(state);
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "decide_buyer_action") {
      return defaultBuyerAction(state);
    }

    const parsed: Partial<BuyerAction> = JSON.parse(toolCall.function.arguments ?? "{}");
    const validActions: BuyerAction["action"][] = ["reveal_pain", "challenge", "ask_question", "push_back", "engage", "deflect", "end_call", "close"];
    const validTones: BuyerAction["tone"][] = ["neutral", "skeptical", "interested", "frustrated", "warm"];

    return {
      action: validActions.includes(parsed.action as BuyerAction["action"]) ? (parsed.action as BuyerAction["action"]) : "ask_question",
      target: parsed.target?.trim(),
      reason: parsed.reason?.trim() || "evaluating the seller",
      tone: validTones.includes(parsed.tone as BuyerAction["tone"]) ? (parsed.tone as BuyerAction["tone"]) : "neutral",
      priority: Math.max(1, Math.min(10, Math.round(parsed.priority ?? 5))),
    };
  } catch (e) {
    console.warn("[decideBuyerAction] failed:", e);
    return defaultBuyerAction(state);
  }
}

export function renderBuyerAction(action: BuyerAction): string {
  return `BUYER ACTION DECISION:
- Action: ${action.action}${action.target ? ` (${action.target})` : ""}
- Reason: ${action.reason}
- Tone: ${action.tone}
- Priority: ${action.priority}/10`;
}
