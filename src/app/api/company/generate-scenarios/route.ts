import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CompanyProfile {
  company_name: string;
  tagline: string;
  website_url?: string;
  product_deep_dive?: {
    overview: string;
    key_features: string[];
    how_it_works: string;
    pricing_model: string;
    ideal_customer_profile: string;
  };
  industries_served?: string[];
  target_customer_segments?: Array<{ segment: string; company_size: string; use_case: string }>;
  pain_points_solved: string[];
  current_process_problems: string[];
  value_propositions: string[];
  common_objections?: Array<{ objection: string; underlying_concern: string; handling_approach: string }>;
  competitive_landscape?: {
    primary_competitors: string[];
    key_differentiators: string[];
    why_customers_switch: string;
  };
  buyer_personas: Array<{
    name: string;
    full_role?: string;
    role?: string;
    company_type?: string;
    industry: string;
    age_approx?: string;
    personality: string;
    communication_style?: string;
    pain_points: string[];
    goals: string[];
    hidden_concerns?: string;
    prior_experience?: string;
    budget_authority?: string;
    decision_timeline?: string;
    decision_criteria?: string[];
    objections_they_raise?: string[];
    opening_line?: string;
    background_context?: string;
  }>;
  customer_testimonials?: Array<{
    customer_name?: string;
    customer_company?: string;
    quote: string;
    before_state: string;
    after_state: string;
    source: string;
  }>;
  sales_scenario_seeds?: Array<{
    scenario_type: string;
    buyer_persona: string;
    setup: string;
    buyer_opening: string;
    seller_goal: string;
    hidden_challenges: string[];
  }>;
  industry_dynamics?: {
    market_trend: string;
    regulatory_factors: string;
    buying_cycle: string;
    budget_seasonality: string;
  };
}

function buildPersonaFromProfile(persona: CompanyProfile["buyer_personas"][0]): Record<string, unknown> {
  const role = persona.full_role || persona.role || "Decision Maker";
  return {
    name: persona.name,
    jobTitle: role,
    company: persona.company_type ? persona.company_type.split(",")[0].trim() : "Their Company",
    industry: persona.industry,
    personality: persona.personality,
    painPoints: persona.pain_points,
    goals: persona.goals,
    communicationStyle: persona.communication_style || "Skeptical, direct, guards information until trust is earned",
    hiddenConcern: persona.hidden_concerns || "Worried about making a wrong decision that could cost them their job or credibility",
    decisionCriteria: persona.decision_criteria?.join("; ") || "ROI, ease of implementation, low risk",
    priorVendorExperience: persona.prior_experience || "Has evaluated or used competitor solutions with mixed results",
    budgetStatus: persona.budget_authority || "Has budget authority for this category",
    sampleDialogues: persona.opening_line ? `Buyer: "${persona.opening_line}"` : undefined,
  };
}

