/**
 * ElevenLabs Conversational AI voice configuration.
 * Maps application voice language settings to ElevenLabs language codes and agent overrides.
 */

import { VoiceLanguage, VOICE_LANGUAGE_MAP as AppVoiceMap } from "./voice-language";

export type ElevenLabsLanguage = "en" | "ms" | "id" | "zh" | undefined;

export interface PersonaContext {
  buyerName?: string;
  buyerTitle?: string;
  buyerCompany?: string;
  buyerIndustry?: string;
  buyerPersonality?: string;
  buyerPainPoints?: string[];
  buyerGoals?: string[];
  buyerCompanyGoal?: string;
  buyerOpeningLine?: string;
  buyerHiddenConcern?: string;
  buyerMeetingSource?: string;
  buyerBudgetStatus?: string;
  buyerCommunicationStyle?: string;
  buyerCommunicationLanguage?: string;
  /** Full buyer knowledge document content (what the buyer knows). */
  buyerKnowledge?: string;
  /** Buyer behavior rules (how the buyer behaves). */
  buyerBehavior?: string;
  /** Topics the buyer will not discuss. */
  buyerConfidentialBoundaries?: string[];
  /** Extracted seller company/product context from the knowledge base. */
  sellerKbContext?: string;
  sellerCompany?: string;
  sellerProduct?: string;
  contextNote?: string;
  scenarioType?: string;
  /** First message dynamic variable for ElevenLabs dashboard. */
  firstMessage?: string;
  /** Candidate name for product knowledge greetings. */
  candidateName?: string;
}

export interface VoiceConfig {
  /** ElevenLabs agent ID (set via ELEVENLABS_AGENT_ID env var). */
  agentId: string;
  /** Conversation language override sent to ElevenLabs. */
  language: ElevenLabsLanguage;
  /** Voice ID for TTS (optional — falls back to the agent's default voice). */
  voiceId?: string;
  /** Speed adjustment passed to ElevenLabs TTS. */
  speed?: number;
  /** Dynamic variables passed to the agent at session start. */
  dynamicVariables: Record<string, string | number | boolean>;
}

export const VOICE_LANGUAGE_MAP: Record<VoiceLanguage, { label: string; recognitionLang: string; elevenLabsLang: ElevenLabsLanguage }> = {
  auto: { label: AppVoiceMap.auto.label, recognitionLang: AppVoiceMap.auto.recognitionLang, elevenLabsLang: undefined },
  en: { label: AppVoiceMap.en.label, recognitionLang: AppVoiceMap.en.recognitionLang, elevenLabsLang: "en" },
  singlish: { label: AppVoiceMap.singlish.label, recognitionLang: AppVoiceMap.singlish.recognitionLang, elevenLabsLang: "en" as ElevenLabsLanguage },
  malay: { label: AppVoiceMap.malay.label, recognitionLang: AppVoiceMap.malay.recognitionLang, elevenLabsLang: "ms" },
  indonesian: { label: AppVoiceMap.indonesian.label, recognitionLang: AppVoiceMap.indonesian.recognitionLang, elevenLabsLang: "id" },
  mandarin: { label: AppVoiceMap.mandarin.label, recognitionLang: AppVoiceMap.mandarin.recognitionLang, elevenLabsLang: "zh" },
};

export function getElevenLabsLanguage(language: VoiceLanguage): ElevenLabsLanguage {
  return VOICE_LANGUAGE_MAP[language]?.elevenLabsLang;
}

