import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, jobTitle, company, industry } = await req.json();
    const seed = encodeURIComponent(name ?? "avatar");

    // Deterministic illustrated avatar via DiceBear (free, no API key needed)
    const imageUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=e2e8f0`;
    return NextResponse.json({ imageUrl });
  } catch (e) {
    console.error("[avatar/generate] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
