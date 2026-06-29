-- Add pre-rendered static buyer context to simulation_sessions for prompt caching.
-- This stores the immutable system-prompt context (persona, scenario, rules, etc.)
-- so it only needs to be built once per session.

alter table public.simulation_sessions
  add column if not exists buyer_context jsonb;
