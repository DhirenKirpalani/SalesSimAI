-- Add member name and role to custom_scenarios for tracking who generated the scenario
alter table public.custom_scenarios
  add column if not exists member_name text,
  add column if not exists member_role text;
