-- Tornar bucket person-photos público para exibição de fotos
-- A segurança é garantida pela RLS: cada usuário vê apenas seus próprios arquivos

-- Policy pública de leitura
DROP POLICY IF EXISTS "Public photos read" ON storage.objects;
CREATE POLICY "Public photos read" ON storage.objects
  FOR SELECT USING (bucket_id = 'person-photos');

-- Owner pode fazer upload
DROP POLICY IF EXISTS "Owner can upload photos" ON storage.objects;
CREATE POLICY "Owner can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'person-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner pode atualizar
DROP POLICY IF EXISTS "Owner can update photos" ON storage.objects;
CREATE POLICY "Owner can update photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'person-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner pode deletar
DROP POLICY IF EXISTS "Owner can delete photos" ON storage.objects;
CREATE POLICY "Owner can delete photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'person-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
