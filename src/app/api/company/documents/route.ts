import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/vector-store";
import { extractTextFromBuffer } from "@/lib/extract-text";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

function sanitizeBucketName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 30);
}

const KNOWLEDGE_BASE_BUCKET = process.env.KNOWLEDGE_BASE_BUCKET_NAME ?? "knowledge-base";

function deriveOrgFolderName(orgId: string, orgName: string): string {
  const base = sanitizeBucketName(orgName);
  const suffix = orgId.toLowerCase();
  const candidate = `${base}-${suffix}`;
  if (candidate.length <= 100) return candidate;
  return `${base.substring(0, Math.max(1, 99 - suffix.length - 1))}-${suffix}`;
}

function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function getStoragePath(
  orgFolder: string,
  productType: string,
  documentType: string,
  index: number,
  fileName: string
): string {
  const ext = getFileExtension(fileName);
  const prefix = `${productType}-${documentType}`;
  return `${orgFolder}/${productType}/${documentType}/${prefix}-${index}${ext ? `.${ext}` : ""}`;
}

async function listFolderFiles(bucketName: string, folder: string): Promise<string[]> {
  const svc = serviceSupabase();
  const { data, error } = await svc.storage.from(bucketName).list(folder);
  if (error) {
    console.error("[listFolderFiles] error:", error);
    return [];
  }
  return (data ?? []).map((f) => f.name);
}

async function getNextIndex(
  bucketName: string,
  orgFolder: string,
  productType: string,
  documentType: string
): Promise<number> {
  const folderPath = `${orgFolder}/${productType}/${documentType}`;
  const files = await listFolderFiles(bucketName, folderPath);
  const prefix = `${productType}-${documentType}`;
  const pattern = new RegExp(`^${prefix}-(\\d+)\\..*$`);
  let max = 0;
  for (const name of files) {
    const match = name.match(pattern);
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }
  return max + 1;
}

