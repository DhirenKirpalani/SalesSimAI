-- Add video recording URL to heygen_sessions
alter table public.heygen_sessions
  add column if not exists video_url text;
