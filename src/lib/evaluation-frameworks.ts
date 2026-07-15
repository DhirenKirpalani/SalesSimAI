/**
 * Evaluation Framework Config
 *
 * Maps scenario types to their post-call analysis framework.
 * Each framework defines scoring dimensions, weights, participant role,
 * system prompt, and JSON response shape for the GPT evaluation call.
 *
 * Used by:
 *   - src/app/api/simulation/analyze/route.ts  (text chat post-call)
 *   - src/app/api/simulation/coach/route.ts    (voice call post-call)
 */

export interface FrameworkDimension {
  /** snake_case key used in the normalized breakdown object */
  key: string;
  /** Human-readable label for display */
  label: string;
  /** Weight in the overall score (0-1, all weights must sum to 1) */
  weight: number;
  /** Description used in the GPT prompt */
  description: string;
}

export interface EvaluationFramework {
  /** Unique framework id */
  id: string;
  /** Display name */
  name: string;
  /** What to call the human participant in prompts */
  participantRole: string;
  /** Uppercase label for transcript lines */
  transcriptLabel: string;
  /** Scoring dimensions */
  dimensions: FrameworkDimension[];
  /** Coverage steps for the discovery/progression checklist */
  coverageSteps: { key: string; label: string }[];
  /** Build the system prompt for the GPT evaluation call */
  buildSystemPrompt: (participantRole: string) => string;
  /** Build the JSON response shape instruction for the GPT prompt */
  buildJsonShape: () => string;
  /** Build the inline evaluation instructions for the coach route prompt */
  buildEvaluationInstructions: (participantRole: string) => string;
  /** Normalize raw GPT output into a standard breakdown object */
  normalizeBreakdown: (raw: Record<string, unknown>) => Record<string, number>;
  /** Compute overall score from a normalized breakdown */
  computeOverall: (breakdown: Record<string, number>) => number;
}

// ────────────────────────────────────────────────────────────
// MEDDIC Framework (default — used for all sales scenarios)
// ────────────────────────────────────────────────────────────

const MEDDIC_DIMENSIONS: FrameworkDimension[] = [
  { key: "identify_pain", label: "Identify Pain", weight: 0.25, description: "Did they discover and probe specific business pain points?" },
  { key: "metrics", label: "Metrics", weight: 0.20, description: "Did they quantify business impact, ROI, or cost of the pain?" },
  { key: "economic_buyer", label: "Economic Buyer", weight: 0.15, description: "Did they identify or engage the financial decision maker?" },
  { key: "decision_criteria", label: "Decision Criteria", weight: 0.15, description: "Did they uncover the buyer's evaluation requirements?" },
  { key: "decision_process", label: "Decision Process", weight: 0.15, description: "Did they map the buying process, timeline, or steps?" },
  { key: "champion", label: "Champion", weight: 0.10, description: "Did they build a relationship and find or create an internal advocate?" },
];

const MEDDIC_COVERAGE_STEPS = [
  { key: "intro_agenda", label: "Intro + Agenda" },
  { key: "current_process", label: "Current Process" },
  { key: "breakdown", label: "Breakdown Points" },
  { key: "impact", label: "Impact" },
  { key: "cost", label: "Cost Quantification" },
  { key: "previous_attempts", label: "Previous Attempts" },
  { key: "future_state", label: "Future State" },
  { key: "stakeholders", label: "Stakeholders" },
  { key: "blockers", label: "Blockers" },
];

