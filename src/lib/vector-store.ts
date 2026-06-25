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
