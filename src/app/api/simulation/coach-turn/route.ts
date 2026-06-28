import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, sellerText, buyerText } = await req.json();
    if (!sessionId || !sellerText?.trim()) {
      return NextResponse.json({ fallback: true });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ fallback: true });

    const { data: session } = await supabase
      .from("simulation_sessions")
      .select("scenario_id, scenario_table")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (!session) return NextResponse.json({ fallback: true });

    const { data: scenario } = await supabase
      .from(session.scenario_table)
      .select("scoring_criteria")
      .eq("id", session.scenario_id)
      .single();

    if (!scenario?.scoring_criteria) {
      return NextResponse.json({ fallback: true });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ fallback: true });

    const systemPrompt = `You are a real-time sales coach. The seller's performance is measured against the rubric below. Evaluate ONLY the single exchange provided.

SCORING RUBRIC:
${scenario.scoring_criteria}

Return ONLY valid JSON — no extra text:
{
  "checkpoint_hit": "<checkpoint ID e.g. B1, B2 — null if none clearly hit this turn>",
  "checkpoint_name": "<short name of the checkpoint hit — null if none>",
  "quality": "good" | "warning" | "missed",
  "nudge": "<direct coaching message, max 12 words>",
  "suggested_next": "<what the seller should do next, max 15 words>"
}`;

    const userMsg = `Seller: "${sellerText.trim()}"\nBuyer: "${(buyerText || "").trim()}"`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 150,
      }),
    });

    if (!res.ok) return NextResponse.json({ fallback: true });
    const data = await res.json();
    const result = JSON.parse(data.choices[0].message.content);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ fallback: true });
  }
}
