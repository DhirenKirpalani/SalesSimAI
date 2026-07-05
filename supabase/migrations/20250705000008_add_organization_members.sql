-- ============================================================
-- Organization Members (many-to-many) + migration from profiles.organization_id
-- ============================================================

create table if not exists public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.organization_members enable row level security;

-- Seed existing memberships from profiles.organization_id
do $$
begin
  insert into public.organization_members (organization_id, user_id, role, created_at)
  select
    p.organization_id,
    p.id,
    case
      when o.created_by = p.id then 'admin'
      when p.role = 'admin' then 'admin'
      else 'member'
    end,
    p.created_at
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.organization_id is not null
  on conflict (organization_id, user_id) do nothing;
end $$;

-- RLS: members can view their own memberships and other members of the same org
drop policy if exists "Members can view their memberships" on public.organization_members;
create policy "Members can view their memberships"
  on public.organization_members for select using (
    user_id = auth.uid() or
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
  );

-- RLS: only admins can insert/update/delete (enforced in application via service role)
drop policy if exists "Admins can manage memberships" on public.organization_members;
create policy "Admins can manage memberships"
  on public.organization_members for all using (
    exists (
      select 1 from public.organization_members
      where organization_id = organization_members.organization_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- Index for fast lookups
create index if not exists idx_organization_members_user_id on public.organization_members(user_id);
create index if not exists idx_organization_members_org_id on public.organization_members(organization_id);
