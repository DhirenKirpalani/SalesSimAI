import { NextRequest, NextResponse } from "next/server";

const EXTRACTION_PROMPT = `You are an expert B2B sales intelligence analyst building a COMPREHENSIVE company profile for sales simulation training. I have scraped multiple pages from a company's website. Your output must be RICH and DETAILED — comparable to a manually researched sales playbook.

Analyze ALL pages thoroughly. Cross-reference information. Extract specific details, not generics.

Return ONLY valid JSON in this exact shape:

{
  "company_name": "<exact company name>",
  "tagline": "<specific one-liner, not generic marketing fluff>",
  "website_url": "<main domain>",
  
  "product_deep_dive": {
    "overview": "<2-3 sentences on what the product does, how it works, and who uses it>",
    "key_features": ["<specific feature 1 — e.g. 'AI-powered cash flow forecasting with 14-day projections'>", "<specific feature 2>", "<specific feature 3>"],
    "how_it_works": "<step-by-step description of the customer journey from sign-up to value>",
    "pricing_model": "<how they charge — flat fee, % of revenue, per-seat, freemium? Specific numbers if found>",
    "ideal_customer_profile": "<specific customer size, stage, revenue, industry — e.g. 'Seed to Series B SaaS companies with $50K-$500K MRR'>"
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
    "<specific, concrete pain point — NOT generic 'cash flow management'. E.g. 'Founders spending 6+ hours/week manually updating investor update spreadsheets because their financial data is scattered across 4 tools'>"
  ],
  
  "current_process_problems": [
    "<the BEFORE state — what painful manual process does the customer endure? Include EXACT customer quotes. E.g. 'Before Choco Up, I was manually reconciling Stripe payouts with my bank account every Tuesday. It took 3 hours and I still never knew my true runway.'>"
  ],
  
  "value_propositions": [
    "<specific, quantified value prop — e.g. 'Get funded in 48 hours vs 6-9 months for traditional VC rounds'>",
    "<concrete differentiation — e.g. 'No equity dilution — retain 100% ownership while accessing growth capital'>"
  ],
  
  "competitive_landscape": {
    "primary_competitors": ["<specific competitor 1>", "<specific competitor 2>"],
    "key_differentiators": ["<how they win — e.g. 'Revenue-based repayment flexes with your cash flow vs fixed monthly bank loans'>", "<another differentiator>"],
    "why_customers_switch": "<specific reason customers leave alternatives for this solution>"
  },
  
  "common_objections": [
    {
      "objection": "<exact objection a buyer would raise — e.g. 'Your 8% fee is higher than my bank's 5% interest rate'>",
      "underlying_concern": "<the real fear behind this — e.g. 'Total cost of capital and comparing apples to oranges'>",
      "handling_approach": "<how a good seller would address this — e.g. 'Reframe: include time value of money, speed to market, and equity preservation'">"
    }
  ],
  
  "buyer_personas": [
    {
      "name": "<first name only, e.g. Marcus>",
      "full_role": "<specific title — e.g. CFO, not just 'Finance Director'>",
      "company_type": "<e.g. 'Fast-growing D2C e-commerce brand, $5M revenue'>",
      "industry": "<specific industry>",
      "age_approx": "<e.g. 35-45>",
      "personality": "<rich description — e.g. 'Data-driven, skeptical of sales claims, asks for proof points, values speed and transparency. Frustrated by opaque pricing. Will test you with hard questions.'>",
      "communication_style": "<e.g. 'Direct, no-nonsense. Wants numbers upfront. Gets impatient with long intros. Prefers email follow-ups with concrete next steps.'>",
      "pain_points": [
        "<specific pain tied to their role — e.g. 'Burn rate is $400K/month but revenue is lumpy. Every month-end is a nightmare figuring out if we can make payroll'>",
        "<another specific pain — e.g. 'Last fundraising took 8 months and killed our product velocity. Never again.'>"
      ],
      "goals": [
        "<specific goal — e.g. 'Secure 6 months of runway without diluting equity before next board meeting in 3 weeks'>",
        "<another goal — e.g. 'Get real-time visibility into cash position instead of waiting for month-end close'>"
      ],
      "hidden_concerns": "<what they won't say out loud — e.g. 'Worried the board will judge him for needing emergency funding. Also afraid his finance team is too small to manage another financial relationship.'>",
      "prior_experience": "<what they've tried before — e.g. 'Used a traditional bank line of credit but the covenants were restrictive. Tried invoice factoring but the advance rate was only 70%.'>",
      "budget_authority": "<e.g. 'Can approve up to $200K without board approval. Anything above needs 2-week board sign-off.'>",
      "decision_timeline": "<e.g. 'Needs solution within 3 weeks before next payroll. Will evaluate 2-3 vendors simultaneously.'>",
      "decision_criteria": ["<e.g. 'Speed of funding — must be live within 2 weeks'>", "<e.g. 'Integration with existing accounting stack (QuickBooks/Xero)'>", "<e.g. 'No personal guarantees or restrictive covenants'>"],
      "objections_they_raise": [
        "<specific objection this persona would say — e.g. 'I already have a line of credit. Why do I need this?'>",
        "<another — e.g. 'My accountant says revenue-based financing complicates our cap table.'>"
      ],
      "opening_line": "<what this persona might say at the START of a discovery call — e.g. 'Look, I'll be direct. We grew 40% last quarter but I'm staring at a $200K payroll in 10 days and I'm $80K short. Can you actually help or is this another sales pitch?'>",
      "background_context": "<2-3 sentences setting the scene for the seller — e.g. 'Marcus is the newly promoted CFO of a D2C skincare brand that exploded on TikTok. Revenue jumped from $1M to $5M in 8 months but cash flow hasn't caught up. His predecessor left messy books. He's under pressure from the CEO and investors to 'fix the finances' but has no budget for a full finance team.'>"
    }
  ],
  
  "customer_testimonials": [
    {
      "customer_name": "<if mentioned>",
      "customer_company": "<if mentioned>",
      "quote": "<VERBATIM quote about their problem BEFORE using the product>",
      "before_state": "<what their process looked like before — e.g. 'Manual spreadsheet tracking of 200+ SKUs across 3 warehouses'>",
      "after_state": "<what changed after — e.g. 'Automated reorder alerts, never out-of-stock again'>",
      "source": "<page URL or inferred>"
    }
  ],
  
  "sales_scenario_seeds": [
    {
      "scenario_type": "<e.g. Discovery Call / Objection Handling / Product Demo / Executive Presentation>",
      "buyer_persona": "<which persona this targets>",
      "setup": "<1-2 sentences setting the scene for the seller>",
      "buyer_opening": "<what the buyer says first — this kicks off the simulation>",
      "seller_goal": "<what the seller should achieve in this scenario>",
      "hidden_challenges": ["<specific discovery questions the seller must ask to uncover>", "<another hidden challenge>"]
    }
  ],
  
  "industry_dynamics": {
    "market_trend": "<e.g. 'Revenue-based financing is growing 300% YoY as founders seek alternatives to dilutive VC'>",
    "regulatory_factors": "<any regulatory context — e.g. 'SE Asia fintech regulations vary by country, affecting cross-border lending'>",
    "buying_cycle": "<e.g. 'Typical evaluation: 1-2 weeks. Decision made by CFO + CEO. Legal review takes 3-5 days.'>",
    "budget_seasonality": "<e.g. 'Q4 is peak — companies need working capital for holiday inventory. Q1 is slowest.'>"
  }
}

CRITICAL RULES FOR RICH OUTPUT:
1. NEVER use generic phrases like "streamline operations" or "improve efficiency". Be SPECIFIC and CONCRETE.
2. Pain points must describe a REAL activity the buyer does — with tools, time, and frustration level.
3. Buyer personas must feel like real people with contradictions, pressures, and history.
4. Opening lines must be SURPRISING and AUTHENTIC — not "Tell me about your product." Make the seller work.
5. Extract EXACT customer quotes. Paraphrase only if the exact text isn't available.
6. If the website has pricing, include specific numbers. If it has a calculator, describe what inputs it asks for.
7. Objections must be SPECIFIC to THIS product, not generic sales objections.
8. Include at least 2 detailed buyer personas with distinct personalities and concerns.
9. The "hidden_concerns" field is crucial — this is what makes simulations feel real.
10. Scenario seeds must give the seller a CLEAR situation with STAKES.`;

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

