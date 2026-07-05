-- Make granola_notes accessible to all members of the same organization
-- This allows a team to share one Granola API key/workspace and see each other's calls

-- Update existing rows: set organization_id from the importing user's profile where missing
update public.granola_notes n
set organization_id = p.organization_id
from public.profiles p
where n.user_id = p.id and n.organization_id is null;

-- Drop the old user-level policy
drop policy if exists "Users manage own granola notes" on public.granola_notes;

-- New org-level policy: members can view/manage notes for their org
create policy "Org members manage granola notes"
  on public.granola_notes for all
  using (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );

-- Index for org-level lookups
create index if not exists idx_granola_notes_org_id
  on public.granola_notes (organization_id);
