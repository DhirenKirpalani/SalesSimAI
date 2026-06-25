-- Enable vector extension (run in Supabase Dashboard SQL Editor if this fails as non-superuser)
create extension if not exists vector with schema extensions;

-- Table to store conversation chunks with vector embeddings for RAG
-- Each row = one turn (user or buyer message) from a call
create table if not exists public.conversation_vectors (
  id uuid default gen_random_uuid() primary key,
  session_id uuid,  -- nullable: works for both simulation_sessions and heygen_sessions
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('user', 'buyer')),
  content text not null,
  embedding vector(1536) not null,        -- OpenAI text-embedding-3-small = 1536 dims
  metadata jsonb default '{}',             -- {"scenario_type":"Discovery Call","score":72,"turn_index":3}
  created_at timestamptz default now()
);

-- HNSW index for fast approximate nearest neighbor search (cosine similarity)
create index if not exists idx_conversation_vectors_embedding
  on public.conversation_vectors
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Index for filtering by user + scenario_type before vector search
CREATE INDEX IF NOT EXISTS idx_conversation_vectors_user_scenario
  ON public.conversation_vectors USING btree (user_id, ((metadata->>'scenario_type')));

-- Enable RLS
alter table public.conversation_vectors enable row level security;

-- Drop existing policy if it exists (prevents duplicate policy error on re-run)
drop policy if exists "Users can CRUD their own conversation vectors" on public.conversation_vectors;

create policy "Users can CRUD their own conversation vectors"
  on public.conversation_vectors
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- PostgreSQL function for semantic similarity search via Supabase RPC
-- Called as: supabase.rpc('match_vectors', { query_embedding: [...], match_threshold: 0.7, match_count: 5 })
create or replace function public.match_vectors(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_user_id uuid default null,
  filter_scenario_type text default null,
  filter_source text default null
)
returns table (
  id uuid,
  session_id uuid,
  source text,
  content text,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    cv.id,
    cv.session_id,
    cv.source,
    cv.content,
    cv.metadata,
    cv.created_at,
    1 - (cv.embedding <=> query_embedding) as similarity
  from public.conversation_vectors cv
  where
    (filter_user_id is null or cv.user_id = filter_user_id)
    and (filter_scenario_type is null or cv.metadata->>'scenario_type' = filter_scenario_type)
    and (filter_source is null or cv.source = filter_source)
    and 1 - (cv.embedding <=> query_embedding) > match_threshold
  order by cv.embedding <=> query_embedding
  limit match_count;
$$;
