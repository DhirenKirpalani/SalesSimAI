export type SimulationStage = "opening" | "discovery" | "qualification" | "objection" | "closing";
export type BuyerEmotion = "neutral" | "skeptical" | "interested" | "frustrated";
export type BuyerIntent = "answer" | "objection" | "question" | "redirect";
export type BuyerAction = "reveal_pain" | "challenge" | "ask_question" | "push_back" | "engage" | "deflect" | "end_call" | "close";

export interface SimulationState {
  trust_level: number;
  buyer_mood: number;
  stage: SimulationStage;
  facts_discovered: {
    budget: boolean;
    decision_maker: boolean;
    timeline: boolean;
    current_solution: boolean;
  };
  objections_used: string[];
  engagement_level: number;
}

export interface BuyerResponse {
  message: string;
  emotion: BuyerEmotion;
  intent: BuyerIntent;
  action?: BuyerAction;
  state_updates: {
    trust_delta: number;
    mood_delta: number;
    facts_revealed: string[];
  };
  follow_up_question?: string;
}

export interface SimulationSession {
  id: string;
  user_id: string;
  scenario_id: string;
  scenario_table: string;
  status: "active" | "completed" | "abandoned";
  state: SimulationState;
  heygen_session_id?: string | null;
  started_at: string;
  ended_at?: string | null;
  created_at: string;
}

export interface SimulationMessage {
  id: string;
  session_id: string;
  role: "user" | "buyer";
  content: string;
  emotion?: string | null;
  intent?: string | null;
  action?: string | null;
  created_at: string;
}

export interface HeyGenStreamingSession {
  session_id: string;
  sdp: { type: string; sdp: string };
  ice_servers2: RTCIceServer[];
  access_token?: string;
}

export type HeyGenConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "speaking"
  | "error"
  | "stopped";
