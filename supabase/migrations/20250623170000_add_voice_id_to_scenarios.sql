alter table public.custom_scenarios add column if not exists voice_id text;
alter table public.platform_scenarios add column if not exists voice_id text;
alter table public.custom_scenarios add column if not exists avatar_name text;
alter table public.platform_scenarios add column if not exists avatar_name text;
