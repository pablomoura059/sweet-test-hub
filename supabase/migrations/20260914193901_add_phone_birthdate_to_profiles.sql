-- Adiciona phone e birth_date em public.profiles
-- Habilita RLS para segurança

-- Adiciona coluna phone se não existir
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Adiciona coluna birth_date se não existir
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Habilita RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: usuário logado pode ler todos os perfis (necessário para o dashboard)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- Policy: usuário pode atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
