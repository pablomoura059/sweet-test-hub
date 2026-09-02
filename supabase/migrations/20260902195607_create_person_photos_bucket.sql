INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('person-photos', 'person-photos', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own photos"
ON storage.objects
FOR ALL
USING (bucket_id = 'person-photos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'person-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
