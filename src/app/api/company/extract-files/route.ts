import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

// pdf2json is CommonJS only
const PDFParser = require("pdf2json");

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

async function extractPdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    try {
      const pdfParser = new PDFParser();
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        const text = pdfData?.Pages?.map((page: any) =>
          page.Texts?.map((t: any) => decodeURIComponent(t.R?.[0]?.T ?? "")).join(" ")
        ).join("\n") ?? "";
        resolve(text.trim());
      });
      pdfParser.on("pdfParser_dataError", (err: any) => {
        console.error("[extract-files] PDF parse error:", err);
        resolve("");
      });
      pdfParser.parseBuffer(buffer);
    } catch (e) {
      console.error("[extract-files] PDF parse error:", e);
      resolve("");
    }
  });
}

async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value?.trim() ?? "";
  } catch (e) {
    console.error("[extract-files] DOCX parse error:", e);
    return "";
  }
}

async function extractPptx(buffer: Buffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const texts: string[] = [];

    // PPTX structure: ppt/slides/slide1.xml, slide2.xml, etc.
    const slideFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
    );

    for (const fileName of slideFiles.sort()) {
      const file = zip.files[fileName];
      if (!file) continue;
      const xml = await file.async("text");
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      // a:t elements contain text in PPTX
      const textNodes = doc.getElementsByTagName("a:t");
      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes.item(i);
        if (node?.firstChild?.nodeValue) {
          texts.push(node.firstChild.nodeValue);
        }
      }
    }

    // Also extract notes if present
    const noteFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("ppt/notesSlides/") && name.endsWith(".xml")
    );
    for (const fileName of noteFiles.sort()) {
      const file = zip.files[fileName];
      if (!file) continue;
      const xml = await file.async("text");
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      const textNodes = doc.getElementsByTagName("a:t");
      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes.item(i);
        if (node?.firstChild?.nodeValue) {
          texts.push(node.firstChild.nodeValue);
        }
      }
    }

    return texts.join(" ").trim();
  } catch (e) {
    console.error("[extract-files] PPTX parse error:", e);
    return "";
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdf(buffer);
  }
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    name.endsWith(".docx")
  ) {
    return extractDocx(buffer);
  }
  if (
    type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    name.endsWith(".pptx")
  ) {
    return extractPptx(buffer);
  }
  if (type === "text/plain" || name.endsWith(".txt")) {
    return buffer.toString("utf-8").trim();
  }

  console.warn("[extract-files] Unsupported file type:", type, name);
  return "";
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
        { error: "Could not extract text from any of the uploaded files. Supported: PDF, DOCX, PPTX, TXT" },
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
