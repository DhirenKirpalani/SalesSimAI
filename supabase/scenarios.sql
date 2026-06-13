-- ============================================================
-- Scenarios Table + RLS
-- ============================================================

create table if not exists public.scenarios (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  industry text not null,
  difficulty text not null check (difficulty in ('Beginner','Intermediate','Advanced','Expert')),
  duration int not null,
  persona_id uuid references public.buyer_personas(id) on delete set null,
  description text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.scenarios enable row level security;

drop policy if exists "Scenarios are viewable by everyone" on public.scenarios;
create policy "Scenarios are viewable by everyone"
  on public.scenarios for select using (true);
