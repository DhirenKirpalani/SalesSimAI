import { NextRequest, NextResponse } from "next/server";

interface TranscriptEntry {
  role: "avatar" | "user";
  text: string;
  time: string;
}

export async function POST(req: NextRequest) {
  const { transcript, scenarioName } = await req.json() as {
    transcript: TranscriptEntry[];
    scenarioName: string;
  };

  if (!transcript?.length) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  const transcriptText = transcript
    .map((t) => `${t.role === "user" ? "Seller" : "Buyer"}: ${t.text}`)
    .join("\n");

  const prompt = `You are an expert sales coach reviewing a simulated B2B sales call.

Scenario: ${scenarioName}

TRANSCRIPT:
${transcriptText}

Analyze the seller's performance. Return a JSON object with exactly these fields:
{
  "score": number (0-100, overall call quality),
  "summary": string (1-2 sentence overall assessment),
  "wentWell": string[] (2-3 specific things the seller did well, referencing actual moments — empty array if none),
  "missed": string[] (2-3 specific missed opportunities — empty array if none),
  "objections": string[] (objections or concerns raised by the buyer that the seller didn't fully address — empty array if none),
  "tip": string (the single most important coaching tip for the seller's next call)
}

Be specific and reference actual moments. Be constructive but honest. If the call was very short, note that in the summary.`;

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
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
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
