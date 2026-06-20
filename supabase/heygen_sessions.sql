-- LiveAvatar simulation sessions
create table if not exists heygen_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  scenario_id    text,
  scenario_table text,
  scenario_name  text,
  transcript     jsonb,      -- TranscriptEntry[] { role, text, time }
  analysis       jsonb,      -- MEDDIC FeedbackResult
  duration_s     integer,
  started_at     timestamptz default now() not null,
  ended_at       timestamptz
);

alter table heygen_sessions enable row level security;

create policy "Users can manage own heygen sessions"
  on heygen_sessions for all
  using (auth.uid() = user_id);

-- Index for listing a user's sessions by date
create index heygen_sessions_user_started on heygen_sessions(user_id, started_at desc);
