-- Add scoring and evaluation fields to scenario tables

alter table public.custom_scenarios
  add column if not exists scoring_criteria text,
  add column if not exists evaluation_framework text;

alter table public.platform_scenarios
  add column if not exists scoring_criteria text,
  add column if not exists evaluation_framework text;