const MEDDIC: EvaluationFramework = {
  id: "meddic",
  name: "MEDDIC",
  participantRole: "seller",
  transcriptLabel: "SELLER",
  dimensions: MEDDIC_DIMENSIONS,
  coverageSteps: MEDDIC_COVERAGE_STEPS,

  buildSystemPrompt(participantRole: string) {
    const dims = MEDDIC_DIMENSIONS.map(d => `- ${d.label}: ${d.description}`).join("\n");
    const weights = MEDDIC_DIMENSIONS.map(d => `${d.label} ${Math.round(d.weight * 100)}%`).join(", ");
    return `You are an expert B2B sales coach analyzing a sales call transcript using the MEDDIC framework. The human participant is the ${participantRole}. Score strictly. Do not give points for silence, greetings, "yes", "sounds good", or generic small talk.

MEDDIC scoring guidance — start every dimension at 0 and award points ONLY when the ${participantRole}'s own words provide clear evidence:
- 0: No evidence the ${participantRole} addressed this dimension.
- 20-40: Weak or implicit mention (one vague reference, not probed).
- 50-70: Clear evidence (specific question or statement tied to the dimension).
- 80-100: Strong evidence (probed deeply, quantified, or tied to a concrete next step).

Dimensions:
${dims}

Compute the overall_score as a weighted average: ${weights}.

Return ONLY valid JSON in this exact shape:
{
  "overall_score": <0-100>,
  "breakdown": {
    ${MEDDIC_DIMENSIONS.map(d => `"${d.label}": <0-100>`).join(",\n    ")}
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "missed_opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "coaching_recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "coaching_moments": [
    {
      "buyer_quote": "<exact buyer statement from transcript>",
      "signal": "<what this statement signals>",
      "what_they_should_have_said": "<exact script they should have used in that moment>"
    }
  ]
}

Rules for strengths, weaknesses, missed opportunities, and coaching recommendations:
- They MUST be grounded in the actual transcript and the scenario above.
- Strengths: specific things the ${participantRole} actually said or did well. Do NOT list generic advice. If there are no real strengths, return an empty array.
- Weaknesses: specific gaps or mistakes evident in the transcript. Use quotes or refer to actual turns.
- Missed opportunities: specific questions or tactics the ${participantRole} failed to use at a real moment in the conversation.
- Coaching recommendations: actionable advice that directly addresses the weaknesses and missed opportunities. Do not repeat generic sales tips.

COACHING MOMENTS rules:
- Pick 3-5 real moments from the transcript where the buyer said something significant.
- For each, explain what signal that statement sends (objection, buying signal, etc.).
- Provide an exact script the ${participantRole} should have used — not generic advice, word-for-word what to say.
- Be honest and specific. Reference actual moments from the transcript.`;
  },

  buildJsonShape() {
    return `{
  "overall_score": number,
  "meddic_breakdown": {
    ${MEDDIC_DIMENSIONS.map(d => `"${d.label}": number`).join(",\n    ")}
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missed_opportunities": ["..."],
  "recommendations": ["..."],
  "discovery_coverage": { ${MEDDIC_COVERAGE_STEPS.map(s => `"${s.key}": boolean`).join(", ")} }
}`;
  },

  buildEvaluationInstructions(participantRole: string) {
    const dims = MEDDIC_DIMENSIONS.map((d, i) => `${i + 1}. ${d.label}: ${d.description}`).join("\n");
    const weights = MEDDIC_DIMENSIONS.map(d => `${d.label} ${Math.round(d.weight * 100)}%`).join(", ");
    return `EVALUATE on MEDDIC dimensions. Start each dimension at 0 and award points ONLY when the ${participantRole}'s own words in the transcript provide clear evidence. Silence, greetings, "yes", "sounds good", or generic small talk must score 0.

Use this strict scale for each dimension:
- 0: No evidence the ${participantRole} addressed this dimension.
- 20-40: Weak or implicit mention (one vague reference, not probed).
- 50-70: Clear evidence (specific question or statement tied to the dimension).
- 80-100: Strong evidence (probed deeply, quantified, or tied to a concrete next step).

Dimensions:
${dims}

Use the SCORING RUBRIC above to judge how well the ${participantRole} hit each checkpoint. Do not give partial credit for simply talking; require evidence.

Also provide:
- OVERALL_SCORE: weighted average (0-100). Weights: ${weights}.
- STRENGTHS: Specific things the ${participantRole} actually did well (max 3). Must be grounded in the transcript. Return empty if none.
- WEAKNESSES: Specific gaps or mistakes evident in the transcript (max 5). Reference actual turns or quotes.
- MISSED_OPPORTUNITIES: Specific questions or tactics the ${participantRole} failed to use at a real moment in the transcript (max 5).
- RECOMMENDATIONS: Actionable coaching tips that directly address the weaknesses and missed opportunities (max 5). Do not repeat generic sales advice.
- DISCOVERY_COVERAGE: Which of the 9 discovery steps were covered (true/false)
  Steps: ${MEDDIC_COVERAGE_STEPS.map(s => s.key).join(", ")}`;
  },

  normalizeBreakdown(raw: Record<string, unknown>) {
    const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const rb = (raw.breakdown ?? raw.meddic_breakdown ?? raw) as Record<string, unknown>;
    return {
      identify_pain: clamp(rb["Identify Pain"] ?? rb["identify_pain"] ?? 0),
      metrics: clamp(rb["Metrics"] ?? rb["metrics"] ?? 0),
      economic_buyer: clamp(rb["Economic Buyer"] ?? rb["economic_buyer"] ?? 0),
      decision_criteria: clamp(rb["Decision Criteria"] ?? rb["decision_criteria"] ?? 0),
      decision_process: clamp(rb["Decision Process"] ?? rb["decision_process"] ?? 0),
      champion: clamp(rb["Champion"] ?? rb["champion"] ?? 0),
    };
  },

  computeOverall(breakdown: Record<string, number>) {
    return Math.round(
      MEDDIC_DIMENSIONS.reduce((sum, d) => sum + (breakdown[d.key] ?? 0) * d.weight, 0)
    );
  },
};

