-- Store scenario name directly in simulation_sessions for display in history pages
alter table public.simulation_sessions add column if not exists scenario_name text;
