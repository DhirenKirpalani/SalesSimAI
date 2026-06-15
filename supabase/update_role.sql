-- ============================================================
-- Update existing profiles: migrate role column to app_role enum
-- Run this AFTER profiles.sql if upgrading an existing database
-- ============================================================

-- Step 1: Create the enum if it does not exist yet
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception
  when duplicate_object then null;
end $$;

-- Step 2: Drop the old incompatible default
alter table public.profiles
  alter column role drop default;

-- Step 3: Normalize existing text values to valid enum values
update public.profiles set role = 'user' where role not in ('admin', 'user') or role is null;

-- Step 4: Alter the role column to use the new enum
alter table public.profiles
  alter column role type public.app_role
  using (role::public.app_role);

-- Step 5: Set default so new users are regular users
alter table public.profiles
  alter column role set default 'user';

-- Step 6: Add position column if missing
do $$ begin
  alter table public.profiles add column position text;
exception
  when duplicate_column then null;
end $$;

-- Step 7: Promote a specific user to admin (update email as needed)
-- update public.profiles set role = 'admin' where email = 'admin@example.com';
