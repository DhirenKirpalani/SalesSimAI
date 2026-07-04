import { NextRequest, NextResponse } from "next/server";
import { extractTextFromBuffer } from "@/lib/extract-text";

const EXTRACTION_PROMPT = `You are an expert B2B sales intelligence analyst building a COMPREHENSIVE company profile for sales simulation training. You have access to content scraped from the company's website AND/OR uploaded company documents (sales decks, pitch decks, case studies, product sheets, etc.). Your output must be RICH and DETAILED — comparable to a manually researched sales playbook.

Analyze ALL sources thoroughly. Cross-reference information. Extract specific details, not generics.

Return ONLY valid JSON in this exact shape:

{
  "company_name": "<exact company name>",
  "tagline": "<specific one-liner, not generic marketing fluff>",
  "website_url": "<main domain>",
  
  "product_deep_dive": {
    "overview": "<2-3 sentences on what the product does, how it works, and who uses it>",
    "key_features": ["<specific feature 1>", "<specific feature 2>", "<specific feature 3>"],
    "how_it_works": "<step-by-step description of the customer journey from sign-up to value>",
    "pricing_model": "<how they charge — flat fee, % of revenue, per-seat, freemium? Specific numbers if found>",
    "ideal_customer_profile": "<specific customer size, stage, revenue, industry>"
  },
  
  "industries_served": ["<specific industry 1>", "<specific industry 2>"],
  "target_customer_segments": [
    {
      "segment": "<e.g. Early-stage SaaS founders>",
      "company_size": "<e.g. 10-50 employees, $1M-$10M ARR>",
      "use_case": "<why this segment buys — specific scenario>"
    }
  ],
  
  "pain_points_solved": [
    "<specific, concrete pain point — NOT generic>"
  ],
  
  "current_process_problems": [
    "<the BEFORE state — what painful manual process does the customer endure?>"
  ],
  
  "value_propositions": [
    "<specific, quantified value prop>",
    "<concrete differentiation>"
  ],
  
  "competitive_landscape": {
    "primary_competitors": ["<specific competitor 1>", "<specific competitor 2>"],
    "key_differentiators": ["<how they win>", "<another differentiator>"],
    "why_customers_switch": "<specific reason customers leave alternatives for this solution>"
  },
  
  "common_objections": [
    {
      "objection": "<exact objection a buyer would raise>",
      "underlying_concern": "<the real fear behind this>",
      "handling_approach": "<how a good seller would address this>"
    }
  ],
  
  "buyer_personas": [
    {
      "name": "<first name only>",
      "full_role": "<specific title — e.g. CFO>",
      "company_type": "<e.g. 'Fast-growing D2C e-commerce brand, $5M revenue'>",
      "industry": "<specific industry>",
      "age_approx": "<e.g. 35-45>",
      "personality": "<rich description>",
      "communication_style": "<e.g. 'Direct, no-nonsense. Wants numbers upfront.'>",
      "pain_points": [
        "<specific pain tied to their role>"
      ],
      "goals": [
        "<specific goal>"
      ],
      "hidden_concerns": "<what they won't say out loud>",
      "prior_experience": "<what they've tried before>",
      "budget_authority": "<e.g. 'Can approve up to $200K without board approval'>",
      "decision_timeline": "<e.g. 'Needs solution within 3 weeks'>",
      "decision_criteria": ["<criterion 1>", "<criterion 2>"],
      "objections_they_raise": [
        "<specific objection this persona would say>"
      ],
      "opening_line": "<what this persona might say at the START of a discovery call>",
      "background_context": "<2-3 sentences setting the scene for the seller>"
    }
  ],
  
  "customer_testimonials": [
    {
      "customer_name": "<if mentioned>",
      "customer_company": "<if mentioned>",
      "quote": "<VERBATIM quote about their problem BEFORE using the product>",
      "before_state": "<what their process looked like before>",
      "after_state": "<what changed after>",
      "source": "<page URL or inferred>"
    }
  ],
  
  "sales_scenario_seeds": [
    {
      "scenario_type": "<e.g. Discovery Call / Objection Handling / Product Demo / Executive Presentation>",
      "buyer_persona": "<which persona this targets>",
      "setup": "<1-2 sentences setting the scene for the seller>",
      "buyer_opening": "<what the buyer says first>",
      "seller_goal": "<what the seller should achieve in this scenario>",
      "hidden_challenges": ["<specific discovery questions the seller must ask>", "<another hidden challenge>"]
    }
  ],
  
  "industry_dynamics": {
    "market_trend": "<e.g. 'Revenue-based financing is growing 300% YoY'>",
    "regulatory_factors": "<any regulatory context>",
    "buying_cycle": "<e.g. 'Typical evaluation: 1-2 weeks. Decision made by CFO + CEO.'>",
    "budget_seasonality": "<e.g. 'Q4 is peak — companies need working capital for holiday inventory.'>"
  }
}

CRITICAL RULES FOR RICH OUTPUT:
1. NEVER use generic phrases like "streamline operations" or "improve efficiency". Be SPECIFIC and CONCRETE.
2. Pain points must describe a REAL activity the buyer does — with tools, time, and frustration level.
3. Buyer personas must feel like real people with contradictions, pressures, and history.
4. Opening lines must be SURPRISING and AUTHENTIC.
5. Extract EXACT customer quotes. Paraphrase only if the exact text isn't available.
6. If the source has pricing, include specific numbers.
7. Objections must be SPECIFIC to THIS product, not generic sales objections.
8. Include at least 2 detailed buyer personas with distinct personalities and concerns.
9. The "hidden_concerns" field is crucial.
10. Scenario seeds must give the seller a CLEAR situation with STAKES.
11. If website content is missing, infer reasonable specifics from the uploaded documents. If documents are missing, rely entirely on the website.`;

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBaseUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}`;
}

function getPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

const COMMON_PATHS = [
  "/", "/about", "/about-us", "/product", "/products", "/solutions",
  "/features", "/pricing", "/customers", "/case-studies", "/success-stories",
  "/testimonials", "/resources", "/blog", "/use-cases", "/industries",
  "/integrations", "/partners", "/why-us", "/how-it-works",
];

async function fetchWithTavily(urls: string[]): Promise<Map<string, string>> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");

  const res = await fetch("https://api.tavily.com/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ urls, extract_depth: "advanced" }),
  });

  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  const data = await res.json();
  const results = data.results ?? [];
  
  const contentMap = new Map<string, string>();
  for (const r of results) {
    const text = r.raw_content?.trim() ?? "";
    if (text.length > 200) contentMap.set(r.url, text);
  }
  return contentMap;
}

async function fetchWithJina(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`, {
      headers: { "Accept": "text/plain" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Jina error: ${res.status}`);
    return (await res.text()).trim();
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function fetchPageRaw(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; day1AI/1.0)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return stripHtml(await res.text());
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function fetchSinglePage(url: string): Promise<string> {
  try {
    const text = await fetchWithJina(url);
    if (text.length > 500) return text;
  } catch { /* silent fail */ }
  try {
    const text = await fetchPageRaw(url);
    if (text.length > 500) return text;
  } catch { /* silent fail */ }
  return "";
}

async function discoverPages(baseUrl: string): Promise<string[]> {
  const base = getBaseUrl(baseUrl);
  const discovered: string[] = [];
  try {
    const sitemapUrl = `${base}/sitemap.xml`;
    const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const xml = await res.text();
      const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
      for (const match of locMatches) {
        const url = match[1]?.trim();
        if (url && !discovered.includes(url)) discovered.push(url);
      }
      if (discovered.length > 0) return discovered.slice(0, 10);
    }
  } catch { /* ignore */ }
  return [];
}

async function crawlWebsite(baseUrl: string, extraUrls?: string[]): Promise<Map<string, string>> {
  const contentMap = new Map<string, string>();
  const base = getBaseUrl(baseUrl);
  const startTime = Date.now();

  const discovered = await discoverPages(baseUrl);
  const hasDiscovered = discovered.length > 0;

  const urlsToTry: string[] = [baseUrl];
  
  if (hasDiscovered) {
    for (const url of discovered) {
      if (!urlsToTry.includes(url)) urlsToTry.push(url);
    }
  } else {
    for (const path of COMMON_PATHS) {
      if (path === "/" || getPath(baseUrl) === path) continue;
      urlsToTry.push(`${base}${path}`);
    }
  }
  
  if (extraUrls) {
    for (const u of extraUrls) {
      if (!urlsToTry.includes(u)) urlsToTry.push(u);
    }
  }

  try {
    const tavilyResults = await fetchWithTavily(urlsToTry.slice(0, 8));
    for (const [url, text] of tavilyResults) {
      contentMap.set(url, text);
    }
  } catch (e) {
    console.warn("[extract-combined] Tavily batch failed:", (e as Error).message);
  }

  const goodPages = Array.from(contentMap.values()).filter((t) => t.length > 500).length;
  if (goodPages >= 3) return contentMap;

  const remaining = urlsToTry
    .filter((u) => !contentMap.has(u) || (contentMap.get(u)?.length ?? 0) < 200)
    .slice(0, hasDiscovered ? 2 : 3);
  
  for (const url of remaining) {
    try {
      const text = await fetchSinglePage(url);
      if (text.length > 200) contentMap.set(url, text);
      await new Promise((r) => setTimeout(r, 100));
    } catch { /* silent */ }
  }

  return contentMap;
}

function combineScrapedContent(contentMap: Map<string, string>): string {
  const sections: string[] = [];
  for (const [url, text] of contentMap) {
    if (url.endsWith("/") || url.endsWith(getBaseUrl(url))) {
      sections.push(`=== HOMEPAGE: ${url} ===\n${text}`);
    }
  }
  for (const [url, text] of contentMap) {
    if (!url.endsWith("/")) {
      sections.push(`=== PAGE: ${url} ===\n${text}`);
    }
  }
  return sections.join("\n\n").slice(0, 15000);
}

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
        { role: "user", content: `SOURCE CONTENT:\n${text.slice(0, 16000)}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000,
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
    const url = formData.get("url") as string | null;
    const successStoriesUrl = formData.get("successStoriesUrl") as string | null;

    const files: File[] = [];
    formData.forEach((value, key) => {
      if (value instanceof File && key.startsWith("file")) {
        files.push(value);
      }
    });

    if (!url?.trim() && files.length === 0) {
      return NextResponse.json({ error: "Provide a website URL, upload files, or both" }, { status: 400 });
    }

    const sections: string[] = [];

    if (url?.trim()) {
      const extraUrls: string[] = [];
      if (successStoriesUrl?.trim()) extraUrls.push(successStoriesUrl.trim());
      const scrapedContent = await crawlWebsite(url.trim(), extraUrls.length > 0 ? extraUrls : undefined);
      if (scrapedContent.size === 0 && files.length === 0) {
        return NextResponse.json({ error: "Could not extract any content from the website" }, { status: 400 });
      }
      const websiteText = combineScrapedContent(scrapedContent);
      if (websiteText.length > 0) {
        sections.push(`=== WEBSITE CONTENT ===\n${websiteText}`);
      }
    }

    if (files.length > 0) {
      const fileTexts: string[] = [];
      for (const file of files) {
        const text = await extractTextFromFile(file);
        if (text.length > 50) {
          fileTexts.push(`--- ${file.name} ---\n${text}`);
        }
      }
      if (fileTexts.length === 0 && sections.length === 0) {
        return NextResponse.json({ error: "Could not extract text from any uploaded files" }, { status: 400 });
      }
      if (fileTexts.length > 0) {
        sections.push(`=== UPLOADED DOCUMENTS ===\n${fileTexts.join("\n\n")}`);
      }
    }

    const combinedText = sections.join("\n\n\n");
    const extracted = await extractWithLLM(combinedText);

    return NextResponse.json({
      success: true,
      data: extracted,
    });
  } catch (e: any) {
    console.error("[company/extract-combined] error:", e);
    return NextResponse.json({ error: e.message || "Extraction failed" }, { status: 500 });
  }
}
