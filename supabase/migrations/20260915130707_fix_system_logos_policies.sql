-- Corrige policies do bucket system-logos
-- O path do objeto no Supabase Storage pode vir como:
--   'system-logos/USER_ID/logo.png'  (com bucket prefix)
-- ou:
--   'USER_ID/logo.png'                (sem bucket prefix)
--
-- A policy usa storage.foldername(name) para extrair o primeiro segmento,
-- mas se vier com bucket prefixado, o [1] retornaria 'system-logos' — não o user_id.
-- A validação extra de UUID garante que o segmento extraído seja um ID de usuário.

-- 1) Drop policies antigas
DROP POLICY IF EXISTS "users_upload_own_logo" ON storage.objects;
DROP POLICY IF EXISTS "anyone_read_system_logos" ON storage.objects;
DROP POLICY IF EXISTS "users_update_own_logo" ON storage.objects;

-- 2) Policy de INSERT (upload) — isola por user_id
--    Usa substring e validação de UUID para compensar bucket prefixado
CREATE POLICY "users_upload_own_logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'system-logos'
  AND (
    -- Caso 1: path sem bucket prefix (name = 'USER_ID/logo.png')
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Caso 2: path com bucket prefixado (name = 'system-logos/USER_ID/logo.png')
    -- foldername retorna ['system-logos', 'USER_ID', 'logo.png'] → [2] é o user_id
    (array_length(storage.foldername(name), 1) >= 2 AND auth.uid()::text = (storage.foldername(name))[2])
  )
);

-- 3) Policy de SELECT (leitura pública — bucket é public: true)
CREATE POLICY "anyone_read_system_logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'system-logos');

-- 4) Policy de UPDATE (upsert/replace da logo) — isola por user_id
CREATE POLICY "users_update_own_logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'system-logos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    (array_length(storage.foldername(name), 1) >= 2 AND auth.uid()::text = (storage.foldername(name))[2])
  )
)
WITH CHECK (
  bucket_id = 'system-logos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    (array_length(storage.foldername(name), 1) >= 2 AND auth.uid()::text = (storage.foldername(name))[2])
  )
);
