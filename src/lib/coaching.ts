/**
 * Live Coaching Framework — Scenario-aware
 * Adapts steps, questions, and tips based on scenario type.
 * Zero API calls — runs in <50ms.
 */

export interface ScenarioContext {
  sellerCompany?: string;
  sellerProduct?: string;
  buyerName?: string;
  buyerTitle?: string;
  buyerCompany?: string;
  buyerIndustry?: string;
  buyerPainPoints?: string[];
  contextNote?: string;
  scenarioType?: string;
}

export interface CoachingStep {
  id: number;
  name: string;
  keywords: string[];
}

const FRAMEWORKS: Record<string, CoachingStep[]> = {
  "Discovery Call": [
    { id: 0, name: "Intro + Agenda", keywords: ["agenda", "objective", "today", "call", "discussion", "plan", "goal for", "purpose"] },
    { id: 1, name: "Current Process", keywords: ["process", "currently", "today", "handle", "manage", "workflow", "steps", "how do you", "walk me through"] },
    { id: 2, name: "Breakdown Points", keywords: ["break", "breakdown", "problem", "struggle", "friction", "bottleneck", "difficult", "challenge", "pain point"] },
    { id: 3, name: "Impact", keywords: ["impact", "affect", "consequence", "result", "outcome", "mean for", "what happens when", "downstream"] },
    { id: 4, name: "Cost Quantification", keywords: ["cost", "time", "hours", "money", "spend", "waste", "how much", "quantify", "per week", "estimate", "put a number"] },
    { id: 5, name: "Previous Attempts", keywords: ["tried", "attempt", "before", "previous", "solution", "already", "approach", "worked", "software", "tool", "fix"] },
    { id: 6, name: "Future State", keywords: ["if", "solved", "change", "different", "would", "ideal", "future", "look like", "what if", "imagine"] },
    { id: 7, name: "Stakeholders", keywords: ["who else", "involve", "decision", "team", "stakeholder", "approval", "buy-in", "cfo", "ceo", "cto", "vp", "head of", "committee", "board"] },
    { id: 8, name: "Blockers", keywords: ["stop", "block", "concern", "worry", "risk", "hesitation", "barrier", "prevent", "objection", "concerned about"] },
  ],
  "Product Knowledge Interview": [
    { id: 0, name: "Product Overview", keywords: ["overview", "what is", "describe", "explain", "positioning", "value proposition", "what does", "core offering", "about"] },
    { id: 1, name: "Key Features", keywords: ["feature", "capability", "functionality", "what can it do", "how does it work", "key benefit", "main functions", "what it does"] },
    { id: 2, name: "Target Use Cases", keywords: ["use case", "ideal customer", "who uses", "target", "icp", "best fit", "segment", "persona", "customer type", "who is it for"] },
    { id: 3, name: "Competitive Differentiation", keywords: ["competitor", "different", "vs", "compare", "advantage", "unique", "why us", "better than", "alternative", "difference"] },
    { id: 4, name: "Technical Architecture", keywords: ["integration", "api", "technical", "infrastructure", "platform", "stack", "erp", "crm", "sync", "connect", "architecture"] },
    { id: 5, name: "Pricing & Packaging", keywords: ["price", "cost", "plan", "tier", "subscription", "license", "per user", "pricing model", "roi", "value", "how much"] },
    { id: 6, name: "Implementation", keywords: ["onboard", "setup", "deploy", "timeline", "go live", "migration", "training", "support", "kickoff", "how long"] },
    { id: 7, name: "ROI & Success", keywords: ["roi", "outcome", "result", "metric", "kpi", "success", "measurable", "impact", "savings", "efficiency", "return"] },
    { id: 8, name: "Product Objections", keywords: ["limitation", "missing feature", "doesn't support", "not enough", "concern", "worry", "risk", "gap", "drawback", "can't"] },
  ],
  "Objection Handling": [
    { id: 0, name: "Acknowledge & Validate", keywords: ["understand", "hear you", "appreciate", "valid", "makes sense", "fair point", "i see"] },
    { id: 1, name: "Clarify Concern", keywords: ["help me understand", "what specifically", "which part", "can you elaborate", "tell me more", "dig deeper"] },
    { id: 2, name: "Reframe", keywords: ["reframe", "think about it", "another way", "actually", "what if", "consider", "perspective"] },
    { id: 3, name: "Provide Proof", keywords: ["example", "case study", "customer", "reference", "data", "proof", "evidence", "result", "track record"] },
    { id: 4, name: "Bridge to Value", keywords: ["value", "benefit", "outcome", "what that means", "so what", "the real benefit", "impact"] },
    { id: 5, name: "Trial Close", keywords: ["if we could", "would you", "assuming", "hypothetically", "if that works", "sound fair", "make sense"] },
    { id: 6, name: "Address Secondary", keywords: ["what else", "other concern", "anything else", "in addition", "besides", "secondary", "another worry"] },
    { id: 7, name: "Confirm Resolution", keywords: ["feel better", "comfortable", "resolved", "clear", "good now", "satisfied", "confident"] },
    { id: 8, name: "Move Forward", keywords: ["next step", "move forward", "proceed", "schedule", "sign", "agreement", "close", "commit"] },
  ],
  "Closing Negotiation": [
    { id: 0, name: "Confirm Interest", keywords: ["interested", "like what", "excited", "ready", "keen", "wanting", "serious", "good fit"] },
    { id: 1, name: "Discuss Terms", keywords: ["price", "cost", "budget", "terms", "contract", "proposal", "quote", "pricing", "investment"] },
    { id: 2, name: "Handle Price Pushback", keywords: ["expensive", "too much", "cheaper", "discount", "lower", "budget", "afford", "justify cost"] },
    { id: 3, name: "Propose Structure", keywords: ["pilot", "phased", "starter", "trial", "proof of concept", "poc", "pilot program", "gradual"] },
    { id: 4, name: "Negotiate Timeline", keywords: ["timeline", "when", "start", "deadline", "urgent", "quarter", "go live", "kickoff", "pace"] },
    { id: 5, name: "Secure Commitment", keywords: ["commit", "ready to", "move ahead", "sign", "proceed", "green light", "approval", "yes", "go"] },
    { id: 6, name: "Map Next Steps", keywords: ["next step", "what happens", "paperwork", "legal", "procurement", "contract", "signing", "onboarding"] },
    { id: 7, name: "Last-Minute Blockers", keywords: ["need to", "check with", "legal", "finance", "cfo", "board", "one more thing", "final concern"] },
    { id: 8, name: "Close the Deal", keywords: ["deal", "close", "done", "agreed", "signed", "official", "partnership", "moving forward"] },
  ],
  "Demo Follow-Up": [
    { id: 0, name: "Recap Highlights", keywords: ["recap", "highlight", "saw", "impressed", "liked", "favorite part", "what stood out", "demo"] },
    { id: 1, name: "Confirm Fit", keywords: ["fit", "solve", "address", "matches", "relevant", "applicable", "for us", "our use case"] },
    { id: 2, name: "Technical Questions", keywords: ["technical", "integration", "api", "security", "compliance", "setup", "configure", "how does", "technical detail"] },
    { id: 3, name: "Integration Requirements", keywords: ["integrate", "connect", "sync", "erp", "crm", "workflow", "existing system", "data migration"] },
    { id: 4, name: "Implementation Timeline", keywords: ["timeline", "how long", "when", "go live", "deploy", "rollout", "phases", "schedule"] },
    { id: 5, name: "Decision Makers", keywords: ["who else", "decision", "stakeholder", "approval", "cfo", "cto", "team", "committee", "sign off"] },
    { id: 6, name: "Budget Questions", keywords: ["budget", "cost", "pricing", "approve", "funding", "financial", "cfo", "finance team", "yearly budget"] },
    { id: 7, name: "Propose Next Steps", keywords: ["next step", "pilot", "trial", "follow up", "another call", "proposal", "contract", "po"] },
    { id: 8, name: "Secure Commitment", keywords: ["commit", "move forward", "ready", "excited", "partner", "proceed", "get started", "sign"] },
  ],
};

