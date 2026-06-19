/**
 * Simple OpenAI-compatible /chat/completions endpoint for LiveAvatar test.
 * No session lookup, no auth — just calls GPT-4o and streams SSE.
 * LiveAvatar config: base_url = {APP_URL}/api/heygen-test/llm
 */

import { NextRequest, NextResponse } from "next/server";

function sseChunk(id: string, content: string): string {
  return (
    "data: " +
    JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: "gpt-4o",
      choices: [{ index: 0, delta: { content }, finish_reason: null }],
    }) +
    "\n\n"
  );
}

function sseDone(id: string): string {
  return (
    "data: " +
    JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: "gpt-4o",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    }) +
    "\n\n" +
    "data: [DONE]\n\n"
  );
}

const SYSTEM_PROMPT = `You are a friendly, helpful AI assistant. 
Respond naturally and concisely to what the user says. Keep replies to 1-3 sentences.`;

export async function POST(req: NextRequest) {
  const completionId = `chatcmpl-test-${Date.now()}`;

  try {
    const body = await req.json();
    const messages: Array<{ role: string; content: string }> = body.messages ?? [];
    const shouldStream: boolean = body.stream ?? true;

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser?.content?.trim()) {
      return NextResponse.json({ error: "No user message" }, { status: 400 });
    }

    console.log("[heygen-test/llm] user:", lastUser.content.slice(0, 80));

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.filter((m) => m.role === "user" || m.role === "assistant").slice(-6),
        ],
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error("[heygen-test/llm] OpenAI error:", err);
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const openaiJson = await openaiRes.json();
    const responseText = openaiJson.choices?.[0]?.message?.content ?? "I'm here, go ahead.";
    console.log("[heygen-test/llm] response:", responseText.slice(0, 80));

    if (!shouldStream) {
      return NextResponse.json({
        id: completionId,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-4o",
        choices: [{ index: 0, message: { role: "assistant", content: responseText }, finish_reason: "stop" }],
      });
    }

    const words = responseText.split(" ");
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunk = i === words.length - 1 ? words[i] : words[i] + " ";
          controller.enqueue(encoder.encode(sseChunk(completionId, chunk)));
        }
        controller.enqueue(encoder.encode(sseDone(completionId)));
        controller.close();
      },
    });

    return new NextResponse(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[heygen-test/llm] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
