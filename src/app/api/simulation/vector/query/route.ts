import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { querySimilarConversations } from "@/lib/vector-store";

/**
 * POST /api/simulation/vector/query
 * Semantic search across stored conversation vectors.
 * Body: { query: string, scenarioType?: string, source?: "user"|"buyer", limit?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { query, scenarioType, source, limit = 5 } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query text" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await querySimilarConversations(query, user.id, {
      scenarioType,
      source: source as "user" | "buyer" | undefined,
      limit: Math.min(Number(limit), 20),
      minSimilarity: 0.6,
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[vector/query]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }
}
