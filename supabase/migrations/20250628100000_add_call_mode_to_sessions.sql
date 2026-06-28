-- Add call_mode to simulation_sessions to distinguish voice vs text chat
alter table public.simulation_sessions
  add column if not exists call_mode text default 'voice'
  check (call_mode in ('voice', 'text'));
