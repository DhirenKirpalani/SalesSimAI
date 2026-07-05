-- Adjust calls schema for multi-source integrations
-- External IDs may overlap between platforms, so uniqueness must be (source, external_id)

-- Ensure source column exists (it may have been added before the table rename)
alter table public.calls
  add column if not exists source text not null default 'granola';

-- Drop the old unique constraint on external_id
alter table public.calls
  drop constraint if exists granola_notes_external_id_key;

-- Add composite unique constraint on source + external_id
alter table public.calls
  add constraint calls_source_external_id_key unique (source, external_id);

-- Rename remaining granola-specific indexes
alter index if exists idx_granola_notes_external_id rename to idx_calls_external_id;
alter index if exists idx_granola_notes_user_id rename to idx_calls_user_id;

-- Add a source index for filtering by platform
CREATE INDEX IF NOT EXISTS idx_calls_source ON public.calls(source);

-- Update table comment
comment on table public.calls is 'Stores imported calls and meetings from any connected integration source (Granola, Google, Microsoft, HubSpot, etc.)';
