-- Add avatar_id to scenario tables so each scenario can have a default avatar

alter table public.custom_scenarios add column if not exists avatar_id text;
alter table public.platform_scenarios add column if not exists avatar_id text;
