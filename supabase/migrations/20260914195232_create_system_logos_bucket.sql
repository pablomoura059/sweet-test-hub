-- Criar bucket para logos do sistema, isolado por usuario
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'system-logos',
  'system-logos',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Policy: qualquer pessoa autenticada pode fazer upload da propria logo
CREATE POLICY "users_upload_own_logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'system-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: qualquer pessoa autenticada pode ler logos de qualquer usuario (URL publica)
CREATE POLICY "anyone_read_system_logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'system-logos');

-- Policy: qualquer pessoa autenticada pode atualizar (substituir) a propria logo
CREATE POLICY "users_update_own_logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'system-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'system-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
