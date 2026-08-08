-- Make organization_id nullable on company_documents to support personal knowledge bases
alter table public.company_documents
  alter column organization_id drop not null;

-- Add user_id column to company_documents for personal mode filtering
alter table public.company_documents
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Index for user-level filtering (personal mode)
create index if not exists idx_company_docs_user
  on public.company_documents using btree (user_id);

-- Update RLS: users can view their own personal documents (org_id is null)
drop policy if exists "Users can view org documents" on public.company_documents;
create policy "Users can view org documents"
  on public.company_documents for select using (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
    or (organization_id is null and user_id = auth.uid())
  );

-- Update RLS: users can insert personal documents
drop policy if exists "Users can insert org documents" on public.company_documents;
create policy "Users can insert org documents"
  on public.company_documents for insert with check (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
    or (organization_id is null and user_id = auth.uid())
  );

-- Update chunk RLS to allow personal docs
drop policy if exists "Users can view org document chunks" on public.company_document_chunks;
create policy "Users can view org document chunks"
  on public.company_document_chunks for select using (
    document_id in (
      select id from public.company_documents
      where organization_id in (
        select organization_id from public.profiles where id = auth.uid()
      )
      or (organization_id is null and user_id = auth.uid())
    )
  );

drop policy if exists "Users can insert org document chunks" on public.company_document_chunks;
create policy "Users can insert org document chunks"
  on public.company_document_chunks for insert with check (
    document_id in (
      select id from public.company_documents
      where organization_id in (
        select organization_id from public.profiles where id = auth.uid()
      )
      or (organization_id is null and user_id = auth.uid())
    )
  );

-- Update match_company_docs RPC to support null org_id (filter by user_id instead)
create or replace function public.match_company_docs(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  filter_org_id uuid default null,
  filter_doc_type text default null,
  filter_user_id uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  doc_type text,
  document_type text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    c.content,
    d.doc_type,
    d.document_type,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.company_document_chunks c
  join public.company_documents d on d.id = c.document_id
  where (
    (filter_org_id is not null and d.organization_id = filter_org_id)
    or (filter_org_id is null and filter_user_id is not null and d.user_id = filter_user_id and d.organization_id is null)
  )
  and (filter_doc_type is null or d.doc_type = filter_doc_type)
  and c.embedding is not null
  and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
