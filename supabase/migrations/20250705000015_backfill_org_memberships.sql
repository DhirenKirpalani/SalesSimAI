-- Backfill missing organization memberships and fix recursive RLS policy
-- ============================================================

-- 1. Fix the recursive organization_members SELECT policy
DROP POLICY IF EXISTS "Members can view their memberships" ON public.organization_members;
CREATE POLICY "Members can view their memberships"
  ON public.organization_members FOR SELECT USING (
    user_id = auth.uid()
  );

-- 2. Ensure every organization creator has an admin membership
INSERT INTO public.organization_members (organization_id, user_id, role, created_at)
SELECT
  o.id,
  o.created_by,
  'admin',
  COALESCE(o.created_at, now())
FROM public.organizations o
WHERE o.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = o.id AND om.user_id = o.created_by
  );

-- 3. Ensure every profile with an active organization has a membership
INSERT INTO public.organization_members (organization_id, user_id, role, created_at, position)
SELECT
  p.organization_id,
  p.id,
  CASE WHEN p.role = 'admin' THEN 'admin' ELSE 'member' END,
  COALESCE(p.created_at, now()),
  p.position
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p.organization_id AND om.user_id = p.id
  );
