/**
 * Vector store service for RAG (Retrieval Augmented Generation)
 * Stores conversation turns as embeddings for semantic similarity search.
 */

import { createClient } from "@/lib/supabase/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Generate an embedding vector from text using OpenAI text-embedding-3-small.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000), // Stay well under token limit
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding error: ${err}`);
  }

  const data = await response.json();
  return data.data?.[0]?.embedding as number[];
}

interface TurnChunk {
  source: "user" | "buyer";
  content: string;
  turnIndex: number;
}

interface IngestOptions {
  sessionId: string;
  userId: string;
  scenarioType?: string;
  overallScore?: number | null;
  chunks: TurnChunk[];
}

/**
 * Ingest conversation turns into the vector store.
 * Call this AFTER the session ends (background job).
 */
export async function ingestConversationVectors(opts: IngestOptions): Promise<void> {
  const supabase = await createClient();

  // Generate embeddings for all chunks in parallel
  const embeddings = await Promise.all(
    opts.chunks.map((chunk) => embedText(chunk.content))
  );

  // Build rows for bulk insert
  const rows = opts.chunks.map((chunk, i) => ({
    session_id: opts.sessionId,
    user_id: opts.userId,
    source: chunk.source,
    content: chunk.content,
    embedding: embeddings[i] as unknown as string, // pgvector accepts array literal string
    metadata: {
      scenario_type: opts.scenarioType ?? "Unknown",
      overall_score: opts.overallScore ?? undefined,
      turn_index: chunk.turnIndex,
    },
  }));

  // Supabase JS client handles array → vector conversion automatically
  const { error } = await supabase.from("conversation_vectors").insert(rows as any);

  if (error) {
    throw new Error(`Vector insert failed: ${error.message}`);
  }
}

interface SimilarChunk {
  id: string;
  session_id: string;
  source: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Query the vector store for semantically similar conversation turns.
 * Uses the `match_vectors` PostgreSQL function via Supabase RPC.
 * Returns chunks ordered by cosine similarity (highest first).
 */
export async function querySimilarConversations(
  queryText: string,
  userId: string,
  opts?: {
    scenarioType?: string;
    source?: "user" | "buyer";
    limit?: number;
    minSimilarity?: number;
  }
): Promise<SimilarChunk[]> {
  const supabase = await createClient();
  const embedding = await embedText(queryText);

  const { data, error } = await supabase.rpc("match_vectors", {
    query_embedding: embedding,
    match_threshold: opts?.minSimilarity ?? 0.7,
    match_count: opts?.limit ?? 5,
    filter_user_id: userId,
    filter_scenario_type: opts?.scenarioType ?? null,
    filter_source: opts?.source ?? null,
  });

  if (error) {
    throw new Error(`Vector query failed: ${error.message}`);
  }

  return (data ?? []) as SimilarChunk[];
}

/**
 * Build a RAG context string from similar past buyer responses.
 * Injects "memory" of how this buyer reacted in similar past conversations.
 * Returns empty string if no similar conversations found (graceful fallback).
 */
export async function buildRagContext(
  userMessage: string,
  userId: string,
  scenarioType?: string,
  limit = 3
): Promise<string> {
  try {
    const similarBuyer = await querySimilarConversations(userMessage, userId, {
      scenarioType,
      source: "buyer",
      limit,
      minSimilarity: 0.65,
    });

    if (similarBuyer.length === 0) return "";

    const lines = similarBuyer.map((r) => `- "${r.content}"`).join("\n");

    return `PAST CONVERSATION MEMORY — similar situations from your previous calls:
${lines}

