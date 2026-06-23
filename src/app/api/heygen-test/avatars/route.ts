import { NextRequest, NextResponse } from "next/server";

const LIVEAVATAR_BASE = "https://api.liveavatar.com";
const API_KEY = process.env.LIVEAVATAR_API_KEY!;

export interface HeyGenAvatar {
  id: string;
  name: string;
  preview_image_url: string | null;
  gender: string | null;
  voice_id: string | null;
}

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({
      avatars: [],
      count: 0,
      hasMore: false,
      hint: "LIVEAVATAR_API_KEY is not set in environment variables.",
    });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(searchParams.get("page_size") ?? "12"), 100);
  const offset = (page - 1) * pageSize;

  try {
    // Try user avatars first
    let res = await fetch(`${LIVEAVATAR_BASE}/v1/avatars?page=${page}&page_size=${pageSize}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
    });

    let text = await res.text();
    let json: Record<string, unknown> = {};
    let items: Record<string, unknown>[] = [];
    let count = 0;
    let hasMore = false;

    if (res.ok) {
      json = JSON.parse(text);
      items = (json.data as Record<string, unknown> | undefined)?.results as Record<string, unknown>[] ?? [];
      count = Number((json.data as Record<string, unknown> | undefined)?.count ?? items.length);
      hasMore = !!((json.data as Record<string, unknown> | undefined)?.next);
    }

    // Fallback to public avatars if user has none
    if (items.length === 0) {
      console.log("[heygen/avatars] User avatars empty — trying public avatars...");
      try {
        const pubRes = await fetch(`${LIVEAVATAR_BASE}/v1/avatars/public?page=${page}&page_size=${pageSize}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
        });
        if (pubRes.ok) {
          const pubJson = await pubRes.json();
          items = (pubJson.data as Record<string, unknown> | undefined)?.results as Record<string, unknown>[] ?? [];
          count = Number((pubJson.data as Record<string, unknown> | undefined)?.count ?? items.length);
          hasMore = !!((pubJson.data as Record<string, unknown> | undefined)?.next);
          console.log("[heygen/avatars] Public avatars returned", items.length, "of", count);
        }
      } catch (e) {
        console.warn("[heygen/avatars] Public avatars failed:", e);
      }
    }

    const avatars: HeyGenAvatar[] = items.map((item) => {
      const defaultVoice = item.default_voice as Record<string, unknown> | undefined;
      return {
        id: String(item.id ?? ""),
        name: String(item.name ?? "Unnamed"),
        preview_image_url: item.preview_url ? String(item.preview_url) : null,
        gender: item.gender ? String(item.gender) : null,
        voice_id: defaultVoice?.id ? String(defaultVoice.id) : null,
      };
    }).filter((a) => a.id);

    return NextResponse.json({ avatars, count, hasMore });
  } catch (err) {
    console.error("[heygen/avatars] error:", err);
    return NextResponse.json({
      avatars: [],
      count: 0,
      hasMore: false,
      hint: "Failed to reach LiveAvatar API. Check network or API key.",
    }, { status: 500 });
  }
}
