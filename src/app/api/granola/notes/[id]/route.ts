import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GRANOLA_API_BASE = "https://public-api.granola.ai";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const { data: note, error } = await supabase
      .from("granola_notes")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (error || !note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    let transcript = note.transcript;
    const apiKey = process.env.GRANOLA_API_KEY;

    if (!transcript && apiKey && note.external_id) {
      try {
        const detailRes = await fetch(
          `${GRANOLA_API_BASE}/v1/notes/${note.external_id}?include=transcript`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: "application/json",
            },
          }
        );
        if (detailRes.ok) {
          const detail = await detailRes.json();
          transcript = detail.transcript ?? null;
          await supabase
            .from("granola_notes")
            .update({ transcript, raw_data: { ...note.raw_data, ...detail } })
            .eq("id", id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[granola/notes/[id]] transcript fetch failed:", message);
      }
    }

    return NextResponse.json({ note: { ...note, transcript } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[granola/notes/[id]] unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { product_type } = body;
    const allowedTypes = ["payment", "eor", "cards"];

    if (!allowedTypes.includes(product_type)) {
      return NextResponse.json({ error: "Invalid product_type" }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from("granola_notes")
      .update({ product_type })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select("id, product_type")
      .single();

    if (error || !note) {
      console.error("[granola/notes/[id]] patch failed:", error?.message);
      return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
    }

    return NextResponse.json({ success: true, note });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[granola/notes/[id]] patch unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("granola_notes")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) {
      console.error("[granola/notes/[id]] delete failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[granola/notes/[id]] delete unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
