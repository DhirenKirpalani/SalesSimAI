-- ============================================================
-- Profiles Table + Functions + Triggers + RLS
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- --------------------------------------------------------
-- 1. Create profiles table (extends auth.users)
-- --------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  email text not null,
  role text not null default 'Sales Rep',
  company text,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------
-- 2. Enable Row Level Security
-- --------------------------------------------------------
alter table public.profiles enable row level security;

-- --------------------------------------------------------
-- 3. RLS Policies
-- --------------------------------------------------------
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- --------------------------------------------------------
-- 4. Function: Auto-create profile on new user signup
-- --------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, company)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'company'
  );
  return new;
end;
$$ language plpgsql security definer;

-- --------------------------------------------------------
-- 5. Trigger: Run function after auth user created
-- --------------------------------------------------------
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Revoke execute from public roles (trigger only, not RPC)
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
