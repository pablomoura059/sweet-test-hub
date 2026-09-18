insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'person-documents',
  'person-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']::text[]
)
on conflict (id) do update set
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf']::text[];

create policy "person_documents_owner_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'person-documents'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "person_documents_owner_read"
  on storage.objects for select
  using (
    bucket_id = 'person-documents'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "person_documents_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'person-documents'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );