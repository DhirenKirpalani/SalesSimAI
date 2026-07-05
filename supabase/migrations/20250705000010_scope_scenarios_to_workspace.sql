-- Scope custom_scenarios access to the user's workspaces
-- ============================================================

-- Update custom_scenarios RLS policies to enforce workspace scoping
DROP POLICY IF EXISTS "Users can view own custom scenarios" ON public.custom_scenarios;
CREATE POLICY "Users can view workspace custom scenarios"
  ON public.custom_scenarios FOR SELECT USING (
    (organization_id IS NULL AND (auth.uid() = user_id OR auth.uid() = created_by))
    OR organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own custom scenarios" ON public.custom_scenarios;
CREATE POLICY "Users can insert workspace custom scenarios"
  ON public.custom_scenarios FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      organization_id IS NULL
      OR organization_id IN (
        SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own custom scenarios" ON public.custom_scenarios;
CREATE POLICY "Users can update workspace custom scenarios"
  ON public.custom_scenarios FOR UPDATE USING (
    (organization_id IS NULL AND (auth.uid() = user_id OR auth.uid() = created_by))
    OR organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own custom scenarios" ON public.custom_scenarios;
CREATE POLICY "Users can delete workspace custom scenarios"
  ON public.custom_scenarios FOR DELETE USING (
    (organization_id IS NULL AND (auth.uid() = user_id OR auth.uid() = created_by))
    OR organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );
