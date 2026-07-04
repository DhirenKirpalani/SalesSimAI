-- ============================================================
-- Granola Notes Table
-- Stores imported meeting notes, transcripts, and summaries from Granola
-- ============================================================

create table if not exists public.granola_notes (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  external_id    text not null unique,
  title          text,
  summary        text,
  summary_markdown text,
  transcript     jsonb,
  owner          jsonb,
  attendees      jsonb,
  calendar_event jsonb,
  web_url        text,
  created_at     timestamptz,
  updated_at     timestamptz,
  imported_at    timestamptz not null default now(),
  raw_data       jsonb not null default '{}',
  metadata       jsonb not null default '{}'
);

alter table public.granola_notes enable row level security;

drop policy if exists "Users manage own granola notes" on public.granola_notes;
create policy "Users manage own granola notes"
  on public.granola_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for efficient lookups by external Granola note ID
CREATE INDEX IF NOT EXISTS idx_granola_notes_external_id ON public.granola_notes(external_id);
CREATE INDEX IF NOT EXISTS idx_granola_notes_user_id ON public.granola_notes(user_id);
