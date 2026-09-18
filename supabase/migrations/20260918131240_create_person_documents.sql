-- Migration: person_documents
-- Somente imagens (JPG, JPEG, PNG). Máximo 3 documentos por pessoa.

-- =============================================
-- TABELA person_documents
-- =============================================
CREATE TABLE IF NOT EXISTS public.person_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text,
    file_size bigint,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index para buscas por pessoa
CREATE INDEX IF NOT EXISTS idx_person_documents_person_id ON public.person_documents(person_id);
CREATE INDEX IF NOT EXISTS idx_person_documents_user_id ON public.person_documents(user_id);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.person_documents ENABLE ROW LEVEL SECURITY;

-- Gestor só vê seus próprios documentos
CREATE POLICY "person_documents_select_own"
ON public.person_documents FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Gestor só insere com seu próprio user_id
CREATE POLICY "person_documents_insert_own"
ON public.person_documents FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Gestor só exclui seus próprios documentos
CREATE POLICY "person_documents_delete_own"
ON public.person_documents FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admin mantém acesso total
CREATE POLICY "person_documents_admin_all"
ON public.person_documents FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- =============================================
-- BUCKET STORAGE
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'person-documents',
    'person-documents',
    false,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Gestor só faz upload no próprio path
CREATE POLICY "person_documents_upload_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'person-documents'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR (
            array_length(storage.foldername(name), 1) >= 2
            AND auth.uid()::text = (storage.foldername(name))[2]
        )
    )
);

-- Gestor só vê seus próprios arquivos
CREATE POLICY "person_documents_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'person-documents'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR (
            array_length(storage.foldername(name), 1) >= 2
            AND auth.uid()::text = (storage.foldername(name))[2]
        )
    )
);

-- Gestor só exclui seus próprios arquivos
CREATE POLICY "person_documents_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'person-documents'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR (
            array_length(storage.foldername(name), 1) >= 2
            AND auth.uid()::text = (storage.foldername(name))[2]
        )
    )
);

-- Admin acesso total no bucket
CREATE POLICY "person_documents_admin_all"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'person-documents'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
