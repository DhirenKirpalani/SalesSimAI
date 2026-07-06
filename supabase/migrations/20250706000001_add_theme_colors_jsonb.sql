-- Add theme_colors JSONB column to organizations
-- Stores 4 configurable brand colors: { primary, background, foreground, surface }
alter table public.organizations add column if not exists theme_colors jsonb;

-- Backfill from existing theme_color column if present
update public.organizations
set theme_colors = jsonb_build_object(
  'primary', coalesce(theme_color, '#F76918'),
  'background', '#F6EFE1',
  'foreground', '#3D1805',
  'surface', '#FFFFFF'
)
where theme_colors is null;
