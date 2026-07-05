-- Add source column to granola_notes so imported calls can be tagged by platform
alter table public.granola_notes
add column if not exists source text not null default 'granola';

comment on column public.granola_notes.source is 'Source platform for the imported call (e.g. granola, google, microsoft, hubspot)';
