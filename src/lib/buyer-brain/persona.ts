import { CustomPersona } from "@/types";

/**
 * Builds the buyer identity section of the system prompt.
 */
export function buildPersonaSection(persona: CustomPersona): string {
  const lines: string[] = [];

  if (persona.personalityTraits?.length) {
    lines.push(`BEHAVIOUR: ${persona.personalityTraits.join(". ")}.`);
  } else if (persona.personality) {
    lines.push(`PERSONALITY: ${persona.personality}`);
  }

  if (persona.painPointsCurrentProcess || persona.painPointsImpact) {
    lines.push("");
    lines.push("YOUR CURRENT SITUATION:");
    if (persona.painPointsCurrentProcess) {
      lines.push(`Process: ${persona.painPointsCurrentProcess}`);
    }
    if (persona.painPointsImpact) {
      lines.push(`Impact: ${persona.painPointsImpact}`);
    }
    if (persona.painPoints?.length) {
      lines.push(`Also: ${persona.painPoints.join("; ")}`);
    }
  } else if (persona.painPoints?.length) {
    lines.push(`PAIN POINTS: ${persona.painPoints.join("; ")}`);
  }

  if (persona.companyGoal || persona.personalMotivation) {
    lines.push("");
    lines.push("YOUR GOALS:");
    if (persona.companyGoal) lines.push(`Company: ${persona.companyGoal}`);
    if (persona.personalMotivation) lines.push(`Personal: ${persona.personalMotivation}`);
    if (persona.goals?.length) {
      lines.push(`Other: ${persona.goals.join("; ")}`);
    }
  } else if (persona.goals?.length) {
    lines.push(`GOALS: ${persona.goals.join("; ")}`);
  }

  if (persona.communicationStyle || persona.communicationLanguage) {
    lines.push("");
    lines.push("HOW YOU COMMUNICATE:");
    if (persona.communicationLanguage) lines.push(`Environment: ${persona.communicationLanguage}`);
    if (persona.communicationStyle) lines.push(`Style: ${persona.communicationStyle}`);
  }

  if (persona.priorVendorExperience) lines.push(`\nPRIOR VENDOR EXPERIENCE: ${persona.priorVendorExperience}`);
  if (persona.decisionCriteria) lines.push(`DECISION CRITERIA: ${persona.decisionCriteria}`);
  if (persona.hiddenConcern) lines.push(`HIDDEN CONCERN: ${persona.hiddenConcern}`);
  if (persona.budgetStatus) lines.push(`BUDGET: ${persona.budgetStatus}`);
  if (persona.timelinePressure) lines.push(`TIMELINE: ${persona.timelinePressure}`);
  if (persona.sampleDialogues) lines.push(`\nSAMPLE DIALOGUES:\n${persona.sampleDialogues}`);

  return lines.join("\n");
}