These are examples of how you reacted before. Stay consistent with your persona, but you are NOT required to copy these exactly. React naturally based on the current context.`;
  } catch {
    // Graceful fallback: if vector table doesn't exist or query fails, skip RAG
    return "";
  }
}

interface CompanyDocChunk {
  id: string;
  name: string;
  content: string;
  doc_type: string;
  similarity: number;
}

/**
 * Query company documents for semantic similarity.
 * Returns relevant chunks from the organization's knowledge base.
 */
export async function queryCompanyDocuments(
  queryText: string,
  organizationId: string | null,
  opts?: {
    docType?: string;
    limit?: number;
    minSimilarity?: number;
    userId?: string;
  }
): Promise<CompanyDocChunk[]> {
  const supabase = await createClient();
  const embedding = await embedText(queryText);

  const { data, error } = await supabase.rpc("match_company_docs", {
    query_embedding: embedding,
    match_threshold: opts?.minSimilarity ?? 0.65,
    match_count: opts?.limit ?? 5,
    filter_org_id: organizationId,
    filter_doc_type: opts?.docType ?? null,
    filter_user_id: organizationId ? null : (opts?.userId ?? null),
  });

  if (error) {
    console.error("[queryCompanyDocuments] RPC error:", error);
    return [];
  }

  return (data ?? []) as CompanyDocChunk[];
}

/**
 * Build a RAG context string from company documents using an externally provided Supabase client.
 * Use this from server-to-server routes (e.g. ElevenLabs webhook) where no user cookies exist,
 * passing a service-role client so RLS is bypassed.
 */
export async function buildCompanyRagContextWithClient(
  queryText: string,
  organizationId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any,
  opts?: {
    docType?: string;
    limit?: number;
    minSimilarity?: number;
    maxCharsPerDoc?: number;
    maxTotalChars?: number;
    userId?: string;
  }
): Promise<string> {
  try {
    const embedding = await embedText(queryText);
    const { data, error } = await supabaseClient.rpc("match_company_docs", {
      query_embedding: embedding,
      match_threshold: opts?.minSimilarity ?? 0.65,
      match_count: opts?.limit ?? 5,
      filter_org_id: organizationId,
      filter_doc_type: opts?.docType ?? null,
      filter_user_id: organizationId ? null : (opts?.userId ?? null),
    });
    if (error) {
      console.error("[buildCompanyRagContextWithClient] RPC error:", error);
      return "";
    }
    const chunks = (data ?? []) as CompanyDocChunk[];
    if (chunks.length === 0) return "";

    const uniqueDocIds = [...new Set(chunks.map((c) => c.id))];
    const { data: docs } = await supabaseClient
      .from("company_documents")
      .select("id, name, content, document_type")
      .in("id", uniqueDocIds)
      .eq("organization_id", organizationId);

    const docMap = new Map(((docs ?? []) as Array<{id: string; name: string; content: string; document_type: string}>).map((d) => [d.id, d]));
    const maxCharsPerDoc = opts?.maxCharsPerDoc ?? 50_000;
    const maxTotalChars = opts?.maxTotalChars ?? 100_000;
    let totalChars = 0;
    const lines: string[] = [];

    for (const id of uniqueDocIds) {
      const doc = docMap.get(id);
      const chunk = chunks.find((c) => c.id === id)!;
      const fullContent = doc?.content?.trim();
      if (doc && fullContent) {
        const truncated = fullContent.length > maxCharsPerDoc
          ? fullContent.slice(0, maxCharsPerDoc) + "\n[document truncated]"
          : fullContent;
        lines.push(`[${doc.document_type || chunk.doc_type}] ${doc.name || chunk.name}:\n${truncated}`);
        totalChars += truncated.length;
      } else {
        lines.push(`[${chunk.doc_type}] ${chunk.name}:\n${chunk.content}`);
        totalChars += chunk.content.length;
      }
      if (totalChars >= maxTotalChars) break;
    }

    return `COMPANY KNOWLEDGE — relevant documents for context:
${lines.join("\n\n---\n\n")}

Use this information to respond accurately when the seller asks about your company's products, pricing, or policies. You are the BUYER; you may reference this knowledge naturally, but do not volunteer it unprompted.`;
  } catch (err) {
    console.error("[buildCompanyRagContextWithClient] error:", err);
    return "";
  }
}

/**
 * Build a RAG context string from company documents.
 * Uses semantic search to pick the most relevant documents, then sends the full document text
 * so the buyer has richer context than isolated chunks.
 */
export async function buildCompanyRagContext(
  queryText: string,
  organizationId: string,
  opts?: {
    docType?: string;
    limit?: number;
    minSimilarity?: number;
    maxCharsPerDoc?: number;
    maxTotalChars?: number;
  }
): Promise<string> {
  try {
    const chunks = await queryCompanyDocuments(queryText, organizationId, opts);
    if (chunks.length === 0) return "";

    const supabase = await createClient();

    // Fetch the full document text for each document that produced a matching chunk
    const uniqueDocIds = [...new Set(chunks.map((c) => c.id))];
    const { data: docs } = await supabase
      .from("company_documents")
      .select("id, name, content, document_type")
      .in("id", uniqueDocIds)
      .eq("organization_id", organizationId);

    const docMap = new Map((docs ?? []).map((d) => [d.id, d]));

    const maxCharsPerDoc = opts?.maxCharsPerDoc ?? 50_000;
    const maxTotalChars = opts?.maxTotalChars ?? 100_000;

    let totalChars = 0;
    const lines: string[] = [];

    for (const id of uniqueDocIds) {
      const doc = docMap.get(id);
      const chunk = chunks.find((c) => c.id === id)!;
      const fullContent = doc?.content?.trim();
      if (doc && fullContent) {
        const truncated =
          fullContent.length > maxCharsPerDoc
            ? fullContent.slice(0, maxCharsPerDoc) + "\n[document truncated due to length]"
            : fullContent;
        if (fullContent.length > maxCharsPerDoc) {
          console.warn(`[buildCompanyRagContext] truncated document ${doc.name} from ${fullContent.length} to ${maxCharsPerDoc} chars`);
        }
        lines.push(`[${doc.document_type || chunk.doc_type}] ${doc.name || chunk.name}:\n${truncated}`);
        totalChars += truncated.length;
      } else {
        // Fallback for older documents uploaded before full-text storage
        lines.push(`[${chunk.doc_type}] ${chunk.name}:\n${chunk.content}`);
        totalChars += chunk.content.length;
      }

      if (totalChars >= maxTotalChars) {
        console.warn(`[buildCompanyRagContext] total context exceeded ${maxTotalChars} chars; truncating remaining documents`);
        break;
      }
    }

    return `COMPANY KNOWLEDGE — relevant documents for context:
${lines.join("\n\n---\n\n")}

Use this information to respond accurately when the seller asks about your company's products, pricing, or policies. You are the BUYER; you may reference this knowledge naturally, but do not volunteer it unprompted.`;
  } catch (err) {
    console.error("[buildCompanyRagContext] error:", err);
    return "";
  }
}
