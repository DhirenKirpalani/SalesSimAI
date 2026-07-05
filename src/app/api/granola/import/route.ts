import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GRANOLA_API_BASE = "https://public-api.granola.ai";

function classifyProductType(title: string, summary?: string | null): string {
  const text = `${title} ${summary ?? ""}`.toLowerCase();
  const eorKeywords = ["eor", "employer of record", "hire", "hiring", "global team", "remote employee", "local entity", "contractor", "workforce", "talent"];
  const cardsKeywords = ["card", "cards", "corporate card", "expense card", "payment card", "spend card", "virtual card"];
  const paymentKeywords = ["payment", "payroll", "payout", "invoice", "billing", "merchant", "checkout", "transfer", "remittance", "gateway"];

  if (eorKeywords.some((k) => text.includes(k))) return "eor";
  if (cardsKeywords.some((k) => text.includes(k))) return "cards";
  if (paymentKeywords.some((k) => text.includes(k))) return "payment";
  return "payment";
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GRANOLA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Granola API key not configured" }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    const organizationId = userProfile?.organization_id ?? null;

    const { createdAfter, limit = 30 } = await req.json().catch(() => ({}));

    const params = new URLSearchParams({
      page_size: String(Math.min(limit, 30)),
    });
    if (createdAfter) {
      params.set("created_after", createdAfter);
    }

    const listRes = await fetch(`${GRANOLA_API_BASE}/v1/notes?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!listRes.ok) {
      const text = await listRes.text().catch(() => "unknown");
      console.error("[granola/import] Granola list failed:", listRes.status, text);
      return NextResponse.json(
        { error: "Granola API request failed", status: listRes.status, detail: text },
        { status: 502 }
      );
    }

    const listData = await listRes.json();
    const notes = Array.isArray(listData.notes) ? listData.notes : [];

    const imported: string[] = [];
    const errors: string[] = [];

    for (const note of notes) {
      const noteId = note?.id;
      if (!noteId) continue;

      try {
        const detailRes = await fetch(`${GRANOLA_API_BASE}/v1/notes/${noteId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        });

        if (!detailRes.ok) {
          const text = await detailRes.text().catch(() => "unknown");
          errors.push(`${noteId}: ${detailRes.status} ${text}`);
          continue;
        }

        const detail = await detailRes.json();

        const noteTitle = detail.title ?? "";
        const noteSummary = detail.summary ?? detail.summary_text ?? null;
        const productType = classifyProductType(noteTitle, noteSummary);

        const { error: upsertError } = await supabase.from("granola_notes").upsert(
          {
            user_id: user.id,
            organization_id: organizationId,
            external_id: detail.id,
            title: noteTitle || null,
            summary: noteSummary,
            summary_text: detail.summary_text ?? detail.summary ?? null,
            summary_markdown: detail.summary_markdown ?? null,
            transcript: detail.transcript ?? null,
            owner: detail.owner ?? null,
            attendees: detail.attendees ?? null,
            calendar_event: detail.calendar_event ?? null,
            web_url: detail.web_url ?? null,
            product_type: productType,
            created_at: detail.created_at ? new Date(detail.created_at).toISOString() : null,
            updated_at: detail.updated_at ? new Date(detail.updated_at).toISOString() : null,
            raw_data: detail,
            metadata: {
              imported_by: user.id,
              import_batch: new Date().toISOString(),
            },
          },
          { onConflict: "external_id" }
        );

        if (upsertError) {
          console.error("[granola/import] upsert failed:", upsertError.message);
          errors.push(`${noteId}: ${upsertError.message}`);
          continue;
        }

        imported.push(noteId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${noteId}: ${message}`);
      }
    }

    return NextResponse.json({
      importedCount: imported.length,
      importedIds: imported,
      errors,
      hasMore: !!listData.hasMore,
      cursor: listData.cursor ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[granola/import] unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
