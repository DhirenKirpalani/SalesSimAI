-- ============================================================
-- Add product_type to scenario tables
-- Matches the product type taxonomy used in company_documents
-- ============================================================

-- Add product_type to platform_scenarios
alter table public.platform_scenarios
add column if not exists product_type text not null default 'eor'
  check (product_type in ('payment','eor','cards'));

-- Add product_type to custom_scenarios
alter table public.custom_scenarios
add column if not exists product_type text not null default 'eor'
  check (product_type in ('payment','eor','cards'));

-- Index for fast filtering by product type
create index if not exists idx_platform_scenarios_product_type
  on public.platform_scenarios(product_type);

create index if not exists idx_custom_scenarios_product_type
  on public.custom_scenarios(product_type);

-- The product knowledge scenario covers Aspire's full payment/card/FX stack,
-- so it should be classified as 'payment' rather than the default 'eor'.
update public.platform_scenarios
set product_type = 'payment'
where name = 'Aspire — Product Knowledge Interview';
