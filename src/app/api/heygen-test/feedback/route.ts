import { NextRequest, NextResponse } from "next/server";

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
  "coaching_recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}

MEDDIC scoring guidance:
- Metrics: Did they quantify business impact and ROI?
- Economic Buyer: Did they identify and engage the decision maker?
- Decision Criteria: Did they uncover evaluation criteria?
- Decision Process: Did they map the buying process and timeline?
- Identify Pain: Did they discover and probe specific pain points?
- Champion: Did they build a relationship and internal advocate?

Be honest and specific. Reference actual moments from the transcript. If the call was very short, score conservatively and note it.`;

export async function POST(req: NextRequest) {
  const { transcript, scenarioName } = await req.json() as {
    transcript: TranscriptEntry[];
    scenarioName: string;
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
        max_tokens: 800,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return NextResponse.json(JSON.parse(content));
  } catch (e) {
    console.error("[heygen-test/feedback] error:", e);
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 });
  }
}
