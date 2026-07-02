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

export interface CoachingMoment {
  buyerQuote: string;
  signal: string;
  whatTheyShouldHaveSaid: string;
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
  coachingMoments: CoachingMoment[];
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
  personalityTraits?: string[];
  painPoints: string[];
  painPointsCurrentProcess?: string;
  painPointsImpact?: string;
  goals?: string[];
  companyGoal?: string;
  personalMotivation?: string;
  communicationStyle?: string;
  communicationLanguage?: string;
  priorVendorExperience?: string;
  decisionCriteria?: string;
  hiddenConcern?: string;
  meetingSource?: string;
  budgetStatus?: string;
  timelinePressure?: string;
  sampleDialogues?: string;
  age?: number | string;
  gender?: string;
  income?: string;
  education?: string;
  location?: string;
  avatar?: string;
  companySize?: string;
  reportsTo?: string;
  decisionRole?: string;
  owns?: string;
  motivations?: string;
  concerns?: string;
  howToEngage?: string;
}

export interface CustomScenario {
  id: string;
  user_id: string;
  created_by?: string | null;
  organization_id?: string | null;
  member_name?: string | null;
  member_role?: string | null;
  seller_company: string;
  seller_product: string;
  seller_description: string;
  preset_persona_id: string | null;
  custom_persona: CustomPersona | null;
  scenario_type: string;
  product_type: "payment" | "eor" | "cards";
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  duration: number;
  context_note: string | null;
  name: string;
  avatar_id: string | null;
  avatar_name: string | null;
  voice_id: string | null;
  voice_avatar_image_url: string | null;
  elevenlabs_voice_id: string | null;
  scoring_criteria: string | null;
  evaluation_framework: string | null;
  created_at: string;
}
