-- ============================================================
-- Simulation Sessions Table
-- ============================================================

create table if not exists public.simulation_sessions (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  scenario_id    uuid not null,
  scenario_table text not null default 'custom_scenarios',
  status         text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  state          jsonb not null default '{
    "trust_level": 50,
    "buyer_mood": 0,
    "stage": "opening",
    "facts_discovered": {
      "budget": false,
      "decision_maker": false,
      "timeline": false,
      "current_solution": false
    },
    "objections_used": [],
    "engagement_level": 50
  }',
  heygen_session_id text,
  buyer_context  jsonb,
  buyer_memory   jsonb not null default '{
    "pain_points_discovered": [],
    "objections_raised": [],
    "seller_promises": [],
    "unanswered_questions": []
  }',
  analysis       jsonb,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.simulation_sessions enable row level security;

drop policy if exists "Users manage own sessions" on public.simulation_sessions;
create policy "Users manage own sessions"
  on public.simulation_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Simulation Messages Table
-- ============================================================

create table if not exists public.simulation_messages (
  id         uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.simulation_sessions(id) on delete cascade,
  role       text not null check (role in ('user', 'buyer')),
  content    text not null,
  emotion    text,
  intent     text,
  created_at timestamptz not null default now()
);

alter table public.simulation_messages enable row level security;

drop policy if exists "Users manage messages in own sessions" on public.simulation_messages;
create policy "Users manage messages in own sessions"
  on public.simulation_messages for all
  using (
    session_id in (
      select id from public.simulation_sessions where user_id = auth.uid()
    )
  )
  with check (
    session_id in (
      select id from public.simulation_sessions where user_id = auth.uid()
    )
  );
