-- ============================================================
-- Custom Scenarios Table + RLS
-- Run this in the Supabase SQL Editor
-- ============================================================

create table if not exists public.custom_scenarios (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid references auth.users on delete cascade not null,

  -- Seller's company context (what the user sells)
  seller_company     text not null,
  seller_product     text not null,
  seller_description text not null,

  -- Buyer persona (preset id OR fully custom jsonb)
  preset_persona_id  text,
  custom_persona     jsonb,

  -- Scenario settings
  scenario_type      text not null default 'Discovery',
  difficulty         text not null default 'Intermediate',
  duration           int  not null default 20,
  context_note       text,

  -- Derived display fields
  name               text not null,

  -- Scoring / Evaluation
  scoring_criteria   text,
  evaluation_framework text,

  created_at         timestamptz not null default now()
);

-- --------------------------------------------------------
-- Enable Row Level Security
-- --------------------------------------------------------
alter table public.custom_scenarios enable row level security;

drop policy if exists "Users can view own custom scenarios" on public.custom_scenarios;
create policy "Users can view own custom scenarios"
  on public.custom_scenarios for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own custom scenarios" on public.custom_scenarios;
create policy "Users can insert own custom scenarios"
  on public.custom_scenarios for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own custom scenarios" on public.custom_scenarios;
create policy "Users can update own custom scenarios"
  on public.custom_scenarios for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own custom scenarios" on public.custom_scenarios;
create policy "Users can delete own custom scenarios"
  on public.custom_scenarios for delete using (auth.uid() = user_id);