function generateProductKnowledgeScenario(profile: CompanyProfile, avatarId: string, voiceId: string) {
  const company = profile.company_name;
  const productInfo = profile.product_deep_dive;
  const overview = productInfo?.overview || profile.tagline;
  const features = productInfo?.key_features?.join("; ") || "";
  const howItWorks = productInfo?.how_it_works || "";
  const pricing = productInfo?.pricing_model || "";
  const idealCustomer = productInfo?.ideal_customer_profile || "";
  const competitors = profile.competitive_landscape?.primary_competitors?.join(", ") || "";
  const differentiators = profile.competitive_landscape?.key_differentiators?.join("; ") || "";
  const currentProblems = profile.current_process_problems;
  const painPoints = profile.pain_points_solved;

  const contextNote = `PRODUCT KNOWLEDGE INTERVIEW FOR ${company.toUpperCase()}

COMPANY: ${company}
WHAT THEY DO: ${overview}
KEY FEATURES: ${features}
HOW IT WORKS: ${howItWorks}
PRICING: ${pricing}
IDEAL CUSTOMER: ${idealCustomer}

PROBLEMS THEY SOLVE:
${painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

CUSTOMER BEFORE STATE (PAINFUL MANUAL PROCESSES):
${currentProblems.map((p, i) => `${i + 1}. ${p}`).join("\n")}

COMPETITIVE LANDSCAPE:
Competitors: ${competitors}
Differentiators: ${differentiators}

You are an HR interviewer testing whether the candidate deeply understands this business.`;

  const interviewerPrompt = `You are ${company}'s Head of Sales Enablement conducting a Product Knowledge Interview.
Your job: test if the candidate truly understands ${company}'s product, market, and customers.

BEHAVIOR:
- Professional but challenging. You respect deep knowledge and call out shallow answers.
- Ask follow-up questions when answers are vague or generic.
- Reference specific features, competitors, and customer pain points from your knowledge base.
- If they give a surface-level answer, probe deeper: "How exactly does that work?" or "Can you give me a specific example?"
- Test their understanding of the competitive landscape — who they compete with and why customers choose ${company}.

STARTING APPROACH:
Introduce yourself briefly, then ask the candidate to explain what ${company} does and who it's for. Based on their answer, dig into specifics.

KNOWLEDGE BASE:
${contextNote}`;

  return {
    name: `${company} — Product Knowledge Interview`,
    scenario_type: "Product Knowledge Interview",
    seller_company: company,
    seller_product: productInfo?.overview || profile.tagline,
    seller_description: `${overview}. Key features: ${features}. Ideal customer: ${idealCustomer}.`,
    context_note: contextNote,
    difficulty: "Intermediate",
    duration: 10,
    custom_persona: {
      name: "Alex",
      jobTitle: "Head of Sales Enablement",
      company,
      industry: profile.industries_served?.[0] ?? "Technology",
      personality: 'Professional, structured, thorough, challenging. Values specificity over buzzwords. Has zero patience for "synergy" and "streamline operations".',
      painPoints: ["Hires sellers who can't explain the product in plain English", "Candidates memorize pitch decks but fold on follow-up questions"],
      goals: ["Assess deep product knowledge", "Test customer empathy and market awareness", "Identify candidates who can sell, not just recite"],
      communicationStyle: 'Structured interview with sharp follow-up questions. Will challenge vague claims with "Give me an example" or "How would you explain that to a skeptical CFO?"',
      hiddenConcern: "Worried that candidates are just good at interviews, not actual selling. Needs proof they understand the buyer's world.",
      decisionCriteria: "Demonstrated product expertise, concrete examples, competitive awareness, ability to handle pressure",
      sampleDialogues: currentProblems.length > 0
        ? `Interviewer: "Let's jump in. ${company} solves a specific problem. A customer told us: '${currentProblems[0]}' Walk me through exactly how our product fixes that."`
        : `Interviewer: "Explain ${company} to me like I'm a skeptical CFO who's never heard of you. What do we actually do?"`,
    } as any,
    avatar_id: avatarId,
    voice_id: voiceId,
    avatar_name: "Alex",
    scenarioTable: "custom_scenarios",
  };
}

function generateDiscoveryScenario(profile: CompanyProfile, persona: CompanyProfile["buyer_personas"][0], avatarId: string, voiceId: string) {
  const company = profile.company_name;
  const productInfo = profile.product_deep_dive;
  const opening = persona.opening_line || "I'm looking for a solution but I've heard a lot of sales pitches before.";
  const background = persona.background_context || `${persona.name} is a ${persona.full_role || persona.role} dealing with ${persona.pain_points[0] || "business challenges"}.`;

  const contextNote = `DISCOVERY CALL SCENARIO

SELLER: You represent ${company}. Your product: ${productInfo?.overview || profile.tagline}
Your goal: Understand the buyer's situation deeply enough to qualify if they're a good fit. DO NOT pitch. Ask smart questions.

BUYER: ${persona.name}, ${persona.full_role || persona.role}
${background}

PERSONALITY: ${persona.personality}
COMMUNICATION STYLE: ${persona.communication_style || "Skeptical, direct"}

PAIN POINTS:
${persona.pain_points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

GOALS:
${persona.goals.map((g, i) => `${i + 1}. ${g}`).join("\n")}

HIDDEN CONCERNS (buyer won't volunteer these):
${persona.hidden_concerns || "Worried about making the wrong choice. Needs to look competent to their boss."}

PRIOR EXPERIENCE:
${persona.prior_experience || "Has evaluated competitors but hasn't found the right fit."}

BUDGET/TIMELINE:
${persona.budget_authority || "Budget authority unclear"} | ${persona.decision_timeline || "No fixed timeline"}

DECISION CRITERIA: ${persona.decision_criteria?.join("; ") || "ROI, ease of use, risk"}

OPENING LINE: "${opening}"`;

  return {
    name: `${company} — Discovery: ${persona.name}`,
    scenario_type: "First Discovery Call",
    seller_company: company,
    seller_product: productInfo?.overview || profile.tagline,
    seller_description: `${productInfo?.overview || profile.tagline}. ${productInfo?.key_features?.join("; ") || ""}`,
    context_note: contextNote,
    difficulty: "Intermediate",
    duration: 10,
    custom_persona: buildPersonaFromProfile(persona) as any,
    avatar_id: avatarId,
    voice_id: voiceId,
    avatar_name: persona.name.split(" ")[0] || "Buyer",
    scenarioTable: "custom_scenarios",
  };
}

