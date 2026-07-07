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

interface GeneratedPersona {
  name: string;
  jobTitle: string;
  company: string;
  industry: string;
  personality: string;
  personalityTraits: string;
  painPoints: string[];
  painPointsCurrentProcess: string;
  painPointsImpact: string;
  goals: string[];
  companyGoal: string;
  personalMotivation: string;
  communicationStyle: string;
  communicationLanguage: string;
  priorVendorExperience: string;
  decisionCriteria: string;
  hiddenConcern: string;
  meetingSource: string;
  budgetStatus: string;
  timelinePressure: string;
  sampleDialogues: string;
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
  custom_persona: GeneratedPersona;
  avatar_name: string;
  avatar_id: string;
  voice_id: string;
  voice_avatar_image_url?: string;
  elevenlabs_voice_id?: string;
  evaluation_framework: string;
  custom_evaluation_framework: string;
  scoring_criteria: string;
}

const SCENARIO_GENERATION_PROMPT = `You are an expert sales enablement AI. You receive two sources:
1. WEBSITE CONTEXT: structured seller company/product context extracted from the vendor's website.
2. UPLOADED DOCUMENTS (PRIMARY SOURCE): raw documents, likely containing the buyer persona, buyer knowledge, buyer behavior, and scenario brief for a sales simulation.

Create 3 distinct, highly realistic sales simulation scenarios for a seller to practice against.

CRITICAL INSTRUCTIONS:
- The UPLOADED DOCUMENTS are the PRIMARY source for the buyer persona, buyer behavior, scenario context, and any hidden facts or disclosure rules. Use them as the authority for who the buyer is, what they know, how they behave, and what scenario to run.
- The WEBSITE CONTEXT is ADDITIONAL context about the seller/vendor company and product. Use it to ground the seller_company, seller_product, seller_description, value propositions, and differentiation.
- If the documents define a specific buyer (name, role, company, situation, fears, criteria), use that buyer directly. Do not invent a different buyer.
- If the documents define a specific scenario type or sales situation, use it. Do not override it with generic website-derived scenarios.
- Read the documents deeply. Buyer knowledge, behavior rules, disclosure ladders, voice samples, and scenario briefs are all valid content to extract from.
- If documents include instructions like "this is your memory" or "do not volunteer," treat those as behavior rules for the buyer, not as seller facts.

Return ONLY valid JSON in this exact shape:

{
  "scenarios": [
    {
      "seller_company": "<company name from profile>",
      "seller_product": "<short product description>",
      "product_type": "<one of: payment, eor, cards>",
      "seller_description": "<2-3 sentence description for the AI seller. Include ideal customer, key value, differentiation, and a specific use case from the profile.>",
      "scenario_type": "<one of: First Discovery Call, Objection Handling, Product Demo, Negotiation, Executive Presentation, Renewal, Win-Back, Pitch, Product Knowledge Interview, Global EOR Onboarding, Multi-Country Payroll Rollout, Compliance & Benefits Review, Expense & Cards Rollout, Remote Team Expansion>",
      "difficulty": "<Beginner|Intermediate|Advanced|Expert>",
      "duration": <5|10|15|20>,
      "context_note": "<Detailed scenario briefing for the AI buyer. Include: what the seller represents, buyer situation, goals, pain points, what to ask, what NOT to do, and specific company/product references.>",
      "custom_persona": {
        "name": "<first name only>",
        "jobTitle": "<specific role, e.g. VP of Finance, Global HR Director, CFO>",
        "company": "<real buyer company name — e.g. BloomCommerce, Vertex Logistics, Northwind Payments. Must be DIFFERENT for each scenario.>",
        "industry": "<specific industry>",
        "personality": "<rich personality description, 2-3 sentences>",
        "personalityTraits": "<3-4 bullet traits that define how this buyer behaves in the call>",
        "painPoints": ["<specific business pain 1>", "<specific business pain 2>"],
        "painPointsCurrentProcess": "<describe the painful manual process this buyer endures today. Be specific with tools, time, and frustration.>",
        "painPointsImpact": "<what the pain costs them — money, time, risk, missed opportunities.>",
        "goals": ["<specific business goal 1>", "<specific business goal 2>"],
        "companyGoal": "<what their company is trying to achieve this quarter/year that this purchase relates to.>",
        "personalMotivation": "<what this buyer personally cares about — their career pressure, KPI, or reputation.>",
        "communicationStyle": "<how they speak in meetings — direct, skeptical, chatty, formal, numbers-driven, etc.>",
        "communicationLanguage": "<specific phrases, jargon, or tone they use.>",
        "priorVendorExperience": "<what they've tried before and why it failed or fell short.>",
        "decisionCriteria": "<how they will decide — what proof points, process, and stakeholders matter.>",
        "hiddenConcern": "<what they won't say out loud but is driving their skepticism.>",
        "meetingSource": "<how the meeting was booked — e.g. Inbound demo request from website, Warm referral from existing customer, Met at fintech conference, LinkedIn outreach, SDR cold call, Partner introduction. Make it specific.>",
        "budgetStatus": "<budget authority and constraints — e.g. 'Can approve up to $50K; above needs CFO sign-off.'>",
        "timelinePressure": "<decision timeline — e.g. 'Needs to go live in 6 weeks before APAC expansion.'>",
        "sampleDialogues": "<2-3 realistic lines the buyer might say at the start of the call or when pushed. Format as Buyer: \"...\" Seller: \"...\" Buyer: \"...\"""
      },
      "avatar_name": "<matching first name from custom_persona.name>",
      "voice_avatar_image_url": "",
      "elevenlabs_voice_id": "",
      "evaluation_framework": "<one of: MEDDIC, BANT, SPIN, Challenger, Sandler, ValueSelling, Standard>",
      "custom_evaluation_framework": "",
      "scoring_criteria": "<5-7 checkpoint rubric the seller will be judged against. Use the chosen framework. Each checkpoint must be a concrete, observable behavior. Format as numbered list.>"
    }
  ]
}

Rules for the 3 scenarios:
- Read BOTH the company profile AND the uploaded documents deeply. Use the specific products, use cases, pain_points_solved, target_customer_segments, and buyer_personas found in the sources to decide what scenarios to create.
- Each of the 3 scenarios must be a DIFFERENT scenario_type and must map to a DIFFERENT real use case or product angle from the sources. Do not default to generic Discovery/ Objection/ Demo unless the sources truly support only those.
- Choose scenario types that fit the use cases found. Examples:
  * If the source highlights "hiring remote teams in APAC" → create a Global EOR Onboarding scenario.
  * If the source highlights "multi-country payroll consolidation" → create a Multi-Country Payroll Rollout scenario.
  * If the source highlights "benefits & compliance" → create a Compliance & Benefits Review scenario.
  * If the source highlights "expense management" → create an Expense & Cards Rollout scenario.
- Ensure the 3 scenarios cover different stages of the sales cycle where possible (e.g. one early discovery, one mid-cycle demo/objection, one late-stage negotiation/executive), but only if the sources support it.
- Each scenario must use a DIFFERENT buyer persona (different role, name, personality, goals, pain points, and company). Use the buyer_personas from the profile if available; otherwise infer realistic personas from target_customer_segments and document content.
- Each scenario must have a DIFFERENT real buyer company name. Do not use generic placeholders like "Their Company" or "Buyer Inc". Use realistic B2B company names relevant to the industry and use case.
- meetingSource must be realistic and specific to the buyer persona and company.
- Choose an evaluation framework that fits the scenario type and use case. Discovery = BANT or SPIN. Objection = Challenger or Sandler. Demo/Negotiation/Executive = MEDDIC or ValueSelling. If none fit, use Standard.
- scoring_criteria must be a concrete rubric with 5-7 observable checkpoints tied to the specific use case and framework. Each checkpoint should describe what the seller must DO or SAY to earn it. Avoid vague phrases like "build rapport".
- Each context_note must be rich and specific. Reference real competitors, features, use cases, and pain points from the sources. Avoid generic language.
- product_type should be the best guess from: payment (fintech/payroll/expense), eor (global hiring/HR), cards (corporate cards/expense). If unsure, use "payment".
- Make the buyers skeptical, realistic, and hard to sell to. Do not make them too easy.
- Every field in the JSON must be filled with a non-empty value. Leave no blank strings except voice_avatar_image_url and elevenlabs_voice_id which the UI will set later.
- Use the exact JSON keys shown above. Do not rename them.`;

