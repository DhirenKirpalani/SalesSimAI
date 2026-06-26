-- ============================================================
-- Platform Scenarios Table
-- Pre-built scenarios created by the platform admin
-- Visible to all authenticated users
-- ============================================================

create table if not exists public.platform_scenarios (
  id                 uuid primary key default uuid_generate_v4(),

  -- Seller's company context
  seller_company     text not null,
  seller_product     text not null,
  seller_description text not null,

  -- Buyer persona
  preset_persona_id  text,
  custom_persona     jsonb,

  -- Scenario settings
  scenario_type      text not null default 'Discovery',
  difficulty         text not null default 'Intermediate',
  duration           int  not null default 20,
  context_note       text,

  -- Display
  name               text not null,

  -- Scoring / Evaluation
  scoring_criteria   text,
  evaluation_framework text,

  created_at         timestamptz not null default now()
);

-- --------------------------------------------------------
-- Enable Row Level Security (read-only for users)
-- --------------------------------------------------------
alter table public.platform_scenarios enable row level security;

drop policy if exists "Anyone can view platform scenarios" on public.platform_scenarios;
create policy "Anyone can view platform scenarios"
  on public.platform_scenarios for select using (true);

drop policy if exists "Only admins can delete platform scenarios" on public.platform_scenarios;
create policy "Only admins can delete platform scenarios"
  on public.platform_scenarios for delete using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

