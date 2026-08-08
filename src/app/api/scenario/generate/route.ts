import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
  product_type: string;
  seller_description: string;
  scenario_type: string;
  difficulty: string;
  duration: number;
  context_note: string;
  custom_persona: GeneratedPersona;
  scoring_criteria: string;
  evaluation_framework: string;
}

const SYSTEM_PROMPT = `You are an expert sales enablement AI that helps users create realistic practice scenarios for sales calls and interviews.

You have a CONVERSATION with the user. On the FIRST message, decide if you have enough context to build a rich scenario:
- If the user gave a clear, specific description (role, situation, company type) → generate the scenario immediately.
- If the description is vague or missing key details → ask 1-2 SHORT clarifying questions to enrich the scenario. Questions should be conversational and specific, like:
  - "What product or service are you selling?"
  - "What's the experience level of the person practicing — beginner or advanced?"
  - "Any specific objections you want to practice handling?"
  - "What industry is the buyer in?"

After the user answers your clarifying questions, generate the complete scenario.

You may receive Knowledge Base documents. Use them to enrich the seller company, product details, and persona when available.

IMPORTANT — You must respond in ONE of two formats:

FORMAT 1 — Clarifying question (when you need more info):
Return JSON: {"type":"question","message":"your clarifying question here"}

FORMAT 2 — Generate scenario (when you have enough context):
Return JSON: {"type":"scenario","scenario":{...full scenario object...}}

The scenario object shape:
{
  "seller_company": "<company the user sells at, or realistic one if not specified>",
  "seller_product": "<short product/service description>",
  "product_type": "<one of: payment, eor, cards — use 'payment' for general/interview scenarios>",
  "seller_description": "<2-3 sentence description of what the seller offers>",
  "scenario_type": "<one of: First Discovery Call, Objection Handling, Negotiation, Product Demo, Pitch, Win-Back, Renewal, Executive Presentation, Product Knowledge Interview, First Round Interview, Behavioral Interview>",
  "difficulty": "<Beginner|Intermediate|Advanced|Expert>",
  "duration": <5|10|15|20>,
  "context_note": "<Detailed scenario briefing. 3-5 sentences.>",
  "custom_persona": {
    "name": "<first name only>",
    "jobTitle": "<specific role>",
    "company": "<realistic buyer company name>",
    "industry": "<specific industry>",
    "personality": "<2-3 sentence personality description>",
    "personalityTraits": "<3-4 bullet traits>",
    "painPoints": ["<specific pain 1>", "<specific pain 2>"],
    "painPointsCurrentProcess": "<current painful process>",
    "painPointsImpact": "<cost/impact of the pain>",
    "goals": ["<goal 1>", "<goal 2>"],
    "companyGoal": "<what their company aims to achieve>",
    "personalMotivation": "<personal career pressure>",
    "communicationStyle": "<how they speak>",
    "communicationLanguage": "<specific phrases/jargon>",
    "priorVendorExperience": "<what they've tried before>",
    "decisionCriteria": "<how they decide>",
    "hiddenConcern": "<unsaid concern driving skepticism>",
    "meetingSource": "<how meeting was booked>",
    "budgetStatus": "<budget authority>",
    "timelinePressure": "<decision timeline>",
    "sampleDialogues": "<2-3 realistic lines>"
  },
  "scoring_criteria": "<5-7 checkpoint rubric as numbered list>",
  "evaluation_framework": "<one of: Standard, MEDDIC, BANT, SPIN, Challenger, Sandler, ValueSelling>"
}

Rules:
- Ask at most 1-2 clarifying questions before generating. Don't over-question.
- Every scenario field must be non-empty.
- Make the persona realistic, skeptical, and hard to sell to.
- If KB documents are provided, use them to enrich seller company, product, and persona.
- For interview scenarios, the persona is the INTERVIEWER, not a buyer.
- Keep clarifying questions short and natural — like a real conversation.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, kbDocIds, category } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured." }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch KB documents if selected
    let kbContext = "";
    if (Array.isArray(kbDocIds) && kbDocIds.length > 0) {
      const { data: docs } = await supabase
        .from("company_documents")
        .select("name, content")
        .in("id", kbDocIds);
      if (docs && docs.length > 0) {
        kbContext = docs
          .filter((d: any) => d.content && d.content.trim().length > 50)
          .map((d: any) => `--- ${d.name} ---\n${d.content}`)
          .join("\n\n")
          .slice(0, 50000);
      }
    }

    // Build conversation messages for OpenAI
    const conversationMessages = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add category context if provided
    if (category) {
      const categoryLabels: Record<string, string> = {
        interviews: "Interviews (behavioral, first round, product knowledge)",
        sales: "Sales calls (discovery, demos, cold calls, objection handling)",
        leadership: "Leadership conversations (feedback, coaching, conflict)",
        corporate_communication: "Corporate communication (stakeholder updates, escalations)",
        negotiation: "Negotiation (salary, vendor, budget, scope)",
        customer_success: "Customer success (onboarding, renewals, churn prevention)",
        product_management: "Product management (PRD reviews, roadmap, tradeoffs)",
        presentations: "Presentations (investor pitches, quarterly reviews, launches)",
        professional_english: "Professional English practice (small talk, meetings, emails)",
      };
      const categoryDesc = categoryLabels[category] || category;
      conversationMessages.push({
        role: "system",
        content: `CATEGORY: The user is creating a scenario in the "${categoryDesc}" category. Tailor the scenario type, persona, and context to fit this category.`,
      });
    }

    // Add KB context as a system-level note
    if (kbContext) {
      conversationMessages.push({
        role: "system",
        content: `KNOWLEDGE BASE DOCUMENTS (use as context for seller company, product, and persona):\n${kbContext}`,
      });
    }

    // Add user/assistant conversation history
    for (const msg of messages as ChatMessage[]) {
      conversationMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: conversationMessages,
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[api/scenario/generate] OpenAI error:", errText);
      return NextResponse.json({ error: "Failed to generate scenario. Please try again." }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    // Check if it's a clarifying question or a scenario
    if (parsed.type === "question" && parsed.message) {
      return NextResponse.json({ type: "question", message: parsed.message });
    }

    if (parsed.type === "scenario" && parsed.scenario) {
      const scenario = parsed.scenario as GeneratedScenario;
      if (!scenario.custom_persona || !scenario.scenario_type) {
        return NextResponse.json({ error: "Generated scenario is incomplete. Please try again with more detail." }, { status: 500 });
      }
      return NextResponse.json({ type: "scenario", scenario });
    }

    // Fallback: if the response doesn't match expected format, try to use it as a scenario directly
    if (parsed.custom_persona && parsed.scenario_type) {
      return NextResponse.json({ type: "scenario", scenario: parsed as GeneratedScenario });
    }

    return NextResponse.json({ error: "Unexpected response format. Please try again." }, { status: 500 });
  } catch (e: any) {
    console.error("[api/scenario/generate] error:", e);
    return NextResponse.json({ error: e.message || "Generation failed" }, { status: 500 });
  }
}