// ────────────────────────────────────────────────────────────
// STAR Framework — 7 Behavioural Competencies (interview scenarios)
// Docs: docs/interview-competency-framework.md
// ────────────────────────────────────────────────────────────

const STAR_DIMENSIONS: FrameworkDimension[] = [
  {
    key: "competency_strategic_thinking",
    label: "Strategic Thinking",
    weight: 0.20,
    description: "Does the candidate frame situations strategically? Do they show business acumen, structured decision-making, and awareness of trade-offs and second-order effects?",
  },
  {
    key: "autonomy_under_complexity",
    label: "Autonomy Under Complexity",
    weight: 0.15,
    description: "Do they take ownership in ambiguous situations without being directed? Do they define the problem, build a hypothesis, and act — without waiting for someone to hand them a map?",
  },
  {
    key: "leverage_without_authority",
    label: "Leverage Without Authority",
    weight: 0.15,
    description: "Can they move people and outcomes they don't control? Do they describe cross-functional influence, stakeholder alignment, and achieving results when formal authority was absent?",
  },
  {
    key: "collaboration",
    label: "Collaboration",
    weight: 0.15,
    description: "Do they make the people around them better? Do they credit teammates without deflecting accountability, handle conflict as productive friction, and show outcomes improved because of how they worked with others?",
  },
  {
    key: "candour_self_correction",
    label: "Candour & Self-Correction",
    weight: 0.15,
    description: "Are they honest enough about themselves to grow? Do they describe real failures — not safe stories — and show they updated their thinking or behavior afterward? Can they be coached?",
  },
  {
    key: "counterfeit_recognition",
    label: "Counterfeit Recognition",
    weight: 0.10,
    description: "Can they tell the real from the performed? Do they show pattern recognition, healthy skepticism, and examples of catching situations where reality didn't match what was presented? Do they challenge false premises rather than just accept them?",
  },
  {
    key: "vision_adjustment",
    label: "Vision Adjustment",
    weight: 0.10,
    description: "Can they update the destination while keeping the team moving? Do they describe pivots — times new information required changing course — and show they can do this without losing momentum or the team?",
  },
];

