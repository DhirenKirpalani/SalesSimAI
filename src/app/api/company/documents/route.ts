import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embedText } from "@/lib/vector-store";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "Not in an organization", status: 400 };

  const { data: org } = await supabase
    .from("organizations")
    .select("created_by")
    .eq("id", profile.organization_id)
    .single();

  if (org?.created_by !== user.id) return { error: "Only admin can manage documents", status: 403 };

  return { user, orgId: profile.organization_id };
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const CHUNK_SIZE = 3000; // ~3000 chars per chunk (roughly 750 tokens)
const CHUNK_OVERLAP = 200;

interface UploadPayload {
  name: string;
  content: string;        // base64-encoded file content
  docType: string;      // pricing | objection_handling | product_knowledge | eor_rules | general
  mimeType: string;
}

/**
 * POST /api/company/documents
 * Upload a document, extract text, chunk, embed, store
 */
export async function POST(req: NextRequest) {
  try {
    const body: UploadPayload = await req.json();
    const { name, content, docType, mimeType } = body;

    if (!name?.trim() || !content?.trim() || !docType) {
      return NextResponse.json({ error: "name, content, and docType are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminCheck = await requireAdmin(supabase);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }
    const { user, orgId } = adminCheck;

    // Decode base64 content
    let textContent: string;
    try {
      const decoded = Buffer.from(content, "base64");
      if (decoded.length > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
      }

      // If it's a text file, use directly; otherwise try to extract
      if (mimeType?.includes("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
        textContent = decoded.toString("utf-8");
      } else if (name.endsWith(".json")) {
        textContent = decoded.toString("utf-8");
      } else {
        // For unsupported binary types, try utf-8 fallback
        // (PDF/DOCX extraction would need the extract-files route logic)
        textContent = decoded.toString("utf-8");
      }
    } catch {
      return NextResponse.json({ error: "Failed to decode file content" }, { status: 400 });
    }

    if (!textContent.trim()) {
      return NextResponse.json({ error: "No text content extracted" }, { status: 400 });
    }

    // Chunk the text
    const chunks = chunkText(textContent.trim(), CHUNK_SIZE, CHUNK_OVERLAP);
    const docRows: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);
      docRows.push({
        organization_id: orgId,
        name: chunks.length === 1 ? name.trim() : `${name.trim()} (part ${i + 1}/${chunks.length})`,
        content: chunks[i],
        doc_type: docType,
        embedding: embedding as unknown as string,
        created_by: user.id,
      });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("company_documents")
      .insert(docRows)
      .select();

    if (insertErr) {
      console.error("[api/company/documents] insert error:", insertErr);
      return NextResponse.json({ error: "Failed to store document" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      chunks: inserted?.length ?? 0,
      documents: inserted,
    });
  } catch (err) {
    console.error("[api/company/documents POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/company/documents
 * List documents for the user's organization
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const adminCheck = await requireAdmin(supabase);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }
    const { orgId } = adminCheck;

    const { data: docs } = await supabase
      .from("company_documents")
      .select("id, name, doc_type, file_path, created_at, created_by")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    // Enrich with creator names
    const enriched = docs ?? [];
    const creatorIds = [...new Set(enriched.map((d) => d.created_by).filter(Boolean))];
    let creators: Record<string, { full_name: string | null; email: string }> = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", creatorIds);
      for (const p of profiles ?? []) {
        creators[p.id] = { full_name: p.full_name, email: p.email };
      }
    }

    return NextResponse.json({
      documents: enriched.map((d) => ({
        ...d,
        creator_name: creators[d.created_by ?? ""]?.full_name || null,
        creator_email: creators[d.created_by ?? ""]?.email || null,
      })),
    });
  } catch (err) {
    console.error("[api/company/documents GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/company/documents?id={docId}
 * Delete a document from the org's knowledge base
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get("id");
    if (!docId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminCheck = await requireAdmin(supabase);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { error } = await supabase.from("company_documents").delete().eq("id", docId);

    if (error) {
      console.error("[api/company/documents DELETE] error:", error);
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/company/documents DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    // Try to break at a sentence boundary
    let breakAt = end;
    if (end < text.length) {
      const searchArea = text.slice(Math.max(start + size - 200, start), end + 200);
      const sentenceEnd = searchArea.search(/[.!?]\s+/);
      if (sentenceEnd !== -1) {
        breakAt = start + size - 200 + sentenceEnd + 2; // include the punctuation + space
      }
    }
    chunks.push(text.slice(start, breakAt).trim());
    start = breakAt - overlap;
  }
  return chunks;
}
