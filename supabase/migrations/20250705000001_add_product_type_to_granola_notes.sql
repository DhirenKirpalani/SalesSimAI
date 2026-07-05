-- Add product_type column to granola_notes for segmenting calls by product
alter table public.granola_notes add column if not exists product_type text default 'payment'
  check (product_type in ('payment','eor','cards'));

-- Backfill existing notes with a default product type
update public.granola_notes set product_type = 'payment' where product_type is null;

-- Index for efficient product-type filtering
CREATE INDEX IF NOT EXISTS idx_granola_notes_product_type ON public.granola_notes(product_type);
