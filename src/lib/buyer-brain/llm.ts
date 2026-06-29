import { parseOpenAIJsonResponse, parseOpenAIStream } from "./parser";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return apiKey;
}

export async function callOpenAIStream(
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
      stream: true,
      temperature: 0.75,
      max_tokens: 250,
    }),
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
