import { SimulationMessage } from "@/types/simulation";

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
