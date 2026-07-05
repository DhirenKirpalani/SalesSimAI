-- Fix custom_scenarios RLS to also check the user's active workspace profile
-- ============================================================

-- Use profiles.organization_id as the workspace fallback.
-- The organization_members subquery is removed to avoid RLS recursion.

DROP POLICY IF EXISTS "Users can view workspace custom scenarios" ON public.custom_scenarios;
CREATE POLICY "Users can view workspace custom scenarios"
  ON public.custom_scenarios FOR SELECT USING (
    (organization_id IS NULL AND (auth.uid() = user_id OR auth.uid() = created_by))
    OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert workspace custom scenarios" ON public.custom_scenarios;
CREATE POLICY "Users can insert workspace custom scenarios"
  ON public.custom_scenarios FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      organization_id IS NULL
      OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update workspace custom scenarios" ON public.custom_scenarios;
CREATE POLICY "Users can update workspace custom scenarios"
  ON public.custom_scenarios FOR UPDATE USING (
    (organization_id IS NULL AND (auth.uid() = user_id OR auth.uid() = created_by))
    OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete workspace custom scenarios" ON public.custom_scenarios;
CREATE POLICY "Users can delete workspace custom scenarios"
  ON public.custom_scenarios FOR DELETE USING (
    (organization_id IS NULL AND (auth.uid() = user_id OR auth.uid() = created_by))
    OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Fix the recursive organization_members SELECT policy
DROP POLICY IF EXISTS "Members can view their memberships" ON public.organization_members;
CREATE POLICY "Members can view their memberships"
  ON public.organization_members FOR SELECT USING (
    user_id = auth.uid()
  );
