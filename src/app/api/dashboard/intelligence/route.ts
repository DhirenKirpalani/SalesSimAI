import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

const ALLOWED_PRODUCT_TYPES = ["payment", "eor", "cards"];

async function fetchTranscriptText(
  orgId: string,
  productType: string
): Promise<{ granola: string; documents: string }> {
  const svc = serviceSupabase();

  // Fetch imported calls (real sales calls) for this product type
  const { data: notes } = await svc
    .from("calls")
    .select("title, summary, summary_text, transcript")
    .eq("organization_id", orgId)
    .eq("product_type", productType)
    .order("imported_at", { ascending: false })
    .limit(50);

  const granolaParts: string[] = [];
  for (const note of notes ?? []) {
    const text = note.summary_text ?? note.summary ?? "";
    if (text) granolaParts.push(`# ${note.title || "Call"}\n${text}`);
  }

  // Fetch uploaded transcript documents for this product type
  const { data: docs } = await svc
    .from("company_documents")
    .select("name, content")
    .eq("organization_id", orgId)
    .eq("doc_type", productType)
    .eq("document_type", "transcript")
    .order("created_at", { ascending: false })
    .limit(50);

  const docParts: string[] = [];
  for (const doc of docs ?? []) {
    if (doc.content) docParts.push(`# ${doc.name}\n${doc.content}`);
  }

  return {
    granola: granolaParts.join("\n\n"),
    documents: docParts.join("\n\n"),
  };
}

async function extractIntelligence(text: string, productType: string): Promise<{
  objections: string[];
  insights: string[];
  useCases: string[];
  industries: string[];
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text.trim()) {
    return { objections: [], insights: [], useCases: [], industries: [] };
  }

  const sample = text.slice(0, 12000);
  const productLabel = productType === "eor" ? "Employer of Record (EoR)" : productType === "cards" ? "Cards" : "Payment";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a sales intelligence analyst for a B2B fintech company.

Read the sales call transcripts and documents about the ${productLabel} product. Extract the most frequently mentioned items and return the top 5 for each category.

Respond with only a JSON object in this exact shape:
{
  "objections": ["short objection 1", "short objection 2", ...],
  "insights": ["short insight 1", "short insight 2", ...],
  "useCases": ["short use case 1", "short use case 2", ...],
  "industries": ["short industry 1", "short industry 2", ...]
}

Each item should be 1-2 sentences, concrete, and actionable. If a category has no relevant data, return an empty array for that category.`,
        },
        {
          role: "user",
          content: `Transcripts and documents:\n\n${sample}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("[dashboard/intelligence] OpenAI error:", await response.text());
    return { objections: [], insights: [], useCases: [], industries: [] };
  }

  try {
    const data = await response.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    return {
      objections: (result.objections ?? []).slice(0, 5),
      insights: (result.insights ?? []).slice(0, 5),
      useCases: (result.useCases ?? []).slice(0, 5),
      industries: (result.industries ?? []).slice(0, 5),
    };
  } catch (e) {
    console.error("[dashboard/intelligence] parse error:", e);
    return { objections: [], insights: [], useCases: [], industries: [] };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productType = searchParams.get("productType") || "payment";

    if (!ALLOWED_PRODUCT_TYPES.includes(productType)) {
      return NextResponse.json({ error: "Invalid productType" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;
    if (!orgId) {
      return NextResponse.json({
        objections: [],
        insights: [],
        useCases: [],
        industries: [],
      });
    }

    const { granola, documents } = await fetchTranscriptText(orgId, productType);
    const combinedText = [granola, documents].filter(Boolean).join("\n\n---\n\n");
    const sourceHash = hashText(combinedText);

    const svc = serviceSupabase();

    // Check cache
    const { data: cached } = await svc
      .from("dashboard_intelligence")
      .select("objections, insights, use_cases, industries, source_hash")
      .eq("organization_id", orgId)
      .eq("product_type", productType)
      .single();

    if (cached && cached.source_hash === sourceHash) {
      return NextResponse.json({
        objections: cached.objections ?? [],
        insights: cached.insights ?? [],
        useCases: cached.use_cases ?? [],
        industries: cached.industries ?? [],
        cached: true,
        sources: {
          granolaCalls: granola ? "included" : "none",
          transcriptDocs: documents ? "included" : "none",
        },
      });
    }

    const intelligence = await extractIntelligence(combinedText, productType);

    // Upsert cache
    await svc.from("dashboard_intelligence").upsert(
      {
        organization_id: orgId,
        product_type: productType,
        objections: intelligence.objections,
        insights: intelligence.insights,
        use_cases: intelligence.useCases,
        industries: intelligence.industries,
        source_hash: sourceHash,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id, product_type" }
    );

    return NextResponse.json({
      ...intelligence,
      cached: false,
      sources: {
        granolaCalls: granola ? "included" : "none",
        transcriptDocs: documents ? "included" : "none",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[dashboard/intelligence] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