const STAR_COVERAGE_STEPS = [
  { key: "strategic_thinking_evidence", label: "Strategic Thinking" },
  { key: "autonomy_under_complexity_evidence", label: "Autonomy Under Complexity" },
  { key: "leverage_without_authority_evidence", label: "Leverage Without Authority" },
  { key: "collaboration_evidence", label: "Collaboration" },
  { key: "candour_self_correction_evidence", label: "Candour & Self-Correction" },
  { key: "counterfeit_recognition_evidence", label: "Counterfeit Recognition" },
  { key: "vision_adjustment_evidence", label: "Vision Adjustment" },
];

const STAR: EvaluationFramework = {
  id: "star",
  name: "STAR",
  participantRole: "candidate",
  transcriptLabel: "CANDIDATE",
  dimensions: STAR_DIMENSIONS,
  coverageSteps: STAR_COVERAGE_STEPS,

  buildSystemPrompt(participantRole: string) {
    const dims = STAR_DIMENSIONS.map(d => `- ${d.label} (${Math.round(d.weight * 100)}%): ${d.description}`).join("\n");
    const weights = STAR_DIMENSIONS.map(d => `${d.label} ${Math.round(d.weight * 100)}%`).join(", ");
    return `You are an expert interview coach analyzing a behavioral interview transcript using a 7-competency framework. The human participant is the ${participantRole}. Score strictly. Do not give points for silence, greetings, "yes", "sounds good", or generic small talk.

Scoring guidance — start every competency at 0 and award points ONLY when the ${participantRole}'s own words provide clear evidence:
- 0: No evidence the ${participantRole} demonstrated this competency.
- 20-40: Vague or surface mention — no concrete example backing it up.
- 50-70: Clear example with most elements present — missing depth, specificity, or outcome.
- 80-100: Strong, concrete, specific example with a meaningful outcome demonstrating this competency.

Competencies:
${dims}

Compute the overall_score as a weighted average: ${weights}.

Return ONLY valid JSON in this exact shape:
{
  "overall_score": <0-100>,
  "breakdown": {
    ${STAR_DIMENSIONS.map(d => `"${d.label}": <0-100>`).join(",\n    ")}
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "missed_opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "coaching_recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "coaching_moments": [
    {
      "buyer_quote": "<exact interviewer statement from transcript>",
      "signal": "<which competency this tests and what signal the answer sent>",
      "what_they_should_have_said": "<exact script they should have used in that moment>"
    }
  ]
}

Rules:
- Strengths: specific things the ${participantRole} actually said or demonstrated. Do NOT list generic praise. Return empty array if none.
- Weaknesses: specific gaps tied to actual transcript moments. Reference quotes or turns.
- Missed opportunities: specific competencies the ${participantRole} failed to demonstrate when the question invited it.
- Coaching recommendations: actionable advice that addresses the specific weaknesses found.

COACHING MOMENTS rules:
- Pick 3-5 real moments where the interviewer asked something that invited a competency to be shown.
- For each, identify which competency was being tested and how the ${participantRole}'s answer scored on it.
- Provide an exact script the ${participantRole} should have used — word-for-word, not generic tips.
- Be honest and specific. Reference actual moments from the transcript.`;
  },

  buildJsonShape() {
    return `{
  "overall_score": number,
  "star_breakdown": {
    ${STAR_DIMENSIONS.map(d => `"${d.label}": number`).join(",\n    ")}
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missed_opportunities": ["..."],
  "recommendations": ["..."],
  "discovery_coverage": { ${STAR_COVERAGE_STEPS.map(s => `"${s.key}": boolean`).join(", ")} }
}`;
  },

  buildEvaluationInstructions(participantRole: string) {
    const dims = STAR_DIMENSIONS.map((d, i) => `${i + 1}. ${d.label} (${Math.round(d.weight * 100)}%): ${d.description}`).join("\n");
    const weights = STAR_DIMENSIONS.map(d => `${d.label} ${Math.round(d.weight * 100)}%`).join(", ");
    return `EVALUATE on 7 behavioural competencies. Start each at 0 and award points ONLY when the ${participantRole}'s own words provide clear evidence. Silence, greetings, and generic talk must score 0.

Strict scoring scale:
- 0: No evidence of this competency.
- 20-40: Vague or surface mention — no concrete example.
- 50-70: Clear example — missing depth, specificity, or measurable outcome.
- 80-100: Strong, specific example with a meaningful, concrete outcome.

Competencies:
${dims}

OVERALL_SCORE: weighted average (0-100). Weights: ${weights}.
STRENGTHS: Specific demonstrations (max 3). Must be grounded in the transcript.
WEAKNESSES: Specific gaps or missed showings (max 5). Reference actual turns.
MISSED_OPPORTUNITIES: Competencies the ${participantRole} failed to demonstrate when the question invited it (max 5).
RECOMMENDATIONS: Actionable coaching targeting the specific weaknesses found (max 5).
DISCOVERY_COVERAGE: Which of the 7 competency areas were evidenced (true/false).
  Steps: ${STAR_COVERAGE_STEPS.map(s => s.key).join(", ")}`;
  },

  normalizeBreakdown(raw: Record<string, unknown>) {
    const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const rb = (raw.breakdown ?? raw.star_breakdown ?? raw) as Record<string, unknown>;
    return {
      competency_strategic_thinking: clamp(rb["Strategic Thinking"] ?? rb["competency_strategic_thinking"] ?? 0),
      autonomy_under_complexity: clamp(rb["Autonomy Under Complexity"] ?? rb["autonomy_under_complexity"] ?? 0),
      leverage_without_authority: clamp(rb["Leverage Without Authority"] ?? rb["leverage_without_authority"] ?? 0),
      collaboration: clamp(rb["Collaboration"] ?? rb["collaboration"] ?? 0),
      candour_self_correction: clamp(rb["Candour & Self-Correction"] ?? rb["candour_self_correction"] ?? 0),
      counterfeit_recognition: clamp(rb["Counterfeit Recognition"] ?? rb["counterfeit_recognition"] ?? 0),
      vision_adjustment: clamp(rb["Vision Adjustment"] ?? rb["vision_adjustment"] ?? 0),
    };
  },

  computeOverall(breakdown: Record<string, number>) {
    return Math.round(
      STAR_DIMENSIONS.reduce((sum, d) => sum + (breakdown[d.key] ?? 0) * d.weight, 0)
    );
  },
};