// Common page paths to crawl for comprehensive extraction
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
  // 1. Try Jina AI (free, handles JS, no auth needed)
  try {
    const text = await fetchWithJina(url);
    if (text.length > 500) return text;
  } catch (e) { /* silent fail - too noisy for fallback */ }

  // 2. Fallback: raw fetch + HTML strip
  try {
    const text = await fetchPageRaw(url);
    if (text.length > 500) return text;
  } catch (e) { /* silent fail */ }

  return "";
}

// Discover real pages via sitemap.xml (handles sitemap index files recursively)
async function discoverPages(baseUrl: string): Promise<string[]> {
  const base = getBaseUrl(baseUrl);
  const discovered: string[] = [];
  const seenSitemaps = new Set<string>();

  async function fetchSitemap(sitemapUrl: string, depth: number): Promise<void> {
    if (depth > 2 || seenSitemaps.has(sitemapUrl)) return;
    seenSitemaps.add(sitemapUrl);

    try {
      const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const xml = await res.text();

      // Check if this is a sitemap index (contains <sitemap> tags)
      const isSitemapIndex = xml.includes("<sitemapindex") || xml.includes("<sitemap>");

      if (isSitemapIndex) {
        // Extract nested sitemap URLs and recurse
        const subSitemapMatches = xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/g);
        for (const match of subSitemapMatches) {
          const subUrl = match[1]?.trim();
          if (subUrl) await fetchSitemap(subUrl, depth + 1);
        }
      } else {
        // Regular sitemap — extract page URLs
        const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
        for (const match of locMatches) {
          const url = match[1]?.trim();
          if (url && !discovered.includes(url)) discovered.push(url);
        }
      }
    } catch { /* ignore */ }
  }

  try {
    await fetchSitemap(`${base}/sitemap.xml`, 0);
    if (discovered.length > 0) {
      console.log(`[extract] Found ${discovered.length} pages from sitemap(s)`);
      return discovered.slice(0, 10);
    }
  } catch { /* ignore */ }

  return [];
}

