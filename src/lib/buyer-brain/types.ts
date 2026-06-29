import { BuyerResponse, SimulationMessage, SimulationState } from "@/types/simulation";

export interface SellerInfo {
  name?: string;
  position?: string;
  company?: string;
}

export type StreamChunk =
  | { type: "sentence"; text: string }
  | { type: "done"; response: BuyerResponse };

export interface BuildPromptContext {
  persona: import("@/types").CustomPersona;
  contextNote: string;
  sellerDescription: string;
  state: SimulationState;
  seller?: SellerInfo;
  difficulty?: string;
  scenarioType?: string;
  recentMessages?: SimulationMessage[];
  ragContext?: string;
  durationMin?: number;
  elapsedMin?: number;
}
