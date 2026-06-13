-- ============================================================
-- Messages (Transcripts) Table + RLS
-- ============================================================

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  simulation_id uuid not null references public.simulations(id) on delete cascade,
  sender text not null check (sender in ('user','ai')),
  text text not null,
  timestamp text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Users can view messages for own simulations" on public.messages;
create policy "Users can view messages for own simulations"
  on public.messages for select using (
    simulation_id in (select id from public.simulations where user_id = auth.uid())
  );

drop policy if exists "Users can insert messages for own simulations" on public.messages;
create policy "Users can insert messages for own simulations"
  on public.messages for insert with check (
    simulation_id in (select id from public.simulations where user_id = auth.uid())
  );

drop policy if exists "Users can delete messages for own simulations" on public.messages;
create policy "Users can delete messages for own simulations"
  on public.messages for delete using (
    simulation_id in (select id from public.simulations where user_id = auth.uid())
  );
