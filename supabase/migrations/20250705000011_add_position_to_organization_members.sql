-- Add workspace-scoped position to organization_members
-- ============================================================

alter table public.organization_members
  add column if not exists position text;

-- Copy existing profile positions into organization_members for the active workspace
update public.organization_members om
set position = p.position
from public.profiles p
where om.user_id = p.id
  and p.position is not null
  and om.position is null;
