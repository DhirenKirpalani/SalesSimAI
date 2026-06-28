ALTER TABLE simulation_sessions
ADD COLUMN IF NOT EXISTS duration_s INTEGER;