const DEFAULT_FRAMEWORK = FRAMEWORKS["Discovery Call"];

function getFramework(type?: string): CoachingStep[] {
  if (!type) return DEFAULT_FRAMEWORK;
  const key = Object.keys(FRAMEWORKS).find((k) =>
    k.toLowerCase() === type.toLowerCase() || type.toLowerCase().includes(k.toLowerCase())
  );
  return key ? FRAMEWORKS[key] : DEFAULT_FRAMEWORK;
}

export function getStepCount(type?: string): number {
  return getFramework(type).length;
}

export function getCoachingSteps(type?: string): CoachingStep[] {
  return getFramework(type);
}

export type DiscoveryStepId = number;

export interface CoachingState {
  currentStep: DiscoveryStepId;
  stepsCompleted: boolean[];
  uncoveredFacts: string[];
  suggestedNextQuestion: string;
  sellerQuestionCount: number;
  scenarioType?: string;
}

export interface CoachingUpdate {
  stepDetected: DiscoveryStepId | null;
  stepCompleted: boolean;
  newSuggestion: string;
  uncoveredFact: string | null;
}

export function createInitialCoachingState(ctx?: ScenarioContext): CoachingState {
  const type = ctx?.scenarioType;
  const steps = getFramework(type);
  const questions = getSuggestedQuestions(ctx ?? {});
  return {
    currentStep: 0,
    stepsCompleted: Array(steps.length).fill(false),
    uncoveredFacts: [],
    suggestedNextQuestion: questions[0]?.[0] ?? "Keep the conversation moving forward.",
    sellerQuestionCount: 0,
    scenarioType: type,
  };
}

