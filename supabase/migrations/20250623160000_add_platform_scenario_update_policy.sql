-- Allow admins to update platform scenarios (for editing pre-built content)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Only admins can update platform scenarios'
    and tablename = 'platform_scenarios'
    and schemaname = 'public'
  ) then
    create policy "Only admins can update platform scenarios"
      on public.platform_scenarios for update using (
        auth.uid() in (
          select id from public.profiles where role = 'admin'
        )
      );
  end if;
end $$;
