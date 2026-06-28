-- ============================================================
-- Link custom and platform scenarios to organizations
-- ============================================================

-- 1. Add org / owner columns to custom_scenarios
alter table public.custom_scenarios
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_custom_scenarios_org_id
  on public.custom_scenarios(organization_id);

-- 2. Add org / owner columns to platform_scenarios
alter table public.platform_scenarios
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_platform_scenarios_org_id
  on public.platform_scenarios(organization_id);

-- 3. Update custom_scenarios RLS policies
alter table public.custom_scenarios enable row level security;

drop policy if exists "Users can view own custom scenarios" on public.custom_scenarios;
create policy "Users can view own custom scenarios"
  on public.custom_scenarios for select using (
    auth.uid() = user_id
    or auth.uid() = created_by
    or organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "Users can insert own custom scenarios" on public.custom_scenarios;
create policy "Users can insert own custom scenarios"
  on public.custom_scenarios for insert with check (
    auth.uid() = user_id
    and (
      organization_id is null
      or organization_id in (
        select organization_id from public.profiles where id = auth.uid()
      )
    )
  );

drop policy if exists "Users can update own custom scenarios" on public.custom_scenarios;
create policy "Users can update own custom scenarios"
  on public.custom_scenarios for update using (
    auth.uid() = user_id
    or auth.uid() = created_by
    or organization_id in (
      select id from public.organizations where created_by = auth.uid()
    )
  );

drop policy if exists "Users can delete own custom scenarios" on public.custom_scenarios;
create policy "Users can delete own custom scenarios"
  on public.custom_scenarios for delete using (
    auth.uid() = user_id
    or auth.uid() = created_by
    or organization_id in (
      select id from public.organizations where created_by = auth.uid()
    )
  );

-- 4. Update platform_scenarios RLS policy
alter table public.platform_scenarios enable row level security;

drop policy if exists "Anyone can view platform scenarios" on public.platform_scenarios;
create policy "Anyone can view platform scenarios"
  on public.platform_scenarios for select using (
    organization_id is null
    or organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );
