import { NextRequest, NextResponse } from "next/server";
import { extractTextFromBuffer } from "@/lib/extract-text";

const EXTRACTION_PROMPT = `You are an expert B2B sales intelligence analyst. Analyze the following content from uploaded company documents (sales decks, pitch decks, case studies, product sheets, etc.) and extract structured company information.

Return ONLY valid JSON in this exact shape:
{
  "company_name": "<company name>",
  "tagline": "<one sentence describing what they do>",
  "products": ["<product 1>", "<product 2>"],
  "industries": ["<industry 1>", "<industry 2>"],
  "target_customers": ["<customer segment 1>", "<customer segment 2>"],
  "pain_points_solved": ["<pain point 1>", "<pain point 2>", "<pain point 3>"],
  "current_process_problems": ["<before-state problem 1>", "<before-state problem 2>", "<before-state problem 3>"],
  "value_propositions": ["<value prop 1>", "<value prop 2>", "<value prop 3>"],
  "common_objections": ["<objection 1>", "<objection 2>", "<objection 3>"],
  "competitors": ["<competitor 1>", "<competitor 2>"],
  "buyer_personas": [
    {
      "name": "<persona name e.g. Startup Founder>",
      "role": "<job title>",
      "industry": "<industry>",
      "pain_points": ["<pain 1>", "<pain 2>"],
      "goals": ["<goal 1>", "<goal 2>"],
      "objections": ["<objection 1>", "<objection 2>"],
      "personality": "<personality description>"
    }
  ],
  "customer_quotes": [
    {
      "quote": "<exact customer testimonial about their problem before using the product>",
      "source": "<inferred source e.g. case study, testimonial>"
    }
  ]
}

Rules:
- current_process_problems: describe the BEFORE state — the painful manual process the customer had before this solution. E.g. "I tracked everything in spreadsheets and missed reorder windows"
- pain_points_solved: the business problems the product solves
- buyer_personas: create 2-3 realistic buyer personas based on the target customer segments
- customer_quotes: extract real quotes from testimonials/case studies about the problem they faced BEFORE using the product
- If info is missing, infer from context or leave as reasonable guesses based on the industry
- Be specific and concrete, not generic`;

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return extractTextFromBuffer(buffer, file.name, file.type);
}

async function extractWithLLM(text: string) {
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
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: `DOCUMENT CONTENT:\n${text.slice(0, 12000)}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files: File[] = [];

    // Collect all files from the form
    formData.forEach((value, key) => {
      if (value instanceof File && key.startsWith("file")) {
        files.push(value);
      }
    });

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const extractedTexts: string[] = [];
    for (const file of files) {
      const text = await extractTextFromFile(file);
      if (text.length > 50) {
        extractedTexts.push(`--- ${file.name} ---\n${text}`);
      }
    }

    if (extractedTexts.length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from any of the uploaded files. Supported: PDF, DOCX, PPTX, TXT, CSV, JSON, MD" },
        { status: 400 }
      );
    }

    const combinedText = extractedTexts.join("\n\n");
    const extracted = await extractWithLLM(combinedText);

    return NextResponse.json({
      success: true,
      data: extracted,
      sources: files.map((f) => f.name),
    });
  } catch (e: any) {
    console.error("[company/extract-files] error:", e);
    return NextResponse.json({ error: e.message || "Extraction failed" }, { status: 500 });
  }
}
