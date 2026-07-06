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
}

interface GeneratedScenario {
  seller_company: string;
  seller_product: string;
  product_type: "payment" | "eor" | "cards";
  seller_description: string;
  scenario_type: string;
  difficulty: string;
  duration: number;
  context_note: string;
  custom_persona: Record<string, unknown>;
  avatar_name: string;
  avatar_id: string;
  voice_id: string;
  evaluation_framework: string;
  scoring_criteria: string;
}

const SCENARIO_GENERATION_PROMPT = `You are an expert sales enablement AI. You have a structured company profile extracted from a B2B company's website and documents. Create 3 distinct, highly realistic sales simulation scenarios for a seller to practice against. Each scenario must have a different context, buyer persona, and sales situation — all grounded in the company profile.

Return ONLY valid JSON in this exact shape:

{
  "scenarios": [
    {
      "seller_company": "<company name>",
      "seller_product": "<short product description>",
      "product_type": "<one of: payment, eor, cards>",
      "seller_description": "<2-3 sentence description for the AI seller to understand what they are selling. Include ideal customer, key value, and differentiation.>",
      "scenario_type": "<one of: First Discovery Call, Objection Handling, Product Demo, Negotiation, Executive Presentation>",
      "difficulty": "<Beginner|Intermediate|Advanced|Expert>",
      "duration": <5|10|15|20>,
      "context_note": "<Detailed scenario briefing for the AI buyer. Include: what the seller represents, buyer situation, goals, pain points, what to ask, what NOT to do.>",
      "custom_persona": {
        "name": "<first name only>",
        "jobTitle": "<specific role>",
        "company": "<real buyer company name — e.g. BloomCommerce, Vertex Logistics, Northwind Payments. Must be different for each scenario.>",
        "industry": "<industry>",
        "personality": "<rich personality description>",
        "painPoints": ["<pain 1>", "<pain 2>"],
        "goals": ["<goal 1>", "<goal 2>"],
        "communicationStyle": "<how they speak>",
        "hiddenConcern": "<what they won't say out loud>",
        "decisionCriteria": "<how they decide>",
        "priorVendorExperience": "<what they've tried before>",
        "budgetStatus": "<budget authority>",
        "meetingSource": "<how the meeting was booked — e.g. Inbound demo request from website, Warm referral from existing customer, Met at fintech conference, LinkedIn outreach, SDR cold call, Partner introduction>",
        "sampleDialogues": "Buyer: \"<opening line>\""
      },
      "avatar_name": "<matching first name from persona.name>",
      "evaluation_framework": "<one of: MEDDIC, BANT, SPIN, Challenger, Sandler, ValueSelling, or Standard>",
      "scoring_criteria": "<5-7 checkpoint rubric the seller will be judged against. Use the chosen framework. Each checkpoint must be a concrete, observable behavior. Format as numbered list.>"
    }
  ]
}

Rules for the 3 scenarios:
- Read the company profile deeply. Use the specific products, use cases, pain_points_solved, target_customer_segments, and buyer_personas found in the profile to decide what scenarios to create.
- Each of the 3 scenarios must be a DIFFERENT scenario_type and must map to a DIFFERENT real use case or product angle from the company profile. Do not default to generic Discovery/ Objection/ Demo unless the profile truly supports only those.
- Choose scenario types that fit the use cases found on the website. Examples:
  * If the site highlights "hiring remote teams in APAC" → create a scenario around global EOR/onboarding.
  * If the site highlights "multi-country payroll consolidation" → create a scenario around payroll consolidation.
  * If the site highlights "benefits & compliance" → create a scenario around compliance or benefits negotiation.
  * If the site highlights "expense management" → create a scenario around expense/cards rollout.
- For each scenario, pick the scenario_type that best fits that use case: First Discovery Call, Objection Handling, Product Demo, Negotiation, Executive Presentation, Renewal, or Win-Back.
- Ensure the 3 scenarios cover different stages of the sales cycle where possible (e.g. one early discovery, one mid-cycle demo/objection, one late-stage negotiation/executive), but only if the profile supports it.
- Each scenario must use a DIFFERENT buyer persona (different role, name, personality, goals, pain points, and company). Use the buyer_personas from the profile if available; otherwise infer realistic personas from target_customer_segments.
- Each scenario must have a DIFFERENT real buyer company name. Do not use generic placeholders like "Their Company" or "Buyer Inc". Use realistic B2B company names relevant to the industry and use case.
- meetingSource must be realistic and specific to the buyer persona and company.
- Choose an evaluation framework that fits the scenario type and use case. Discovery = BANT or SPIN. Objection = Challenger or Sandler. Demo/Negotiation/Executive = MEDDIC or ValueSelling.
- scoring_criteria must be a concrete rubric with 5-7 observable checkpoints tied to the specific use case and framework. Each checkpoint should describe what the seller must DO or SAY to earn it. Avoid vague phrases like "build rapport".
- Each context_note must be rich and specific to the company. Reference real competitors, features, use cases, and pain points from the profile. Avoid generic language.
- product_type should be the best guess from: payment (fintech/payroll/expense), eor (global hiring/HR), cards (corporate cards/expense). If unsure, use "payment".
- Make the buyers skeptical, realistic, and hard to sell to. Do not make them too easy.`;