function generateObjectionScenario(profile: CompanyProfile, persona: CompanyProfile["buyer_personas"][0], avatarId: string, voiceId: string) {
  const company = profile.company_name;
  const productInfo = profile.product_deep_dive;
  const obj = profile.common_objections?.[0] || persona.objections_they_raise?.[0];
  const objection = obj
    ? (typeof obj === "string" ? obj : obj.objection)
    : "I'm not sure this is worth the investment.";
  const opening = persona.opening_line || `I've been looking at ${company}, but ${objection}`;

  const contextNote = `OBJECTION HANDLING SCENARIO

SELLER: You represent ${company}. Your product: ${productInfo?.overview || profile.tagline}
The buyer is interested but has a specific objection. Your job: handle it with empathy, data, and strategic reframing.

BUYER: ${persona.name}, ${persona.full_role || persona.role}
OBJECTION: "${objection}"

PERSONALITY: ${persona.personality}
COMMUNICATION STYLE: ${persona.communication_style || "Skeptical, demands proof"}

DEEPER CONTEXT:
${persona.background_context || `${persona.name} is evaluating ${company} but has concerns.`}

HIDDEN CONCERN: ${persona.hidden_concerns || "Afraid of making the wrong choice."}
PRIOR EXPERIENCE: ${persona.prior_experience || "Has been burned by overpromising vendors before."}

GOOD SELLER APPROACH:
1. Validate the concern — don't dismiss it
2. Ask clarifying questions to understand the real fear
3. Reframe using specific data, social proof, or ROI
4. Share a relevant customer story
5. Offer a low-risk next step

DO NOT:
- Get defensive
- Discount without understanding
- Use generic "trust me" language
- Rush to close before addressing the concern`;

  return {
    name: `${company} — Objection: ${persona.name.split(" ")[0] || "Buyer"}`,
    scenario_type: "Objection Handling",
    seller_company: company,
    seller_product: productInfo?.overview || profile.tagline,
    seller_description: `${productInfo?.overview || profile.tagline}`,
    context_note: contextNote,
    difficulty: "Advanced",
    duration: 10,
    custom_persona: {
      ...buildPersonaFromProfile(persona),
      personality: persona.personality + " Pushes back on unsupported claims. Demands concrete proof.",
      sampleDialogues: `Buyer: "${opening}"`,
    } as any,
    avatar_id: avatarId,
    voice_id: voiceId,
    avatar_name: persona.name.split(" ")[0] || "Buyer",
    scenarioTable: "custom_scenarios",
  };
}