async function uploadToOrgFolder(
  orgId: string,
  orgName: string,
  productType: string,
  documentType: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const orgFolder = deriveOrgFolderName(orgId, orgName);
  const index = await getNextIndex(KNOWLEDGE_BASE_BUCKET, orgFolder, productType, documentType);
  const path = getStoragePath(orgFolder, productType, documentType, index, fileName);

  const svc = serviceSupabase();
  const { error } = await svc.storage.from(KNOWLEDGE_BASE_BUCKET).upload(path, fileBuffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return path;
}

async function deleteFromStorage(filePath: string): Promise<void> {
  const svc = serviceSupabase();
  const { error } = await svc.storage.from(KNOWLEDGE_BASE_BUCKET).remove([filePath]);
  if (error) {
    console.error("[deleteFromStorage] error:", error);
  }
}


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
    .select("created_by, name")
    .eq("id", profile.organization_id)
    .single();

  if (org?.created_by !== user.id) return { error: "Only admin can manage documents", status: 403 };

  return { user, orgId: profile.organization_id, orgName: org?.name ?? "" };
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const CHUNK_SIZE = 3000; // ~3000 chars per chunk (roughly 750 tokens)
const CHUNK_OVERLAP = 200;

/**
 * POST /api/company/documents
 * Upload documents via FormData, extract text, chunk, embed, store
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const productType = formData.get("productType") as string;
    const documentType = formData.get("documentType") as string;
    const files: File[] = [];

    formData.forEach((value, key) => {
      if (value instanceof File && key === "files") {
        files.push(value);
      }
    });

    if (!productType || !documentType || files.length === 0) {
      return NextResponse.json({ error: "productType, documentType and files are required" }, { status: 400 });
    }

    const allowedProductTypes = ["payment", "eor", "cards"];
    if (!allowedProductTypes.includes(productType)) {
      return NextResponse.json({ error: "Invalid productType" }, { status: 400 });
    }

    const allowedDocumentTypes = ["icp", "value_prop", "competitive", "objection_handling", "product_pricing", "process_methodology"];
    if (!allowedDocumentTypes.includes(documentType)) {
      return NextResponse.json({ error: "Invalid documentType" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminCheck = await requireAdmin(supabase);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }
    const { user, orgId, orgName } = adminCheck;

    let totalChunks = 0;
    const insertedDocs: any[] = [];

    for (const file of files) {
      const name = file.name;
      const mimeType = file.type || "application/octet-stream";
      let fileBuffer: Buffer;
      try {
        fileBuffer = Buffer.from(await file.arrayBuffer());
      } catch {
        return NextResponse.json({ error: `Failed to read file ${name}` }, { status: 400 });
      }

      if (fileBuffer.length > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File ${name} too large (max 50MB)` }, { status: 400 });
      }

      const textContent = await extractTextFromBuffer(fileBuffer, name, mimeType);
      if (!textContent.trim()) {
        return NextResponse.json({ error: `No text content extracted from ${name}` }, { status: 400 });
      }

      // Upload the actual file to the shared knowledge-base bucket under the org's folder
      let filePath: string;
      try {
        filePath = await uploadToOrgFolder(orgId, orgName, productType, documentType, name, fileBuffer, mimeType);
      } catch (err: any) {
        console.error("[api/company/documents] storage upload error:", err);
        return NextResponse.json({ error: err.message || "Storage upload failed" }, { status: 500 });
      }

      // Chunk the text
      const chunks = chunkText(textContent.trim(), CHUNK_SIZE, CHUNK_OVERLAP);

      // Create the document metadata row first
      const { data: docRecord, error: docErr } = await supabase
        .from("company_documents")
        .insert({
          organization_id: orgId,
          name: name.trim(),
          content: "",
          doc_type: productType,
          document_type: documentType,
          file_path: filePath,
          created_by: user.id,
        })
        .select()
        .single();

      if (docErr || !docRecord) {
        console.error("[api/company/documents] document insert error:", docErr);
        return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
      }

      // Embed each chunk and store them in the chunks table
      const chunkRows: any[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embedText(chunks[i]);
        chunkRows.push({
          document_id: docRecord.id,
          content: chunks[i],
          embedding: embedding as unknown as string,
          chunk_index: i,
        });
      }

      const { error: chunkErr } = await supabase
        .from("company_document_chunks")
        .insert(chunkRows);

      if (chunkErr) {
        console.error("[api/company/documents] chunk insert error:", chunkErr);
        return NextResponse.json({ error: "Failed to store document chunks" }, { status: 500 });
      }

      totalChunks += chunkRows.length;
      insertedDocs.push(docRecord);
    }

    return NextResponse.json({
      success: true,
      chunks: totalChunks,
      documents: insertedDocs,
    });
  } catch (err) {
    console.error("[api/company/documents POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/company/documents
 * List documents for the user's organization (one row per uploaded file)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const adminCheck = await requireAdmin(supabase);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }
    const { orgId } = adminCheck;

    const { data: rows } = await supabase
      .from("company_documents")
      .select("id, name, doc_type, document_type, file_path, created_at, created_by")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    // Enrich with creator info
    const creatorIds = [...new Set((rows ?? []).map((d) => d.created_by).filter(Boolean))];
    let creators: Record<string, { full_name: string | null; email: string; role: string | null }> = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", creatorIds);
      for (const p of profiles ?? []) {
        creators[p.id] = { full_name: p.full_name, email: p.email, role: p.role };
      }
    }

    return NextResponse.json({
      documents: (rows ?? []).map((d) => ({
        ...d,
        creator_name: creators[d.created_by ?? ""]?.full_name || null,
        creator_email: creators[d.created_by ?? ""]?.email || null,
        creator_role: creators[d.created_by ?? ""]?.role || null,
        chunk_count: 0, // frontend can optionally fetch this; not needed for the list
      })),
    });
  } catch (err) {
    console.error("[api/company/documents GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/company/documents?file_path={path}
 * Delete a document and all its chunks from the org's knowledge base
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("file_path");
    if (!filePath) {
      return NextResponse.json({ error: "file_path is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminCheck = await requireAdmin(supabase);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { error } = await supabase.from("company_documents").delete().eq("file_path", filePath);

    if (error) {
      console.error("[api/company/documents DELETE] error:", error);
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }

    // Also remove the actual file from the knowledge-base bucket
    try {
      await deleteFromStorage(filePath);
    } catch (err) {
      console.error("[api/company/documents DELETE] storage delete error:", err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/company/documents DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function chunkText(text: string, size: number, overlap: number): string[] {
  if (!text.trim()) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    // Try to break at a sentence boundary
    let breakAt = end;
    if (end < text.length) {
      const searchStart = Math.max(start + size - 200, start);
      const searchArea = text.slice(searchStart, end + 200);
      const sentenceEnd = searchArea.search(/[.!?]\s+/);
      if (sentenceEnd !== -1) {
        breakAt = searchStart + sentenceEnd + 2; // include the punctuation + space
      }
    }
    chunks.push(text.slice(start, breakAt).trim());

    if (breakAt >= text.length) break;
    start = breakAt - overlap;
  }
  return chunks;
}
