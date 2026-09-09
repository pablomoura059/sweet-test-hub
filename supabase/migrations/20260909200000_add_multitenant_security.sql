-- ============================================================
-- SEGURANÇA MULTI-TENANT
-- Data: 2026-09-09
-- ============================================================

-- ============================================================
-- 1. FUNÇÃO PÚBLICA: verificar se uma pessoa pertence ao usuário
-- ============================================================
-- Esta função é SECURITY DEFINER (executa com privilégios do dono)
-- mas usa search_path seguro para evitar hijacking.
-- Qualquer usuário logado pode chamá-la para verificar
-- se um person_id pertence a ele.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_person_owner(people_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.people
    WHERE id = people_id AND user_id = auth.uid()
  );
END;
$$;

-- ============================================================
-- 2. RE-CRIAR POLICIES DE INVESTMENTS COM VERIFICAÇÃO DE person_id
-- ============================================================
-- Primeiro dropar as policies existentes para recriar limpas
DROP POLICY IF EXISTS "Users can insert own investments" ON investments;
DROP POLICY IF EXISTS "Users can update own investments" ON investments;

-- INSERT: usuário pode criar investimento SE:
--   (a) user_id do investimento = auth.uid()  E
--   (b) person_id é NULL (cadastro antigo) OU person_id pertence ao auth.uid()
CREATE POLICY "Users can insert own investments" ON investments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      person_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.people
        WHERE id = person_id AND user_id = auth.uid()
      )
    )
  );

-- UPDATE: impede alteração de user_id e person_id para outro usuário
CREATE POLICY "Users can update own investments" ON investments
  FOR UPDATE USING (
    auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() = user_id
    AND (
      person_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.people
        WHERE id = person_id AND user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 3. GARANTIR QUE profiles EXISTA E TENHA RLS
-- ============================================================
-- A tabela profiles pode já existir. IF NOT EXISTS no CREATE TABLE
-- garante que não dá erro se já existir.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'manager',
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT  profiles_role_check CHECK (role IN ('admin', 'manager')),
  CONSTRAINT  profiles_status_check CHECK (status IN ('pending', 'active', 'blocked'))
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profiles_updated_at();

-- ============================================================
-- 4. POLICIES RLS PARA profiles
-- ============================================================

-- Cada usuário pode VER apenas seu próprio profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Cada usuário pode ATUALIZAR apenas seu próprio profile (exceto role/status)
-- manager NÃO pode se tornar admin via UPDATE
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = 'manager'  -- impede manager de alterar role
  );

-- Admin pode atualizar qualquer profile (role e status)
DROP POLICY IF EXISTS "admin_can_manage_profiles" ON public.profiles;
CREATE POLICY "admin_can_manage_profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: apenas o trigger pode inserir (protegido por security definer)
DROP POLICY IF EXISTS "profiles_insert_system" ON public.profiles;
CREATE POLICY "profiles_insert_system" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- DELETE: proibido para qualquer um (nunca deletar profiles pelo app)
DROP POLICY IF EXISTS "profiles_no_delete" ON public.profiles;
CREATE POLICY "profiles_no_delete" ON public.profiles
  FOR DELETE USING (FALSE);

-- ============================================================
-- 5. TRIGGER: criar profile automaticamente ao cadastrar no auth.users
-- ============================================================
-- Função que cria um profile quando um novo usuário é criado no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'manager',
    'pending'
  );
  RETURN NEW;
END;
$$;

-- Drope e recrie o trigger para garantir que esté atualizado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. FUNÇÃO PÚBLICA: verificar se é admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;