async function extractProfileFromUrls(urls: string[], reqOrigin: string): Promise<{ profile: CompanyProfile | null; error?: string }> {
  if (urls.length === 0) return { profile: null, error: "No URLs in knowledge base. Add website URLs in Company Knowledge page first." };
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || reqOrigin;
    const res = await fetch(`${baseUrl}/api/company/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urls[0], urls }),
    });
    const data = await res.json();
    if (!res.ok) return { profile: null, error: data.error || "Extraction failed" };
    return { profile: data.data };
  } catch (e: any) {
    return { profile: null, error: e.message || "Extraction failed" };
  }
}

async function generateScenariosWithLLM(profile: CompanyProfile): Promise<GeneratedScenario[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SCENARIO_GENERATION_PROMPT },
        { role: "user", content: `COMPANY PROFILE:\n${JSON.stringify(profile, null, 2)}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 4500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  const scenarios = Array.isArray(parsed.scenarios) ? parsed.scenarios : [];
  if (scenarios.length === 0) throw new Error("LLM did not return any scenarios");
  return scenarios as GeneratedScenario[];
}

export async function POST(req: NextRequest) {
  try {
    const { avatarId, voiceId } = await req.json();
    const finalAvatarId = avatarId || process.env.LIVEAVATAR_AVATAR_ID;
    if (!finalAvatarId) return NextResponse.json({ error: "No avatar available. Set LIVEAVATAR_AVATAR_ID env var or select an avatar." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    const organizationId = userProfile?.organization_id ?? null;
    if (!organizationId) return NextResponse.json({ error: "Not in an organization" }, { status: 400 });

    // Get organization profile and source URLs
    const { data: org } = await supabase
      .from("organizations")
      .select("profile_data, source_urls")
      .eq("id", organizationId)
      .single();

    let profile = org?.profile_data as CompanyProfile | null;
    let extractedFromUrls = false;

    if (!profile) {
      const urls = (org?.source_urls as string[] | null) ?? [];
      const reqOrigin = new URL(req.url).origin;
      const extracted = await extractProfileFromUrls(urls, reqOrigin);
      if (extracted.error) return NextResponse.json({ error: extracted.error }, { status: 400 });
      if (!extracted.profile) return NextResponse.json({ error: "Could not extract profile from knowledge base" }, { status: 400 });
      profile = extracted.profile;
      extractedFromUrls = true;

      // Save the extracted profile for future use
      await supabase.from("organizations").update({ profile_data: profile }).eq("id", organizationId);
    }

    const generated = await generateScenariosWithLLM(profile);
    const scenariosWithAvatar = generated.map((s) => ({
      ...s,
      avatar_id: finalAvatarId,
      voice_id: voiceId || null,
    }));

    return NextResponse.json({
      success: true,
      data: scenariosWithAvatar,
      profile,
      extractedFromUrls,
    });
  } catch (e: any) {
    console.error("[api/scenarios/generate-from-kb] error:", e);
    return NextResponse.json({ error: e.message || "Generation failed" }, { status: 500 });
  }
}