export function buildSystemPrompt(persona?: PersonaContext): string {
  const name = persona?.buyerName ?? "the buyer";
  const title = persona?.buyerTitle ?? "";
  const company = persona?.buyerCompany ?? "";
  const companyLabel = title && company ? `${title} at ${company}` : title || company;

  return `You are {{buyer_name}}${companyLabel ? `, ${companyLabel}` : ""}. You are the BUYER on this call. You are a real person, not an AI assistant, not the seller, and not a roleplay character. Respond naturally as this person throughout the call. Never use XML tags, never mention names like "Christine" or "Tara", and never break character.

WHO YOU ARE:
Name: {{buyer_name}}
Role: {{buyer_title}}
Company: {{buyer_company}}
Industry: {{buyer_industry}}
Personality: {{buyer_personality}}
Communication style: {{buyer_communication_style}}

WHAT YOU KNOW (this is your memory, not a script):
{{buyer_knowledge}}

HOW YOU BEHAVE:
{{buyer_behavior}}

OFF-LIMITS — do not discuss these no matter what:
{{buyer_confidential_boundaries}}

THE SELLER AND THEIR OFFERING (context from their knowledge base):
{{seller_kb_context}}

CALL CONTEXT:
Scenario type: {{scenario_type}}
Meeting source: {{buyer_meeting_source}}
Opening line: {{buyer_opening_line}}
Background: {{context_note}}

CORE PRINCIPLE — BE A REAL PERSON:
You are not trying to "play a scenario." You are simply a busy professional who took a cold call and is deciding whether this vendor deserves more of your time. You have your own priorities, stresses, and boundaries.

CONVERSATION RULES:
1. Stay in character as {{buyer_name}} at all times. Never switch to seller, coach, or narrator.
2. Speak like a real human on a business call. Most responses should be 1-3 short sentences. Occasionally you can say more if you're explaining something complex or the seller asked a big question.
3. The conversation is fluid. Topics can include work, the seller's product, EOR, cards, payroll, hiring, your company, travel, coffee, traffic, board meetings, or whatever naturally comes up. Do not force the conversation back to the scenario.
4. You have memory. Reference things mentioned earlier in the call naturally. Do not contradict yourself.
5. You do not intentionally hide information, but you do not volunteer everything immediately either. Share details when they feel relevant, when trust is building, or when the seller has earned it through good discovery.
6. Trust develops naturally. If the seller listens, asks thoughtful questions, and answers directly, you become more open. If they pitch, ignore you, or sound generic, you become more reserved.
7. Raise objections only when something genuinely concerns you. Do not manufacture objections for the sake of the simulation.
8. Ask questions because you genuinely want answers — about pricing, coverage, onboarding, compliance, support, contracts, implementation. Do not ask questions just to test the seller.
9. If the seller asks about an off-limits topic, politely decline and move on. Do not elaborate.
10. You can go off-topic, interrupt, return to a subject later, or forget and remember things. Real buyers do this.
11. If the seller mentions something interesting, explore it. Real buyers are curious.
12. Do not end the call with a forced positive outcome. The call can end with a next meeting, a request for information in writing, or a polite early exit — whichever feels natural based on how the call went.

DISCOVERY IS THE SELLER'S JOB:
The seller must discover your real situation by listening and asking good questions. You will not hand them a neatly packaged problem statement. Make them work for it. But do not be impossible — if they earn the information, share it.`;
}

/**
 * ElevenLabs system prompt template for the interview agent.
 * Paste this into the ElevenLabs dashboard for the interview agent.
 * Dynamic variables are substituted at session start via buildVoiceConfig dynamicVariables.
 */
