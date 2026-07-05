-- Add slug column to organizations and populate unique slugs for existing rows
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Helper function to generate a clean slug from a name
CREATE OR REPLACE FUNCTION generate_org_slug(base_name text, existing_slug text DEFAULT NULL)
RETURNS text AS $$
DECLARE
  clean text;
  candidate text;
  counter integer := 1;
BEGIN
  clean := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(base_name, 'org'), '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g'));
  clean := TRIM(BOTH '-' FROM clean);
  IF clean = '' THEN clean := 'org'; END IF;
  candidate := clean;
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = candidate AND (existing_slug IS NULL OR slug != existing_slug)) LOOP
    counter := counter + 1;
    candidate := clean || '-' || counter;
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

-- Populate slugs for existing organizations without exposing IDs
UPDATE organizations
SET slug = generate_org_slug(name)
WHERE slug IS NULL;

-- Make slug non-nullable after population
ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;
