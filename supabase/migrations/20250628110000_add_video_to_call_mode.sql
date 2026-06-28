-- Allow 'video' as a valid call_mode for HeyGen video sessions
alter table public.simulation_sessions
  drop constraint if exists simulation_sessions_call_mode_check;

alter table public.simulation_sessions
  add constraint simulation_sessions_call_mode_check
  check (call_mode in ('voice', 'text', 'video'));