async function extractProfileFromUrls(urls: string[], reqOrigin: string): Promise<{ profile: CompanyProfile | null; error?: string }> {
  if (urls.length === 0) return { profile: null, error: "No URLs in knowledge base." };
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

const DOCUMENT_EXTRACTION_PROMPT = `You are an expert B2B sales intelligence analyst. You have content from uploaded company documents (sales decks, pitch decks, case studies, product sheets, etc.). Build a COMPREHENSIVE company profile comparable to a manually researched sales playbook.

Return ONLY valid JSON in this exact shape:

{
  "company_name": "<exact company name or infer from documents>",
  "tagline": "<specific one-liner>",
  "website_url": "",
  "product_deep_dive": {
    "overview": "<2-3 sentences on what the product does>",
    "key_features": ["<feature 1>", "<feature 2>", "<feature 3>"],
    "how_it_works": "<step-by-step customer journey>",
    "pricing_model": "<how they charge>",
    "ideal_customer_profile": "<specific customer size, stage, industry>"
  },
  "industries_served": ["<industry 1>", "<industry 2>"],
  "target_customer_segments": [
    { "segment": "<segment>", "company_size": "<size>", "use_case": "<why they buy>" }
  ],
  "pain_points_solved": ["<pain 1>", "<pain 2>", "<pain 3>"],
  "current_process_problems": ["<before-state 1>", "<before-state 2>"],
  "value_propositions": ["<value prop 1>", "<value prop 2>"],
  "common_objections": [
    { "objection": "<objection>", "underlying_concern": "<concern>", "handling_approach": "<how to handle>" }
  ],
  "competitive_landscape": {
    "primary_competitors": ["<competitor 1>", "<competitor 2>"],
    "key_differentiators": ["<differentiator 1>", "<differentiator 2>"],
    "why_customers_switch": "<reason>"
  },
  "buyer_personas": [
    {
      "name": "<first name only>",
      "full_role": "<specific title>",
      "company_type": "<e.g. 'Fast-growing D2C brand, $5M revenue'>",
      "industry": "<industry>",
      "age_approx": "<e.g. 35-45>",
      "personality": "<rich description>",
      "communication_style": "<how they speak>",
      "pain_points": ["<pain 1>", "<pain 2>"],
      "goals": ["<goal 1>", "<goal 2>"],
      "hidden_concerns": "<what they won't say>",
      "prior_experience": "<what they've tried>",
      "budget_authority": "<budget authority>",
      "decision_timeline": "<timeline>",
      "decision_criteria": ["<criterion 1>", "<criterion 2>"],
      "objections_they_raise": ["<objection 1>", "<objection 2>"],
      "opening_line": "<buyer opening line>",
      "background_context": "<scene setting>"
    }
  ]
}

Rules:
- Be SPECIFIC and CONCRETE. Avoid generic phrases.
- Pain points must describe real activities with tools, time, and frustration.
- Buyer personas must feel like real people with contradictions and pressures.
- Include at least 2 detailed buyer personas.
- If information is missing, infer reasonable specifics from the document context and industry.`;

async function extractProfileFromDocuments(documents: { name: string; content: string }[]): Promise<CompanyProfile | null> {
  if (documents.length === 0) return null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const combinedText = documents.map((d) => `--- ${d.name} ---\n${d.content}`).join("\n\n");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: DOCUMENT_EXTRACTION_PROMPT },
          { role: "user", content: `DOCUMENT CONTENT:\n${combinedText.slice(0, 16000)}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });
    if (!res.ok) {
      console.error("[extractProfileFromDocuments] OpenAI error:", await res.text());
      return null;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(content) as CompanyProfile;
  } catch (e: any) {
    console.error("[extractProfileFromDocuments] error:", e);
    return null;
  }
}

async function fetchOrgDocuments(supabase: any, organizationId: string): Promise<{ name: string; content: string }[]> {
  const { data: docs, error } = await supabase
    .from("company_documents")
    .select("name, content")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[generate-from-kb] document fetch error:", error);
    return [];
  }
  return (docs ?? []).filter((d: any) => typeof d.content === "string" && d.content.trim().length > 50);
}

async function generateScenariosWithLLM(
  websiteProfile: CompanyProfile | null,
  documentsText: string
): Promise<GeneratedScenario[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const userContent = [
    websiteProfile
      ? "WEBSITE CONTEXT (seller company / product):\n" + JSON.stringify(websiteProfile, null, 2)
      : "WEBSITE CONTEXT: none provided.",
    "",
    "UPLOADED DOCUMENTS (PRIMARY SOURCE — buyer persona, buyer behavior, scenario brief, hidden facts):",
    documentsText || "No documents uploaded.",
  ].join("\n");

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
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 8000,
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
    const { avatarId, voiceId, selectedUrls, selectedDocIds } = await req.json();
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

    // Get organization data
    const { data: org } = await supabase
      .from("organizations")
      .select("profile_data, source_urls")
      .eq("id", organizationId)
      .single();

    // Fetch uploaded documents for this org only
    const allDocuments = await fetchOrgDocuments(supabase, organizationId);
    const selectedDocuments = Array.isArray(selectedDocIds) && selectedDocIds.length > 0
      ? allDocuments.filter((d) => selectedDocIds.includes(d.name))
      : allDocuments;
    const documentsText = selectedDocuments.map((d) => `--- ${d.name} ---\n${d.content}`).join("\n\n");

    const allUrls = (org?.source_urls as string[] | null) ?? [];
    const urlsToUse = Array.isArray(selectedUrls) && selectedUrls.length > 0
      ? selectedUrls
      : allUrls;

    // Use cached profile only if no explicit selection was made (so cache is not stale)
    const hasExplicitSelection = (Array.isArray(selectedUrls) && selectedUrls.length > 0) ||
      (Array.isArray(selectedDocIds) && selectedDocIds.length > 0);
    let cachedProfile = hasExplicitSelection ? null : (org?.profile_data as CompanyProfile | null);
    let websiteProfile: CompanyProfile | null = null;
    let extractedFromUrls = false;
    let extractedFromDocuments = false;

    // Documents are the primary source for buyer persona/scenario.
    // URLs provide additional seller company/product context (website profile).
    // If only documents are selected, fall back to extracting a profile from the documents for backward compatibility.
    if (urlsToUse.length > 0) {
      // Prefer cached profile if it matches the full URL set and no explicit selection was made
      if (cachedProfile) {
        websiteProfile = cachedProfile;
      } else {
        const reqOrigin = new URL(req.url).origin;
        const extracted = await extractProfileFromUrls(urlsToUse, reqOrigin);
        if (extracted.error) return NextResponse.json({ error: extracted.error }, { status: 400 });
        if (!extracted.profile) return NextResponse.json({ error: "Could not extract profile from selected website URLs" }, { status: 400 });
        websiteProfile = extracted.profile;
        extractedFromUrls = true;
      }
    }

    if (!websiteProfile && selectedDocuments.length > 0) {
      const docProfile = await extractProfileFromDocuments(selectedDocuments);
      if (!docProfile) return NextResponse.json({ error: "Could not extract profile from selected documents" }, { status: 400 });
      websiteProfile = docProfile;
      extractedFromDocuments = true;
    }

    if (!websiteProfile && selectedDocuments.length === 0) {
      return NextResponse.json({ error: "No knowledge base content selected. Select at least one URL or document." }, { status: 400 });
    }

    // Save the extracted profile for future use only when using the full knowledge base
    if (!hasExplicitSelection && websiteProfile) {
      await supabase.from("organizations").update({ profile_data: websiteProfile }).eq("id", organizationId);
    }

    const generated = await generateScenariosWithLLM(websiteProfile, documentsText);
    const scenariosWithAvatar = generated.map((s) => ({
      ...s,
      avatar_id: finalAvatarId,
      voice_id: voiceId || null,
    }));

    return NextResponse.json({
      success: true,
      data: scenariosWithAvatar,
      profile: websiteProfile,
      extractedFromUrls,
      extractedFromDocuments,
      documentsUsed: selectedDocuments.length,
      urlsUsed: urlsToUse.length,
    });
  } catch (e: any) {
    console.error("[api/scenarios/generate-from-kb] error:", e);
    return NextResponse.json({ error: e.message || "Generation failed" }, { status: 500 });
  }
}