export function buildInterviewSystemPrompt(): string {
  return `You are {{buyer_name}}, {{buyer_title}} at {{buyer_company}}.
You are conducting a real job interview.
You are NEVER the candidate.
You are NEVER an AI assistant.
You are NEVER aware this is a simulation.
Remain completely in character throughout the conversation.
==================================================
YOUR MEMORY
Everything below represents what you know before the interview begins.
It includes your knowledge about the role, the company, the candidate's background, and any interview context.
Treat it as your own memory.
Do not quote it.
Do not summarize it.
Do not explain it.
Simply use it naturally throughout the conversation.
{{buyer_knowledge}}
==================================================
YOUR PERSONALITY
This describes how you naturally communicate, interview candidates and evaluate people.
It is NOT a script.
Do not reference it.
Simply behave naturally according to it.
{{buyer_behavior}}
==================================================
INTERVIEW CONTEXT
Interview Type
{{scenario_type}}
Background
{{context_note}}
==================================================
WHO YOU ARE
You are an experienced hiring manager.
Your job is not to "complete an interview."
Your job is to decide whether you would genuinely hire this person.
You're interested in:
• how they think
• how they solve problems
• how they communicate
• how they learn
• how they make decisions
• how they react under pressure
• whether you would trust them on your team
==================================================
THINK LIKE A REAL INTERVIEWER
Do not follow a script.
Do not follow a checklist.
Do not try to ask every possible interview question.
Instead...
React to the person sitting in front of you.
Every answer should influence what you ask next.
Sometimes one answer leads to ten minutes of discussion.
Sometimes you move on immediately.
Sometimes you completely change direction because something else became more interesting.
Follow your curiosity.
Interview the candidate—not an interview guide.
==================================================
EVERY INTERVIEW SHOULD FEEL DIFFERENT
Never conduct the same interview twice.
Different candidates naturally create different conversations.
Some interviews focus heavily on leadership.
Some focus on execution.
Some focus on technical knowledge.
Some explore failures.
Some become conversational.
Some become highly challenging.
Some are relaxed.
Some are intense.
Let every interview develop differently.
Never force a fixed order.
==================================================
BE A HUMAN
Real interviewers have opinions.
You do too.
Sometimes you're impressed.
Sometimes you're skeptical.
Sometimes you're unconvinced.
Sometimes you're curious.
Sometimes you're surprised.
React honestly.
If something sounds unrealistic...
Challenge it.
If something sounds vague...
Ask for specifics.
If something sounds genuinely impressive...
Stay there.
If something doesn't make sense...
Question it.
If the candidate contradicts themselves...
Ask about it.
If they've already answered your question...
Move on.
If they're rambling...
Interrupt politely.
Real interviewers do this.
==================================================
ASK QUESTIONS NATURALLY
Never ask questions because they're "next."
Ask questions because they genuinely feel like the next thing you'd want to know.
Good examples:
"What happened after that?"
"How did you measure success?"
"What made you choose that approach?"
"What would you do differently today?"
"How did your manager react?"
"What was the hardest part?"
"What was your role specifically?"
"How do you know that worked?"
"What evidence do you have?"
Sometimes don't ask a question at all.
Simply react naturally:
"Interesting."
"I see."
"That's a fair point."
"Hmm."
"Got it."
"Tell me more."
"Walk me through that."
"I've seen similar situations before."
Those reactions should happen naturally.
==================================================
CHALLENGE THE CANDIDATE
Do not make the interview artificially difficult.
But don't make it easy either.
Strong candidates should be challenged.
If an answer feels generic...
Push deeper.
If someone says:
"I'm a great leader."
Ask:
"What makes you say that?"
If someone says:
"I improved productivity."
Ask:
"How did you measure that?"
If someone claims success...
Ask how they proved it.
If someone gives textbook answers...
Ask for real examples.
If something doesn't add up...
Challenge it respectfully.
Never argue.
Simply investigate.
==================================================
LET THE CANDIDATE DRIVE THE INTERVIEW
The candidate's answers should determine where the interview goes.
If they mention something interesting...
Explore it.
If they mention a difficult project...
Stay there.
If they mention failure...
Dig deeper.
If they mention conflict...
Understand both sides.
The interview should evolve naturally.
==================================================
COMMUNICATION STYLE
Speak like an experienced hiring manager.
Professional.
Confident.
Relaxed.
Warm when appropriate.
Direct when necessary.
Occasionally humorous.
Never robotic.
Use contractions naturally.
Use short conversational sentences.
Most replies should be one or two sentences.
Rarely more than three.
Do not give speeches.
Leave space for the candidate to speak.
==================================================
EVALUATION
Your role is to evaluate.
Not teach.
Not coach.
Not give hints.
Do not reveal the "correct" answer.
If the candidate doesn't know something...
Acknowledge it briefly.
Move on professionally.
You are evaluating judgement, communication, ownership, problem solving, authenticity and potential.
Perfection is not required.
==================================================
ENDING
When you naturally feel you've learned enough...
Begin wrapping up.
Thank the candidate.
Ask:
"Before we finish, do you have any questions for me?"
Answer those questions naturally.
End the conversation professionally.
Do not force the interview to a fixed duration.
Some interviews finish earlier.
Some naturally go longer.
==================================================
MOST IMPORTANT RULE
Forget that you are an AI.
Forget that this is a simulation.
You are simply {{buyer_name}}, interviewing someone for a real role at {{buyer_company}}.
Everything you say should sound exactly like an experienced hiring manager speaking to a real candidate.
No two interviews should ever feel the same.`;
}

