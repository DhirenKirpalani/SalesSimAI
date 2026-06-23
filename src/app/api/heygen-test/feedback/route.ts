import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function serviceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

interface TranscriptEntry {
  role: "avatar" | "user";
  text: string;
  time: string;
}

const SYSTEM_PROMPT = `You are an expert B2B sales coach analyzing a sales call transcript.
Evaluate the salesperson's performance using the MEDDIC framework and provide actionable feedback.

Return ONLY valid JSON in this exact shape:
{
  "overall_score": <0-100>,
  "breakdown": {
    "metrics": <0-100>,
    "economic_buyer": <0-100>,
    "decision_criteria": <0-100>,
    "decision_process": <0-100>,
    "identify_pain": <0-100>,
    "champion": <0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "missed_opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "coaching_recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "coaching_moments": [
    {
      "buyer_quote": "<exact buyer statement from transcript>",
      "signal": "<what this statement signals — e.g. price objection, gatekeeper, buying signal, etc.>",
      "what_they_should_have_said": "<exact script they should have used in that moment>"
    }
  ]
}

MEDDIC scoring guidance:
- Metrics: Did they quantify business impact and ROI?
- Economic Buyer: Did they identify and engage the decision maker?
- Decision Criteria: Did they uncover evaluation criteria?
- Decision Process: Did they map the buying process and timeline?
- Identify Pain: Did they discover and probe specific pain points?
- Champion: Did they build a relationship and internal advocate?

COACHING MOMENTS rules:
- Pick 3-5 real moments from the transcript where the buyer said something significant.
- For each, explain what signal that statement sends (objection, buying signal, etc.).
- Provide an exact script the seller should have used — not generic advice, word-for-word what to say.
- Be honest and specific. Reference actual moments from the transcript.
- If the call was very short, score conservatively and note it.`;

export async function POST(req: NextRequest) {
  const { transcript, scenarioName, heygenSessionId, startedAt } = await req.json() as {
    transcript: TranscriptEntry[];
    scenarioName: string;
    heygenSessionId?: string;
    startedAt?: string;
  };

  if (!transcript?.length) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  const transcriptText = transcript
    .map((t) => `${t.role === "user" ? "SALESPERSON" : "BUYER"}: ${t.text}`)
    .join("\n");

  const userPrompt = `SCENARIO: ${scenarioName}\n\nTRANSCRIPT:\n${transcriptText}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const analysis = JSON.parse(content);

    // Persist to DB before responding
    if (heygenSessionId) {
      const durationS = startedAt
        ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
        : null;
      try {
        await serviceSupabase()
          .from("heygen_sessions")
          .update({
            transcript,
            analysis,
            duration_s: durationS,
            ended_at: new Date().toISOString(),
          })
          .eq("id", heygenSessionId);
      } catch (dbErr) {
        console.warn("[heygen-test/feedback] DB update failed:", dbErr);
      }
    }

    return NextResponse.json(analysis);
  } catch (e) {
    console.error("[heygen-test/feedback] error:", e);
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 });
  }
}
