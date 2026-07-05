-- Rename granola_notes to calls to support multiple integration sources
-- The table will hold imported calls from Granola, Google, Microsoft, HubSpot, etc.

alter table if exists public.granola_notes rename to calls;

-- Update the sequence to match the new table name
alter sequence if exists public.granola_notes_id_seq rename to calls_id_seq;

-- Recreate RLS policies with the new table name
-- Drop old policies if they reference the old table name
drop policy if exists "Users manage own granola notes" on public.calls;
drop policy if exists "Org members manage granola notes" on public.calls;

-- Enable RLS (idempotent)
alter table public.calls enable row level security;

-- Org-level policy: members can view/manage calls for their org
create policy "Org members manage calls"
  on public.calls for all
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

-- Update index names
alter index if exists idx_granola_notes_org_id rename to idx_calls_org_id;
