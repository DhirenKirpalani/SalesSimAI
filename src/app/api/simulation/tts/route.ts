import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof VOICES)[number];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });

    const { text, voice = "nova" } = await req.json() as { text: string; voice?: Voice };

    if (!text?.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        voice,
        input: text.slice(0, 4096),
        response_format: "pcm",
        speed: 1.0,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[tts] OpenAI error:", err);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/pcm",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[tts]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
