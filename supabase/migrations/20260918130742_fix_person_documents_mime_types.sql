-- Corrige os tipos MIME permitidos no bucket person-documents
-- Remove PDF, mantendo apenas imagens (JPG, JPEG, PNG)

update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png']::text[]
where id = 'person-documents';