export function getSuggestedQuestions(ctx: ScenarioContext): Record<number, string[]> {
  const company = ctx.sellerCompany ?? "our solution";
  const product = ctx.sellerProduct ?? "this product";
  const buyerRole = ctx.buyerTitle ?? "your role";
  const buyerCo = ctx.buyerCompany ?? "your company";
  const pain = ctx.buyerPainPoints?.[0] ?? "this area";
  const type = ctx.scenarioType ?? "Discovery Call";

  const discovery: Record<number, string[]> = {
    0: [`Before we dive in — what would make this conversation most valuable for you as ${buyerRole} at ${buyerCo}?`, `I'd love to understand your goals for today's call. What should we focus on to make this time count?`, `Walk me through what you're hoping to get out of this discussion with ${company}.`],
    1: [`Walk me through how your team currently handles ${pain} — start to finish. What does that process look like today?`, `Can you paint me a picture of your current workflow around ${pain}?`, `How does your team manage ${pain} right now? I'd love to understand the process in your own words.`],
    2: [`Where in that process does it break down the most? Which part causes the most friction?`, `If you had to point to the single biggest pain point in that workflow, what would it be?`, `Which step causes the most frustration or delays for you and your team?`],
    3: [`When that breaks down, what's the ripple effect? How does it impact your team, your customers, or your business?`, `How does that problem actually affect your day-to-day outcomes? What's the real-world impact?`, `What happens downstream when that issue occurs? Who else feels the pain?`],
    4: [`If you had to quantify it, how much is this costing you — in time, money, or missed opportunities?`, `How many hours per week does your team spend dealing with this? What would you estimate the financial impact to be?`, `Put a number on it for me. What would solving this be worth to ${buyerCo} over the next year?`],
    5: [`What have you already tried to fix this? Any tools, vendors, or internal approaches?`, `Have you looked at any solutions before — what worked, even partially, and what didn't?`, `What's already been attempted? Understanding that helps me know how ${product} could fit.`],
    6: [`If this were completely solved, what would change for you personally in your role as ${buyerRole}?`, `Picture it six months from now — this problem is gone. What's different about your day?`, `How would solving this impact your team's metrics, your personal stress level, and your goals at ${buyerCo}?`],
    7: [`Who else at ${buyerCo} feels this pain and would need to be involved in a decision like this?`, `Who else would need to sign off? What does the decision-making process typically look like for changes like this?`, `Beyond you, who are the key stakeholders? The champion, the budget owner, the blocker — who do we need to win over?`],
    8: [`If we found the right approach for ${buyerCo}, what would stop you from moving forward?`, `What concerns do you have about implementation, change management, or budget approval?`, `What's the biggest risk in your mind? And if we could solve for that, what would your ideal timeline look like?`],
  };

  const productKnowledge: Record<number, string[]> = {
    0: [`Before we start — what specific aspects of ${product} are you most interested in assessing?`, `What would make this interview most valuable for you as ${buyerRole} at ${buyerCo}?`, `What areas of ${company}'s offering should we focus on today?`],
    1: [`Walk me through the core features of ${product}. What problems does each feature solve?`, `What are the top 3 capabilities of ${product} that differentiate it in the market?`, `Describe the key functionality — how does ${product} work at a high level?`],
    2: [`Who is the ideal customer for ${product}? What use cases does it serve best?`, `Describe the target customer profile. What industries, company sizes, and roles benefit most?`, `Walk me through a typical use case. Who uses ${product} and what for?`],
    3: [`How does ${product} compare to the main alternatives in the market?`, `What makes ${company} different from competitors? Why would a buyer choose you?`, `Describe your competitive positioning. Where do you win and where do you lose?`],
    4: [`How does ${product} integrate with existing systems? What platforms does it connect to?`, `Walk me through the technical architecture. How is it deployed and what integrations are available?`, `What does the integration process look like? What systems does it sync with?`],
    5: [`How is ${product} priced? What are the different tiers or packages?`, `Walk me through the pricing model. What drives the cost and what's included?`, `How do you justify the price? What ROI do customers typically see?`],
    6: [`What does the implementation process look like? How long does it take to go live?`, `Walk me through onboarding. What support does ${company} provide during setup?`, `How do you handle data migration and user training? What's the typical timeline?`],
    7: [`What measurable outcomes do customers see? How do you track success?`, `Walk me through the ROI. What metrics improve and by how much?`, `How do you define success for a ${product} customer? What KPIs matter most?`],
    8: [`What are the most common product objections you hear? How do you handle them?`, `What limitations or gaps does ${product} have? How do you address buyer concerns?`, `When a buyer says "${product} doesn't do X," what's your response?`],
  };

  const objection: Record<number, string[]> = {
    0: [`I completely understand. Let me make sure I hear you correctly — your concern is...`, `That's a fair point. Can you tell me more about what's driving that?`],
    1: [`Help me understand — which part specifically is the sticking point for you?`, `What would need to be true for this to feel like the right move?`],
    2: [`Another way to think about it...`, `What if we looked at it from a different angle?`],
    3: [`We actually had a customer in a similar situation...`, `Let me share some data on how others handled this...`],
    4: [`The real value here isn't just the feature — it's what it unlocks for your team...`, `So what that means in practice is...`],
    5: [`If we could solve for that, would you be comfortable moving forward?`, `Does that address your concern?`],
    6: [`Is there anything else on your mind?`, `Any other hesitations I can help with?`],
    7: [`Do you feel confident this is the right solution now?`, `Does that clear things up?`],
    8: [`Great — let's talk about next steps. What does your timeline look like?`, `Perfect. Shall we schedule the kickoff?`],
  };

  const closing: Record<number, string[]> = {
    0: [`On a scale of 1-10, how excited are you about moving forward with this?`, `Does this feel like the right solution for ${buyerCo}?`],
    1: [`Let's talk terms. What budget are we working with?`, `Here's the proposal — walk me through what works and what doesn't.`],
    2: [`I hear you on the budget. What if we structured this differently?`, `Let's look at the total cost of ownership vs the value delivered.`],
    3: [`What if we started with a pilot program to prove value?`, `Would a phased rollout work better for your team?`],
    4: [`What's your ideal go-live date?`, `How quickly do you need to see results?`],
    5: [`Are you ready to move forward?`, `What do you need from me to say yes?`],
    6: [`Here's what happens next...`, `Let me walk you through the onboarding process.`],
    7: [`Is there anyone else we need to loop in before we proceed?`, `Any final questions or concerns?`],
    8: [`Congratulations! Welcome to the ${company} family.`, `Let's get the paperwork started.`],
  };

  const demo: Record<number, string[]> = {
    0: [`What stood out to you most from the demo?`, `Which feature resonated with you the most?`],
    1: [`Does this feel like it would solve your ${pain} challenge?`, `How well does this fit your current workflow?`],
    2: [`Any technical questions? Integration, security, compliance?`, `What would your IT team need to know?`],
    3: [`Which systems would ${product} need to integrate with?`, `How does the data flow between ${product} and your existing stack?`],
    4: [`What's your ideal timeline for rollout?`, `How quickly would you want to go live?`],
    5: [`Who else needs to see this before a decision is made?`, `What does the approval process typically look like?`],
    6: [`Does the pricing align with your budget expectations?`, `What would make the financial case easier to approve?`],
    7: [`What would be the best next step for you?`, `Would a pilot or a proposal be more helpful?`],
    8: [`Ready to get started?`, `What do you need to move forward?`],
  };

  if (type.toLowerCase().includes("product knowledge")) return productKnowledge;
  if (type.toLowerCase().includes("objection")) return objection;
  if (type.toLowerCase().includes("closing") || type.toLowerCase().includes("negotiation")) return closing;
  if (type.toLowerCase().includes("demo")) return demo;
  return discovery;
}

