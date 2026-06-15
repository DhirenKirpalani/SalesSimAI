-- ============================================================
-- Update profiles table: add position column + company (if missing)
-- Run this AFTER profiles.sql to upgrade an existing database
-- ============================================================

-- Step 1: Add company column if missing
-- (legacy migration for older databases)
do $$ begin
  alter table public.profiles add column company text;
exception
  when duplicate_column then null;
end $$;

-- Step 2: Add position column for job title/role in company
do $$ begin
  alter table public.profiles add column position text;
exception
  when duplicate_column then null;
end $$;