// ────────────────────────────────────────────────────────────
// Scenario Type → Framework Mapping
// ────────────────────────────────────────────────────────────

const INTERVIEW_SCENARIO_TYPES = new Set([
  "First Round Interview",
  "Product Knowledge Interview",
]);

const FRAMEWORK_BY_ID: Record<string, EvaluationFramework> = {
  meddic: MEDDIC,
  star: STAR,
};

/**
 * Get the evaluation framework for a given scenario type.
 * Falls back to MEDDIC for any unrecognized type.
 */
export function getFramework(scenarioType?: string): EvaluationFramework {
  if (!scenarioType) return MEDDIC;
  if (INTERVIEW_SCENARIO_TYPES.has(scenarioType)) return STAR;
  return MEDDIC;
}

/**
 * Get a framework by its id (e.g. "meddic", "star").
 * Falls back to MEDDIC.
 */
export function getFrameworkById(id?: string): EvaluationFramework {
  if (!id) return MEDDIC;
  return FRAMEWORK_BY_ID[id.toLowerCase()] ?? MEDDIC;
}

/**
 * Resolve framework from either the scenario's evaluation_framework field
 * or the scenario_type. The evaluation_framework field takes precedence.
 */
export function resolveFramework(
  scenarioType?: string,
  evaluationFramework?: string
): EvaluationFramework {
  if (evaluationFramework) {
    const normalized = evaluationFramework.toLowerCase();
    if (normalized.includes("star")) return STAR;
    if (normalized.includes("meddic")) return MEDDIC;
  }
  return getFramework(scenarioType);
}

export { MEDDIC, STAR };