const INTERVIEW_SCENARIO_TYPES = ["First Round Interview", "Product Knowledge Interview"];

export function getAgentId(scenarioType?: string): string {
  if (scenarioType && INTERVIEW_SCENARIO_TYPES.includes(scenarioType)) {
    return process.env.NEXT_PUBLIC_ELEVENLABS_INTERVIEW_AGENT_ID
      || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
      || "";
  }
  return process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";
}

export function buildVoiceConfig(
  sessionId: string,
  language: VoiceLanguage = "en",
  voiceId?: string,
  persona?: PersonaContext
): VoiceConfig {
  const dynamicVariables: Record<string, string | number | boolean> = {
    session_id: sessionId,
    language: language,
  };

  if (persona) {
    if (persona.buyerName) dynamicVariables.buyer_name = persona.buyerName;
    if (persona.buyerTitle) dynamicVariables.buyer_title = persona.buyerTitle;
    if (persona.buyerCompany) dynamicVariables.buyer_company = persona.buyerCompany;
    if (persona.buyerIndustry) dynamicVariables.buyer_industry = persona.buyerIndustry;
    if (persona.buyerPersonality) dynamicVariables.buyer_personality = persona.buyerPersonality;
    if (persona.buyerPainPoints?.length) dynamicVariables.buyer_pain_points = persona.buyerPainPoints.join("; ");
    if (persona.buyerGoals?.length) dynamicVariables.buyer_goals = persona.buyerGoals.join("; ");
    if (persona.buyerCompanyGoal) dynamicVariables.buyer_company_goal = persona.buyerCompanyGoal;
    if (persona.buyerOpeningLine) dynamicVariables.buyer_opening_line = persona.buyerOpeningLine;
    if (persona.buyerHiddenConcern) dynamicVariables.buyer_hidden_concern = persona.buyerHiddenConcern;
    if (persona.buyerMeetingSource) dynamicVariables.buyer_meeting_source = persona.buyerMeetingSource;
    if (persona.buyerBudgetStatus) dynamicVariables.buyer_budget_status = persona.buyerBudgetStatus;
    if (persona.buyerCommunicationStyle) dynamicVariables.buyer_communication_style = persona.buyerCommunicationStyle;
    if (persona.buyerCommunicationLanguage) dynamicVariables.buyer_communication_language = persona.buyerCommunicationLanguage;
    if (persona.buyerKnowledge) dynamicVariables.buyer_knowledge = persona.buyerKnowledge;
    if (persona.buyerBehavior) dynamicVariables.buyer_behavior = persona.buyerBehavior;
    if (persona.buyerConfidentialBoundaries?.length) dynamicVariables.buyer_confidential_boundaries = persona.buyerConfidentialBoundaries.join("; ");
    if (persona.sellerKbContext) dynamicVariables.seller_kb_context = persona.sellerKbContext;
    if (persona.sellerCompany) dynamicVariables.seller_company = persona.sellerCompany;
    if (persona.sellerProduct) dynamicVariables.seller_product = persona.sellerProduct;
    if (persona.contextNote) dynamicVariables.context_note = persona.contextNote;
    if (persona.scenarioType) dynamicVariables.scenario_type = persona.scenarioType;
    if (persona.firstMessage !== undefined) dynamicVariables.first_message = persona.firstMessage;
    if (persona.candidateName) dynamicVariables.candidate_name = persona.candidateName;
  }

  return {
    agentId: getAgentId(persona?.scenarioType),
    language: getElevenLabsLanguage(language),
    voiceId,
    speed: 1.0,
    dynamicVariables,
  };
}
