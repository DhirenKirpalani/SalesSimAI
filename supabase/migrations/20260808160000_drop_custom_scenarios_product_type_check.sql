-- Drop the product_type check constraint on custom_scenarios
-- to allow category values like 'interviews', 'sales', 'negotiation', etc.
-- This matches what was already done for platform_scenarios.

alter table public.custom_scenarios drop constraint if exists custom_scenarios_product_type_check;
alter table public.custom_scenarios alter column product_type drop default;