/**
 * Analyze a conversation turn and detect progress.
 * Runs entirely client-side. Returns coaching update.
 */
export function analyzeTurn(
  sellerText: string,
  buyerText: string,
  currentState: CoachingState,
  ctx?: ScenarioContext
): CoachingUpdate {
  const combined = (sellerText + " " + buyerText).toLowerCase();
  const steps = getFramework(ctx?.scenarioType ?? currentState.scenarioType);

  // Detect which step this turn touches
  let detectedStep: DiscoveryStepId | null = null;
  for (const step of steps) {
    if (step.keywords.some((kw: string) => combined.includes(kw))) {
      detectedStep = step.id;
      break;
    }
  }

  // Update completed steps
  const newCompleted = [...currentState.stepsCompleted];
  if (detectedStep !== null) {
    newCompleted[detectedStep] = true;
  }

  // Determine current step (first uncompleted, or last if all done)
  let currentStep: DiscoveryStepId = 0;
  let allCompleted = true;
  for (let i = 0; i < newCompleted.length; i++) {
    if (!newCompleted[i]) {
      currentStep = i;
      allCompleted = false;
      break;
    }
  }
  if (allCompleted) {
    currentStep = (steps.length - 1) as DiscoveryStepId;
  }

  // Extract uncovered facts from buyer response
  const uncoveredFact = extractFact(buyerText);

  // Pick a scenario-aware suggestion for the next step
  const questions = getSuggestedQuestions(ctx ?? {});
  let newSuggestion: string;
  if (allCompleted) {
    newSuggestion = "Great progress — summarize what you've learned and propose clear next steps.";
  } else {
    const suggestionPool = questions[currentStep] ?? ["Keep the conversation moving forward."];
    const rotationIndex = currentState.sellerQuestionCount % suggestionPool.length;
    newSuggestion = suggestionPool[rotationIndex];
  }

  return {
    stepDetected: detectedStep,
    stepCompleted: detectedStep !== null && detectedStep <= currentState.currentStep,
    newSuggestion,
    uncoveredFact,
  };
}

