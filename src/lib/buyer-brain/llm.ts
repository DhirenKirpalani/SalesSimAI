import { parseOpenAIJsonResponse, parseOpenAIStream } from "./parser";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const recordBuyerMetadataTool = {
  type: "function" as const,
  function: {
    name: "record_buyer_metadata",
    description: "Record the buyer's emotional state, intent, and state updates after the spoken response.",
    parameters: {
      type: "object",
      properties: {
        emotion: {
          type: "string",
          enum: ["neutral", "skeptical", "interested", "frustrated"],
          description: "The buyer's emotional tone in this response.",
        },
        intent: {
          type: "string",
          enum: ["answer", "objection", "question", "redirect"],
          description: "The buyer's intent in this response.",
        },
        trust_delta: {
          type: "integer",
          minimum: -15,
          maximum: 15,
          description: "Change in trust level from this turn.",
        },
        mood_delta: {
          type: "integer",
          minimum: -5,
          maximum: 5,
          description: "Change in mood from this turn.",
        },
        facts_revealed: {
          type: "array",
          items: {
            type: "string",
            enum: ["budget", "decision_maker", "timeline", "current_solution"],
          },
          description: "Facts the buyer revealed during this turn.",
        },
        follow_up_question: {
          type: "string",
          description: "Optional follow-up question the buyer has.",
        },
        action: {
          type: "string",
          enum: ["reveal_pain", "challenge", "ask_question", "push_back", "engage", "deflect", "end_call", "close"],
          description: "The internal action the buyer decided to take this turn.",
        },
      },
      required: ["emotion", "intent", "trust_delta", "mood_delta", "facts_revealed"],
      additionalProperties: false,
    },
  },
};

export function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return apiKey;
}

export async function callOpenAIStream(
  model: string,
  systemPrompt: string,
  chatHistory: ChatMessage[],
  userMessage: string,
  useMetadataTool: boolean = false
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...chatHistory,
      { role: "user", content: userMessage },
    ],
    stream: true,
    temperature: 0.75,
    max_tokens: 250,
  };

  if (useMetadataTool) {
    body.tools = [recordBuyerMetadataTool];
    body.tool_choice = "auto";
  }

  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenAIApiKey()}`,
    },
    body: JSON.stringify(body),
  });
}

export async function callOpenAIChat(
  model: string,
  systemPrompt: string,
  chatHistory: ChatMessage[],
  userMessage: string
): Promise<Response> {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenAIApiKey()}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.75,
      max_tokens: 400,
    }),
  });
}

export { parseOpenAIStream, parseOpenAIJsonResponse };
