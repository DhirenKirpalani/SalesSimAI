-- ============================================================
-- Organizations Table + RLS
-- ============================================================

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