/**
 * Update the coaching state with a new turn analysis.
 */
export function updateCoachingState(
  state: CoachingState,
  update: CoachingUpdate
): CoachingState {
  const newCompleted = [...state.stepsCompleted];
  if (update.stepDetected !== null) {
    newCompleted[update.stepDetected] = true;
  }

  let currentStep: DiscoveryStepId = 0;
  let allCompleted = true;
  for (let i = 0; i < newCompleted.length; i++) {
    if (!newCompleted[i]) {
      currentStep = i as DiscoveryStepId;
      allCompleted = false;
      break;
    }
  }
  if (allCompleted) {
    currentStep = (newCompleted.length - 1) as DiscoveryStepId;
  }

  return {
    currentStep,
    stepsCompleted: newCompleted,
    uncoveredFacts: update.uncoveredFact
      ? [...state.uncoveredFacts, update.uncoveredFact]
      : state.uncoveredFacts,
    suggestedNextQuestion: update.newSuggestion,
    sellerQuestionCount: state.sellerQuestionCount + 1,
  };
}

/**
 * Extract a concrete fact from buyer text.
 * Looks for "we...", "our...", "currently..." patterns.
 */
function extractFact(buyerText: string): string | null {
  const text = buyerText.trim();
  if (!text || text.length < 10) return null;

  // Look for specific patterns that indicate revealed information
  const patterns = [
    /we (?:use|have|rely on|spend|waste|lose|save|need|want|are looking for) ([^.]{5,80})/i,
    /our (?:process|system|team|budget|timeline|goal) is ([^.]{5,80})/i,
    /currently,? we ([^.]{5,80})/i,
    /it takes (?:us|our team)? ([^.]{5,80})/i,
    /about (\d+ (?:hours?|days?|weeks?|months?) [^.]{0,60})/i,
    /costs? (?:us)? about? ([^.]{5,60})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const fact = match[1]?.trim();
      if (fact && fact.length > 3) return fact;
    }
  }

  return null;
}

/**
 * Get coaching tip for the current step.
 */
export function getStepTip(stepId: DiscoveryStepId, ctx?: ScenarioContext): string {
  const buyerCo = ctx?.buyerCompany ?? "their company";
  const product = ctx?.sellerProduct ?? "this product";
  const type = ctx?.scenarioType ?? "Discovery Call";

  const discoveryTips: Record<number, string> = {
    0: "Set the agenda together. Ask what they want to achieve. This isn't a pitch — it's a mutual discovery.",
    1: `Get the buyer to walk through their current process in their own words. Don't interrupt. Let them tell the full story of how ${buyerCo} does things today.`,
    2: "Listen for emotional language — frustration, annoyance, wasted time. That's where the real pain lives.",
    3: "Connect the problem to business outcomes. Ask 'so what?' until you hit something measurable — revenue, retention, or reputation.",
    4: "Push for numbers. 'How many hours per week?' 'What's the dollar impact?' Quantification is what turns pain into budget.",
    5: "Uncover what failed before. This reveals their skepticism, buying history, and what NOT to pitch. Learn from their scars.",
    6: "Make them paint the ideal future. Personalize it: 'What would change for YOU specifically?' Not the company — them.",
    7: `Map the buying committee at ${buyerCo}. Who decides? Who influences? Who blocks? You can't close what you don't understand.`,
    8: "Surface hidden objections early. Budget, timeline, politics — better to hear it now than at the contract stage.",
  };

  const productTips: Record<number, string> = {
    0: "Start with the big picture. What's the product's core promise and who is it for?",
    1: "Know your features cold. Be ready to explain what each one does and why it matters.",
    2: "Who benefits most? Be specific about use cases, industries, and buyer personas.",
    3: "Why you over them? Know your 3 key differentiators and be ready to back them up with proof.",
    4: "Integration is a dealbreaker for most buyers. Know your API, security certs, and supported platforms.",
    5: "Pricing shouldn't be a surprise. Know the tiers, what's included, and how to justify the value.",
    6: "Buyers fear long deployments. Know your typical timeline, support model, and what the buyer needs to do.",
    7: "What does success look like? Have concrete numbers — time saved, revenue gained, errors reduced.",
    8: "Know your gaps. Be honest about limitations and ready to reframe or address concerns.",
  };

  const objectionTips: Record<number, string> = {
    0: "Don't fight the objection — validate it. 'I completely understand.' Disarm before you reframe.",
    1: "Dig deeper. The stated objection is rarely the real one. Ask 'what specifically?' until you find the root concern.",
    2: "Reframe, don't contradict. 'Another way to think about it is...' shifts perspective without dismissing them.",
    3: "Show, don't tell. Use specific customer examples, data, or references — generic claims don't work.",
    4: "Always bridge back to value. The objection is about cost; the answer is about what they gain.",
    5: "Test the temperature. 'If we could solve for that, would you be comfortable moving forward?'",
    6: "Don't stop at one. Ask 'Is there anything else?' until they're out of concerns.",
    7: "Confirm before you close. 'Does that clear things up?' If yes, move. If no, dig deeper.",
    8: "Objection handled? Close. Don't celebrate — ask for the next step immediately.",
  };

  const closingTips: Record<number, string> = {
    0: "Gauge real interest before you negotiate. 'On a scale of 1-10, how excited are you?' Anything below 7 means more discovery.",
    1: "Know your numbers. Walk in with pricing confidence and be ready to justify every dollar.",
    2: "Price pushback is expected. Have 3 structures ready: standard, phased, and pilot. Don't discount — restructure.",
    3: "Reducing risk beats reducing price. A pilot program often costs less than a 20% discount.",
    4: "Timeline creates urgency. Know their fiscal year, budget cycle, and internal deadlines.",
    5: "Ask for the close directly. 'Are you ready to move forward?' Silence is your friend.",
    6: "Make next steps crystal clear. Who does what by when? Ambiguity kills deals.",
    7: "The last-minute blocker is real. 'Is there anyone else we need to loop in?' Ask this before you think you need to.",
    8: "Signed? Don't stop. Set the kickoff date before they hang up. Momentum matters.",
  };

  const demoTips: Record<number, string> = {
    0: "Start by recapping what resonated. 'What stood out to you most?' This reveals their real interest.",
    1: "Confirm fit before you sell more. 'Does this feel like it would solve your X challenge?'",
    2: "Expect technical deep-dives. Have your security docs, API specs, and integration guide ready.",
    3: "Map their stack. Know exactly which systems need to connect and what the data flow looks like.",
    4: "Timelines reveal urgency. 'How quickly do you need this live?' Fast timelines = hot deals.",
    5: "Identify the committee. Who else needs to see this? The demo isn't for one person.",
    6: "Budget objections come here. 'Does the pricing align with your expectations?' Surface it early.",
    7: "Propose specific next steps. Not 'let's touch base' — 'let's schedule a pilot kickoff for next Tuesday.'",
    8: "Don't leave without commitment. What do they need to move forward? Get the answer before the call ends.",
  };

  if (type.toLowerCase().includes("product knowledge")) return productTips[stepId] ?? "Keep the conversation moving forward.";
  if (type.toLowerCase().includes("objection")) return objectionTips[stepId] ?? "Keep the conversation moving forward.";
  if (type.toLowerCase().includes("closing") || type.toLowerCase().includes("negotiation")) return closingTips[stepId] ?? "Keep the conversation moving forward.";
  if (type.toLowerCase().includes("demo")) return demoTips[stepId] ?? "Keep the conversation moving forward.";
  return discoveryTips[stepId] ?? "Keep the conversation moving forward.";
}

/**
 * Get seller coverage percentage.
 */
export function getCoveragePercent(state: CoachingState): number {
  const total = state.stepsCompleted.length;
  if (total === 0) return 0;
  const completed = state.stepsCompleted.filter(Boolean).length;
  return Math.round((completed / total) * 100);
}
