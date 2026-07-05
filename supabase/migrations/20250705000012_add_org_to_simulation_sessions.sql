-- Add workspace scoping to simulation_sessions and heygen_sessions
-- ============================================================

alter table public.simulation_sessions
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_simulation_sessions_org_id
  on public.simulation_sessions(organization_id);

alter table public.heygen_sessions
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_heygen_sessions_org_id
  on public.heygen_sessions(organization_id);

-- Backfill organization_id from the user's active profile at the time of the session.
-- This is a best-effort mapping: for each session, use the session owner's profile organization_id.
update public.simulation_sessions s
set organization_id = p.organization_id
from public.profiles p
where s.user_id = p.id
  and s.organization_id is null
  and p.organization_id is not null;

update public.heygen_sessions s
set organization_id = p.organization_id
from public.profiles p
where s.user_id = p.id
  and s.organization_id is null
  and p.organization_id is not null;
