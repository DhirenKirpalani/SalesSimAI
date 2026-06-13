-- ============================================================
-- Simulations Table + RLS
-- ============================================================

create table if not exists public.simulations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  score int not null check (score >= 0 and score <= 100),
  duration int not null,
  status text not null default 'completed' check (status in ('completed','in-progress','abandoned')),
  created_at timestamptz not null default now()
);

alter table public.simulations enable row level security;

drop policy if exists "Users can view own simulations" on public.simulations;
create policy "Users can view own simulations"
  on public.simulations for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own simulations" on public.simulations;
create policy "Users can insert own simulations"
  on public.simulations for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own simulations" on public.simulations;
create policy "Users can update own simulations"
  on public.simulations for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own simulations" on public.simulations;
create policy "Users can delete own simulations"
  on public.simulations for delete using (auth.uid() = user_id);