async function crawlWebsite(baseUrl: string, extraUrls?: string[]): Promise<Map<string, string>> {
  const contentMap = new Map<string, string>();
  const base = getBaseUrl(baseUrl);
  const startTime = Date.now();

  // STEP 1: Discover real pages first via sitemap
  const discovered = await discoverPages(baseUrl);
  const hasDiscovered = discovered.length > 0;

  // Build URL list: discovered real pages > common paths > extras
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

  // STEP 2: Try Tavily batch (fastest path)
  try {
    const tavilyResults = await fetchWithTavily(urlsToTry.slice(0, 8));
    for (const [url, text] of tavilyResults) {
      contentMap.set(url, text);
    }
    console.log(`[extract] Tavily returned ${contentMap.size} pages`);
  } catch (e) {
    console.warn("[extract] Tavily batch failed:", (e as Error).message);
  }

  // If Tavily got enough content (homepage + 2 subpages), skip expensive fallbacks
  const goodPages = Array.from(contentMap.values()).filter((t) => t.length > 500).length;
  if (goodPages >= 3) {
    console.log(`[extract] Got ${goodPages} good pages from Tavily in ${Date.now() - startTime}ms, skipping fallback`);
    return contentMap;
  }

  // STEP 3: Fallback - try individual fetches for missing pages, but limit aggressively
  const remaining = urlsToTry
    .filter((u) => !contentMap.has(u) || (contentMap.get(u)?.length ?? 0) < 200)
    .slice(0, hasDiscovered ? 2 : 3); // if we know real pages exist, try fewer fallbacks
  
  for (const url of remaining) {
    try {
      const text = await fetchSinglePage(url);
      if (text.length > 200) contentMap.set(url, text);
      await new Promise((r) => setTimeout(r, 100));
    } catch { /* silent */ }
  }

  console.log(`[extract] Crawl complete: ${contentMap.size} pages in ${Date.now() - startTime}ms`);
  return contentMap;
}

function combineScrapedContent(contentMap: Map<string, string>): string {
  const sections: string[] = [];
  
  // Homepage first
  for (const [url, text] of contentMap) {
    if (url.endsWith("/") || url.endsWith(getBaseUrl(url))) {
      sections.push(`=== HOMEPAGE: ${url} ===\n${text}`);
    }
  }
  
  // Then other pages
  for (const [url, text] of contentMap) {
    if (!url.endsWith("/")) {
      sections.push(`=== PAGE: ${url} ===\n${text}`);
    }
  }
  
  return sections.join("\n\n").slice(0, 50000); // cap at 50k tokens for GPT-4.1
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
      model: "gpt-4.1",
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: `WEBSITE CONTENT:\n${text}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 8000,
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
    const { url, urls, successStoriesUrl } = await req.json();
    const mainUrl = url || (Array.isArray(urls) && urls.length > 0 ? urls[0] : "");
    if (!mainUrl) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    // Build extra URLs from urls array (skip first which is main) + successStoriesUrl
    const extraUrls: string[] = [];
    if (Array.isArray(urls) && urls.length > 1) {
      extraUrls.push(...urls.slice(1));
    }
    if (successStoriesUrl) extraUrls.push(successStoriesUrl);
    
    // STEP 1: Scrape — crawl multiple pages and extract all raw content
    console.log(`[company/extract] Starting comprehensive crawl of ${mainUrl}`);
    const scrapedContent = await crawlWebsite(mainUrl, extraUrls.length > 0 ? extraUrls : undefined);
    console.log(`[company/extract] Scraped ${scrapedContent.size} pages`);
    
    if (scrapedContent.size === 0) {
      return NextResponse.json({ error: "Could not extract any content from the website. The site may block scrapers or require JavaScript." }, { status: 400 });
    }

    // STEP 2: Combine all scraped content
    const combinedText = combineScrapedContent(scrapedContent);
    console.log(`[company/extract] Combined content length: ${combinedText.length} chars`);

    // STEP 3: AI Synthesis — OpenAI creates structured profile from comprehensive scraped text
    const extracted = await extractWithLLM(combinedText);

    return NextResponse.json({
      success: true,
      data: extracted,
      sources: {
        crawled: Array.from(scrapedContent.keys()),
        pagesScraped: scrapedContent.size,
        totalContentLength: combinedText.length,
      },
    });
  } catch (e: any) {
    console.error("[company/extract] error:", e);
    return NextResponse.json({ error: e.message || "Extraction failed" }, { status: 500 });
  }
}
