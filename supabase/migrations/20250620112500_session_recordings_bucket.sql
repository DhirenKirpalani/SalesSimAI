-- Create storage bucket for session recordings
insert into storage.buckets (id, name, public)
values ('session-recordings', 'session-recordings', true)
on conflict do nothing;

-- Allow authenticated users to upload to session-recordings
do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Authenticated users can upload session recordings'
      and tablename = 'objects'
      and schemaname = 'storage'
  ) then
    create policy "Authenticated users can upload session recordings"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'session-recordings');
  end if;
end $$;

-- Allow authenticated users to read session recordings
do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Authenticated users can read session recordings'
      and tablename = 'objects'
      and schemaname = 'storage'
  ) then
    create policy "Authenticated users can read session recordings"
      on storage.objects for select to authenticated
      using (bucket_id = 'session-recordings');
  end if;
end $$;
