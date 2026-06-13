-- ============================================================
-- Buyer Personas Table + RLS
-- ============================================================

create table if not exists public.buyer_personas (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  job_title text not null,
  company text not null,
  industry text not null,
  personality text not null,
  pain_points text[] not null default '{}',
  goals text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.buyer_personas enable row level security;

drop policy if exists "Personas are viewable by everyone" on public.buyer_personas;
create policy "Personas are viewable by everyone"
  on public.buyer_personas for select using (true);
