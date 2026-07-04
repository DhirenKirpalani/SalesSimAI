-- ============================================================
-- Add summary_text column to granola_notes for Granola API compatibility
-- ============================================================

alter table public.granola_notes
add column if not exists summary_text text;
