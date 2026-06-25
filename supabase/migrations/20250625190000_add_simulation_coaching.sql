-- Add missing duration_s column to simulation_sessions
alter table public.simulation_sessions add column if not exists duration_s integer;

-- Create coaching results table for voice call evaluations
create table if not exists public.simulation_coaching (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.simulation_sessions(id) on delete cascade,
  discovery_score integer not null default 0,
  objection_score integer not null default 0,
  empathy_score integer not null default 0,
  overall_score integer not null default 0,
  missed_opportunities text[] not null default '{}',
  recommendations text[] not null default '{}',
  discovery_coverage jsonb not null default '{}',
  created_at timestamp with time zone default now(),

  unique (session_id)
);

-- Index for fast lookup by session
CREATE INDEX IF NOT EXISTS idx_simulation_coaching_session_id ON public.simulation_coaching(session_id);

-- Enable RLS
alter table public.simulation_coaching enable row level security;

-- Allow users to read coaching for their own sessions
CREATE POLICY "Users can read their own coaching"
  ON public.simulation_coaching
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.simulation_sessions ss
      WHERE ss.id = simulation_coaching.session_id AND ss.user_id = auth.uid()
    )
  );

-- Allow users to insert/update coaching for their own sessions
CREATE POLICY "Users can upsert their own coaching"
  ON public.simulation_coaching
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.simulation_sessions ss
      WHERE ss.id = simulation_coaching.session_id AND ss.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.simulation_sessions ss
      WHERE ss.id = simulation_coaching.session_id AND ss.user_id = auth.uid()
    )
  );
