-- Cache for AI-extracted dashboard intelligence per org/product type
-- Avoids calling OpenAI on every product-type switch when source data hasn't changed

create table if not exists public.dashboard_intelligence (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_type text not null check (product_type in ('payment','eor','cards')),
  objections text[] not null default '{}',
  insights text[] not null default '{}',
  use_cases text[] not null default '{}',
  industries text[] not null default '{}',
  source_hash text not null, -- hash of the combined source text
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_type)
);

alter table public.dashboard_intelligence enable row level security;

-- Index for fast lookups
create index if not exists idx_dashboard_intelligence_org_product
  on public.dashboard_intelligence (organization_id, product_type);

-- RLS: org members can view their own cached intelligence
drop policy if exists "Org members can view dashboard intelligence" on public.dashboard_intelligence;
create policy "Org members can view dashboard intelligence"
  on public.dashboard_intelligence for select using (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );

-- RLS: org members can upsert their own cached intelligence
drop policy if exists "Org members can manage dashboard intelligence" on public.dashboard_intelligence;
create policy "Org members can manage dashboard intelligence"
  on public.dashboard_intelligence for all using (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );
