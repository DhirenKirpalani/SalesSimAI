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
// STAR Framework (used for interview scenarios)
// ────────────────────────────────────────────────────────────

const STAR_DIMENSIONS: FrameworkDimension[] = [
  { key: "structure", label: "Structure (STAR)", weight: 0.40, description: "Did the candidate use the STAR format (Situation, Task, Action, Result)? Were answers well-organized with all four components?" },
  { key: "specificity", label: "Specificity", weight: 0.25, description: "Were answers grounded in concrete examples with real details, metrics, and outcomes? No generic or vague statements." },
  { key: "self_awareness", label: "Self-Awareness", weight: 0.15, description: "Could they honestly discuss failures, weaknesses, and areas for growth? Did they show genuine introspection?" },
  { key: "communication", label: "Communication", weight: 0.10, description: "Was the delivery clear, concise, and confident? Appropriate answer length — not too short, not rambling." },
  { key: "motivation", label: "Motivation & Fit", weight: 0.10, description: "Did they show genuine interest in the role? Career vision aligns with the position. Thoughtful questions at the end." },
];

const STAR_COVERAGE_STEPS = [
  { key: "tell_me_about_yourself", label: "Tell Me About Yourself" },
  { key: "why_this_role", label: "Why This Role" },
  { key: "challenge_star", label: "Challenge (STAR)" },
  { key: "failure_star", label: "Failure (STAR)" },
  { key: "conflict_star", label: "Conflict (STAR)" },
  { key: "influence_star", label: "Influence (STAR)" },
  { key: "strengths_weaknesses", label: "Strengths & Weaknesses" },
  { key: "career_vision", label: "Career Vision" },
  { key: "questions_for_interviewer", label: "Questions for Interviewer" },
];

const STAR: EvaluationFramework = {
  id: "star",
  name: "STAR",
  participantRole: "candidate",
  transcriptLabel: "CANDIDATE",
  dimensions: STAR_DIMENSIONS,
  coverageSteps: STAR_COVERAGE_STEPS,

  buildSystemPrompt(participantRole: string) {
    const dims = STAR_DIMENSIONS.map(d => `- ${d.label}: ${d.description}`).join("\n");
    const weights = STAR_DIMENSIONS.map(d => `${d.label} ${Math.round(d.weight * 100)}%`).join(", ");
    return `You are an expert interview coach analyzing a behavioral interview transcript using the STAR framework. The human participant is the ${participantRole}. Score strictly. Do not give points for silence, greetings, "yes", "sounds good", or generic small talk.

STAR scoring guidance — start every dimension at 0 and award points ONLY when the ${participantRole}'s own words provide clear evidence:
- 0: No evidence the ${participantRole} addressed this dimension.
- 20-40: Weak or implicit mention (one vague reference, no concrete example).
- 50-70: Clear evidence (specific example with most STAR components present).
- 80-100: Strong evidence (complete STAR with concrete details, metrics, and clear outcomes).

Dimensions:
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
      "signal": "<what this question signals>",
      "what_they_should_have_said": "<exact script they should have used in that moment>"
    }
  ]
}

Rules for strengths, weaknesses, missed opportunities, and coaching recommendations:
- They MUST be grounded in the actual transcript and the scenario above.
- Strengths: specific things the ${participantRole} actually said or did well. Do NOT list generic advice. If there are no real strengths, return an empty array.
- Weaknesses: specific gaps or mistakes evident in the transcript. Use quotes or refer to actual turns.
- Missed opportunities: specific questions or topics the ${participantRole} failed to address at a real moment in the conversation.
- Coaching recommendations: actionable advice that directly addresses the weaknesses and missed opportunities. Do not repeat generic interview tips.

COACHING MOMENTS rules:
- Pick 3-5 real moments from the transcript where the interviewer asked something significant.
- For each, explain what signal that question sends (behavioral competency, red flag, etc.).
- Provide an exact script the ${participantRole} should have used — not generic advice, word-for-word what to say.
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
    const dims = STAR_DIMENSIONS.map((d, i) => `${i + 1}. ${d.label}: ${d.description}`).join("\n");
    const weights = STAR_DIMENSIONS.map(d => `${d.label} ${Math.round(d.weight * 100)}%`).join(", ");
    return `EVALUATE on STAR dimensions. Start each dimension at 0 and award points ONLY when the ${participantRole}'s own words in the transcript provide clear evidence. Silence, greetings, "yes", "sounds good", or generic small talk must score 0.

Use this strict scale for each dimension:
- 0: No evidence the ${participantRole} addressed this dimension.
- 20-40: Weak or implicit mention (one vague reference, no concrete example).
- 50-70: Clear evidence (specific example with most STAR components present).
- 80-100: Strong evidence (complete STAR with concrete details, metrics, and clear outcomes).

Dimensions:
${dims}

Use the SCORING RUBRIC above to judge how well the ${participantRole} hit each checkpoint. Do not give partial credit for simply talking; require evidence.

Also provide:
- OVERALL_SCORE: weighted average (0-100). Weights: ${weights}.
- STRENGTHS: Specific things the ${participantRole} actually did well (max 3). Must be grounded in the transcript. Return empty if none.
- WEAKNESSES: Specific gaps or mistakes evident in the transcript (max 5). Reference actual turns or quotes.
- MISSED_OPPORTUNITIES: Specific questions or topics the ${participantRole} failed to address at a real moment in the transcript (max 5).
- RECOMMENDATIONS: Actionable coaching tips that directly address the weaknesses and missed opportunities (max 5). Do not repeat generic interview advice.
- DISCOVERY_COVERAGE: Which of the 9 interview steps were covered (true/false)
  Steps: ${STAR_COVERAGE_STEPS.map(s => s.key).join(", ")}`;
  },

  normalizeBreakdown(raw: Record<string, unknown>) {
    const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const rb = (raw.breakdown ?? raw.star_breakdown ?? raw) as Record<string, unknown>;
    return {
      structure: clamp(rb["Structure (STAR)"] ?? rb["structure"] ?? 0),
      specificity: clamp(rb["Specificity"] ?? rb["specificity"] ?? 0),
      self_awareness: clamp(rb["Self-Awareness"] ?? rb["self_awareness"] ?? 0),
      communication: clamp(rb["Communication"] ?? rb["communication"] ?? 0),
      motivation: clamp(rb["Motivation & Fit"] ?? rb["motivation"] ?? 0),
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