function generateDemoScenario(profile: CompanyProfile, persona: CompanyProfile["buyer_personas"][0], avatarId: string, voiceId: string) {
  const company = profile.company_name;
  const productInfo = profile.product_deep_dive;
  const opening = persona.opening_line || `I've heard good things about ${company}. Show me how this actually works.`;
  const background = persona.background_context || `${persona.name} is a ${persona.full_role || persona.role} who needs to see the product in action.`;

  const contextNote = `PRODUCT DEMO SCENARIO

SELLER: You're doing a live product demo for ${company}. The buyer has specific questions and will challenge you to show value, not features.

BUYER: ${persona.name}, ${persona.full_role || persona.role}
${background}

COMMUNICATION STYLE: ${persona.communication_style || 'Wants to see the product, not hear about it. Will interrupt with "show me" requests.'}

PAIN POINTS TO ADDRESS:
${persona.pain_points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

GOALS:
${persona.goals.map((g, i) => `${i + 1}. ${g}`).join("\n")}

KEY FEATURES TO HIGHLIGHT (from product deep dive):
${productInfo?.key_features?.map((f, i) => `${i + 1}. ${f}`).join("\n") || "Key features not extracted"}

OPENING: "${opening}"

RULES FOR SELLER:
- Start by confirming what the buyer wants to see (don't assume)
- Connect every feature to a specific business outcome
- Use the buyer's actual pain points as the demo narrative
- Anticipate technical questions about integration, security, data
- Leave room for the buyer to drive — don't talk over them`;

  return {
    name: `${company} — Demo: ${persona.name.split(" ")[0] || "Buyer"}`,
    scenario_type: "Product Demo",
    seller_company: company,
    seller_product: productInfo?.overview || profile.tagline,
    seller_description: `${productInfo?.overview || profile.tagline}. ${productInfo?.how_it_works || ""}`,
    context_note: contextNote,
    difficulty: "Advanced",
    duration: 15,
    custom_persona: {
      ...buildPersonaFromProfile(persona),
      personality: persona.personality + ' Wants to see proof, not promises. Will ask "how does that work" and "what if" questions.',
      sampleDialogues: `Buyer: "${opening}"`,
    } as any,
    avatar_id: avatarId,
    voice_id: voiceId,
    avatar_name: persona.name.split(" ")[0] || "Buyer",
    scenarioTable: "custom_scenarios",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { profile, avatarId, voiceId, productType } = await req.json();
    if (!profile || !avatarId) {
      return NextResponse.json({ error: "Missing profile or avatarId" }, { status: 400 });
    }

    const scenarioProductType = productType === "eor" || productType === "cards" || productType === "payment"
      ? productType
      : "payment";

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("organization_id, full_name, role")
      .eq("id", user.id)
      .single();
    const organizationId = userProfile?.organization_id ?? null;
    const memberName = userProfile?.full_name ?? null;
    const memberRole = userProfile?.role ?? null;

    const scenarios = [];
    const personas = profile.buyer_personas?.slice(0, 2) ?? [];

    // 1. Product Knowledge Interview (like NorthPay)
    scenarios.push(generateProductKnowledgeScenario(profile, avatarId, voiceId));

    // 2. Discovery Call for first persona
    if (personas.length > 0) {
      scenarios.push(generateDiscoveryScenario(profile, personas[0], avatarId, voiceId));
    }

    // 3. Objection Handling for first persona
    if (personas.length > 0) {
      scenarios.push(generateObjectionScenario(profile, personas[0], avatarId, voiceId));
    }

    // 4. Product Demo for second persona (if exists)
    if (personas.length > 1) {
      scenarios.push(generateDemoScenario(profile, personas[1], avatarId, voiceId));
    }

    // Save to Supabase
    const dbRows = scenarios.map((s) => ({
      user_id: user.id,
      created_by: user.id,
      organization_id: organizationId,
      member_name: memberName,
      member_role: memberRole,
      name: s.name,
      scenario_type: s.scenario_type,
      product_type: scenarioProductType,
      seller_company: s.seller_company,
      seller_product: s.seller_product,
      seller_description: s.seller_description,
      difficulty: s.difficulty,
      duration: s.duration,
      context_note: s.context_note,
      custom_persona: s.custom_persona,
      preset_persona_id: null,
      avatar_id: s.avatar_id,
      avatar_name: s.avatar_name,
      voice_id: s.voice_id,
    }));

    const { data: inserted, error } = await supabase
      .from("custom_scenarios")
      .insert(dbRows)
      .select("id");

    if (error) {
      console.error("[company/generate-scenarios] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: scenarios.length,
      scenarioIds: inserted?.map((r) => r.id) ?? [],
      scenarios: scenarios.map((s) => ({ name: s.name, type: s.scenario_type })),
    });
  } catch (e: any) {
    console.error("[company/generate-scenarios] error:", e);
    return NextResponse.json({ error: e.message || "Generation failed" }, { status: 500 });
  }
}
