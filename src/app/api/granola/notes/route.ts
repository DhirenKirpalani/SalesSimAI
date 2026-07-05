import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;
    if (!orgId) {
      return NextResponse.json({ notes: [] });
    }

    const { data: notes, error } = await supabase
      .from("granola_notes")
      .select("id, external_id, title, summary, summary_text, summary_markdown, created_at, updated_at, imported_at, owner, attendees, web_url, product_type, user_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[granola/notes] fetch failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes: notes ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[granola/notes] unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
