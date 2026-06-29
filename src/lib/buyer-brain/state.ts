import { BuyerResponse, SimulationState } from "@/types/simulation";

/**
 * Applies trust, mood, engagement, facts, and stage updates after a buyer turn.
 */
export function applyStateUpdates(
  state: SimulationState,
  updates: BuyerResponse["state_updates"],
  messageCount: number
): SimulationState {
  const newTrust = Math.min(100, Math.max(0, state.trust_level + updates.trust_delta));
  const newMood = Math.min(10, Math.max(-10, state.buyer_mood + updates.mood_delta));
  const newEngagement = Math.min(100, Math.max(0, state.engagement_level + updates.trust_delta * 0.5));

  const newFacts = { ...state.facts_discovered };
  for (const fact of updates.facts_revealed) {
    if (fact in newFacts) {
      (newFacts as Record<string, boolean>)[fact] = true;
    }
  }

  let stage = state.stage;
  if (messageCount >= 4 && stage === "opening") stage = "discovery";
  if (messageCount >= 10 && stage === "discovery") stage = "qualification";
  if (newTrust < 35 && stage !== "opening") stage = "objection";
  if (newTrust >= 70 && messageCount >= 14) stage = "closing";

  return {
    ...state,
    trust_level: newTrust,
    buyer_mood: newMood,
    engagement_level: newEngagement,
    facts_discovered: newFacts,
    stage,
  };
}
