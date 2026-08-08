import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/vector-store";
import { extractTextFromBuffer } from "@/lib/extract-text";
import { createHash } from "crypto";

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
  orgId: string | null,
  orgName: string,
  userId: string,
  productType: string,
  documentType: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const folderKey = orgId ? deriveOrgFolderName(orgId, orgName) : `personal-${userId.toLowerCase()}`;
  const index = await getNextIndex(KNOWLEDGE_BASE_BUCKET, folderKey, productType, documentType);
  const path = getStoragePath(folderKey, productType, documentType, index, fileName);

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


async function requireOrgMember(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.organization_id ?? null;

  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by, name")
      .eq("id", orgId)
      .single();
    return { user, orgId, orgName: org?.name ?? "", userId: user.id };
  }

  // Personal mode — no org required
  return { user, orgId: null, orgName: "Personal", userId: user.id };
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  const orgId = profile?.organization_id ?? null;

  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by, name")
      .eq("id", orgId)
      .single();

    const isOrgAdmin = org?.created_by === user.id || profile?.role === "admin";
    if (!isOrgAdmin) return { error: "Only admin can manage documents", status: 403 };

    return { user, orgId, orgName: org?.name ?? "", userId: user.id };
  }

  // Personal mode — user is always their own admin
  return { user, orgId: null, orgName: "Personal", userId: user.id };
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const CHUNK_SIZE = 3000; // ~3000 chars per chunk (roughly 750 tokens)
const CHUNK_OVERLAP = 200;
const SEMANTIC_DUPLICATE_THRESHOLD = 0.92; // cosine similarity threshold for near-duplicate chunks

const DOCUMENT_TYPES = [
  "icp",
  "value_prop",
  "competitive",
  "objection_handling",
  "product_pricing",
  "process_methodology",
  "transcript",
];

// ── Deduplication helpers ──────────────────────────────────────────────────

function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function findExistingFileByHash(
  svc: ReturnType<typeof serviceSupabase>,
  orgId: string | null,
  userId: string,
  fileHash: string
): Promise<{ id: string; name: string } | null> {
  let query = svc.from("company_documents").select("id, name").eq("file_hash", fileHash);
  if (orgId) query = query.eq("organization_id", orgId);
  else query = query.is("organization_id", null).eq("user_id", userId);
  const { data, error } = await query.maybeSingle();
  if (error) console.error("[findExistingFileByHash] error:", error);
  return data ?? null;
}

async function findExistingContentByHash(
  svc: ReturnType<typeof serviceSupabase>,
  orgId: string | null,
  userId: string,
  contentHash: string
): Promise<{ id: string; name: string } | null> {
  let query = svc.from("company_documents").select("id, name").eq("content_hash", contentHash);
  if (orgId) query = query.eq("organization_id", orgId);
  else query = query.is("organization_id", null).eq("user_id", userId);
  const { data, error } = await query.maybeSingle();
  if (error) console.error("[findExistingContentByHash] error:", error);
  return data ?? null;
}

