-- Re-tag sessions by their scenario's workspace, not the user's current profile workspace
-- ============================================================

-- simulation_sessions linked to custom_scenarios (scenario_id is uuid)
update public.simulation_sessions s
set organization_id = cs.organization_id
from public.custom_scenarios cs
where s.scenario_id = cs.id
  and s.scenario_table = 'custom_scenarios'
  and cs.organization_id is not null;

-- simulation_sessions linked to platform_scenarios (scenario_id is uuid)
update public.simulation_sessions s
set organization_id = ps.organization_id
from public.platform_scenarios ps
where s.scenario_id = ps.id
  and s.scenario_table = 'platform_scenarios'
  and ps.organization_id is not null;

-- heygen_sessions linked to custom_scenarios (scenario_id is text)
update public.heygen_sessions s
set organization_id = cs.organization_id
from public.custom_scenarios cs
where s.scenario_id = cs.id::text
  and s.scenario_table = 'custom_scenarios'
  and cs.organization_id is not null;

-- heygen_sessions linked to platform_scenarios (scenario_id is text)
update public.heygen_sessions s
set organization_id = ps.organization_id
from public.platform_scenarios ps
where s.scenario_id = ps.id::text
  and s.scenario_table = 'platform_scenarios'
  and ps.organization_id is not null;
