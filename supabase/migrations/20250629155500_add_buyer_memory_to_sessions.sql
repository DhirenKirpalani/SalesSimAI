-- Add structured buyer memory to simulation_sessions for long-term conversation recall.

alter table public.simulation_sessions
  add column if not exists buyer_memory jsonb not null default '{
    "pain_points_discovered": [],
    "objections_raised": [],
    "seller_promises": [],
    "unanswered_questions": []
  }';