async function findExistingChunkByHash(
  svc: ReturnType<typeof serviceSupabase>,
  chunkHash: string
): Promise<boolean> {
  const { data, error } = await svc
    .from("company_document_chunks")
    .select("id", { count: "exact", head: true })
    .eq("chunk_hash", chunkHash);
  if (error) {
    console.error("[findExistingChunkByHash] error:", error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

async function findSemanticallySimilarChunks(
  svc: ReturnType<typeof serviceSupabase>,
  orgId: string | null,
  userId: string,
  embedding: number[],
  threshold: number,
  limit: number
): Promise<{ id: string; similarity: number }[]> {
  const { data, error } = await svc.rpc("match_company_docs", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
    filter_org_id: orgId,
    filter_doc_type: null,
    filter_user_id: orgId ? null : userId,
  });
  if (error) {
    console.error("[findSemanticallySimilarChunks] error:", error);
    return [];
  }
  return (data ?? []).map((row: any) => ({ id: row.id, similarity: row.similarity }));
}

async function classifyDocumentType(text: string, fileName: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "icp";

  const sample = text.slice(0, 4000);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a document classifier for a knowledge base.

Read the file name and text, then classify the document into exactly one bucket:
- ICP: Target audience, personas, profiles of who you work with
- Value Prop: Value proposition, benefits, ROI, why use this
- Competitive: Competitive analysis, competitor comparison, alternatives
- Objection Handling: Common questions, concerns, rebuttals, FAQ
- Product/Pricing: Product features, pricing, packages, tiers
- Process/Methodology: Processes, methodologies, playbooks, workflows
- Transcript: Real conversation transcript, meeting transcript, or dialogue record

Respond with only a JSON object:
{
  "bucket": "exactly one of: ICP, Value Prop, Competitive, Objection Handling, Product/Pricing, Process/Methodology, Transcript",
  "confidence": 0.0-1.0,
  "summary": "one sentence about what the document contains"
}

No other text.`,
        },
        {
          role: "user",
          content: `File name: ${fileName}\n\nText:\n${sample}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("[classifyDocumentType] OpenAI error:", await response.text());
    return "icp";
  }

  try {
    const data = await response.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const bucketMap: Record<string, string> = {
      ICP: "icp",
      "Value Prop": "value_prop",
      Competitive: "competitive",
      "Objection Handling": "objection_handling",
      "Product/Pricing": "product_pricing",
      "Process/Methodology": "process_methodology",
      Transcript: "transcript",
    };
    const mapped = bucketMap[result.bucket];
    if (mapped && DOCUMENT_TYPES.includes(mapped)) return mapped;
  } catch (e) {
    console.error("[classifyDocumentType] parse error:", e);
  }
  return "icp";
}

/**
 * POST /api/company/documents
 * Upload documents via FormData, extract text, chunk, embed, store
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const productType = formData.get("productType") as string;
    const documentType = formData.get("documentType") as string;
    const bulkUpload = formData.get("bulkUpload") === "true";
    const files: File[] = [];

    formData.forEach((value, key) => {
      if (value instanceof File && key === "files") {
        files.push(value);
      }
    });

    if (!productType || files.length === 0) {
      return NextResponse.json({ error: "productType and files are required" }, { status: 400 });
    }

    if (!bulkUpload && !documentType) {
      return NextResponse.json({ error: "documentType is required for manual upload" }, { status: 400 });
    }

    const allowedProductTypes = ["payment", "eor", "cards", "general"];
    if (!allowedProductTypes.includes(productType)) {
      return NextResponse.json({ error: "Invalid productType" }, { status: 400 });
    }

    const allowedDocumentTypes = ["icp", "value_prop", "competitive", "objection_handling", "product_pricing", "process_methodology", "transcript"];
    if (!bulkUpload && !allowedDocumentTypes.includes(documentType)) {
      return NextResponse.json({ error: "Invalid documentType" }, { status: 400 });
    }

    const supabase = await createClient();
    const adminCheck = await requireAdmin(supabase);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }
    const { user, orgId, orgName, userId } = adminCheck;
    const svc = serviceSupabase();

    let totalChunks = 0;
    let totalSkippedChunks = 0;
    const insertedDocs: any[] = [];
    const skippedFiles: { name: string; reason: string; existingDocumentId?: string }[] = [];

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

      // ── File-level deduplication ─────────────────────────────────────────────
      const fileHash = sha256Buffer(fileBuffer);
      const existingFile = await findExistingFileByHash(svc, orgId, userId, fileHash);
      if (existingFile) {
        skippedFiles.push({
          name,
          reason: "duplicate_file",
          existingDocumentId: existingFile.id,
        });
        continue;
      }

      // ── Content-level deduplication ────────────────────────────────────────
      const contentHash = sha256Text(textContent.trim());
      const existingContent = await findExistingContentByHash(svc, orgId, userId, contentHash);
      if (existingContent) {
        skippedFiles.push({
          name,
          reason: "duplicate_content",
          existingDocumentId: existingContent.id,
        });
        continue;
      }

      // In bulk mode, let AI classify the document type based on the text
      const effectiveDocumentType = bulkUpload
        ? await classifyDocumentType(textContent.trim(), name)
        : documentType;

      // Upload the actual file to the shared knowledge-base bucket under the org's folder
      let filePath: string;
      try {
        filePath = await uploadToOrgFolder(orgId, orgName, userId, productType, effectiveDocumentType, name, fileBuffer, mimeType);
      } catch (err: any) {
        console.error("[api/company/documents] storage upload error:", err);
        return NextResponse.json({ error: err.message || "Storage upload failed" }, { status: 500 });
      }

      // Chunk the text
      const chunks = chunkText(textContent.trim(), CHUNK_SIZE, CHUNK_OVERLAP);

      // Create the document metadata row (full text is stored for rich AI context)
      const { data: docRecord, error: docErr } = await supabase
        .from("company_documents")
        .insert({
          organization_id: orgId,
          user_id: orgId ? null : userId,
          name: name.trim(),
          content: textContent.trim(),
          doc_type: productType,
          document_type: effectiveDocumentType,
          file_path: filePath,
          file_hash: fileHash,
          content_hash: contentHash,
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
        const chunkHash = sha256Text(chunks[i]);

        // ── Exact chunk-level deduplication ─────────────────────────────────
        const existingChunkHash = await findExistingChunkByHash(svc, chunkHash);
        if (existingChunkHash) {
          totalSkippedChunks++;
          continue;
        }

        const embedding = await embedText(chunks[i]);

        // ── Semantic chunk-level deduplication ──────────────────────────────
        const similarChunks = await findSemanticallySimilarChunks(
          svc,
          orgId,
          userId,
          embedding,
          SEMANTIC_DUPLICATE_THRESHOLD,
          1
        );
        if (similarChunks.length > 0) {
          totalSkippedChunks++;
          continue;
        }

        chunkRows.push({
          document_id: docRecord.id,
          content: chunks[i],
          embedding: embedding as unknown as string,
          chunk_index: i,
          chunk_hash: chunkHash,
        });
      }

      if (chunkRows.length > 0) {
        const { error: chunkErr } = await supabase
          .from("company_document_chunks")
          .insert(chunkRows);

        if (chunkErr) {
          console.error("[api/company/documents] chunk insert error:", chunkErr);
          return NextResponse.json({ error: "Failed to store document chunks" }, { status: 500 });
        }
      }

      totalChunks += chunkRows.length;
      insertedDocs.push({
        ...docRecord,
        totalChunks: chunks.length,
        newChunks: chunkRows.length,
        skippedChunks: chunks.length - chunkRows.length,
      });
    }

    return NextResponse.json({
      success: true,
      chunks: totalChunks,
      skippedChunks: totalSkippedChunks,
      documents: insertedDocs,
      skippedFiles,
    });
  } catch (err) {
    console.error("[api/company/documents POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/company/documents
 * List documents for the user's organization (one row per uploaded file)
 * Optional: ?document_type=competitive returns content for that type
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get("document_type") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const supabase = await createClient();
    const adminCheck = await requireOrgMember(supabase);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }
    const { orgId, userId } = adminCheck;

    // Use service role to bypass RLS so all org members can read documents
    const svc = serviceSupabase();
    
    // Only fetch content when filtering by document_type (for specific use cases)
    // Otherwise, skip content to reduce payload size dramatically
    const selectFields = documentType
      ? "id, name, doc_type, document_type, file_path, created_at, created_by, content"
      : "id, name, doc_type, document_type, file_path, created_at, created_by";
    
    let query = svc
      .from("company_documents")
      .select(selectFields, { count: "exact" });

    if (orgId) {
      query = query.eq("organization_id", orgId);
    } else {
      query = query.is("organization_id", null).eq("user_id", userId);
    }

    if (documentType) {
      query = query.eq("document_type", documentType);
    }

    const { data: rows, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Enrich with creator info
    const creatorIds = [...new Set((rows ?? []).map((d: any) => d.created_by).filter(Boolean))];
    let creators: Record<string, { full_name: string | null; email: string; role: string | null }> = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await svc
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", creatorIds);
      for (const p of profiles ?? []) {
        creators[p.id] = { full_name: p.full_name, email: p.email, role: p.role };
      }
    }

    const response = NextResponse.json({
      documents: (rows ?? []).map((d: any) => ({
        ...d,
        creator_name: creators[d.created_by ?? ""]?.full_name || null,
        creator_email: creators[d.created_by ?? ""]?.email || null,
        creator_role: creators[d.created_by ?? ""]?.role || null,
        chunk_count: 0, // frontend can optionally fetch this; not needed for the list
      })),
      total: count ?? 0,
      limit,
      offset,
      hasMore: (count ?? 0) > offset + limit,
    });
    response.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=60");
    return response;
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
