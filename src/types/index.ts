export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  avatar?: string;
  joinDate: string;
}

export interface BuyerPersona {
  id: string;
  name: string;
  jobTitle: string;
  company: string;
  industry: string;
  personality: string;
  painPoints: string[];
  goals: string[];
  avatar?: string;
}

export interface Scenario {
  id: string;
  name: string;
  industry: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  duration: number; // minutes
  persona: BuyerPersona;
  description: string;
  tags: string[];
}

export interface Simulation {
  id: string;
  userId: string;
  scenarioId: string;
  scenarioName: string;
  score: number;
  duration: number; // minutes
  date: string;
  status: "completed" | "in-progress" | "abandoned";
  transcript?: Message[];
}

export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface AnalysisBreakdown {
  metrics: number;
  economicBuyer: number;
  decisionCriteria: number;
  decisionProcess: number;
  identifyPain: number;
  champion: number;
}

export interface SessionAnalysis {
  id: string;
  simulationId: string;
  overallScore: number;
  breakdown: AnalysisBreakdown;
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[];
  coachingRecommendations: string[];
}

export interface Organization {
  id: string;
  name: string;
  plan: string;
  users: number;
  simulations: number;
  createdAt: string;
}

export interface StatMetric {
  label: string;
  value: string | number;
  change?: number;
  icon?: string;
}

export interface CustomPersona {
  name: string;
  jobTitle: string;
  company: string;
  industry: string;
  personality: string;
  painPoints: string[];
}

export interface CustomScenario {
  id: string;
  user_id: string;
  seller_company: string;
  seller_product: string;
  seller_description: string;
  preset_persona_id: string | null;
  custom_persona: CustomPersona | null;
  scenario_type: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  duration: number;
  context_note: string | null;
  name: string;
  created_at: string;
}
