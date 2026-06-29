-- Add buyer action column to simulation_messages for decision tracing.

alter table public.simulation_messages
  add column if not exists action text;
