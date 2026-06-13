-- ============================================================
-- Session Analyses Table + RLS
-- ============================================================

create table if not exists public.session_analyses (
  id uuid primary key default uuid_generate_v4(),
  simulation_id uuid not null unique references public.simulations(id) on delete cascade,
  overall_score int not null check (overall_score >= 0 and overall_score <= 100),
  discovery int not null,
  qualification int not null,
  communication int not null,
  objection_handling int not null,
  closing int not null,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  missed_opportunities text[] not null default '{}',
  coaching_recommendations text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.session_analyses enable row level security;

drop policy if exists "Users can view analyses for own simulations" on public.session_analyses;
create policy "Users can view analyses for own simulations"
  on public.session_analyses for select using (
    simulation_id in (select id from public.simulations where user_id = auth.uid())
  );
