-- ============================================================
-- Company Knowledge Base Schema
-- Organization invite flow + Company documents with RAG
-- Run this AFTER organizations.sql and profiles.sql
-- ============================================================

-- Ensure organizations table exists first (self-contained)
create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  plan text not null default 'Starter' check (plan in ('Starter','Growth','Enterprise')),
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

drop policy if exists "Organizations are viewable by everyone" on public.organizations;
create policy "Organizations are viewable by everyone"
  on public.organizations for select using (true);

drop policy if exists "Authenticated users can create organizations" on public.organizations;
create policy "Authenticated users can create organizations"
  on public.organizations for insert with check (true);

drop policy if exists "Org admin can update their organization" on public.organizations;
create policy "Org admin can update their organization"
  on public.organizations for update using (created_by = auth.uid());

-- 1. Add organization_id to profiles (FK to organizations)
alter table public.profiles add column if not exists organization_id uuid
  references public.organizations(id) on delete set null;

-- Index for fast org lookups
create index if not exists idx_profiles_organization_id on public.profiles(organization_id);

-- 2. Add created_by (admin) to organizations
alter table public.organizations add column if not exists created_by uuid
  references auth.users(id) on delete set null;

-- 2b. Add branding + invite restriction columns
alter table public.organizations add column if not exists logo_url text;
alter table public.organizations add column if not exists theme_color text default '#0f172a';
alter table public.organizations add column if not exists email_domain text;
alter table public.organizations add column if not exists profile_data jsonb;
alter table public.organizations add column if not exists source_urls text[] default '{}';

-- 3. Organization invites table
-- Admins invite by email; invitees accept to join

create table if not exists public.organization_invites (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.organization_invites enable row level security;

create unique index if not exists idx_invites_org_email
  on public.organization_invites(organization_id, email)
  where status = 'pending';

-- RLS: org members can view invites for their org
drop policy if exists "Org members can view invites" on public.organization_invites;
create policy "Org members can view invites"
  on public.organization_invites for select using (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );

-- RLS: only org admin (created_by) can insert invites
drop policy if exists "Org admins can create invites" on public.organization_invites;
create policy "Org admins can create invites"
  on public.organization_invites for insert with check (
    invited_by = auth.uid() and
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.created_by = auth.uid()
    )
  );

-- RLS: invitee can accept their own invite (update status)
drop policy if exists "Invitees can accept own invite" on public.organization_invites;
create policy "Invitees can accept own invite"
  on public.organization_invites for update using (
    email = (select email from auth.users where id = auth.uid())
  );

-- 4. Company documents table (knowledge base per org)
-- Stores one row per uploaded file (metadata only)

create table if not exists public.company_documents (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,                        -- "Reviews GPT.pdf"
  content text not null default '',          -- kept empty; chunks store the text
  doc_type text not null default 'eor'     -- payment | eor | cards (product type)
    check (doc_type in ('payment','eor','cards')),
  document_type text not null default 'icp' -- icp | value_prop | competitive | objection_handling | product_pricing | process_methodology | transcript
    check (document_type in ('icp','value_prop','competitive','objection_handling','product_pricing','process_methodology','transcript')),
  file_path text,                            -- original file in storage bucket
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.company_documents enable row level security;

-- Index for org-level filtering
create index if not exists idx_company_docs_org_type
  on public.company_documents using btree (organization_id, doc_type);

-- RLS: only users in the same org can see their org's documents
drop policy if exists "Users can view org documents" on public.company_documents;
create policy "Users can view org documents"
  on public.company_documents for select using (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );

-- RLS: only org members can insert documents
drop policy if exists "Users can insert org documents" on public.company_documents;
create policy "Users can insert org documents"
  on public.company_documents for insert with check (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );

-- RLS: only doc creator or org admin can delete
drop policy if exists "Doc creator or admin can delete" on public.company_documents;
create policy "Doc creator or admin can delete"
  on public.company_documents for delete using (
    created_by = auth.uid() or
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.created_by = auth.uid()
    )
  );

-- 5. Company document chunks table
-- Stores text chunks + embeddings for RAG

create table if not exists public.company_document_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.company_documents(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  chunk_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.company_document_chunks enable row level security;

create index if not exists idx_company_document_chunks_document_id
  on public.company_document_chunks(document_id);

-- HNSW index for semantic search
create index if not exists idx_company_document_chunks_embedding
  on public.company_document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- RLS: only users in the same org can see their document chunks
drop policy if exists "Users can view org document chunks" on public.company_document_chunks;
create policy "Users can view org document chunks"
  on public.company_document_chunks for select using (
    document_id in (
      select id from public.company_documents
      where organization_id in (
        select organization_id from public.profiles where id = auth.uid()
      )
    )
  );

-- RLS: only org members can insert chunks for their documents
drop policy if exists "Users can insert org document chunks" on public.company_document_chunks;
create policy "Users can insert org document chunks"
  on public.company_document_chunks for insert with check (
    document_id in (
      select id from public.company_documents
      where organization_id in (
        select organization_id from public.profiles where id = auth.uid()
      )
    )
  );

-- RLS: only doc creator or org admin can delete chunks
drop policy if exists "Doc creator or admin can delete chunks" on public.company_document_chunks;
create policy "Doc creator or admin can delete chunks"
  on public.company_document_chunks for delete using (
    document_id in (
      select id from public.company_documents
      where created_by = auth.uid()
         or organization_id in (
           select id from public.organizations where created_by = auth.uid()
         )
    )
  );

-- 6. PostgreSQL function: semantic search on company_document_chunks
-- Called from vector-store.ts as supabase.rpc('match_company_docs', {...})

create or replace function public.match_company_docs(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_org_id uuid
)
returns table (
  id uuid,
  name text,
  content text,
  doc_type text,
  similarity float
)
language sql
stable
as $$
  select
    d.id,
    d.name,
    c.content,
    d.doc_type,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.company_document_chunks c
  join public.company_documents d on d.id = c.document_id
  where d.organization_id = filter_org_id
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
